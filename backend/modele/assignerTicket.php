<?php
require_once __DIR__ . '/../config/session.php';
startSecureSession();
require_once __DIR__ . '/../config/csrf.php';
require '../config/cors.php';
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-CSRF-Token");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

verifierTokenCsrf();

require_once '../connexionBDD.php';
require_once __DIR__ . '/../config/notifications.php';

// Vérification de la session et du rôle
$rolesAutorises = ['referent', 'technicien', 'directeur'];
if (
    !isset($_SESSION['user']) ||
    !isset($_SESSION['user']['role']) ||
    !in_array($_SESSION['user']['role'], $rolesAutorises) ||
    !isset($_SESSION['user']['idTechnicien'])
) {
    http_response_code(401);
    echo json_encode(['succes' => false, 'erreur' => 'Non connecté ou non technicien']);
    exit;
}

$idTechnicien = $_SESSION['user']['idTechnicien'];
$nomTechnicien = $_SESSION['user']['nom'] ?? 'Technicien';
$prenomTechnicien = $_SESSION['user']['prenom'] ?? '';

$donnees = json_decode(file_get_contents('php://input'), true);
if (!isset($donnees['idTicket'])) {
    echo json_encode(['succes' => false, 'erreur' => 'Ticket non spécifié']);
    exit;
}

$idTicket = intval($donnees['idTicket']);

// L'auto-assignation (un technicien qui se prend un ticket libre lui-même)
// n'existe plus : seul un directeur plateforme peut assigner un ticket, à
// n'importe quel technicien de son choix — y compris lui-même — et même si
// le ticket est déjà pris en charge par quelqu'un d'autre.
if (!estDirecteurPlateforme()) {
    http_response_code(403);
    echo json_encode(['succes' => false, 'erreur' => 'Seul un directeur peut assigner un ticket.']);
    exit;
}

$idTechnicienCible = isset($donnees['idTechnicienCible']) ? intval($donnees['idTechnicienCible']) : null;
if (!$idTechnicienCible) {
    echo json_encode(['succes' => false, 'erreur' => 'Technicien cible non spécifié.']);
    exit;
}

