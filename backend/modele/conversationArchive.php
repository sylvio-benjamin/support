<?php
require '../config/cors.php';
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

require_once __DIR__ . '/../config/session.php';
startSecureSession();
require '../connexionBDD.php';

// Vérifier si l'utilisateur est connecté
if (!isset($_SESSION['user'])) {
    echo json_encode(['success' => false, 'error' => 'Accès non autorisé. Utilisateur non connecté.']);
    exit;
}

// Vérifier le rôle de l'utilisateur
$isDirecteur = isset($_SESSION['user']['idDirecteur']) || 
               (isset($_SESSION['user']['idTechnicien']) && isset($_SESSION['user']['role']) && $_SESSION['user']['role'] === 'directeur');
$isTechnicien = isset($_SESSION['user']['idTechnicien']) && 
                (!isset($_SESSION['user']['role']) || $_SESSION['user']['role'] !== 'directeur');

if (!$isDirecteur && !$isTechnicien) {
    echo json_encode(['success' => false, 'error' => 'Accès non autorisé. Rôle non reconnu.']);
    exit;
}

try {
    // Récupérer l'ID du ticket archive depuis les paramètres GET
    $idTicketArchive = $_GET['idTicketArchive'] ?? null;
    
    if (!$idTicketArchive) {
        echo json_encode(['success' => false, 'error' => 'ID du ticket archive manquant.']);
        exit;
    }
    
    // Pour les archives, tous les techniciens et directeurs peuvent accéder aux conversations
    // Pas de restriction d'accès spécifique
    
    // D'abord récupérer l'idTicketOriginal de l'archive
    $sqlArchive = "SELECT idTicketOriginal FROM archiveTicket WHERE idTicketArchive = :idTicketArchive";
    $stmtArchive = $bdd->prepare($sqlArchive);
    $stmtArchive->bindParam(':idTicketArchive', $idTicketArchive, PDO::PARAM_STR);
    $stmtArchive->execute();
    $archive = $stmtArchive->fetch(PDO::FETCH_ASSOC);
    
    if (!$archive || !$archive['idTicketOriginal']) {
        echo json_encode(['success' => false, 'error' => 'Archive non trouvée ou ID original manquant.']);
        exit;
    }
    
    // Récupérer les messages de la conversation depuis la table conversation
    $sql = "
        SELECT 
            c.idMessage,
            c.message,
            c.dateEnvoi,
            c.fichierJoint,
            c.idExpediteur,
            CASE 
                WHEN u.idUtilisateur IS NOT NULL THEN u.nomUtilisateur
                WHEN t.idTechnicien IS NOT NULL THEN t.nomTechnicien
                ELSE NULL
            END as nom,
            CASE 
                WHEN u.idUtilisateur IS NOT NULL THEN u.prenomUtilisateur
                WHEN t.idTechnicien IS NOT NULL THEN t.prenomTechnicien
                ELSE NULL
            END as prenom,
            CASE 
                WHEN u.idUtilisateur IS NOT NULL THEN 'utilisateur'
                WHEN t.idTechnicien IS NOT NULL THEN 'technicien'
                ELSE 'inconnu'
            END as roleExpediteur
        FROM conversation c
        LEFT JOIN utilisateur u ON c.idExpediteur = u.idUtilisateur
        LEFT JOIN techniciens t ON c.idExpediteur = t.idTechnicien
        WHERE c.idTicket = :idTicketOriginal
        ORDER BY c.dateEnvoi ASC
    ";
    
    $stmt = $bdd->prepare($sql);
    $stmt->bindParam(':idTicketOriginal', $archive['idTicketOriginal'], PDO::PARAM_INT);
    $stmt->execute();
    
    $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Ajouter les pièces jointes multiples si la table existe
    try {
        $ids = array_map(function($m){ return $m['idMessage']; }, $messages);
        if (!empty($ids)) {
            $checkTable = $bdd->query("SHOW TABLES LIKE 'conversation_fichiers'");
            $tableExists = $checkTable && $checkTable->fetch() !== false;
            if ($tableExists) {
                $placeholders = implode(',', array_fill(0, count($ids), '?'));
                $sqlFiles = "SELECT idMessage, cheminFichier FROM conversation_fichiers WHERE idMessage IN ($placeholders) ORDER BY id ASC";
                $stmtFiles = $bdd->prepare($sqlFiles);
                $stmtFiles->execute($ids);
                $rows = $stmtFiles->fetchAll(PDO::FETCH_ASSOC);
                $map = [];
                foreach ($rows as $r) {
                    $mid = $r['idMessage'];
                    if (!isset($map[$mid])) $map[$mid] = [];
                    $map[$mid][] = $r['cheminFichier'];
                }
                foreach ($messages as &$m) {
                    $m['fichiersJoints'] = isset($map[$m['idMessage']]) ? $map[$m['idMessage']] : [];
                    if (empty($m['fichiersJoints']) && !empty($m['fichierJoint'])) {
                        $m['fichiersJoints'] = [$m['fichierJoint']];
                    }
                }
                unset($m);
            } else {
                foreach ($messages as &$m) {
                    $m['fichiersJoints'] = !empty($m['fichierJoint']) ? [$m['fichierJoint']] : [];
                }
                unset($m);
            }
        }
    } catch (Exception $e) {
        // ignore
    }

    echo json_encode(['success' => true, 'messages' => $messages]);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Erreur de base de données.']);
}
?> 