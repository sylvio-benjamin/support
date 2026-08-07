<?php
require '../config/cors.php';
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/session.php';
startSecureSession();
// Vérification de session
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

// Autoriser les rôles technicien, directeur, admin
$rolesAutorises = ['technicien', 'directeur', 'admin'];
if (!in_array($_SESSION['user']['role'], $rolesAutorises)) {
    http_response_code(403);
    echo json_encode(['erreur' => 'Accès non autorisé']);
    exit;
}

require_once '../connexionBDD.php';

// Endpoint pour récupérer les utilisateurs d'une entreprise spécifique
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $idEntreprise = $_GET['idEntreprise'] ?? null;
    
    if (!$idEntreprise) {
        echo json_encode(['success' => false, 'error' => 'ID entreprise manquant']);
        exit;
    }
    
    try {
        // Récupérer les utilisateurs de l'entreprise spécifiée (employés et admins référents)
        $stmt = $bdd->prepare("
            SELECT u.idUtilisateur, u.nomUtilisateur, u.prenomUtilisateur,
                   u.emailUtilisateur, u.idEntreprise, u.roleEntreprise,
                   u.loginUtilisateur, u.telephone, u.naissance, u.desactiver,
                   u.photoprofil, e.nomEntreprise
            FROM utilisateur u 
            LEFT JOIN entreprise e ON u.idEntreprise = e.idEntreprise 
            WHERE u.idEntreprise = :idEntreprise 
            AND (u.roleEntreprise = 'employe' OR u.roleEntreprise = 'admin')
            AND u.desactiver = 0
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

// Endpoint POST pour recherche par nom d'entreprise
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $nomEntreprise = $data['nomEntreprise'] ?? '';
    
    if (!$nomEntreprise) {
        echo json_encode(['success' => false, 'error' => 'Nom entreprise manquant']);
        exit;
    }
    
    try {
        // Récupérer les utilisateurs de l'entreprise par nom
        $stmt = $bdd->prepare("
            SELECT u.idUtilisateur, u.nomUtilisateur, u.prenomUtilisateur,
                   u.emailUtilisateur, u.idEntreprise, u.roleEntreprise,
                   u.loginUtilisateur, u.telephone, u.naissance, u.desactiver,
                   u.photoprofil, e.nomEntreprise
            FROM utilisateur u 
            LEFT JOIN entreprise e ON u.idEntreprise = e.idEntreprise 
            WHERE e.nomEntreprise LIKE :nomEntreprise 
            AND (u.roleEntreprise = 'employe' OR u.roleEntreprise = 'admin')
            AND u.desactiver = 0
            ORDER BY u.nomUtilisateur, u.prenomUtilisateur
        ");
        $stmt->bindParam(':nomEntreprise', '%' . $nomEntreprise . '%');
        $stmt->execute();
        $utilisateurs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'utilisateurs' => $utilisateurs]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => 'Erreur de base de données.']);
    }
    exit;
}
?> 