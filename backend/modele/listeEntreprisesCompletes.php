<?php
require '../config/cors.php';
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/session.php';
startSecureSession();
// Vérification de session pour les directeurs uniquement
if (!isset($_SESSION['user']) || empty($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['erreur' => 'Non authentifié']);
    exit;
}

// Vue complète de TOUTES les entreprises (nom, nombre d'admins, etc.) :
// réservée au directeur INTERNE. Un directeur "client" ne doit pas voir les
// autres entreprises de la plateforme.
if (!estDirecteurPlateforme()) {
    http_response_code(403);
    echo json_encode(['erreur' => 'Accès non autorisé - Directeur requis']);
    exit;
}

require_once '../connexionBDD.php';

try {
    // Récupérer toutes les entreprises avec le nombre d'utilisateurs et le statut
    $stmt = $bdd->query("
        SELECT 
            e.idEntreprise,
            e.nomEntreprise,
            e.acronymeEntreprise,
            e.categorie,
            e.pays,
            e.ville,
            e.adresse,
            e.adresseComplete,
            e.desactiver,
            COUNT(u.idUtilisateur) as nombreUtilisateurs,
            SUM(CASE WHEN u.desactiver = 0 THEN 1 ELSE 0 END) as utilisateursActifs,
            SUM(CASE WHEN u.roleEntreprise = 'admin' THEN 1 ELSE 0 END) as nombreAdmins
        FROM entreprise e
        LEFT JOIN utilisateur u ON e.idEntreprise = u.idEntreprise
        GROUP BY e.idEntreprise
        ORDER BY e.nomEntreprise ASC
    ");
    
    $entreprises = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true, 
        'entreprises' => $entreprises
    ]);
} catch (PDOException $e) {
    echo json_encode([
        'success' => false, 
        'error' => 'Erreur de base de données: '
    ]);
}
?> 