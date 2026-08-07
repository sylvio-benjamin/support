<?php
require '../config/cors.php';
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

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

// Seul un technicien interne peut proposer un RDV (le frontend n'appelle cet
// endpoint que depuis les widgets technicien/directeur). Auparavant n'importe
// quel compte authentifié (y compris un simple employé) le pouvait.
$idTechnicienSession = (int)($_SESSION['user']['idTechnicien'] ?? 0);
if (!$idTechnicienSession) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès non autorisé.']);
    exit;
}

require_once '../connexionBDD.php'; // Connexion à la BDD AVANT tout appel

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $idTicket = $_POST['Ticket'] ?? null;
    $titre = $_POST['titre'] ?? null;
    $priorite = $_POST['priorite'] ?? 'normal';

    // Plusieurs créneaux proposés au choix du client (champ JSON "creneaux"),
    // avec repli sur un seul créneau ("date"/"heure") pour compatibilité.
    $creneaux = [];
    if (!empty($_POST['creneaux'])) {
        $decode = json_decode($_POST['creneaux'], true);
        if (is_array($decode)) {
            foreach ($decode as $c) {
                if (!empty($c['date']) && !empty($c['heure'])) {
                    $creneaux[] = ['date' => $c['date'], 'heure' => $c['heure']];
                }
            }
        }
    } elseif (!empty($_POST['date']) && !empty($_POST['heure'])) {
        $creneaux[] = ['date' => $_POST['date'], 'heure' => $_POST['heure']];
    }
    $creneaux = array_slice($creneaux, 0, 5);
    $date = $creneaux[0]['date'] ?? null;
    $heure = $creneaux[0]['heure'] ?? null;

    if (count($creneaux) > 0 && $idTicket && $titre) {
        // idTechnicien/idUtilisateur dérivés de la session et du ticket lui-même,
        // jamais du corps de la requête : sinon n'importe quel technicien pouvait
        // créer un RDV bidon associant un idUtilisateur/idTicket arbitraire, y
        // compris d'une autre entreprise (même pattern que saveChatMessage.php).
        $stmtTicket = $bdd->prepare("SELECT idUtilisateur, idTechnicien FROM ticket WHERE idTicket = :idTicket");
        $stmtTicket->execute(['idTicket' => $idTicket]);
        $ticketInfo = $stmtTicket->fetch(PDO::FETCH_ASSOC);

        if (!$ticketInfo) {
            echo json_encode(['success' => false, 'error' => 'Ticket introuvable.']);
            exit;
        }

        // Le technicien doit être assigné à ce ticket (ou technicien général).
        if ((int)$ticketInfo['idTechnicien'] !== $idTechnicienSession) {
            $reqTechGeneral = $bdd->prepare("SELECT idTechnicien FROM techniciens WHERE idTechnicien = ? AND (role = 'technicien' OR role IS NULL)");
            $reqTechGeneral->execute([$idTechnicienSession]);
            if (!$reqTechGeneral->fetch()) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Accès non autorisé à ce ticket.']);
                exit;
            }
        }

        $idTechnicien = $idTechnicienSession;
        $idUtilisateur = $ticketInfo['idUtilisateur'];
        // Vérifier que tous les créneaux proposés sont dans le futur
        $now = date('Y-m-d H:i:s');
        foreach ($creneaux as $c) {
            if (strtotime($c['date'] . ' ' . $c['heure']) <= strtotime($now)) {
                echo json_encode(['success' => false, 'error' => 'Les créneaux proposés doivent être dans le futur.']);
                exit;
            }
        }
        // Vérifier s'il existe déjà un RDV Futur ou Présent pour ce ticket
        $stmtCheck = $bdd->prepare("SELECT COUNT(*) FROM Calendrier WHERE idTicket = :idTicket AND status IN ('Futur', 'Présent')");
        $stmtCheck->execute(['idTicket' => $idTicket]);
        if ($stmtCheck->fetchColumn() > 0) {
            echo json_encode(['success' => false, 'error' => 'Un RDV à venir existe déjà pour ce ticket.']);
            exit;
        }
        $resultat = creerRDV($creneaux, $idTicket, $idUtilisateur, $idTechnicien, $titre, $priorite, $bdd);
        if ($resultat) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Impossible de créer le RDV (erreur BDD).']);
        }
    } else {
        echo json_encode(['success' => false, 'error' => 'Paramètres manquants']);
    }
    exit();
}

