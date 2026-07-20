<?php
require_once __DIR__ . '/uploadHelper.php';

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

$dossier = __DIR__ . '/../../uploads/';
if (!file_exists($dossier)) mkdir($dossier, 0755, true);

// Logs supprimés après debug

// Gérer le nouveau format multi-fichiers (piecesJointes_0, piecesJointes_1, etc.)
$piecesJointes = [];
foreach ($_FILES as $key => $value) {
    if (strpos($key, 'piecesJointes_') === 0) {
        // Vérifier que $value est bien un array de fichier valide
        if (isset($value['name']) && isset($value['tmp_name']) && isset($value['error'])) {
            $piecesJointes[] = $value;
        }
    }
}

error_log('DEBUG uploadChatFile - piecesJointes found: ' . count($piecesJointes));

if (!empty($piecesJointes)) {
    $cheminsFichiers = [];
    $erreurs = [];
    
    foreach ($piecesJointes as $index => $file) {
        error_log("DEBUG uploadChatFile - Processing file $index: " . print_r($file, true));
        
        if (is_array($file) && isset($file['error']) && $file['error'] === UPLOAD_ERR_OK) {
            $validation = validerPieceJointe($file);
            if (!$validation['success']) {
                $erreurs[] = $validation['error'] . ' (' . $file['name'] . ')';
                continue;
            }

            $nomFichier = nomPieceJointeSecurise($validation['extension']);
            $cheminFichierWeb = 'uploads/' . $nomFichier;

            if (move_uploaded_file($file['tmp_name'], $dossier . $nomFichier)) {
                $cheminsFichiers[] = $cheminFichierWeb;
                error_log("DEBUG uploadChatFile - File uploaded successfully: $cheminFichierWeb");
            } else {
                $erreurs[] = 'Erreur lors du déplacement du fichier ' . (isset($file['name']) ? $file['name'] : 'inconnu');
                error_log("DEBUG uploadChatFile - Failed to move file: " . (isset($file['name']) ? $file['name'] : 'inconnu'));
            }
        } else {
            $erreur_msg = 'Erreur upload pour le fichier ' . (is_array($file) && isset($file['name']) ? $file['name'] : 'inconnu');
            $erreurs[] = $erreur_msg;
            error_log("DEBUG uploadChatFile - Upload error: $erreur_msg, error code: " . (is_array($file) && isset($file['error']) ? $file['error'] : 'N/A'));
        }
    }
    
    if (!empty($cheminsFichiers)) {
        echo json_encode([
            'success' => true, 
            'cheminsFichiers' => $cheminsFichiers,
            'erreurs' => $erreurs
        ]);
        exit;
    } else {
        echo json_encode(['success' => false, 'error' => 'Aucun fichier uploadé avec succès. ' . implode(', ', $erreurs)]);
        exit;
    }
}

// Gérer l'ancien format mono-fichier (pieceJointe) pour compatibilité
if (isset($_FILES['pieceJointe']) && $_FILES['pieceJointe']['error'] === UPLOAD_ERR_OK) {
    $validation = validerPieceJointe($_FILES['pieceJointe']);
    if (!$validation['success']) {
        echo json_encode(['success' => false, 'error' => $validation['error']]);
        exit;
    }

    $nomFichier = nomPieceJointeSecurise($validation['extension']);
    $cheminFichierWeb = 'uploads/' . $nomFichier;

    if (move_uploaded_file($_FILES['pieceJointe']['tmp_name'], $dossier . $nomFichier)) {
        $cheminFichier = $cheminFichierWeb;
        echo json_encode(['success' => true, 'cheminFichier' => $cheminFichier]);
        exit;
    } else {
        echo json_encode(['success' => false, 'error' => 'Erreur lors du déplacement du fichier.']);
        exit;
    }
}

// Aucun fichier reçu
echo json_encode(['success' => false, 'error' => 'Aucun fichier reçu ou erreur upload.']);
exit; 
