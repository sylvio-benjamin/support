<?php
require '../config/cors.php';
header('Access-Control-Allow-Methods: GET, OPTIONS');
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
    
    $idTicket = $_GET['idTicket'] ?? 0;
    error_log('DEBUG getChatMessages: idTicket=' . $idTicket);
    
if (!$idTicket) {
        echo json_encode(['erreur' => 'ID ticket manquant']);
    exit;
}

    // Vérifier les permissions
    $user = $_SESSION['user'];
    $idUtilisateur = $user['idUtilisateur'] ?? $user['id'] ?? 0;
    $idTechnicien = $user['idTechnicien'] ?? 0;
    $role = $user['role'] ?? '';
    
    error_log("DEBUG getChatMessages: Utilisateur $idUtilisateur, Technicien $idTechnicien, rôle $role");
    
    // Vérifier si l'utilisateur a accès à ce ticket
    $requeteAcces = "
        SELECT 
            t.idTicket,
            t.idUtilisateur,
            t.idTechnicien,
            u.nomUtilisateur,
            u.prenomUtilisateur,
            tech.nomTechnicien,
            tech.prenomTechnicien
                     FROM ticket t 
                     LEFT JOIN utilisateur u ON t.idUtilisateur = u.idUtilisateur 
                     LEFT JOIN techniciens tech ON t.idTechnicien = tech.idTechnicien 
        WHERE t.idTicket = ?
    ";
    
    $preparationAcces = $bdd->prepare($requeteAcces);
    $preparationAcces->execute([$idTicket]);
    $infoTicket = $preparationAcces->fetch(PDO::FETCH_ASSOC);
    
    if (!$infoTicket) {
    error_log('DEBUG getChatMessages: Ticket non trouvé');
        echo json_encode(['erreur' => 'Ticket non trouvé']);
    exit;
}

    // Vérifier les permissions selon le rôle
    $accesAutorise = false;
    
    if ($role === 'admin' || $role === 'directeur') {
        // Admin et directeur ont accès à tous les tickets
        $accesAutorise = true;
        error_log('DEBUG getChatMessages: Accès autorisé (admin/directeur)');
    } else if ($role === 'technicien') {
        // Technicien : accès si assigné au ticket OU si c'est un technicien général
        if ($infoTicket['idTechnicien'] == $idTechnicien) {
            $accesAutorise = true;
            error_log('DEBUG getChatMessages: Accès autorisé (technicien assigné)');
        } else {
            // Vérifier si c'est un technicien général (sans assignation spécifique)
            $reqTechGeneral = $bdd->prepare("SELECT idTechnicien FROM techniciens WHERE idTechnicien = ? AND (role = 'technicien' OR role IS NULL)");
            $reqTechGeneral->execute([$idTechnicien]);
            if ($reqTechGeneral->fetch()) {
                $accesAutorise = true;
                error_log('DEBUG getChatMessages: Accès autorisé (technicien général)');
            }
        }
    } else {
        // Utilisateur normal (employé) : accès seulement à ses propres tickets
        if ($infoTicket['idUtilisateur'] == $idUtilisateur) {
            $accesAutorise = true;
            error_log('DEBUG getChatMessages: Accès autorisé (utilisateur propriétaire)');
        } else {
            error_log("DEBUG getChatMessages: Accès refusé - Ticket appartient à {$infoTicket['idUtilisateur']}, utilisateur connecté: $idUtilisateur");
        }
    }
    
    if (!$accesAutorise) {
        error_log('DEBUG getChatMessages: Accès refusé');
        echo json_encode(['erreur' => 'Accès non autorisé']);
        exit;
}

