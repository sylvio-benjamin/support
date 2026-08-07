<?php
header('Content-Type: application/json');
require '../config/cors.php';
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

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

require_once '../connexionBDD.php';

$idTicket = isset($_GET['idTicket']) ? intval($_GET['idTicket']) : 0;
if (!$idTicket) {
    echo json_encode(['success' => false, 'error' => 'idTicket manquant']);
    exit;
}

try {
    // Vérifier que l'appelant a accès à CE ticket avant de renvoyer son RDV
    // (idTicket venait de la requête sans aucune vérification d'appartenance —
    // n'importe quel compte authentifié pouvait lire le RDV de n'importe quel
    // ticket, y compris d'une autre entreprise).
    $stmtTicket = $bdd->prepare("SELECT t.idUtilisateur, t.idTechnicien, u.idEntreprise AS idEntrepriseTicket
                                 FROM ticket t LEFT JOIN utilisateur u ON t.idUtilisateur = u.idUtilisateur
                                 WHERE t.idTicket = :idTicket");
    $stmtTicket->execute(['idTicket' => $idTicket]);
    $infoTicket = $stmtTicket->fetch(PDO::FETCH_ASSOC);

    if (!$infoTicket) {
        echo json_encode(['success' => false, 'error' => 'Ticket non trouvé.']);
        exit;
    }

    $role = $_SESSION['user']['role'] ?? '';
    $accesAutorise = false;
    if (estDirecteurPlateforme()) {
        $accesAutorise = true;
    } else if ($role === 'admin' || $role === 'directeur') {
        $idEntrepriseAppelant = $_SESSION['user']['idEntreprise'] ?? null;
        $accesAutorise = $idEntrepriseAppelant !== null && $infoTicket['idEntrepriseTicket'] !== null
            && (int)$infoTicket['idEntrepriseTicket'] === (int)$idEntrepriseAppelant;
    } else if (isset($_SESSION['user']['idTechnicien'])) {
        $accesAutorise = true; // technicien interne : mêmes droits que pour le chat/tickets
    } else {
        $idUtilisateurAppelant = (int)($_SESSION['user']['idUtilisateur'] ?? 0);
        $accesAutorise = ((int)$infoTicket['idUtilisateur'] === $idUtilisateurAppelant);
        if (!$accesAutorise && $idUtilisateurAppelant) {
            // Membre ajouté au ticket (cf. membresTicket.php).
            $reqMembre = $bdd->prepare("SELECT COUNT(*) FROM ticketMembres WHERE idTicket = ? AND idUtilisateur = ?");
            $reqMembre->execute([$idTicket, $idUtilisateurAppelant]);
            $accesAutorise = $reqMembre->fetchColumn() > 0;
        }
    }

    if (!$accesAutorise) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Accès non autorisé à ce ticket.']);
        exit;
    }

    $stmt = $bdd->prepare("SELECT * FROM Calendrier WHERE idTicket = :idTicket ORDER BY date DESC, heure DESC LIMIT 1");
    $stmt->execute(['idTicket' => $idTicket]);
    $rdv = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($rdv) {
        echo json_encode(['success' => true, 'rdv' => $rdv]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Aucun RDV trouvé pour ce ticket.']);
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Erreur BDD.']);
}
