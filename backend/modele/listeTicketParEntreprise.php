<?php
require_once __DIR__ . '/../config/session.php';
startSecureSession();
require '../config/cors.php';
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
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

require_once __DIR__ . '/../connexionBDD.php';

// Endpoint pour récupérer les tickets de l'entreprise de l'admin référent
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $idEntreprise = $_SESSION['user']['idEntreprise'];
        
        // Récupérer uniquement les tickets de l'entreprise de l'admin référent
        $requete = $bdd->prepare("
            SELECT t.*, 
                   u.nomUtilisateur, u.prenomUtilisateur, 
                   tech.nomTechnicien, tech.prenomTechnicien,
                   e.nomEntreprise
            FROM ticket t 
            LEFT JOIN utilisateur u ON t.idUtilisateur = u.idUtilisateur 
            LEFT JOIN techniciens tech ON t.idTechnicien = tech.idTechnicien 
            LEFT JOIN entreprise e ON u.idEntreprise = e.idEntreprise
            WHERE u.idEntreprise = :idEntreprise
            ORDER BY t.dateCreation DESC
        ");
        $requete->bindParam(':idEntreprise', $idEntreprise, PDO::PARAM_INT);
        $requete->execute();
        $tickets = $requete->fetchAll(PDO::FETCH_ASSOC);
        
        // Correction des données de technicien si nécessaire
        foreach ($tickets as &$ticket) {
            if ($ticket['idTechnicien'] && (!$ticket['nomTechnicien'] || !$ticket['prenomTechnicien'])) {
                $requeteTech = $bdd->prepare("SELECT nomTechnicien, prenomTechnicien FROM techniciens WHERE idTechnicien = :idTechnicien");
                $requeteTech->execute([':idTechnicien' => $ticket['idTechnicien']]);
                $technicien = $requeteTech->fetch(PDO::FETCH_ASSOC);
                
                if ($technicien) {
                    $ticket['nomTechnicien'] = $technicien['nomTechnicien'];
                    $ticket['prenomTechnicien'] = $technicien['prenomTechnicien'];
                }
            }
        }
        
        echo json_encode(['success' => true, 'tickets' => $tickets]);
    } catch (PDOException $erreur) {
        echo json_encode(['success' => false, 'error' => 'Erreur de base de données.']);
    }
    exit;
}

// Si ce n'est pas une requête GET, retourner une erreur
http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
exit;
?> 