error_log('DEBUG getChatMessages: Accès autorisé, récupération des messages');

    // Récupérer les messages et les fichiers joints avec une seule requête
    $sql = "
        SELECT 
            c.idMessage, 
            c.idTicket, 
            c.idExpediteur, 
            c.message, 
            c.dateEnvoi, 
            c.fichierJoint, 
            c.nomExpediteur, 
            c.prenomExpediteur,
            GROUP_CONCAT(cf.cheminFichier ORDER BY cf.id ASC) AS fichiersJoints_list
        FROM conversation c
        LEFT JOIN conversation_fichiers cf ON c.idMessage = cf.idMessage
        WHERE c.idTicket = ? 
        GROUP BY c.idMessage
        ORDER BY c.dateEnvoi ASC
    ";

$stmt = $bdd->prepare($sql);
$stmt->execute([$idTicket]);
$messages = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Enrichir chaque message avec les informations de l'expéditeur
foreach ($messages as &$msg) {
        // Si les champs nomExpediteur/prenomExpediteur existent et sont remplis, les utiliser
        if (isset($msg['nomExpediteur']) && $msg['nomExpediteur'] && $msg['nomExpediteur'] !== 'Utilisateur inconnu') {
            $msg['nom'] = $msg['nomExpediteur'];
            $msg['prenom'] = $msg['prenomExpediteur'] ?? '';
            error_log("DEBUG getChatMessages: Utilisation nomExpediteur/prenomExpediteur - {$msg['prenom']} {$msg['nom']}");
        } else {
            // Fallback vers l'ancienne logique pour les messages existants
            $idExp = intval($msg['idExpediteur']);
            error_log("DEBUG getChatMessages: Fallback pour idExpediteur = $idExp");
            
            // Chercher d'abord dans techniciens (inclut directeur)
            $reqTech = $bdd->prepare("SELECT prenomTechnicien AS prenom, nomTechnicien AS nom, photoprofil FROM techniciens WHERE idTechnicien = ?");
            $reqTech->execute([$idExp]);
            $tech = $reqTech->fetch(PDO::FETCH_ASSOC);
            
            if ($tech && $tech['nom']) {
                $msg['nom'] = $tech['nom'];
                $msg['prenom'] = $tech['prenom'];
                $msg['photoprofil'] = $tech['photoprofil'];
                error_log("DEBUG getChatMessages: Technicien trouvé (fallback) - {$tech['prenom']} {$tech['nom']}");
            } else {
                // Sinon chercher dans utilisateur
                $reqUser = $bdd->prepare("SELECT prenomUtilisateur AS prenom, nomUtilisateur AS nom, photoprofil FROM utilisateur WHERE idUtilisateur = ?");
                $reqUser->execute([$idExp]);
                $user = $reqUser->fetch(PDO::FETCH_ASSOC);
                
                if ($user && $user['nom']) {
                    $msg['nom'] = $user['nom'];
                    $msg['prenom'] = $user['prenom'];
                    $msg['photoprofil'] = $user['photoprofil'];
                    error_log("DEBUG getChatMessages: Utilisateur trouvé (fallback) - {$user['prenom']} {$user['nom']}");
                } else {
                    $msg['nom'] = 'Utilisateur inconnu';
                $msg['prenom'] = '';
                $msg['photoprofil'] = null;
                error_log("DEBUG getChatMessages: Aucun utilisateur/technicien trouvé pour idExpediteur = $idExp");
            }
        }
    }
        
        // Traiter les fichiers joints multiples
        if ($msg['fichiersJoints_list']) {
            $msg['fichiersJoints'] = explode(',', $msg['fichiersJoints_list']);
        } else {
            $msg['fichiersJoints'] = [];
        }
        
        // Compatibilité : si pas de fichiers multiples mais un fichierJoint, l'ajouter
        if (empty($msg['fichiersJoints']) && !empty($msg['fichierJoint'])) {
            $msg['fichiersJoints'] = [$msg['fichierJoint']];
        }
        
        unset($msg['fichiersJoints_list']); // Nettoyer le champ temporaire
}
unset($msg);

echo json_encode($messages); 
    
} catch (Exception $e) {
    error_log('Erreur getChatMessages: ' . $e->getMessage());
    echo json_encode(['erreur' => 'Erreur serveur.']);
}
?> 
