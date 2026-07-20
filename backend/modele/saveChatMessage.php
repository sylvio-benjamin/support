<?php
require '../config/cors.php';
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');
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

try {
    require_once __DIR__ . '/../connexionBDD.php';
    $bdd->beginTransaction();
    
    $donnees = json_decode(file_get_contents('php://input'), true);
    error_log('DEBUG saveChatMessage: ' . print_r($donnees, true));
    
    $idTicket = $donnees['idTicket'] ?? 0;
    $idExpediteur = $donnees['idExpediteur'] ?? 0;
    $message = isset($donnees['message']) ? $donnees['message'] : '';
    if ($message === null) $message = '';
    $fichierJoint = $donnees['fichierJoint'] ?? null;
    $fichiersJoints = $donnees['fichiersJoints'] ?? [];

    error_log("DEBUG saveChatMessage - Paramètres: idTicket=$idTicket, idExpediteur=$idExpediteur, message=$message");
    error_log("DEBUG saveChatMessage - fichierJoint: " . ($fichierJoint ?? 'NULL'));
    error_log("DEBUG saveChatMessage - fichiersJoints: " . print_r($fichiersJoints, true));

    if (!$idTicket || !$idExpediteur || (!$message && !$fichierJoint && empty($fichiersJoints))) {
        error_log('Paramètres manquants !');
        echo json_encode([
            'succes' => false,
            'erreur' => 'Paramètres manquants',
            'debug' => [
                'idTicket' => $idTicket,
                'idExpediteur' => $idExpediteur,
                'message' => $message,
                'fichierJoint' => $fichierJoint
            ]
        ]);
        exit;
    }

    // Vérifier si les colonnes existent
    $checkColumn = $bdd->query("SHOW COLUMNS FROM conversation LIKE 'fichierJoint'");
    $columnExists = $checkColumn->fetch() !== false;
    
    $checkNomExp = $bdd->query("SHOW COLUMNS FROM conversation LIKE 'nomExpediteur'");
    $nomExpExists = $checkNomExp->fetch() !== false;
    
    // Récupérer les informations de l'expéditeur
    $nomExpediteur = '';
    $prenomExpediteur = '';
    
    if ($nomExpExists) {
        // Chercher d'abord dans techniciens (inclut directeur)
        $reqTech = $bdd->prepare("SELECT prenomTechnicien AS prenom, nomTechnicien AS nom FROM techniciens WHERE idTechnicien = ?");
        $reqTech->execute([$idExpediteur]);
        $tech = $reqTech->fetch(PDO::FETCH_ASSOC);
        
        if ($tech && $tech['nom']) {
            $nomExpediteur = $tech['nom'];
            $prenomExpediteur = $tech['prenom'];
            error_log("DEBUG saveChatMessage: Technicien trouvé - {$tech['prenom']} {$tech['nom']}");
        } else {
            // Sinon chercher dans utilisateur
            $reqUser = $bdd->prepare("SELECT prenomUtilisateur AS prenom, nomUtilisateur AS nom FROM utilisateur WHERE idUtilisateur = ?");
            $reqUser->execute([$idExpediteur]);
            $user = $reqUser->fetch(PDO::FETCH_ASSOC);
            
            if ($user && $user['nom']) {
                $nomExpediteur = $user['nom'];
                $prenomExpediteur = $user['prenom'];
                error_log("DEBUG saveChatMessage: Utilisateur trouvé - {$user['prenom']} {$user['nom']}");
            } else {
                $nomExpediteur = 'Utilisateur inconnu';
                $prenomExpediteur = '';
                error_log("Aucun expéditeur trouvé pour idExpediteur = $idExpediteur");
            }
        }
    }

    // Sauvegarder le message dans la table conversation avec les informations de l'expéditeur
    if ($columnExists) {
        $requeteSauvegarder = "
            INSERT INTO conversation (idTicket, idExpediteur, message, fichierJoint, nomExpediteur, prenomExpediteur)
            VALUES (?, ?, ?, ?, ?, ?)
        ";
        $params = [$idTicket, $idExpediteur, $message, $fichierJoint, $nomExpediteur, $prenomExpediteur];
    } else {
        $requeteSauvegarder = "
            INSERT INTO conversation (idTicket, idExpediteur, message, nomExpediteur, prenomExpediteur)
            VALUES (?, ?, ?, ?, ?)
        ";
        $params = [$idTicket, $idExpediteur, $message, $nomExpediteur, $prenomExpediteur];
    }

    $preparationSauvegarder = $bdd->prepare($requeteSauvegarder);
    $result = $preparationSauvegarder->execute($params);
    error_log('Message sauvegardé: ' . ($result ? 'SUCCESS' : 'FAILED'));

    if (!$result) {
        error_log('Erreur SQL message: ' . print_r($preparationSauvegarder->errorInfo(), true));
        throw new Exception('Erreur lors de la sauvegarde du message');
    }

    $idMessage = $bdd->lastInsertId();

    // Sauvegarder les fichiers joints dans la nouvelle table conversation_fichiers
    if (!empty($fichiersJoints)) {
        $requeteFichiers = "INSERT INTO conversation_fichiers (idMessage, cheminFichier) VALUES (?, ?)";
        $preparationFichiers = $bdd->prepare($requeteFichiers);
        foreach ($fichiersJoints as $chemin) {
            $preparationFichiers->execute([$idMessage, $chemin]);
        }
        error_log('Fichiers joints sauvegardés dans conversation_fichiers.');
    }

    // Récupérer les informations du ticket et de l'expéditeur
    $requeteTicket = "
        SELECT 
            t.idUtilisateur,
            t.idTechnicien,
            t.titre,
            u.nomUtilisateur,
            u.prenomUtilisateur,
            tech.nomTechnicien,
            tech.prenomTechnicien
        FROM ticket t
        LEFT JOIN utilisateur u ON t.idUtilisateur = u.idUtilisateur
        LEFT JOIN techniciens tech ON t.idTechnicien = tech.idTechnicien
        WHERE t.idTicket = ?
    ";

    $preparationTicket = $bdd->prepare($requeteTicket);
    $preparationTicket->execute([$idTicket]);
    $infoTicket = $preparationTicket->fetch(PDO::FETCH_ASSOC);
    error_log('Info ticket: ' . print_r($infoTicket, true));

    if (!$infoTicket) {
        $bdd->rollback();
        error_log('Ticket non trouvé !');
        echo json_encode([
            'succes' => false,
            'erreur' => 'Ticket non trouvé',
            'debug' => ['idTicket' => $idTicket]
        ]);
        exit;
    }

    // Déterminer qui doit recevoir la notification
    $idDestinataire = null;

    error_log("idExpediteur=$idExpediteur, idUtilisateur={$infoTicket['idUtilisateur']}, idTechnicien={$infoTicket['idTechnicien']}");

    // Vérifier si l'expéditeur est l'utilisateur ou le technicien
    if ($idExpediteur == $infoTicket['idUtilisateur']) {
        // L'expéditeur est l'utilisateur, le destinataire est le technicien (s'il y en a un d'assigné)
        if ($infoTicket['idTechnicien']) {
            $idDestinataire = $infoTicket['idTechnicien'];
            error_log("Cas 1: Utilisateur -> Technicien. Destinataire: $idDestinataire");
        } else {
            error_log("AUCUN TECHNICIEN ASSIGNÉ au ticket $idTicket - Pas de notification créée");
        }
    } else if ($idExpediteur == $infoTicket['idTechnicien']) {
        // L'expéditeur est le technicien, le destinataire est l'utilisateur
        $idDestinataire = $infoTicket['idUtilisateur'];
        error_log("Cas 2: Technicien -> Utilisateur. Destinataire: $idDestinataire");
    } else {
        error_log("ERREUR: Expéditeur ne correspond ni à l'utilisateur ni au technicien du ticket !");
    }

    // Créer la notification si on a un destinataire
    if ($idDestinataire) {
        // Vérifier si le destinataire est actuellement actif sur ce ticket
        $destinataireActif = false;
        try {
            // D'abord nettoyer les anciennes entrées (plus de 1 minute)
            $cleanupQuery = "DELETE FROM user_activity_tracker WHERE lastActivity < DATE_SUB(NOW(), INTERVAL 1 MINUTE)";
            $bdd->exec($cleanupQuery);
            
            // Puis vérifier l'activité récente (10 secondes)
            $requeteActivite = "SELECT COUNT(*) as count FROM user_activity_tracker 
                               WHERE idUtilisateur = ? AND idTicket = ? 
                               AND lastActivity > DATE_SUB(NOW(), INTERVAL 10 SECOND)";
            $stmtActivite = $bdd->prepare($requeteActivite);
            $stmtActivite->execute([$idDestinataire, $idTicket]);
            $activite = $stmtActivite->fetch(PDO::FETCH_ASSOC);
            $destinataireActif = $activite['count'] > 0;
            error_log("Destinataire actif: " . ($destinataireActif ? 'OUI' : 'NON'));
        } catch (Exception $e) {
            error_log("Erreur vérification activité: " . $e->getMessage());
            $destinataireActif = false;
        }
        
        // Déterminer le nom/prénom pour la notification
        $nomExpediteurNotif = '';
        $prenomExpediteurNotif = '';
        
        if ($nomExpExists && $nomExpediteur && $nomExpediteur !== 'Utilisateur inconnu') {
            $nomExpediteurNotif = $nomExpediteur;
            $prenomExpediteurNotif = $prenomExpediteur;
        } else {
            // Fallback vers l'ancienne logique
            $reqTech = $bdd->prepare("SELECT prenomTechnicien AS prenom, nomTechnicien AS nom FROM techniciens WHERE idTechnicien = ?");
            $reqTech->execute([$idExpediteur]);
            $tech = $reqTech->fetch(PDO::FETCH_ASSOC);
            
            if ($tech && $tech['nom']) {
                $nomExpediteurNotif = $tech['nom'];
                $prenomExpediteurNotif = $tech['prenom'];
            } else {
                $reqUser = $bdd->prepare("SELECT prenomUtilisateur AS prenom, nomUtilisateur AS nom FROM utilisateur WHERE idUtilisateur = ?");
                $reqUser->execute([$idExpediteur]);
                $user = $reqUser->fetch(PDO::FETCH_ASSOC);
                
                if ($user && $user['nom']) {
                    $nomExpediteurNotif = $user['nom'];
                    $prenomExpediteurNotif = $user['prenom'];
                } else {
                    $nomExpediteurNotif = 'Utilisateur inconnu';
                    $prenomExpediteurNotif = '';
                }
            }
        }

        // Créer la notification seulement si le destinataire n'est pas actif
        if (!$destinataireActif) {
            $messageNotif = '';
            if ($fichierJoint) {
                $messageNotif = "{$prenomExpediteurNotif} {$nomExpediteurNotif} a envoyé un fichier";
            } else {
                $messageNotif = "{$prenomExpediteurNotif} {$nomExpediteurNotif}: " . substr($message, 0, 100);
                if (strlen($message) > 100) $messageNotif .= "...";
            }

            $requeteNotification = "
                INSERT INTO notifications (idUtilisateur, idTicket, message, type, dateCreation, lu)
                VALUES (?, ?, ?, 'message', NOW(), 0)
            ";
            $preparationNotification = $bdd->prepare($requeteNotification);
            $resultNotif = $preparationNotification->execute([$idDestinataire, $idTicket, $messageNotif]);
            error_log('Notification créée: ' . ($resultNotif ? 'SUCCESS' : 'FAILED'));
        } else {
            error_log("Destinataire actif - pas de notification créée");
        }
    }

    // Confirmer la transaction
    $bdd->commit();
    error_log('Transaction confirmée');

    // Après insertion, renvoyer le message inséré avec les fichiers joints
    if ($result) {
        error_log('DEBUG lastInsertId: ' . $idMessage);
        
        // Récupérer le message complet avec les fichiers joints
        $stmt = $bdd->prepare("SELECT c.*, GROUP_CONCAT(cf.cheminFichier) as fichiersJoints_list FROM conversation c LEFT JOIN conversation_fichiers cf ON c.idMessage = cf.idMessage WHERE c.idMessage = ? GROUP BY c.idMessage");
        $stmt->execute([$idMessage]);
        $msgData = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($msgData && $msgData['fichiersJoints_list']) {
            $msgData['fichiersJoints'] = explode(',', $msgData['fichiersJoints_list']);
        } else {
            $msgData['fichiersJoints'] = [];
        }
        unset($msgData['fichiersJoints_list']); // Nettoyer le champ temporaire
        
        echo json_encode(['succes' => true, 'message' => 'Message sauvegardé avec succès', 'messageData' => $msgData]);
        exit;
    }

} catch (Exception $e) {
    if (isset($bdd)) {
        $bdd->rollback();
    }
    error_log('Erreur saveChatMessage: ' . $e->getMessage());
    echo json_encode([
        'succes' => false,
        'erreur' => 'Erreur serveur.'
    ]);
}
?> 
