<?php
require_once __DIR__ . '/../config/session.php';
startSecureSession();
require '../config/cors.php';
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Vérifie la session
if (!isset($_SESSION['user']) || !isset($_SESSION['user']['role'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Utilisateur non connecté']);
    exit;
}

// Vérifier que l'utilisateur est un admin référent
if ($_SESSION['user']['role'] !== 'referent' && $_SESSION['user']['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès non autorisé. Admin référent requis.']);
    exit;
}

// Vérifier que l'utilisateur a un ID et une entreprise
if (!isset($_SESSION['user']['idUtilisateur']) || !isset($_SESSION['user']['idEntreprise'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'ID utilisateur ou entreprise manquant']);
    exit;
}

require_once '../connexionBDD.php';

try {
    $idEntreprise = $_SESSION['user']['idEntreprise'];
    
    // Statistiques des tickets de l'entreprise
    $stmt = $bdd->prepare("
        SELECT 
            COUNT(*) as total_tickets,
            SUM(CASE WHEN t.statut = 'en_attente' THEN 1 ELSE 0 END) as tickets_en_attente,
            SUM(CASE WHEN t.statut = 'en_cours' THEN 1 ELSE 0 END) as tickets_en_cours,
            SUM(CASE WHEN t.statut IN ('resolu', 'ferme') THEN 1 ELSE 0 END) as tickets_resolus,
            SUM(CASE WHEN t.priorite = 'urgente' THEN 1 ELSE 0 END) as tickets_urgents,
            SUM(CASE WHEN DATEDIFF(NOW(), t.dateCreation) > 7 AND t.statut NOT IN ('resolu', 'ferme') THEN 1 ELSE 0 END) as tickets_en_retard,
            SUM(CASE WHEN t.dateCreation >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as tickets_semaine
        FROM ticket t 
        INNER JOIN utilisateur u ON t.idUtilisateur = u.idUtilisateur 
        WHERE u.idEntreprise = :idEntreprise
    ");
    $stmt->bindParam(':idEntreprise', $idEntreprise, PDO::PARAM_INT);
    $stmt->execute();
    $statsTickets = $stmt->fetch(PDO::FETCH_ASSOC);

    // Statistiques des utilisateurs de l'entreprise
    $stmt = $bdd->prepare("
        SELECT 
            COUNT(*) as total_utilisateurs,
            SUM(CASE WHEN roleEntreprise = 'employe' THEN 1 ELSE 0 END) as utilisateurs_actifs,
            SUM(CASE WHEN roleEntreprise = 'admin' THEN 1 ELSE 0 END) as admins_entreprise,
            SUM(CASE WHEN desactiver = 0 THEN 1 ELSE 0 END) as utilisateurs_actifs_total
        FROM utilisateur 
        WHERE idEntreprise = :idEntreprise
    ");
    $stmt->bindParam(':idEntreprise', $idEntreprise, PDO::PARAM_INT);
    $stmt->execute();
    $statsUtilisateurs = $stmt->fetch(PDO::FETCH_ASSOC);

    // Tickets récents de l'entreprise (derniers 10)
    $stmt = $bdd->prepare("
        SELECT t.idTicket, t.titre, t.statut, t.priorite, t.dateCreation,
               u.nomUtilisateur, u.prenomUtilisateur,
               tech.nomTechnicien, tech.prenomTechnicien
        FROM ticket t 
        INNER JOIN utilisateur u ON t.idUtilisateur = u.idUtilisateur 
        LEFT JOIN techniciens tech ON t.idTechnicien = tech.idTechnicien 
        WHERE u.idEntreprise = :idEntreprise
        ORDER BY t.dateCreation DESC 
        LIMIT 10
    ");
    $stmt->bindParam(':idEntreprise', $idEntreprise, PDO::PARAM_INT);
    $stmt->execute();
    $ticketsRecents = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Répartition par statut
    $stmt = $bdd->prepare("
        SELECT t.statut, COUNT(*) as nombre
        FROM ticket t 
        INNER JOIN utilisateur u ON t.idUtilisateur = u.idUtilisateur 
        WHERE u.idEntreprise = :idEntreprise
        GROUP BY t.statut
    ");
    $stmt->bindParam(':idEntreprise', $idEntreprise, PDO::PARAM_INT);
    $stmt->execute();
    $repartitionStatut = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Répartition par priorité
    $stmt = $bdd->prepare("
        SELECT t.priorite, COUNT(*) as nombre
        FROM ticket t 
        INNER JOIN utilisateur u ON t.idUtilisateur = u.idUtilisateur 
        WHERE u.idEntreprise = :idEntreprise
        GROUP BY t.priorite
    ");
    $stmt->bindParam(':idEntreprise', $idEntreprise, PDO::PARAM_INT);
    $stmt->execute();
    $repartitionPriorite = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Évolution des tickets sur les 30 derniers jours
    $stmt = $bdd->prepare("
        SELECT DATE(t.dateCreation) as date, COUNT(*) as nombre
        FROM ticket t 
        INNER JOIN utilisateur u ON t.idUtilisateur = u.idUtilisateur 
        WHERE u.idEntreprise = :idEntreprise 
        AND t.dateCreation >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY DATE(t.dateCreation)
        ORDER BY date
    ");
    $stmt->bindParam(':idEntreprise', $idEntreprise, PDO::PARAM_INT);
    $stmt->execute();
    $evolutionTickets = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'statistiques' => [
            'tickets' => $statsTickets,
            'utilisateurs' => $statsUtilisateurs,
            'ticketsRecents' => $ticketsRecents,
            'repartitionStatut' => $repartitionStatut,
            'repartitionPriorite' => $repartitionPriorite,
            'evolutionTickets' => $evolutionTickets
        ]
    ]);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Erreur de base de données.']);
}
?> 