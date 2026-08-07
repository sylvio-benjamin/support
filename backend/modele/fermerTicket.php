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
require_once 'ticketArchive.php';
require_once 'parametresHelper.php';
require_once __DIR__ . '/../config/notifications.php';
$rolesAutorises = [ 'technicien', 'directeur'];
$donnees = json_decode(file_get_contents('php://input'), true);
$reponse = $donnees['reponse'] ?? null;
$idTicket = $donnees['idTicket'] ?? null;
$rapport = $donnees['rapport'] ?? null;

if (
    !isset($_SESSION['user']) ||
    !isset($_SESSION['user']['role']) ||
    !in_array($_SESSION['user']['role'], $rolesAutorises) ||
    (!isset($_SESSION['user']['idTechnicien']) && !isset($_SESSION['user']['idDirecteur']))
) {
    http_response_code(401);
    echo json_encode(['succes' => false, 'erreur' => 'Non connecté ou non autorisé']);
    exit;
}

if ($idTicket && $reponse) {
    $idUtilisateur = $_SESSION['user']['idTechnicien'] ?? $_SESSION['user']['idDirecteur'];
    $resultat = fermerTicket($bdd, $reponse, $idTicket, $idUtilisateur, $rapport, $_SESSION['user']['role'] === 'directeur');
    if ($resultat) {
        // Archiver immédiatement le ticket fermé/résolu
        $resultatArchive = migrerTicketsResoluOuFerme($bdd);
        if ($resultatArchive['success']) {
            echo json_encode(['succes' => true, 'message' => 'Ticket fermé et archivé avec succès']);
        } else {
            http_response_code(400);
            echo json_encode(['succes' => false, 'erreur' => 'Ticket fermé mais erreur lors de l\'archivage: ' . $resultatArchive['message']]);
        }
    } else {
        http_response_code(400);
        echo json_encode(['succes' => false, 'erreur' => 'Échec de la fermeture du ticket']);
    }
} else {
    http_response_code(400);
    echo json_encode(['succes' => false, 'erreur' => 'Données manquantes']);
    exit;
}

