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
require_once '../connexionBDD.php';

try {

    // L'utilisateur cible est TOUJOURS dérivé de la session, jamais d'un id
    // fourni par le client (sinon n'importe qui peut écraser la photo de
    // n'importe quel autre compte). Les requêtes SQL par type de compte sont
    // des littéraux fixes (aucune interpolation de nom de table/colonne),
    // choisies via ce switch plutôt que construites dynamiquement.
    $userId = null;
    $requeteSelect = '';
    $requeteUpdate = '';

    if (isset($_SESSION['user']['idUtilisateur'])) {
        $userId = $_SESSION['user']['idUtilisateur'];
        $requeteSelect = 'SELECT photoprofil FROM utilisateur WHERE idUtilisateur = ?';
        $requeteUpdate = 'UPDATE utilisateur SET photoprofil = ? WHERE idUtilisateur = ?';
    } elseif (isset($_SESSION['user']['idTechnicien'])) {
        $userId = $_SESSION['user']['idTechnicien'];
        $requeteSelect = 'SELECT photoprofil FROM techniciens WHERE idTechnicien = ?';
        $requeteUpdate = 'UPDATE techniciens SET photoprofil = ? WHERE idTechnicien = ?';
    } elseif (isset($_SESSION['user']['idDirecteur'])) {
        $userId = $_SESSION['user']['idDirecteur'];
        $requeteSelect = 'SELECT photoprofil FROM directeurs WHERE idDirecteur = ?';
        $requeteUpdate = 'UPDATE directeurs SET photoprofil = ? WHERE idDirecteur = ?';
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
    
    // Écrit directement dans le dossier public/ de l'app Next.js : le reverse
    // proxy ne route que "/" (Next.js) et "/backend" (PHP) vers le backend,
    // donc un fichier statique posé à la racine du repo (../../photoprofil/)
    // n'est accessible par aucun des deux — Next.js répond 404 (page HTML,
    // pas le fichier) sur son propre serveur avant même d'atteindre le
    // filesystem. Next.js sert nativement tout ce qui est dans public/ à la
    // racine du domaine, donc ce chemin est immédiatement joignable.
    $dossierUpload = __DIR__ . '/../../support-it/public/photoprofil/';
    if (!file_exists($dossierUpload)) {
        if (!mkdir($dossierUpload, 0755, true) && !is_dir($dossierUpload)) {
            $err = error_get_last();
            error_log("Upload photo profil: échec création du dossier $dossierUpload — " . ($err['message'] ?? 'raison inconnue'));
            echo json_encode(['success' => false, 'error' => "Le dossier de destination n'a pas pu être créé (permissions serveur)."]);
            exit;
        }
    }

    if (!is_writable($dossierUpload)) {
        error_log("Upload photo profil: dossier $dossierUpload non accessible en écriture par le process PHP (vérifier propriétaire/permissions).");
        echo json_encode(['success' => false, 'error' => "Le dossier de destination n'est pas accessible en écriture (permissions serveur)."]);
        exit;
    }

    // Récupérer l'ancienne photo pour la supprimer
    $stmt = $bdd->prepare($requeteSelect);
    $stmt->execute([$userId]);
    $anciennePhoto = $stmt->fetchColumn();
    
    // Supprimer l'ancienne photo si elle existe — cherche d'abord dans le
    // nouvel emplacement (support-it/public/), puis dans l'ancien
    // (racine du repo) pour les photos uploadées avant ce correctif.
    if ($anciennePhoto) {
        $ancienCheminNouveau = __DIR__ . '/../../support-it/public/' . $anciennePhoto;
        $ancienCheminAncien = __DIR__ . '/../../' . $anciennePhoto;
        if (file_exists($ancienCheminNouveau)) {
            unlink($ancienCheminNouveau);
        } elseif (file_exists($ancienCheminAncien)) {
            unlink($ancienCheminAncien);
        }
    }
    
    // Générer un nom de fichier unique
    $timestamp = time();
    $nomFichier = $timestamp . '_' . $userId . '_' . uniqid() . '.' . $extension;
    $cheminComplet = $dossierUpload . $nomFichier;
    
    // Déplacer le fichier uploadé
    if (!move_uploaded_file($fichier['tmp_name'], $cheminComplet)) {
        $err = error_get_last();
        error_log("Upload photo profil: move_uploaded_file a échoué vers $cheminComplet — " . ($err['message'] ?? 'raison inconnue'));
        echo json_encode(['success' => false, 'error' => 'Erreur lors du déplacement du fichier (voir logs serveur pour le détail).']);
        exit;
    }
    
    // Redimensionner l'image si nécessaire
    $largeurMax = 300;
    $hauteurMax = 300;
    redimensionnerImage($cheminComplet, $largeurMax, $hauteurMax);
    
    // Mettre à jour la base de données
    $cheminRelatif = 'photoprofil/' . $nomFichier;
    $stmt = $bdd->prepare($requeteUpdate);
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