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
if (!isset($_SESSION['user']) || empty($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['erreur' => 'Non authentifié']);
    exit;
}

require '../connexionBDD.php'; // Connexion à la BDD AVANT tout appel

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $date = $_POST['date'] ?? null;
    $heure = $_POST['heure'] ?? null;
    $idTicket = $_POST['Ticket'] ?? null;
    $idUtilisateur = $_POST['idUtilisateur'] ?? null;
    $idTechnicien = $_POST['idTechnicien'] ?? null;
    $titre = $_POST['titre'] ?? null;
    $priorite = $_POST['priorite'] ?? 'normal';

    if ($date && $heure && $idTicket && $idUtilisateur && $idTechnicien && $titre) {
        // Vérifier que la date du RDV est dans le futur
        $dateRdv = $date . ' ' . $heure;
        $now = date('Y-m-d H:i:s');
        if (strtotime($dateRdv) <= strtotime($now)) {
            echo json_encode(['success' => false, 'error' => 'La date du rendez-vous doit être dans le futur.']);
            exit;
        }
        // Vérifier s'il existe déjà un RDV Futur ou Présent pour ce ticket
        $stmtCheck = $bdd->prepare("SELECT COUNT(*) FROM Calendrier WHERE idTicket = :idTicket AND status IN ('Futur', 'Présent')");
        $stmtCheck->execute(['idTicket' => $idTicket]);
        if ($stmtCheck->fetchColumn() > 0) {
            echo json_encode(['success' => false, 'error' => 'Un RDV à venir existe déjà pour ce ticket.']);
            exit;
        }
        $resultat = creerRDV($date, $heure, $idTicket, $idUtilisateur, $idTechnicien, $titre, $priorite, $bdd);
        if ($resultat) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Impossible de créer le RDV (erreur BDD).']);
        }
    } else {
        echo json_encode(['success' => false, 'error' => 'Paramètres manquants']);
    }
    exit();
}

function creerRDV($date, $heure, $idTicket, $idUtilisateur, $idTechnicien, $titre, $priorite, $bdd) {
    // Vérification doublon (sécurité supplémentaire)
    $stmtCheck = $bdd->prepare("SELECT COUNT(*) FROM Calendrier WHERE idTicket = :idTicket AND status IN ('Futur', 'Présent')");
    $stmtCheck->execute([
        'idTicket' => $idTicket
    ]);
    if ($stmtCheck->fetchColumn() > 0) {
        // Ne rien faire si doublon
        return false;
    }
    try {
        $stmt = $bdd->prepare("INSERT INTO Calendrier (idTechnicien, idUtilisateur, idTicket, date, heure, Titre, status, priorite, Acceptation) VALUES (:idTechnicien, :idUtilisateur, :idTicket, :date, :heure, :Titre, :status, :priorite, :acceptation)");
        $ok = $stmt->execute([
            'idTechnicien' => $idTechnicien,
            'idUtilisateur' => $idUtilisateur,
            'idTicket' => $idTicket,
            'date' => $date,
            'heure' => $heure,
            'Titre' => $titre,
            'status' => 'Présent', // RDV directement accepté
            'priorite' => $priorite,
            'acceptation' => 'Accepté' // RDV directement accepté
        ]);
        if (!$ok) {
            error_log('Erreur insertion Calendrier: ' . print_r($stmt->errorInfo(), true));
            return false;
        }
        // Récupérer l'id du RDV créé
        $idCalendrier = $bdd->lastInsertId();
        // Message pour l'employé
        $messageTexteEmploye = "Un rendez-vous vous est proposé le $date à $heure.";
        $stmt2 = $bdd->prepare("INSERT INTO conversation (idTicket, idExpediteur, message, dateEnvoi) VALUES (:idTicket, :idExpediteur, :message, NOW())");
        $ok2 = $stmt2->execute([
            'idTicket' => $idTicket,
            'idExpediteur' => $idTechnicien,
            'message' => $messageTexteEmploye
        ]);
        // Message pour le technicien
        $messageTexteTech = "Vous avez proposé un RDV le $date à $heure.";
        $stmt3 = $bdd->prepare("INSERT INTO conversation (idTicket, idExpediteur, message, dateEnvoi) VALUES (:idTicket, :idExpediteur, :message, NOW())");
        $ok3 = $stmt3->execute([
            'idTicket' => $idTicket,
            'idExpediteur' => $idTechnicien,
            'message' => $messageTexteTech
        ]);
        if (!$ok2 || !$ok3) {
            error_log('Erreur insertion conversation: ' . print_r($stmt2->errorInfo(), true) . print_r($stmt3->errorInfo(), true));
        }
    } catch (PDOException $e) {
        error_log('Erreur PDO Calendrier: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => "Erreur serveur lors de l'enregistrement du rendez-vous."]);
        exit;
    }
    return true;
}

// Ajout : fonction pour accepter ou refuser un RDV
function AcceptationRDV($idTicket, $bdd, $reponse) {
    $stmt = $bdd->prepare("SELECT idCalendrier FROM Calendrier WHERE idTicket = :idTicket AND status IN ('Futur', 'Présent') ORDER BY date DESC, heure DESC LIMIT 1");
    $stmt->execute(['idTicket' => $idTicket]);
    $rdv = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$rdv) return false;
    $idRdv = $rdv['idCalendrier'];
    if ($reponse === 'accepte') {
        $stmt2 = $bdd->prepare("UPDATE Calendrier SET Acceptation = 'Accepté', status = 'Présent' WHERE idCalendrier = :id");
        $stmt2->execute(['id' => $idRdv]);
    } else if ($reponse === 'refuse') {
        $stmt2 = $bdd->prepare("UPDATE Calendrier SET Acceptation = 'Refusé', status = 'Fermé' WHERE idCalendrier = :id");
        $stmt2->execute(['id' => $idRdv]);
    }
    return true;
}
