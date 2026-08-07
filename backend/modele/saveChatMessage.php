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
    require_once __DIR__ . '/../config/notifications.php';
    require_once __DIR__ . '/emailNotificationHelper.php';
    $bdd->beginTransaction();
    
    $donnees = json_decode(file_get_contents('php://input'), true);
    error_log('DEBUG saveChatMessage: ' . print_r($donnees, true));
    
    $idTicket = $donnees['idTicket'] ?? 0;
    $message = isset($donnees['message']) ? $donnees['message'] : '';
    if ($message === null) $message = '';
    $fichierJoint = $donnees['fichierJoint'] ?? null;
    $fichiersJoints = $donnees['fichiersJoints'] ?? [];

    // idExpediteur est dérivé de la SESSION, jamais du corps envoyé par le
    // client : sinon n'importe quel compte authentifié pouvait usurper
    // l'identité de n'importe qui d'autre dans un message de chat (et, faute
    // de vérification d'accès au ticket ci-dessous, l'injecter dans N'IMPORTE
    // QUEL ticket de N'IMPORTE QUELLE entreprise).
    $sessionUser = $_SESSION['user'];
    $role = $sessionUser['role'] ?? '';
    $idExpediteur = isset($sessionUser['idTechnicien']) ? $sessionUser['idTechnicien'] : ($sessionUser['idUtilisateur'] ?? 0);

    error_log("DEBUG saveChatMessage - Paramètres: idTicket=$idTicket, idExpediteur=$idExpediteur, message=$message");
    error_log("DEBUG saveChatMessage - fichierJoint: " . ($fichierJoint ?? 'NULL'));
    error_log("DEBUG saveChatMessage - fichiersJoints: " . print_r($fichiersJoints, true));

    if (!$idTicket || !$idExpediteur || (!$message && !$fichierJoint && empty($fichiersJoints))) {
        error_log('Paramètres manquants !');
        echo json_encode([
            'succes' => false,
            'erreur' => 'Paramètres manquants',
        ]);
        exit;
    }

    // Récupérer les infos du ticket AVANT toute écriture, pour vérifier l'accès.
    $requeteTicketAcces = "
        SELECT t.idUtilisateur, t.idTechnicien, t.titre,
               u.nomUtilisateur, u.prenomUtilisateur, u.idEntreprise AS idEntrepriseTicket,
               tech.nomTechnicien, tech.prenomTechnicien
        FROM ticket t
        LEFT JOIN utilisateur u ON t.idUtilisateur = u.idUtilisateur
        LEFT JOIN techniciens tech ON t.idTechnicien = tech.idTechnicien
        WHERE t.idTicket = ?
    ";
    $preparationTicketAcces = $bdd->prepare($requeteTicketAcces);
    $preparationTicketAcces->execute([$idTicket]);
    $infoTicket = $preparationTicketAcces->fetch(PDO::FETCH_ASSOC);

    if (!$infoTicket) {
        $bdd->rollback();
        error_log('Ticket non trouvé !');
        echo json_encode(['succes' => false, 'erreur' => 'Ticket non trouvé']);
        exit;
    }

    // Même logique d'autorisation que getChatMessages.php : un directeur
    // INTERNE (plateforme) voit tout ; un admin référent / directeur "client"
    // est scopé à sa propre entreprise ; un technicien doit être assigné (ou
    // être un technicien général) ; un employé doit être le propriétaire du
    // ticket.
    $accesAutorise = false;
    if (estDirecteurPlateforme()) {
        $accesAutorise = true;
    } else if ($role === 'admin' || $role === 'directeur') {
        $idEntrepriseAppelant = $sessionUser['idEntreprise'] ?? null;
        if ($idEntrepriseAppelant !== null && $infoTicket['idEntrepriseTicket'] !== null
            && (int)$infoTicket['idEntrepriseTicket'] === (int)$idEntrepriseAppelant) {
            $accesAutorise = true;
        }
    } else if ($role === 'technicien') {
        if ($infoTicket['idTechnicien'] == $idExpediteur) {
            $accesAutorise = true;
        } else {
            $reqTechGeneral = $bdd->prepare("SELECT idTechnicien FROM techniciens WHERE idTechnicien = ? AND (role = 'technicien' OR role IS NULL)");
            $reqTechGeneral->execute([$idExpediteur]);
            if ($reqTechGeneral->fetch()) {
                $accesAutorise = true;
            }
        }
    } else if ($infoTicket['idUtilisateur'] == $idExpediteur) {
        $accesAutorise = true;
    } else {
        // Membre ajouté au ticket (cf. membresTicket.php).
        $reqMembre = $bdd->prepare("SELECT COUNT(*) FROM ticketMembres WHERE idTicket = ? AND idUtilisateur = ?");
        $reqMembre->execute([$idTicket, $idExpediteur]);
        if ($reqMembre->fetchColumn() > 0) {
            $accesAutorise = true;
        }
    }

    if (!$accesAutorise) {
        $bdd->rollback();
        http_response_code(403);
        echo json_encode(['succes' => false, 'erreur' => 'Accès non autorisé']);
        exit;
    }

    // Vérifier si les colonnes existent
    $checkColumn = $bdd->query("SHOW COLUMNS FROM conversation LIKE 'fichierJoint'");
    $columnExists = $checkColumn->fetch() !== false;

    $checkNomExp = $bdd->query("SHOW COLUMNS FROM conversation LIKE 'nomExpediteur'");
    $nomExpExists = $checkNomExp->fetch() !== false;

    $checkTypeExp = $bdd->query("SHOW COLUMNS FROM conversation LIKE 'typeExpediteur'");
    $typeExpExists = $checkTypeExp->fetch() !== false;

    // Le TYPE de l'expéditeur (utilisateur vs technicien) est connu avec
    // CERTITUDE depuis la session (présence de idTechnicien) : on ne doit
    // jamais le deviner via une recherche "d'abord techniciens, puis
    // utilisateur", sinon un id qui existe dans LES DEUX tables (ex:
    // idTechnicien=5 ET idUtilisateur=5, deux personnes différentes) fait
    // enregistrer/afficher le mauvais nom — d'où des messages qui semblent
    // "réassignés" au mauvais interlocuteur.
    $typeExpediteur = isset($sessionUser['idTechnicien']) ? 'technicien' : 'utilisateur';

    // Récupérer les informations de l'expéditeur
    $nomExpediteur = '';
    $prenomExpediteur = '';

    if ($nomExpExists) {
        if ($typeExpediteur === 'technicien') {
            $reqExp = $bdd->prepare("SELECT prenomTechnicien AS prenom, nomTechnicien AS nom FROM techniciens WHERE idTechnicien = ?");
        } else {
            $reqExp = $bdd->prepare("SELECT prenomUtilisateur AS prenom, nomUtilisateur AS nom FROM utilisateur WHERE idUtilisateur = ?");
        }
        $reqExp->execute([$idExpediteur]);
        $expediteurInfo = $reqExp->fetch(PDO::FETCH_ASSOC);

        if ($expediteurInfo && $expediteurInfo['nom']) {
            $nomExpediteur = $expediteurInfo['nom'];
            $prenomExpediteur = $expediteurInfo['prenom'];
            error_log("DEBUG saveChatMessage: Expéditeur trouvé ($typeExpediteur) - {$prenomExpediteur} {$nomExpediteur}");
        } else {
            $nomExpediteur = 'Utilisateur inconnu';
            $prenomExpediteur = '';
            error_log("Aucun expéditeur trouvé pour idExpediteur = $idExpediteur ($typeExpediteur)");
        }
    }

    // Sauvegarder le message dans la table conversation avec les informations
    // de l'expéditeur. Colonnes construites dynamiquement : fichierJoint,
    // nomExpediteur/prenomExpediteur et typeExpediteur peuvent ne pas encore
    // exister selon l'état de la migration sur cet environnement.
    $colonnes = ['idTicket', 'idExpediteur', 'message'];
    $placeholders = ['?', '?', '?'];
    $params = [$idTicket, $idExpediteur, $message];

    if ($columnExists) {
        $colonnes[] = 'fichierJoint';
        $placeholders[] = '?';
        $params[] = $fichierJoint;
    }
    if ($nomExpExists) {
        $colonnes[] = 'nomExpediteur';
        $colonnes[] = 'prenomExpediteur';
        $placeholders[] = '?';
        $placeholders[] = '?';
        $params[] = $nomExpediteur;
        $params[] = $prenomExpediteur;
    }
    if ($typeExpExists) {
        $colonnes[] = 'typeExpediteur';
        $placeholders[] = '?';
        $params[] = $typeExpediteur;
    }

    $requeteSauvegarder = "INSERT INTO conversation (" . implode(', ', $colonnes) . ") VALUES (" . implode(', ', $placeholders) . ")";

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

    // $infoTicket a déjà été récupéré plus haut (pour la vérification d'accès) ;
    // pas besoin de le relire.

    // Déterminer qui doit recevoir la notification. On garde une trace de la
    // NATURE du destinataire (employé vs compte interne) pour insérer dans la
    // bonne colonne — auparavant tout partait dans idUtilisateur même quand
    // le destinataire était un technicien, donc ces notifications
    // n'apparaissaient jamais dans son flux (getNotifications.php filtre les
    // techniciens sur idTechnicien, pas idUtilisateur).
    $idDestinataire = null;
    $destinataireEstTechnicien = false;

    error_log("idExpediteur=$idExpediteur, idUtilisateur={$infoTicket['idUtilisateur']}, idTechnicien={$infoTicket['idTechnicien']}");

    // Vérifier si l'expéditeur est l'utilisateur ou le technicien
    if ($idExpediteur == $infoTicket['idUtilisateur']) {
        // L'expéditeur est l'utilisateur, le destinataire est le technicien (s'il y en a un d'assigné)
        if ($infoTicket['idTechnicien']) {
            $idDestinataire = $infoTicket['idTechnicien'];
            $destinataireEstTechnicien = true;
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

            $resultNotif = creerNotification($bdd, [
                'type' => NOTIF_NOUVEAU_MESSAGE,
                'idTicket' => $idTicket,
                'message' => $messageNotif,
                'destinataireTechnicien' => $destinataireEstTechnicien ? $idDestinataire : null,
                'destinataireUtilisateur' => $destinataireEstTechnicien ? null : $idDestinataire,
                'idExpediteur' => $idExpediteur,
                'nomExpediteur' => $nomExpediteurNotif,
                'prenomExpediteur' => $prenomExpediteurNotif,
            ]);
            error_log('Notification créée: ' . ($resultNotif ? 'SUCCESS' : 'FAILED'));
        } else {
            error_log("Destinataire actif - pas de notification créée");
        }
    }

    // Confirmer la transaction
    $bdd->commit();
    error_log('Transaction confirmée');

    // Notifications par email à TOUTES les personnes ayant accès au chat de
    // ce ticket (créateur, technicien assigné, techniciens en partage,
    // membres ajoutés), sauf l'expéditeur lui-même — best-effort après le
    // commit, ne doit jamais faire échouer l'enregistrement du message.
    try {
        $participants = recupererParticipantsChat($bdd, (int)$idTicket);
        $nomExpediteurAffiche = trim("{$prenomExpediteur} {$nomExpediteur}");
        if ($nomExpediteurAffiche === '') {
            $nomExpediteurAffiche = 'Un participant';
        }
        $extraitMessage = ($fichierJoint || !empty($fichiersJoints))
            ? 'a envoyé un fichier.'
            : (mb_strlen($message) > 200 ? mb_substr($message, 0, 200) . '…' : $message);

        foreach ($participants as $participant) {
            if ($participant['type'] === $typeExpediteur && (int)$participant['id'] === (int)$idExpediteur) {
                continue; // pas de notification à soi-même
            }
            if (empty($participant['email'])) {
                continue;
            }
            $introHtml = '<p>Bonjour ' . htmlspecialchars($participant['prenom'] ?? '', ENT_QUOTES) . ',</p>'
                . '<p><strong>' . htmlspecialchars($nomExpediteurAffiche, ENT_QUOTES) . '</strong> a envoyé un nouveau message sur le ticket "' . htmlspecialchars($infoTicket['titre'] ?? '', ENT_QUOTES) . '" :</p>';
            $detailHtml = '<div style="background: #f1f5f9; border-radius: 8px; padding: 14px 18px; margin: 12px 0; font-style: italic; color: #334155;">'
                . nl2br(htmlspecialchars($extraitMessage, ENT_QUOTES)) . '</div>';
            envoyerEmailEvenementTicket(
                $bdd,
                $participant,
                (int)$idTicket,
                'Nouveau message — Ticket #' . $idTicket,
                $introHtml,
                $detailHtml
            );
        }
    } catch (\Throwable $e) {
        error_log('saveChatMessage.php: notifications email ignorées : ' . $e->getMessage());
    }

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
