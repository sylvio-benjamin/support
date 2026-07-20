<?php
require_once __DIR__ . '/../config/session.php';
startSecureSession();
require '../config/cors.php';
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Vérifier la session - permettre l'accès aux techniciens ET aux directeurs
if (!isset($_SESSION['user']) || !isset($_SESSION['user']['role'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Utilisateur non connecté']);
    exit;
}

$isDirecteur = isset($_SESSION['user']['idDirecteur']) || 
               (isset($_SESSION['user']['idTechnicien']) && isset($_SESSION['user']['role']) && $_SESSION['user']['role'] === 'directeur');
$isTechnicien = isset($_SESSION['user']['idTechnicien']) && 
                (!isset($_SESSION['user']['role']) || $_SESSION['user']['role'] !== 'directeur');

if (!$isDirecteur && !$isTechnicien) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Accès non autorisé. Rôle non reconnu.']);
    exit;
}

require_once '../connexionBDD.php';

$idTicketArchive = $_GET['idTicketArchive'] ?? null;

if (!$idTicketArchive) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID de l\'archive manquant']);
    exit;
}

try {
    // Récupérer les données de l'archive
    if ($isDirecteur) {
        // Pour le directeur : accès à toutes les archives
        $requete = $bdd->prepare("
            SELECT * FROM archiveTicket 
            WHERE idTicketArchive = :idTicketArchive
        ");
        $requete->execute([':idTicketArchive' => $idTicketArchive]);
    } else {
        // Pour le technicien : seulement ses archives
        $requete = $bdd->prepare("
            SELECT * FROM archiveTicket 
            WHERE idTicketArchive = :idTicketArchive 
            AND idTechnicien = :idTechnicien
        ");
        $requete->execute([
            ':idTicketArchive' => $idTicketArchive,
            ':idTechnicien' => $_SESSION['user']['idTechnicien']
        ]);
    }
    
    $archive = $requete->fetch(PDO::FETCH_ASSOC);
    
    if (!$archive) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Archive non trouvée ou accès non autorisé']);
        exit;
    }
    
    // L'ID original est maintenant stocké directement dans la base
    if (!isset($archive['idTicketOriginal'])) {
        $archive['idTicketOriginal'] = $archive['idTicketArchive'];
    }
    
    // Récupérer les pièces jointes depuis la table fichier
    $reqFichiers = $bdd->prepare("SELECT cheminFichier FROM fichier WHERE idTicket = :idTicket");
    $reqFichiers->execute([':idTicket' => $archive['idTicketOriginal']]);
    $fichiers = $reqFichiers->fetchAll(PDO::FETCH_COLUMN);
    $archive['pieceJointe'] = $fichiers;
    
    echo json_encode([
        'success' => true,
        'archive' => $archive
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erreur base de données.']);
}
?> 