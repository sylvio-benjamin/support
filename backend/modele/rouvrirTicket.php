<?php
require '../config/cors.php';
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/session.php';
startSecureSession();
require '../connexionBDD.php';

// Vérifier si l'utilisateur est connecté
if (!isset($_SESSION['user'])) {
    echo json_encode(['success' => false, 'error' => 'Accès non autorisé. Utilisateur non connecté.']);
    exit;
}

// Vérifier le rôle de l'utilisateur
$isDirecteur = isset($_SESSION['user']['idDirecteur']);
$isTechnicien = isset($_SESSION['user']['idTechnicien']);

if (!$isDirecteur && !$isTechnicien) {
    echo json_encode(['success' => false, 'error' => 'Accès non autorisé. Rôle non reconnu.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $idTicketArchive = $input['idTicketArchive'] ?? null;

    if (!$idTicketArchive) {
        echo json_encode(['success' => false, 'error' => 'ID du ticket manquant']);
        exit;
    }

    try {
        // Récupérer les données du ticket archivé
        if ($isDirecteur) {
            // Pour le directeur : peut rouvrir n'importe quel ticket
            $sql = "SELECT * FROM archiveTicket WHERE idTicketArchive = :idTicketArchive";
            $stmt = $bdd->prepare($sql);
            $stmt->bindParam(':idTicketArchive', $idTicketArchive, PDO::PARAM_STR);
        } else {
            // Pour le technicien : peut seulement rouvrir ses propres tickets
            $idTechnicien = $_SESSION['user']['idTechnicien'];
            $sql = "SELECT * FROM archiveTicket WHERE idTicketArchive = :idTicketArchive AND idTechnicien = :idTechnicien";
            $stmt = $bdd->prepare($sql);
            $stmt->bindParam(':idTicketArchive', $idTicketArchive, PDO::PARAM_STR);
            $stmt->bindParam(':idTechnicien', $idTechnicien, PDO::PARAM_INT);
        }
        
        $stmt->execute();
        $ticketArchive = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$ticketArchive) {
            echo json_encode(['success' => false, 'error' => 'Ticket non trouvé ou accès non autorisé']);
            exit;
        }

        // Insérer le ticket dans la table ticket principale
        $sql = "INSERT INTO ticket (
            idTicket, idUtilisateur, idTechnicien, titre, description, 
            categorie, serviceConcerne, priorite, statut, dateCreation, 
            sousCategorie, rapport
        ) VALUES (
            :idTicket, :idUtilisateur, :idTechnicien, :titre, :description,
            :categorie, :serviceConcerne, :priorite, 'en_cours', :dateCreation,
            :sousCategorie, :rapport
        )";
        
        $stmt = $bdd->prepare($sql);
        $stmt->execute([
            ':idTicket' => $ticketArchive['idTicketOriginal'],
            ':idUtilisateur' => $ticketArchive['idUtilisateur'],
            ':idTechnicien' => $ticketArchive['idTechnicien'],
            ':titre' => $ticketArchive['titre'],
            ':description' => $ticketArchive['description'],
            ':categorie' => $ticketArchive['categorie'],
            ':serviceConcerne' => $ticketArchive['serviceConcerne'],
            ':priorite' => $ticketArchive['priorite'],
            ':dateCreation' => $ticketArchive['dateCreation'],
            ':sousCategorie' => $ticketArchive['sousCategorie'],
            ':rapport' => $ticketArchive['rapport']
        ]);

        // Supprimer le ticket des archives
        $sql = "DELETE FROM archiveTicket WHERE idTicketArchive = :idTicketArchive";
        $stmt = $bdd->prepare($sql);
        $stmt->bindParam(':idTicketArchive', $idTicketArchive, PDO::PARAM_STR);
        $stmt->execute();

        echo json_encode(['success' => true, 'message' => 'Ticket rouvert avec succès']);

    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => 'Erreur de base de données.']);
    }
} else {
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
}
?> 