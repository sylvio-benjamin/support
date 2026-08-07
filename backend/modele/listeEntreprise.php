<?php
require '../config/cors.php';
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

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

require_once '../connexionBDD.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $nomEntreprise = $data['nomEntreprise'] ?? '';
    if ($nomEntreprise) {
        $stmt = rechercheUtilisateurParEntreprise($nomEntreprise, $bdd);
        $utilisateurs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'utilisateurs' => $utilisateurs]);
        exit;
    }
}

try {
    $stmt = $bdd->query("SELECT idEntreprise, nomEntreprise FROM entreprise ORDER BY nomEntreprise ASC");
    $entreprises = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'entreprises' => $entreprises]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Erreur de base de données.']);
}
function rechercheUtilisateurParEntreprise($nomEntreprise, $bdd){
    $stmt1 = $bdd->prepare("SELECT idEntreprise FROM entreprise WHERE nomEntreprise = :nomEntreprise");
    $stmt1->bindParam(':nomEntreprise', $nomEntreprise);
    $stmt1->execute();
    $result = $stmt1->fetch(PDO::FETCH_ASSOC);
    $stmt = $bdd->prepare(
        "SELECT u.*, e.nomEntreprise
         FROM utilisateur u
         LEFT JOIN entreprise e ON u.idEntreprise = e.idEntreprise
         WHERE u.idEntreprise = :idEntreprise"
    );
    $stmt->bindParam(':idEntreprise', $result['idEntreprise']);
    $stmt->execute();
    return $stmt;
}
?>