try {
    // Commencer une transaction
    $bdd->beginTransaction();

    // Récupérer les informations du ticket avant assignation
    $requeteTicket = $bdd->prepare("SELECT idUtilisateur, titre FROM ticket WHERE idTicket = :idTicket");
    $requeteTicket->execute([':idTicket' => $idTicket]);
    $ticket = $requeteTicket->fetch(PDO::FETCH_ASSOC);

    if (!$ticket) {
        throw new Exception('Ticket non trouvé');
    }

    // Vérifier que la cible existe vraiment.
    $reqCible = $bdd->prepare("SELECT idTechnicien, nomTechnicien, prenomTechnicien, role FROM techniciens WHERE idTechnicien = :id");
    $reqCible->execute([':id' => $idTechnicienCible]);
    $cible = $reqCible->fetch(PDO::FETCH_ASSOC);
    if (!$cible) {
        throw new Exception('Technicien cible introuvable');
    }

    $idTechnicienAssigne = (int)$cible['idTechnicien'];
    $nomAssigne = $cible['nomTechnicien'];
    $prenomAssigne = $cible['prenomTechnicien'];
    $libelleRoleAssigne = $cible['role'] === 'directeur' ? 'Directeur' : 'Technicien';

    // Un directeur peut assigner/réassigner même un ticket déjà pris en charge.
    $requeteAssignation = $bdd->prepare("UPDATE ticket SET idTechnicien = :idTechnicien, dateTicketAssigné = CURRENT_TIMESTAMP, statut = 'en_cours' WHERE idTicket = :idTicket");
    $requeteAssignation->execute([
        ':idTechnicien' => $idTechnicienAssigne,
        ':idTicket' => $idTicket
    ]);

    if ($requeteAssignation->rowCount() > 0) {
        // Créer une notification pour l'utilisateur du ticket
        creerNotification($bdd, [
            'type' => NOTIF_ASSIGNATION,
            'idTicket' => $idTicket,
            'destinataireUtilisateur' => $ticket['idUtilisateur'],
            'titre' => $libelleRoleAssigne . ' assigné à votre ticket',
            'message' => $prenomAssigne . ' ' . $nomAssigne . ' a été assigné à votre ticket "' . $ticket['titre'] . '"',
            'idExpediteur' => $idTechnicienAssigne,
            'nomExpediteur' => $nomAssigne,
            'prenomExpediteur' => $prenomAssigne,
        ]);

        // Si un directeur a assigné le ticket à quelqu'un d'autre que
        // lui-même, la personne assignée n'a elle-même rien cliqué : il faut
        // la prévenir.
        if ($idTechnicienAssigne !== (int)$idTechnicien) {
            creerNotification($bdd, [
                'type' => NOTIF_ASSIGNATION,
                'idTicket' => $idTicket,
                'destinataireTechnicien' => $idTechnicienAssigne,
                'titre' => 'Ticket assigné',
                'message' => $prenomTechnicien . ' ' . $nomTechnicien . ' vous a assigné le ticket "' . $ticket['titre'] . '"',
                'idExpediteur' => $idTechnicien,
                'nomExpediteur' => $nomTechnicien,
                'prenomExpediteur' => $prenomTechnicien,
            ]);
        }

        // Notifier les directeurs qu'un ticket vient d'être pris en charge, et
        // par qui (les comptes directeur sont des lignes de la table
        // techniciens, role = 'directeur') — best-effort, ne doit jamais faire
        // échouer l'assignation elle-même.
        try {
            $requeteDirecteurs = $bdd->prepare("SELECT idTechnicien AS idDirecteur FROM techniciens WHERE role = 'directeur'");
            $requeteDirecteurs->execute();
            $directeurs = $requeteDirecteurs->fetchAll(PDO::FETCH_ASSOC);

            foreach ($directeurs as $directeur) {
                if ((int)$directeur['idDirecteur'] === $idTechnicienAssigne) {
                    continue; // pas de notification à soi-même si un directeur s'est (auto-)assigné
                }
                creerNotification($bdd, [
                    'type' => NOTIF_TICKET_PRIS_EN_CHARGE,
                    'idTicket' => $idTicket,
                    'destinataireTechnicien' => $directeur['idDirecteur'],
                    'titre' => 'Ticket pris en charge',
                    'message' => $prenomAssigne . ' ' . $nomAssigne . ' a pris en charge le ticket "' . $ticket['titre'] . '"',
                    'idExpediteur' => $idTechnicienAssigne,
                    'nomExpediteur' => $nomAssigne,
                    'prenomExpediteur' => $prenomAssigne,
                ]);
            }
        } catch (\Throwable $e) {
            error_log('Notification directeurs (ticket assigné) ignorée : ' . $e->getMessage());
        }

        // Confirmer la transaction
        $bdd->commit();

        echo json_encode(['succes' => true, 'message' => 'Ticket assigné et notification créée']);
    } else {
        // rowCount() peut être à 0 alors que la requête a bien "réussi" si le
        // ticket était déjà assigné exactement à cette même personne (UPDATE
        // ne compte pas les lignes dont la valeur ne change pas) — dans ce
        // cas précis ce n'est pas une erreur.
        $reqVerif = $bdd->prepare("SELECT idTechnicien FROM ticket WHERE idTicket = :idTicket");
        $reqVerif->execute([':idTicket' => $idTicket]);
        $idTechnicienActuel = $reqVerif->fetchColumn();
        if ((int)$idTechnicienActuel === $idTechnicienAssigne) {
            $bdd->commit();
            echo json_encode(['succes' => true, 'message' => 'Ticket déjà assigné à cette personne.']);
        } else {
            $bdd->rollback();
            echo json_encode(['succes' => false, 'erreur' => "Erreur lors de l'assignation."]);
        }
    }
} catch (Exception $e) {
    $bdd->rollback();
    echo json_encode(['succes' => false, 'erreur' => 'Erreur.']);
}
