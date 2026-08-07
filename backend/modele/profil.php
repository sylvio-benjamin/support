<?php
require '../config/cors.php';
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/session.php';
startSecureSession();
require_once '../connexionBDD.php';

// Log de débogage
error_log("=== Profil Debug ===");
error_log("Method: " . $_SERVER['REQUEST_METHOD']);
error_log("Session user: " . json_encode($_SESSION['user'] ?? 'null'));

$idUtilisateur = $_SESSION['user']['idUtilisateur'] ?? null;
$idTechnicien = $_SESSION['user']['idTechnicien'] ?? null;
$idDirecteur = $_SESSION['user']['idDirecteur'] ?? null;

// Vérifier si l'utilisateur est connecté
if (!$idUtilisateur && !$idTechnicien && !$idDirecteur) {
    error_log("❌ Aucun utilisateur connecté");
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Utilisateur non connecté']);
    exit();
}

// Le frontend envoie soit un FormData (technicien), soit un JSON brut
// (directeur, admin) — $_POST reste vide pour ce second cas, ce qui faisait
// systématiquement échouer la sauvegarde avec "Paramètres manquants".
$input = $_POST;
if (empty($input)) {
    $corpsJson = json_decode(file_get_contents('php://input'), true);
    if (is_array($corpsJson)) {
        $input = $corpsJson;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        if ($idUtilisateur && isset($input['telephone'], $input['email'], $input['naissance'])) {
            $telephone = $input['telephone'];
            $email = $input['email'];
            $naissance = $input['naissance'];

            error_log("👤 Mise à jour utilisateur: ID=$idUtilisateur, Tel=$telephone, Email=$email");

            UpdateUserProfile($bdd, $idUtilisateur, $telephone, $email, $naissance);

            echo json_encode([
                'status' => 'success',
                'message' => 'Profil utilisateur mis à jour.'
            ]);
            exit();
        } elseif ($idTechnicien && isset($input['telephone'], $input['email'], $input['naissance'])) {
            $telephone = $input['telephone'];
            $email = $input['email'];
            $naissance = $input['naissance'];

            error_log("👨‍💻 Mise à jour technicien: ID=$idTechnicien, Tel=$telephone, Email=$email");

            UpdateTechProfile($bdd, $idTechnicien, $telephone, $email, $naissance);

            echo json_encode([
                'status' => 'success',
                'message' => 'Profil technicien mis à jour.'
            ]);
            exit();
        } elseif ($idDirecteur && isset($input['telephone'], $input['email'], $input['naissance'])) {
            $telephone = $input['telephone'];
            $email = $input['email'];
            $naissance = $input['naissance'];

            error_log("🧑‍💼 Mise à jour directeur: ID=$idDirecteur, Tel=$telephone, Email=$email");

            UpdateDirecteurProfile($bdd, $idDirecteur, $telephone, $email, $naissance);

            echo json_encode([
                'status' => 'success',
                'message' => 'Profil directeur mis à jour.'
            ]);
            exit();
        } else {
            error_log("❌ Paramètres manquants");
            echo json_encode(['status' => 'error', 'message' => 'Paramètres manquants.']);
            exit();
        }
    } catch (Exception $e) {
        error_log("❌ Erreur serveur: " . $e->getMessage());
        echo json_encode(['status' => 'error', 'message' => 'Erreur serveur.']);
        exit();
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'Méthode non autorisée.']);
    exit();
}

// Fonctions
function UpdateUserProfile($bdd, $idUtilisateur, $telephone, $email, $naissance) {
    $stmt = $bdd->prepare("UPDATE utilisateur SET telephone = ?, emailUtilisateur = ?, naissance = ? WHERE idUtilisateur = ?");
    $result = $stmt->execute([$telephone, $email, $naissance, $idUtilisateur]);
    
    if ($result) {
        error_log("✅ Profil utilisateur mis à jour avec succès");
    } else {
        error_log("❌ Erreur mise à jour utilisateur: " . json_encode($stmt->errorInfo()));
    }
    
    return $result;
}

function UpdateTechProfile($bdd, $idTechnicien, $telephone, $email, $naissance) {
    $stmt = $bdd->prepare("UPDATE techniciens SET telephone = ?, emailTechnicien = ?, naissance = ? WHERE idTechnicien = ?");
    $result = $stmt->execute([$telephone, $email, $naissance, $idTechnicien]);

    if ($result) {
        error_log("✅ Profil technicien mis à jour avec succès");
    } else {
        error_log("❌ Erreur mise à jour technicien: " . json_encode($stmt->errorInfo()));
    }

    return $result;
}

function UpdateDirecteurProfile($bdd, $idDirecteur, $telephone, $email, $naissance) {
    $stmt = $bdd->prepare("UPDATE directeurs SET telephone = ?, emailDirecteur = ?, naissance = ? WHERE idDirecteur = ?");
    $result = $stmt->execute([$telephone, $email, $naissance, $idDirecteur]);

    if ($result) {
        error_log("✅ Profil directeur mis à jour avec succès");
    } else {
        error_log("❌ Erreur mise à jour directeur: " . json_encode($stmt->errorInfo()));
    }

    return $result;
}
?>
