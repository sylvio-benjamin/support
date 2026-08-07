<?php

require '../config/cors.php';
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/session.php';
startSecureSession();

require_once '../connexionBDD.php';

if (!isSessionValid()) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Non authentifié.']);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);
$ticket = $data['idTicket'] ?? null;
$idTechnicien = $data['idTechnicien'] ?? null;

if (!$ticket || !$idTechnicien) {
    echo json_encode(['status' => 'error', 'message' => 'Méthode non autorisée.']);
    exit();
}

// Seul le technicien assigné au ticket (ou un directeur plateforme) peut le
// partager. 'admin' est un rôle CLIENT (une seule entreprise) : il ne doit
// jamais court-circuiter la vérification de propriété du ticket, sinon
// l'admin référent de n'importe quelle entreprise pouvait partager N'IMPORTE
// QUEL ticket de N'IMPORTE QUELLE AUTRE entreprise avec un technicien de son
// choix (même pattern que desactiverEntreprise.php).
$estGestionnaire = estDirecteurPlateforme();

if (!$estGestionnaire) {
    $stmt = $bdd->prepare("SELECT idTechnicien FROM ticket WHERE idTicket = :idTicket");
    $stmt->execute([':idTicket' => $ticket]);
    $proprietaire = $stmt->fetchColumn();

    if ((int)$proprietaire !== (int)($_SESSION['user']['idTechnicien'] ?? 0)) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => "Vous n'avez pas accès à ce ticket."]);
        exit();
    }
}

PartagerTicket($bdd, $ticket, $idTechnicien);
echo json_encode(['status' => 'success', 'message' => 'Ticket partagé avec succès.']);

function PartagerTicket($bdd, $idTicket, $idTechnicien) {
    $stmt = $bdd->prepare("INSERT INTO partagerTicket (idTicket, idTechnicien) VALUES (:idTicket, :idTechnicien)");
    $stmt->execute([':idTicket' => $idTicket, ':idTechnicien' => $idTechnicien]);
}
function VerifierSiPartageExiste($bdd, $idTicket, $idTechnicien) {
    $stmt = $bdd->prepare("SELECT COUNT(*) FROM partagerTicket WHERE idTicket = :idTicket AND idTechnicien = :idTechnicien");
    $stmt->execute([':idTicket' => $idTicket, ':idTechnicien' => $idTechnicien]);
    return $stmt->fetchColumn() > 0;
}
function supprimerPartage($bdd, $idTicket, $idTechnicien) {
    $stmt = $bdd->prepare("DELETE FROM partagerTicket WHERE idTicket = :idTicket AND idTechnicien = :idTechnicien");
    $stmt->execute([':idTicket' => $idTicket, ':idTechnicien' => $idTechnicien]);
}
function selectionnerPartages($bdd, $idTicket) {
    $stmt = $bdd->prepare("SELECT idTechnicien FROM partagerTicket WHERE idTicket = :idTicket");
    $stmt->execute([':idTicket' => $idTicket]);
    return $stmt->fetchAll(PDO::FETCH_COLUMN);
}
