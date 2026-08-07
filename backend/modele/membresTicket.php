<?php
// Permet à un client (créateur du ticket, ou admin/directeur de son
// entreprise) d'ajouter d'autres employés de la MÊME entreprise à un ticket,
// pour qu'ils puissent le consulter et y répondre (visibilité partagée,
// même principe que le partage technicien->technicien de PartageUnTicket.php,
// mais côté client).
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
if (!isset($_SESSION['user']) || empty($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Non authentifié']);
    exit;
}

require_once '../connexionBDD.php';

function infoTicketPourMembres($bdd, $idTicket) {
    $stmt = $bdd->prepare("SELECT t.idTicket, t.idUtilisateur, u.idEntreprise
                            FROM ticket t
                            LEFT JOIN utilisateur u ON t.idUtilisateur = u.idUtilisateur
                            WHERE t.idTicket = :idTicket");
    $stmt->execute(['idTicket' => $idTicket]);
    return $stmt->fetch(PDO::FETCH_ASSOC);
}

// Vrai si l'appelant peut gérer (ajouter/retirer) les membres de ce ticket :
// le créateur du ticket, un admin/directeur "client" de la même entreprise,
// ou un directeur plateforme.
function peutGererMembres($infoTicket) {
    if (estDirecteurPlateforme()) return true;
    $user = $_SESSION['user'];
    $role = $user['role'] ?? '';
    if ($role === 'admin' || $role === 'directeur') {
        $idEntrepriseAppelant = $user['idEntreprise'] ?? null;
        return $idEntrepriseAppelant !== null && $infoTicket['idEntreprise'] !== null
            && (int)$idEntrepriseAppelant === (int)$infoTicket['idEntreprise'];
    }
    $idUtilisateurAppelant = $user['idUtilisateur'] ?? null;
    return $idUtilisateurAppelant !== null && (int)$idUtilisateurAppelant === (int)$infoTicket['idUtilisateur'];
}

// Vrai si l'appelant peut simplement CONSULTER la liste des membres (en plus
// des personnes ci-dessus : n'importe quel membre déjà ajouté au ticket).
function peutVoirMembres($bdd, $infoTicket) {
    if (peutGererMembres($infoTicket)) return true;
    $idUtilisateurAppelant = $_SESSION['user']['idUtilisateur'] ?? null;
    if (!$idUtilisateurAppelant) return false;
    $stmt = $bdd->prepare("SELECT COUNT(*) FROM ticketMembres WHERE idTicket = :idTicket AND idUtilisateur = :idUtilisateur");
    $stmt->execute(['idTicket' => $infoTicket['idTicket'], 'idUtilisateur' => $idUtilisateurAppelant]);
    return $stmt->fetchColumn() > 0;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $idTicket = isset($_GET['idTicket']) ? (int)$_GET['idTicket'] : 0;
    if (!$idTicket) {
        echo json_encode(['success' => false, 'error' => 'idTicket manquant']);
        exit;
    }
    $infoTicket = infoTicketPourMembres($bdd, $idTicket);
    if (!$infoTicket) {
        echo json_encode(['success' => false, 'error' => 'Ticket non trouvé.']);
        exit;
    }
    if (!peutVoirMembres($bdd, $infoTicket)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Accès non autorisé à ce ticket.']);
        exit;
    }
    $stmt = $bdd->prepare("SELECT tm.idUtilisateur, u.nomUtilisateur, u.prenomUtilisateur, u.emailUtilisateur, u.photoprofil
                            FROM ticketMembres tm
                            JOIN utilisateur u ON tm.idUtilisateur = u.idUtilisateur
                            WHERE tm.idTicket = :idTicket
                            ORDER BY u.nomUtilisateur, u.prenomUtilisateur");
    $stmt->execute(['idTicket' => $idTicket]);
    echo json_encode(['success' => true, 'membres' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true) ?? [];
    $idTicket = isset($data['idTicket']) ? (int)$data['idTicket'] : 0;
    $idUtilisateurCible = isset($data['idUtilisateur']) ? (int)$data['idUtilisateur'] : 0;
    $action = $data['action'] ?? 'ajouter';

    if (!$idTicket || !$idUtilisateurCible) {
        echo json_encode(['success' => false, 'error' => 'Paramètres manquants']);
        exit;
    }

    $infoTicket = infoTicketPourMembres($bdd, $idTicket);
    if (!$infoTicket) {
        echo json_encode(['success' => false, 'error' => 'Ticket non trouvé.']);
        exit;
    }

    if ($action === 'retirer') {
        // Le gestionnaire du ticket peut retirer n'importe quel membre ; un
        // membre peut aussi se retirer lui-même.
        $idUtilisateurAppelant = $_SESSION['user']['idUtilisateur'] ?? null;
        $estSoiMeme = $idUtilisateurAppelant !== null && (int)$idUtilisateurAppelant === $idUtilisateurCible;
        if (!peutGererMembres($infoTicket) && !$estSoiMeme) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Accès non autorisé.']);
            exit;
        }
        $stmt = $bdd->prepare("DELETE FROM ticketMembres WHERE idTicket = :idTicket AND idUtilisateur = :idUtilisateur");
        $stmt->execute(['idTicket' => $idTicket, 'idUtilisateur' => $idUtilisateurCible]);
        echo json_encode(['success' => true]);
        exit;
    }

    // Ajout d'un membre
    if (!peutGererMembres($infoTicket)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Accès non autorisé à ce ticket.']);
        exit;
    }

    // Le membre ajouté doit appartenir à la MÊME entreprise que le ticket
    // (jamais un employé d'une autre entreprise cliente).
    $stmtCible = $bdd->prepare("SELECT idEntreprise FROM utilisateur WHERE idUtilisateur = :id");
    $stmtCible->execute(['id' => $idUtilisateurCible]);
    $idEntrepriseCible = $stmtCible->fetchColumn();
    if ($idEntrepriseCible === false || $infoTicket['idEntreprise'] === null
        || (int)$idEntrepriseCible !== (int)$infoTicket['idEntreprise']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => "Cette personne n'appartient pas à la même entreprise que le ticket."]);
        exit;
    }

    if ($idUtilisateurCible === (int)$infoTicket['idUtilisateur']) {
        echo json_encode(['success' => false, 'error' => 'Cette personne est déjà le créateur du ticket.']);
        exit;
    }

    $idAppelant = $_SESSION['user']['idUtilisateur'] ?? $_SESSION['user']['idTechnicien'] ?? 0;
    try {
        $stmt = $bdd->prepare("INSERT INTO ticketMembres (idTicket, idUtilisateur, ajoutePar) VALUES (:idTicket, :idUtilisateur, :ajoutePar)");
        $stmt->execute(['idTicket' => $idTicket, 'idUtilisateur' => $idUtilisateurCible, 'ajoutePar' => $idAppelant]);
    } catch (PDOException $e) {
        // Contrainte UNIQUE(idTicket, idUtilisateur) : déjà membre.
        echo json_encode(['success' => false, 'error' => 'Cette personne est déjà membre de ce ticket.']);
        exit;
    }
    echo json_encode(['success' => true]);
    exit;
}

echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
