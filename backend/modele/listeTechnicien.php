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
if (!isset($_SESSION['user']) || empty($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['erreur' => 'Non authentifié']);
    exit;
}

require_once __DIR__ . '/../connexionBDD.php';

// Endpoint pour récupérer tous les techniciens
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $techniciens = listeTechnicien($bdd);
    echo json_encode(['success' => true, 'techniciens' => $techniciens]);
    exit;
}

function listeTechnicien($bdd){
    // Colonnes explicites : jamais motDePasse (hash bcrypt), qu'aucun affichage
    // frontend ne doit recevoir — accessible ici à tout compte authentifié,
    // quel que soit son rôle.
    $stmt = $bdd->prepare("
        SELECT
            t.idTechnicien, t.loginTechnicien, t.nomTechnicien, t.prenomTechnicien,
            t.role, t.emailTechnicien, t.naissance, t.telephone, t.photoprofil,
            GROUP_CONCAT(s.nomService SEPARATOR ', ') as services
        FROM techniciens t
        LEFT JOIN roleTechnicien rt ON t.idTechnicien = rt.idTechnicien
        LEFT JOIN services s ON rt.idService = s.idService
        GROUP BY t.idTechnicien
        ORDER BY t.nomTechnicien, t.prenomTechnicien
    ");
    $stmt->execute();
    $techniciens = $stmt->fetchAll(PDO::FETCH_ASSOC);
    return $techniciens;
}

function rechercheTechnicien($bdd, $login){
    $stmt = $bdd->prepare("SELECT * FROM techniciens WHERE loginTechnicien = :login");
    $stmt->bindParam(':login', $login);
    $stmt->execute();
    return $stmt;
}
?>
