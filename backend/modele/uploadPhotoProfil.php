<?php
require '../config/cors.php';
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../config/session.php';
startSecureSession();
require '../connexionBDD.php';

try {

    // L'utilisateur cible est TOUJOURS dérivé de la session, jamais d'un id
    // fourni par le client (sinon n'importe qui peut écraser la photo de
    // n'importe quel autre compte).
    $userId = null;
    $table = '';
    $champId = '';

    if (isset($_SESSION['user']['idUtilisateur'])) {
        $table = 'utilisateur';
        $champId = 'idUtilisateur';
        $userId = $_SESSION['user']['idUtilisateur'];
    } elseif (isset($_SESSION['user']['idTechnicien'])) {
        $table = 'techniciens';
        $champId = 'idTechnicien';
        $userId = $_SESSION['user']['idTechnicien'];
    }

    if (!$userId) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Utilisateur non connecté']);
        exit;
    }

    // Vérifier qu'un fichier a été uploadé
    if (!isset($_FILES['photo'])) {
        echo json_encode(['success' => false, 'error' => 'Aucun fichier reçu']);
        exit;
    }
    
    if ($_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
        echo json_encode(['success' => false, 'error' => 'Erreur d\'upload: ' . $_FILES['photo']['error']]);
        exit;
    }
    
    $fichier = $_FILES['photo'];
    
    // Vérifications de sécurité
    $tailleMax = 5 * 1024 * 1024; // 5MB
    if ($fichier['size'] > $tailleMax) {
        echo json_encode(['success' => false, 'error' => 'Fichier trop volumineux (max 5MB)']);
        exit;
    }
    
    $extensionsAutorisees = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    $extension = strtolower(pathinfo($fichier['name'], PATHINFO_EXTENSION));
    if (!in_array($extension, $extensionsAutorisees)) {
        echo json_encode(['success' => false, 'error' => 'Type de fichier non autorisé. Utilisez JPG, PNG, GIF ou WebP']);
        exit;
    }
    
    // Vérifier que c'est bien une image
    $infoImage = getimagesize($fichier['tmp_name']);
    if ($infoImage === false) {
        echo json_encode(['success' => false, 'error' => 'Le fichier n\'est pas une image valide']);
        exit;
    }
    
    // Créer le dossier s'il n'existe pas
    $dossierUpload = __DIR__ . '/../../photoprofil/';
    if (!file_exists($dossierUpload)) {
        mkdir($dossierUpload, 0755, true);
    }
    
    // Récupérer l'ancienne photo pour la supprimer
    $stmt = $bdd->prepare("SELECT photoprofil FROM $table WHERE $champId = ?");
    $stmt->execute([$userId]);
    $anciennePhoto = $stmt->fetchColumn();
    
    // Supprimer l'ancienne photo si elle existe
    if ($anciennePhoto && file_exists(__DIR__ . '/../../' . $anciennePhoto)) {
        unlink(__DIR__ . '/../../' . $anciennePhoto);
    }
    
    // Générer un nom de fichier unique
    $timestamp = time();
    $nomFichier = $timestamp . '_' . $userId . '_' . uniqid() . '.' . $extension;
    $cheminComplet = $dossierUpload . $nomFichier;
    
    // Déplacer le fichier uploadé
    if (!move_uploaded_file($fichier['tmp_name'], $cheminComplet)) {
        echo json_encode(['success' => false, 'error' => 'Erreur lors du déplacement du fichier']);
        exit;
    }
    
    // Redimensionner l'image si nécessaire
    $largeurMax = 300;
    $hauteurMax = 300;
    redimensionnerImage($cheminComplet, $largeurMax, $hauteurMax);
    
    // Mettre à jour la base de données
    $cheminRelatif = 'photoprofil/' . $nomFichier;
    $stmt = $bdd->prepare("UPDATE $table SET photoprofil = ? WHERE $champId = ?");
    $stmt->execute([$cheminRelatif, $userId]);
    
    error_log("Photo mise à jour avec succès: $cheminRelatif");
    
    echo json_encode([
        'success' => true,
        'photoUrl' => $cheminRelatif,
        'message' => 'Photo de profil mise à jour avec succès'
    ]);
    
} catch (Exception $e) {
    error_log("Erreur upload photo profil: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => "Erreur serveur lors de l'upload."]);
} catch (Error $e) {
    error_log("Erreur fatale upload photo profil: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => "Erreur serveur lors de l'upload."]);
}

function redimensionnerImage($cheminFichier, $largeurMax, $hauteurMax) {
    $infoImage = getimagesize($cheminFichier);
    if ($infoImage === false) return;
    
    $largeurOrig = $infoImage[0];
    $hauteurOrig = $infoImage[1];
    $type = $infoImage[2];
    
    // Calculer les nouvelles dimensions
    $ratio = min($largeurMax / $largeurOrig, $hauteurMax / $hauteurOrig);
    if ($ratio >= 1) return; // Pas besoin de redimensionner
    
    $nouvelleLargeur = round($largeurOrig * $ratio);
    $nouvelleHauteur = round($hauteurOrig * $ratio);
    
    // Créer l'image source
    switch ($type) {
        case IMAGETYPE_JPEG:
            $imageSource = imagecreatefromjpeg($cheminFichier);
            break;
        case IMAGETYPE_PNG:
            $imageSource = imagecreatefrompng($cheminFichier);
            break;
        case IMAGETYPE_GIF:
            $imageSource = imagecreatefromgif($cheminFichier);
            break;
        case IMAGETYPE_WEBP:
            $imageSource = imagecreatefromwebp($cheminFichier);
            break;
        default:
            return;
    }
    
    if (!$imageSource) return;
    
    // Créer l'image de destination
    $imageDest = imagecreatetruecolor($nouvelleLargeur, $nouvelleHauteur);
    
    // Préserver la transparence pour PNG et GIF
    if ($type == IMAGETYPE_PNG || $type == IMAGETYPE_GIF) {
        imagealphablending($imageDest, false);
        imagesavealpha($imageDest, true);
        $transparent = imagecolorallocatealpha($imageDest, 255, 255, 255, 127);
        imagefill($imageDest, 0, 0, $transparent);
    }
    
    // Redimensionner
    imagecopyresampled($imageDest, $imageSource, 0, 0, 0, 0, $nouvelleLargeur, $nouvelleHauteur, $largeurOrig, $hauteurOrig);
    
    // Sauvegarder
    switch ($type) {
        case IMAGETYPE_JPEG:
            imagejpeg($imageDest, $cheminFichier, 85);
            break;
        case IMAGETYPE_PNG:
            imagepng($imageDest, $cheminFichier, 8);
            break;
        case IMAGETYPE_GIF:
            imagegif($imageDest, $cheminFichier);
            break;
        case IMAGETYPE_WEBP:
            imagewebp($imageDest, $cheminFichier, 85);
            break;
    }
    
    imagedestroy($imageSource);
    imagedestroy($imageDest);
}
?>