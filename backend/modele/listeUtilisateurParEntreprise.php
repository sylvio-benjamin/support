<?php
require '../config/cors.php';
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/session.php';
startSecureSession();
// Vérification de session plus flexible pour les admins
if (!isset($_SESSION['user']) || empty($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['erreur' => 'Non authentifié']);
    exit;
}

// Vérifier que l'utilisateur a un rôle valide
if (!isset($_SESSION['user']['role'])) {
    http_response_code(401);
    echo json_encode(['erreur' => 'Rôle utilisateur manquant']);
    exit;
}

// Autoriser les rôles admin, directeur, technicien, referent
$rolesAutorises = ['admin', 'directeur', 'technicien', 'referent'];
if (!in_array($_SESSION['user']['role'], $rolesAutorises)) {
    http_response_code(403);
    echo json_encode(['erreur' => 'Accès non autorisé']);
    exit;
}

require __DIR__ . '/../connexionBDD.php';

// Endpoint pour récupérer les utilisateurs de l'entreprise de l'admin référent
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $idEntreprise = $_SESSION['user']['idEntreprise'] ?? null;
        
        if (!$idEntreprise) {
            echo json_encode(['success' => false, 'error' => 'ID entreprise manquant pour l\'admin référent']);
            exit;
        }
        
        // Récupérer uniquement les utilisateurs de l'entreprise de l'admin référent
        $stmt = $bdd->prepare("
            SELECT u.*, e.nomEntreprise 
            FROM utilisateur u 
            LEFT JOIN entreprise e ON u.idEntreprise = e.idEntreprise 
            WHERE u.idEntreprise = :idEntreprise
            ORDER BY u.nomUtilisateur, u.prenomUtilisateur
        ");
        $stmt->bindParam(':idEntreprise', $idEntreprise);
        $stmt->execute();
        $utilisateurs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'utilisateurs' => $utilisateurs]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => 'Erreur de base de données.']);
    }
    exit;
}

function rechercheUtilisateur($login, $bdd){
    $stmt = $bdd->prepare("SELECT * FROM utilisateur WHERE loginUtilisateur = :login");
    $stmt->bindParam(':login', $login);
    $stmt->execute();
    return $stmt;
}
?> 