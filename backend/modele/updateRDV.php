<?php
function sendJsonResponse($data, $httpCode = 200) {
    while (ob_get_level()) { ob_end_clean(); }
    http_response_code($httpCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

require '../config/cors.php';
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/session.php';
startSecureSession();
if (!isset($_SESSION['user']) || empty($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['erreur' => 'Non authentifié']);
    exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

$idCalendrier = $data['idCalendrier'] ?? null;
$reponse = $data['reponse'] ?? null;

if (!empty($idCalendrier) && is_numeric($idCalendrier) && !empty($reponse) && ($reponse === 'accepte' || $reponse === 'refuse')) {
    require_once '../connexionBDD.php';
    require 'Calendrier.php';

    // idTicket/idExpediteur sont dérivés du RDV lui-même et de la SESSION,
    // jamais du corps de la requête : sinon idTicket pouvait ne pas
    // correspondre au RDV réel (message inséré dans un ticket arbitraire) et
    // idUtilisateur/idExpediteur permettait d'usurper n'importe quelle
    // identité (même pattern que saveChatMessage.php).
    $stmtRdv = $bdd->prepare("SELECT idTicket, idUtilisateur, idTechnicien, propositions FROM Calendrier WHERE idCalendrier = :id");
    $stmtRdv->execute(['id' => $idCalendrier]);
    $rdvActuel = $stmtRdv->fetch(PDO::FETCH_ASSOC);

    if (!$rdvActuel) {
        sendJsonResponse(['success' => false, 'error' => 'RDV non trouvé.'], 404);
    }

    $idTicket = $rdvActuel['idTicket'];
    $idUtilisateurSession = (int)($_SESSION['user']['idUtilisateur'] ?? 0);
    $idTechnicienSession = (int)($_SESSION['user']['idTechnicien'] ?? 0);

    // Seule la personne concernée par CE RDV (l'employé ou le technicien
    // assigné) peut y répondre, sauf directeur plateforme.
    $accesAutorise = estDirecteurPlateforme()
        || ($idUtilisateurSession && $idUtilisateurSession === (int)$rdvActuel['idUtilisateur'])
        || ($idTechnicienSession && $idTechnicienSession === (int)$rdvActuel['idTechnicien']);

    if (!$accesAutorise) {
        sendJsonResponse(['success' => false, 'error' => 'Accès non autorisé à ce RDV.'], 403);
    }

    $idExpediteur = $idUtilisateurSession ?: $idTechnicienSession;

    // Si plusieurs créneaux avaient été proposés, le client choisit celui qui
    // lui convient : on vérifie que le créneau choisi fait bien partie de la
    // liste proposée (pas de date/heure arbitraire venant du client).
    $dateChoisie = null;
    $heureChoisie = null;
    if ($reponse === 'accepte' && !empty($rdvActuel['propositions'])) {
        $propositions = json_decode($rdvActuel['propositions'], true);
        $dateDemandee = $data['date'] ?? null;
        $heureDemandee = $data['heure'] ?? null;
        if (is_array($propositions) && $dateDemandee && $heureDemandee) {
            foreach ($propositions as $c) {
                if (($c['date'] ?? null) === $dateDemandee && ($c['heure'] ?? null) === $heureDemandee) {
                    $dateChoisie = $dateDemandee;
                    $heureChoisie = $heureDemandee;
                    break;
                }
            }
        }
    }

    try {
        if ($reponse === 'accepte') {
            if ($dateChoisie && $heureChoisie) {
                $stmt2 = $bdd->prepare("UPDATE Calendrier SET Acceptation = 'Accepté', status = 'Présent', date = :date, heure = :heure, propositions = NULL WHERE idCalendrier = :id");
                $stmt2->execute(['date' => $dateChoisie, 'heure' => $heureChoisie, 'id' => $idCalendrier]);
            } else {
                $stmt2 = $bdd->prepare("UPDATE Calendrier SET Acceptation = 'Accepté', status = 'Présent', propositions = NULL WHERE idCalendrier = :id");
                $stmt2->execute(['id' => $idCalendrier]);
            }
        } else if ($reponse === 'refuse') {
            // 'Fermé' n'existe pas dans l'ENUM status ('Futur','Présent','Passé','') :
            // cette requête levait une PDOException (ERRMODE_EXCEPTION) et le refus
            // échouait toujours, laissant le RDV bloqué en 'Futur'/'Attente' — et comme
            // idTicket est UNIQUE dans Calendrier, plus aucun nouveau RDV n'était possible
            // pour ce ticket. 'Passé' est la valeur valide la plus proche (RDV clos).
            $stmt2 = $bdd->prepare("UPDATE Calendrier SET Acceptation = 'Refusé', status = 'Passé' WHERE idCalendrier = :id");
            $stmt2->execute(['id' => $idCalendrier]);
        }

        if ($reponse === 'accepte') {
            $messageTexte = ($dateChoisie && $heureChoisie)
                ? "Le rendez-vous du $dateChoisie à $heureChoisie a été accepté par l'utilisateur."
                : "Le rendez-vous a été accepté par l'utilisateur.";
        } else {
            $messageTexte = "Le rendez-vous a été refusé par l'utilisateur.";
        }
        $stmt = $bdd->prepare("INSERT INTO conversation (idTicket, idExpediteur, message, dateEnvoi) VALUES (:idTicket, :idExpediteur, :message, NOW())");
        $stmt->execute([
            'idTicket' => $idTicket,
            'idExpediteur' => $idExpediteur,
            'message' => $messageTexte
        ]);

        // Notifications (in-app + email) de la réponse au RDV, à toutes les
        // parties concernées sauf celle qui vient de répondre — best-effort,
        // ne doit jamais faire échouer l'enregistrement de la réponse.
        try {
            require_once __DIR__ . '/../config/notifications.php';
            require_once __DIR__ . '/emailNotificationHelper.php';

            $idUtilisateurRdv = (int)$rdvActuel['idUtilisateur'];
            $idTechnicienRdv = (int)$rdvActuel['idTechnicien'];
            $typeRepondant = ($idUtilisateurSession && $idUtilisateurSession === $idUtilisateurRdv) ? 'utilisateur' : 'technicien';

            if ($typeRepondant === 'utilisateur') {
                $stmtRepondant = $bdd->prepare("SELECT prenomUtilisateur AS prenom, nomUtilisateur AS nom FROM utilisateur WHERE idUtilisateur = ?");
            } else {
                $stmtRepondant = $bdd->prepare("SELECT prenomTechnicien AS prenom, nomTechnicien AS nom FROM techniciens WHERE idTechnicien = ?");
            }
            $stmtRepondant->execute([$idExpediteur]);
            $repondant = $stmtRepondant->fetch(PDO::FETCH_ASSOC);
            $nomRepondantAffiche = $repondant ? trim("{$repondant['prenom']} {$repondant['nom']}") : 'Le destinataire';
            if ($nomRepondantAffiche === '') {
                $nomRepondantAffiche = 'Le destinataire';
            }

            $decisionTexte = $reponse === 'accepte' ? 'accepté' : 'refusé';

            $parties = recupererPartiesRdv($bdd, $idUtilisateurRdv, $idTechnicienRdv);
            foreach ($parties as $partie) {
                if ($partie['type'] === $typeRepondant && (int)$partie['id'] === (int)$idExpediteur) {
                    continue; // pas de notification à soi-même
                }
                creerNotification($bdd, [
                    'type' => NOTIF_RDV_REPONSE,
                    'idTicket' => $idTicket,
                    'destinataireTechnicien' => $partie['type'] === 'technicien' ? $partie['id'] : null,
                    'destinataireUtilisateur' => $partie['type'] === 'utilisateur' ? $partie['id'] : null,
                    'titre' => 'Réponse au rendez-vous',
                    'message' => "$nomRepondantAffiche a $decisionTexte le rendez-vous proposé.",
                    'idExpediteur' => $idExpediteur,
                    'nomExpediteur' => $repondant['nom'] ?? null,
                    'prenomExpediteur' => $repondant['prenom'] ?? null,
                ]);
                if (!empty($partie['email'])) {
                    $introHtml = '<p>Bonjour ' . htmlspecialchars($partie['prenom'] ?? '', ENT_QUOTES) . ',</p>'
                        . '<p><strong>' . htmlspecialchars($nomRepondantAffiche, ENT_QUOTES) . '</strong> a <strong>' . $decisionTexte . '</strong> le rendez-vous proposé.</p>';
                    envoyerEmailEvenementTicket(
                        $bdd,
                        $partie,
                        (int)$idTicket,
                        'Réponse au rendez-vous — Ticket #' . $idTicket,
                        $introHtml,
                        ''
                    );
                }
            }
        } catch (\Throwable $e) {
            error_log('updateRDV.php: notifications réponse RDV ignorées : ' . $e->getMessage());
        }

        sendJsonResponse(['success' => true]);
    } catch (Exception $e) {
        error_log('updateRDV.php: ' . $e->getMessage());
        sendJsonResponse(['success' => false, 'error' => 'Erreur serveur.'], 500);
    }
} else {
    sendJsonResponse(['success' => false, 'error' => 'Paramètres manquants (idCalendrier ou reponse)'], 400);
}
