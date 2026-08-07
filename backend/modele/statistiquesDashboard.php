<?php
// Forcer le rechargement et vider le cache
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");
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

require_once '../connexionBDD.php';

try {
    // Vérifier si l'utilisateur est un admin référent
    $idEntreprise = null;
    if (isset($_SESSION['user']) && isset($_SESSION['user']['role']) && ($_SESSION['user']['role'] === 'referent' || $_SESSION['user']['role'] === 'admin')) {
        $idEntreprise = $_SESSION['user']['idEntreprise'] ?? null;
    }
    
    // Préparer la clause WHERE pour le filtrage par entreprise
    $whereClause = "";
    $params = [];
    if ($idEntreprise) {
        $whereClause = " INNER JOIN utilisateur u ON t.idUtilisateur = u.idUtilisateur WHERE u.idEntreprise = :idEntreprise";
        $params[':idEntreprise'] = $idEntreprise;
    }
    
    // Statistiques des tickets
    $stmt = $bdd->prepare("
        SELECT 
            COUNT(*) as total_tickets,
            SUM(CASE WHEN t.statut = 'en_attente' THEN 1 ELSE 0 END) as tickets_en_attente,
            SUM(CASE WHEN t.statut = 'en_cours' THEN 1 ELSE 0 END) as tickets_en_cours,
            SUM(CASE WHEN t.statut IN ('resolu', 'ferme') THEN 1 ELSE 0 END) as tickets_resolus,
            SUM(CASE WHEN t.priorite = 'urgente' THEN 1 ELSE 0 END) as tickets_urgents,
            SUM(CASE WHEN DATEDIFF(NOW(), t.dateCreation) > 7 AND t.statut NOT IN ('resolu', 'ferme') THEN 1 ELSE 0 END) as tickets_en_retard,
            SUM(CASE WHEN t.dateCreation >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as tickets_semaine
        FROM ticket t" . $whereClause
    );
    if ($idEntreprise) {
        $stmt->bindParam(':idEntreprise', $idEntreprise, PDO::PARAM_INT);
    }
    $stmt->execute();
    $statsTickets = $stmt->fetch(PDO::FETCH_ASSOC);

    // Statistiques des utilisateurs (employés seulement)
    $whereUtilisateurs = "";
    $paramsUtilisateurs = [];
    if ($idEntreprise) {
        $whereUtilisateurs = " WHERE idEntreprise = :idEntreprise";
        $paramsUtilisateurs[':idEntreprise'] = $idEntreprise;
    }
    
    $stmt = $bdd->prepare("
        SELECT 
            COUNT(*) as total_utilisateurs,
            SUM(CASE WHEN roleEntreprise = 'employe' THEN 1 ELSE 0 END) as utilisateurs_actifs,
            SUM(CASE WHEN roleEntreprise != 'employe' THEN 1 ELSE 0 END) as utilisateurs_desactives
        FROM utilisateur" . $whereUtilisateurs
    );
    if ($idEntreprise) {
        $stmt->bindParam(':idEntreprise', $idEntreprise, PDO::PARAM_INT);
    }
    $stmt->execute();
    $statsUtilisateurs = $stmt->fetch(PDO::FETCH_ASSOC);

    // Statistiques des techniciens
    $stmt = $bdd->prepare("
        SELECT 
            COUNT(*) as total_techniciens,
            SUM(CASE WHEN role = 'technicien' THEN 1 ELSE 0 END) as techniciens_actifs,
            SUM(CASE WHEN role = 'technicien' THEN 1 ELSE 0 END) as techniciens_disponibles
        FROM techniciens
    ");
    $stmt->execute();
    $statsTechniciens = $stmt->fetch(PDO::FETCH_ASSOC);

    // Statistiques des entreprises
    $stmt = $bdd->prepare("SELECT COUNT(*) as total_entreprises FROM entreprise");
    $stmt->execute();
    $statsEntreprises = $stmt->fetch(PDO::FETCH_ASSOC);

    // Tickets récents (derniers 10)
    $whereTicketsRecents = "";
    if ($idEntreprise) {
        $whereTicketsRecents = " WHERE u.idEntreprise = :idEntreprise";
    }
    
    $stmt = $bdd->prepare("
        SELECT t.*, u.nomUtilisateur, u.prenomUtilisateur, e.nomEntreprise
        FROM ticket t
        LEFT JOIN utilisateur u ON t.idUtilisateur = u.idUtilisateur
        LEFT JOIN entreprise e ON u.idEntreprise = e.idEntreprise" . $whereTicketsRecents . "
        ORDER BY t.dateCreation DESC
        LIMIT 10
    ");
    if ($idEntreprise) {
        $stmt->bindParam(':idEntreprise', $idEntreprise, PDO::PARAM_INT);
    }
    $stmt->execute();
    $ticketsRecents = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Tickets urgents
    $stmt = $bdd->prepare("
        SELECT t.*, u.nomUtilisateur, u.prenomUtilisateur, e.nomEntreprise
        FROM ticket t
        LEFT JOIN utilisateur u ON t.idUtilisateur = u.idUtilisateur
        LEFT JOIN entreprise e ON u.idEntreprise = e.idEntreprise
        WHERE t.priorite = 'urgente' AND t.statut != 'resolu'
        ORDER BY t.dateCreation DESC
        LIMIT 5
    ");
    $stmt->execute();
    $ticketsUrgents = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Répartition des tickets par statut pour le camembert
    $stmt = $bdd->prepare("
        SELECT 
            statut,
            COUNT(*) as nombre
        FROM ticket
        GROUP BY statut
        ORDER BY nombre DESC
    ");
    $stmt->execute();
    $repartitionTickets = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Activités récentes (tickets créés récemment)
    $stmt = $bdd->prepare("
        SELECT 
            'ticket_creation' as type,
            t.idTicket,
            t.titre,
            t.dateCreation as date,
            u.nomUtilisateur,
            u.prenomUtilisateur,
            CASE 
                WHEN t.priorite = 'urgente' THEN 'Ticket urgent créé'
                WHEN t.statut = 'resolu' THEN 'Ticket résolu'
                ELSE 'Nouveau ticket créé'
            END as description,
            t.priorite,
            t.statut
        FROM ticket t
        LEFT JOIN utilisateur u ON t.idUtilisateur = u.idUtilisateur
        WHERE t.dateCreation >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        ORDER BY t.dateCreation DESC
        LIMIT 5
    ");
    $stmt->execute();
    $activitesRecentes = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $resultat = [
        'success' => true,
        'statistiques' => [
            'tickets' => $statsTickets,
            'utilisateurs' => $statsUtilisateurs,
            'techniciens' => $statsTechniciens,
            'entreprises' => $statsEntreprises
        ],
        'ticketsRecents' => $ticketsRecents,
        'ticketsUrgents' => $ticketsUrgents,
        'repartitionTickets' => $repartitionTickets,
        'activitesRecentes' => $activitesRecentes
    ];

    echo json_encode($resultat);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Erreur lors de la récupération des statistiques.']);
}
?> 