function creerRDV($creneaux, $idTicket, $idUtilisateur, $idTechnicien, $titre, $priorite, $bdd) {
    // Vérification doublon (sécurité supplémentaire)
    $stmtCheck = $bdd->prepare("SELECT COUNT(*) FROM Calendrier WHERE idTicket = :idTicket AND status IN ('Futur', 'Présent')");
    $stmtCheck->execute([
        'idTicket' => $idTicket
    ]);
    if ($stmtCheck->fetchColumn() > 0) {
        // Ne rien faire si doublon
        return false;
    }
    // idTicket est UNIQUE dans Calendrier : une seule ligne par ticket. Pour
    // "proposer plusieurs créneaux au choix du client", on stocke la liste
    // complète en JSON dans "propositions" ; le premier créneau sert de valeur
    // par défaut pour date/heure tant que le client n'a pas choisi.
    $premier = $creneaux[0];
    $date = $premier['date'];
    $heure = $premier['heure'];
    $propositionsJson = count($creneaux) > 1 ? json_encode($creneaux) : null;
    try {
        $stmt = $bdd->prepare("INSERT INTO Calendrier (idTechnicien, idUtilisateur, idTicket, date, heure, propositions, Titre, status, priorite, Acceptation) VALUES (:idTechnicien, :idUtilisateur, :idTicket, :date, :heure, :propositions, :Titre, :status, :priorite, :acceptation)");
        $ok = $stmt->execute([
            'idTechnicien' => $idTechnicien,
            'idUtilisateur' => $idUtilisateur,
            'idTicket' => $idTicket,
            'date' => $date,
            'heure' => $heure,
            'propositions' => $propositionsJson,
            'Titre' => $titre,
            'status' => 'Futur', // en attente de confirmation du client
            'priorite' => $priorite,
            'acceptation' => 'Attente' // le client doit accepter/refuser (cf. updateRDV.php)
        ]);
        if (!$ok) {
            error_log('Erreur insertion Calendrier: ' . print_r($stmt->errorInfo(), true));
            return false;
        }
        // Récupérer l'id du RDV créé
        $idCalendrier = $bdd->lastInsertId();
        // Un seul message dans la conversation partagée du ticket : les deux
        // messages précédents ("proposé" côté employé + "vous avez proposé"
        // côté technicien) apparaissaient tous les deux à tout le monde
        // (thread unique), donnant l'impression d'un message envoyé en double.
        if (count($creneaux) > 1) {
            $listeCreneaux = implode(', ', array_map(function ($c) {
                return $c['date'] . ' à ' . $c['heure'];
            }, $creneaux));
            $messageTexte = "Un rendez-vous vous est proposé, plusieurs créneaux sont possibles : $listeCreneaux. Merci de choisir celui qui vous convient.";
        } else {
            $messageTexte = "Un rendez-vous vous est proposé le $date à $heure.";
        }
        $stmt2 = $bdd->prepare("INSERT INTO conversation (idTicket, idExpediteur, message, dateEnvoi) VALUES (:idTicket, :idExpediteur, :message, NOW())");
        $ok2 = $stmt2->execute([
            'idTicket' => $idTicket,
            'idExpediteur' => $idTechnicien,
            'message' => $messageTexte
        ]);
        if (!$ok2) {
            error_log('Erreur insertion conversation: ' . print_r($stmt2->errorInfo(), true));
        }

        // Notifications (in-app + email) de la proposition de RDV : l'employé
        // concerné ET les admins référents de son entreprise (cf.
        // recupererPartiesRdv) — best-effort, ne doit jamais faire échouer la
        // création du RDV elle-même.
        try {
            require_once __DIR__ . '/../config/notifications.php';
            require_once __DIR__ . '/emailNotificationHelper.php';

            $stmtTech = $bdd->prepare("SELECT prenomTechnicien, nomTechnicien FROM techniciens WHERE idTechnicien = ?");
            $stmtTech->execute([$idTechnicien]);
            $tech = $stmtTech->fetch(PDO::FETCH_ASSOC);
            $nomTechAffiche = $tech ? trim("{$tech['prenomTechnicien']} {$tech['nomTechnicien']}") : 'Un technicien';
            if ($nomTechAffiche === '') {
                $nomTechAffiche = 'Un technicien';
            }

            $parties = recupererPartiesRdv($bdd, (int)$idUtilisateur, (int)$idTechnicien);
            foreach ($parties as $partie) {
                if ($partie['type'] !== 'utilisateur') {
                    continue; // pas de notif au proposeur lui-même
                }
                creerNotification($bdd, [
                    'type' => NOTIF_RDV_PROPOSE,
                    'idTicket' => $idTicket,
                    'destinataireUtilisateur' => $partie['id'],
                    'titre' => 'Rendez-vous proposé',
                    'message' => "$nomTechAffiche vous propose un rendez-vous pour le ticket \"$titre\".",
                    'idExpediteur' => $idTechnicien,
                    'nomExpediteur' => $tech['nomTechnicien'] ?? null,
                    'prenomExpediteur' => $tech['prenomTechnicien'] ?? null,
                ]);
                if (!empty($partie['email'])) {
                    $introHtml = '<p>Bonjour ' . htmlspecialchars($partie['prenom'] ?? '', ENT_QUOTES) . ',</p>'
                        . '<p><strong>' . htmlspecialchars($nomTechAffiche, ENT_QUOTES) . '</strong> vous propose un rendez-vous pour le ticket "' . htmlspecialchars($titre, ENT_QUOTES) . '" :</p>';
                    $detailHtml = '<div style="background: #f1f5f9; border-radius: 8px; padding: 14px 18px; margin: 12px 0; color: #334155;">'
                        . htmlspecialchars($messageTexte, ENT_QUOTES) . '</div>';
                    envoyerEmailEvenementTicket(
                        $bdd,
                        $partie,
                        (int)$idTicket,
                        'Rendez-vous proposé — Ticket #' . $idTicket,
                        $introHtml,
                        $detailHtml
                    );
                }
            }
        } catch (\Throwable $e) {
            error_log('Calendrier.php: notifications RDV proposé ignorées : ' . $e->getMessage());
        }
    } catch (PDOException $e) {
        error_log('Erreur PDO Calendrier: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => "Erreur serveur lors de l'enregistrement du rendez-vous."]);
        exit;
    }
    return true;
}

// Ajout : fonction pour accepter ou refuser un RDV
function AcceptationRDV($idTicket, $bdd, $reponse) {
    $stmt = $bdd->prepare("SELECT idCalendrier FROM Calendrier WHERE idTicket = :idTicket AND status IN ('Futur', 'Présent') ORDER BY date DESC, heure DESC LIMIT 1");
    $stmt->execute(['idTicket' => $idTicket]);
    $rdv = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$rdv) return false;
    $idRdv = $rdv['idCalendrier'];
    if ($reponse === 'accepte') {
        $stmt2 = $bdd->prepare("UPDATE Calendrier SET Acceptation = 'Accepté', status = 'Présent' WHERE idCalendrier = :id");
        $stmt2->execute(['id' => $idRdv]);
    } else if ($reponse === 'refuse') {
        $stmt2 = $bdd->prepare("UPDATE Calendrier SET Acceptation = 'Refusé', status = 'Passé' WHERE idCalendrier = :id");
        $stmt2->execute(['id' => $idRdv]);
    }
    return true;
}
