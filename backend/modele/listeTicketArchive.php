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

require __DIR__ . '/../connexionBDD.php';

// Endpoint pour récupérer les tickets archivés
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // Pour les statistiques de la page d'affichage, tout le monde voit les mêmes archives
        $archives = obtenirToutesLesArchives($bdd);
        
        echo json_encode(['success' => true, 'archives' => $archives]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Erreur serveur.']);
    }
}

function obtenirArchivesParEntreprise($bdd, $idEntreprise) {
    $requete = $bdd->prepare("
        SELECT at.*, 
               u.nomUtilisateur as nomUtilisateur, u.prenomUtilisateur as prenomUtilisateur,
               t.nomTechnicien as nomTechnicien, t.prenomTechnicien as prenomTechnicien
        FROM archiveTicket at
        LEFT JOIN utilisateur u ON at.idUtilisateur = u.idUtilisateur
        LEFT JOIN techniciens t ON at.idTechnicien = t.idTechnicien
        WHERE u.idEntreprise = :idEntreprise
        ORDER BY at.dateCreation DESC
    ");
    $requete->execute([':idEntreprise' => $idEntreprise]);
    return $requete->fetchAll(PDO::FETCH_ASSOC);
}

function obtenirArchivesParTechnicien($bdd, $idTechnicien) {
    $requete = $bdd->prepare("
        SELECT at.*, 
               u.nomUtilisateur as nomUtilisateur, u.prenomUtilisateur as prenomUtilisateur,
               t.nomTechnicien as nomTechnicien, t.prenomTechnicien as prenomTechnicien
        FROM archiveTicket at
        LEFT JOIN utilisateur u ON at.idUtilisateur = u.idUtilisateur
        LEFT JOIN techniciens t ON at.idTechnicien = t.idTechnicien
        WHERE at.idTechnicien = :idTechnicien
        ORDER BY at.dateCreation DESC
    ");
    $requete->execute([':idTechnicien' => $idTechnicien]);
    return $requete->fetchAll(PDO::FETCH_ASSOC);
}

function obtenirToutesLesArchives($bdd) {
    $requete = $bdd->prepare("
        SELECT at.*, 
               u.nomUtilisateur as nomUtilisateur, u.prenomUtilisateur as prenomUtilisateur,
               t.nomTechnicien as nomTechnicien, t.prenomTechnicien as prenomTechnicien
        FROM archiveTicket at
        LEFT JOIN utilisateur u ON at.idUtilisateur = u.idUtilisateur
        LEFT JOIN techniciens t ON at.idTechnicien = t.idTechnicien
        ORDER BY at.dateCreation DESC
    ");
    $requete->execute();
    return $requete->fetchAll(PDO::FETCH_ASSOC);
}

function obtenirArchivesParUtilisateur($bdd, $idUtilisateur) {
    $requete = $bdd->prepare("
        SELECT at.*, 
               u.nomUtilisateur as nomUtilisateur, u.prenomUtilisateur as prenomUtilisateur,
               t.nomTechnicien as nomTechnicien, t.prenomTechnicien as prenomTechnicien
        FROM archiveTicket at
        LEFT JOIN utilisateur u ON at.idUtilisateur = u.idUtilisateur
        LEFT JOIN techniciens t ON at.idTechnicien = t.idTechnicien
        WHERE at.idUtilisateur = :idUtilisateur
        ORDER BY at.dateCreation DESC
    ");
    $requete->execute([':idUtilisateur' => $idUtilisateur]);
    return $requete->fetchAll(PDO::FETCH_ASSOC);
}
?> 