function fermerTicket($bdd, $reponse, $idTicket, $idUtilisateur, $rapport = null, $isDirecteur = false) {
    // Récupérer les informations du ticket avant de le fermer
    $requeteTicket = $bdd->prepare("
        SELECT t.*, u.nomUtilisateur, u.prenomUtilisateur, tech.nomTechnicien, tech.prenomTechnicien 
        FROM ticket t 
        LEFT JOIN utilisateur u ON t.idUtilisateur = u.idUtilisateur 
        LEFT JOIN techniciens tech ON t.idTechnicien = tech.idTechnicien 
        WHERE t.idTicket = ?
    ");
    $requeteTicket->execute([$idTicket]);
    $infoTicket = $requeteTicket->fetch(PDO::FETCH_ASSOC);
    
    // Mettre à jour le ticket pour le fermer
    if ($isDirecteur) {
        // Le directeur peut fermer n'importe quel ticket
        $requete = $bdd->prepare("UPDATE ticket SET statut = :reponse, dateTicketCloture = CURRENT_TIMESTAMP, rapport = :rapport WHERE idTicket = :idTicket");
        $requete->execute([
            ':idTicket' => $idTicket, 
            ':reponse' => $reponse,
            ':rapport' => $rapport
        ]);
    } else {
        // Le technicien ne peut fermer que ses propres tickets
        $requete = $bdd->prepare("UPDATE ticket SET statut = :reponse, dateTicketCloture = CURRENT_TIMESTAMP, rapport = :rapport WHERE idTicket = :idTicket AND idTechnicien = :idTechnicien");
        $requete->execute([
            ':idTicket' => $idTicket, 
            ':idTechnicien' => $idUtilisateur, 
            ':reponse' => $reponse,
            ':rapport' => $rapport
        ]);
    }
    
    if ($requete->rowCount() === 0) {
       return false;
    }
    
    // Créer une notification pour les directeurs si le ticket était urgent
    // (best-effort : ne doit jamais faire échouer la fermeture du ticket elle-même)
    $parametresPlateforme = obtenirParametresPlateforme($bdd);
    if (!empty($parametresPlateforme['notifTicketUrgent']) && $infoTicket && $infoTicket['priorite'] === 'urgente') {
        try {
            // Les comptes directeur sont des lignes de la table techniciens (role = 'directeur')
            $requeteDirecteurs = $bdd->prepare("SELECT idTechnicien AS idDirecteur, nomTechnicien AS nomDirecteur, prenomTechnicien AS prenomDirecteur FROM techniciens WHERE role = 'directeur'");
            $requeteDirecteurs->execute();
            $directeurs = $requeteDirecteurs->fetchAll(PDO::FETCH_ASSOC);

            // Récupérer les infos de celui qui a fermé le ticket
            $nomFermeur = '';
            $prenomFermeur = '';
            if ($isDirecteur) {
                $requeteDirecteur = $bdd->prepare("SELECT nomTechnicien AS nomDirecteur, prenomTechnicien AS prenomDirecteur FROM techniciens WHERE idTechnicien = ?");
                $requeteDirecteur->execute([$idUtilisateur]);
                $directeur = $requeteDirecteur->fetch(PDO::FETCH_ASSOC);
                $nomFermeur = $directeur ? $directeur['nomDirecteur'] : 'Directeur';
                $prenomFermeur = $directeur ? $directeur['prenomDirecteur'] : '';
            } else {
                $requeteTechnicien = $bdd->prepare("SELECT nomTechnicien, prenomTechnicien FROM techniciens WHERE idTechnicien = ?");
                $requeteTechnicien->execute([$idUtilisateur]);
                $technicien = $requeteTechnicien->fetch(PDO::FETCH_ASSOC);
                $nomFermeur = $technicien ? $technicien['nomTechnicien'] : 'Technicien';
                $prenomFermeur = $technicien ? $technicien['prenomTechnicien'] : '';
            }

            // Créer une notification pour chaque directeur (sauf celui qui a fermé le ticket)
            $titreNotification = "Ticket urgent fermé - " . $infoTicket['titre'];
            $messageNotification = "Ticket urgent fermé par " . $prenomFermeur . " " . $nomFermeur . " avec le statut : " . $reponse;
            foreach ($directeurs as $directeur) {
                if ($directeur['idDirecteur'] != $idUtilisateur) {
                    creerNotification($bdd, [
                        'type' => NOTIF_TICKET_FERME_URGENT,
                        'idTicket' => $idTicket,
                        'destinataireTechnicien' => $directeur['idDirecteur'],
                        'titre' => $titreNotification,
                        'message' => $messageNotification,
                        'idExpediteur' => $idUtilisateur,
                        'nomExpediteur' => $nomFermeur,
                        'prenomExpediteur' => $prenomFermeur,
                    ]);
                }
            }
        } catch (\Throwable $e) {
            error_log('Notification directeurs (ticket urgent fermé) ignorée : ' . $e->getMessage());
        }
    }

    // Notifier l'employé propriétaire du ticket que celui-ci est résolu/fermé
    if (!empty($parametresPlateforme['notifResolution']) && $infoTicket && !empty($infoTicket['idUtilisateur'])) {
        try {
            $nomFermeur = trim(($infoTicket['prenomTechnicien'] ?? '') . ' ' . ($infoTicket['nomTechnicien'] ?? ''));
            $libelleStatut = $reponse === 'resolu' ? 'résolu' : 'fermé';
            creerNotification($bdd, [
                'type' => $reponse === 'resolu' ? NOTIF_TICKET_RESOLU : NOTIF_TICKET_FERME,
                'idTicket' => $idTicket,
                'destinataireUtilisateur' => $infoTicket['idUtilisateur'],
                'titre' => 'Ticket ' . $libelleStatut . ' : ' . $infoTicket['titre'],
                'message' => 'Votre ticket "' . $infoTicket['titre'] . '" a été ' . $libelleStatut . ($nomFermeur !== '' ? ' par ' . $nomFermeur : '') . '.',
                'idExpediteur' => $idUtilisateur,
                'nomExpediteur' => $infoTicket['nomTechnicien'] ?? null,
                'prenomExpediteur' => $infoTicket['prenomTechnicien'] ?? null,
            ]);
        } catch (\Throwable $e) {
            error_log('Notification résolution ticket (employé) ignorée : ' . $e->getMessage());
        }
    }

    return true;
}
// Pas de tag PHP de fermeture ici !