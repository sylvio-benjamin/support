<?php
require '../config/cors.php';
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Endpoint volontairement SANS session : c'est la route de l'écran mural
// public (lien à token, remplace l'ancien compte kiosque 'affichage'). La
// seule barrière est le token lui-même — 32 octets aléatoires (64 caractères
// hex), comparé en temps constant pour éviter une attaque par timing.
//
// Par sécurité, cet endpoint ne renvoie QUE ce dont l'écran mural a besoin
// (tickets, archives, nombre de techniciens) : il ne réutilise pas
// listeTechnicien.php, qui expose en plus login/email/téléphone de chaque
// technicien à quiconque a le lien.
require_once '../connexionBDD.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

$token = $_GET['token'] ?? '';
if (!is_string($token) || $token === '') {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Token manquant']);
    exit;
}

$stmt = $bdd->query("SELECT tokenAffichage FROM parametresPlateforme WHERE id = 1");
$tokenAttendu = $stmt->fetchColumn();

if (!$tokenAttendu || !hash_equals($tokenAttendu, $token)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Lien invalide ou expiré']);
    exit;
}

try {
    $tickets = obtenirTousLesTicketsAffichage($bdd);
    $archives = obtenirToutesLesArchivesAffichage($bdd);

    $requeteCount = $bdd->query("SELECT COUNT(*) FROM techniciens");
    $technicienCount = (int) $requeteCount->fetchColumn();

    echo json_encode([
        'success' => true,
        'tickets' => $tickets,
        'archives' => $archives,
        'technicienCount' => $technicienCount,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erreur de base de données.']);
}

function obtenirTousLesTicketsAffichage($bdd) {
    // nombreMessages : pas de session sur cet écran public, donc "lu" est
    // défini comme "lu par AU MOINS UN directeur" (le plus récent des
    // dateLecture parmi tous les directeurs), plutôt qu'un simple total de
    // messages qui ne diminuait jamais — cohérent avec les badges affichés
    // ailleurs dans l'app (voir listeTicket.php::getMessagesNonLusQuery).
    $requete = $bdd->query("SELECT t.*,
                         u.nomUtilisateur, u.prenomUtilisateur,
                         tech.nomTechnicien, tech.prenomTechnicien,
                         e.nomEntreprise,
                         (SELECT COUNT(*) FROM conversation c
                          WHERE c.idTicket = t.idTicket
                          AND (
                              NOT EXISTS (
                                  SELECT 1 FROM messagesLus ml
                                  WHERE ml.idTicket = t.idTicket
                                  AND ml.typeUtilisateur = 'directeur'
                              )
                              OR c.dateEnvoi > (
                                  SELECT MAX(ml.dateLecture)
                                  FROM messagesLus ml
                                  WHERE ml.idTicket = t.idTicket
                                  AND ml.typeUtilisateur = 'directeur'
                              )
                          )) as nombreMessages,
                         CASE WHEN t.description LIKE '%[Ticket créé par le technicien%' THEN true ELSE false END as creerParTechnicien
                         FROM ticket t
                         LEFT JOIN utilisateur u ON t.idUtilisateur = u.idUtilisateur
                         LEFT JOIN techniciens tech ON t.idTechnicien = tech.idTechnicien
                         LEFT JOIN entreprise e ON u.idEntreprise = e.idEntreprise
                         ORDER BY t.dateCreation DESC");
    $tickets = $requete->fetchAll(PDO::FETCH_ASSOC);

    foreach ($tickets as &$ticket) {
        if (!$ticket['nomUtilisateur'] && !$ticket['prenomUtilisateur']) {
            if (preg_match('/\[Ticket urgent public\]\s*Email:\s*([^\n]+)\s*Nom utilisateur:\s*([^\n]+)/i', $ticket['description'], $matches)) {
                $ticket['prenomUtilisateur'] = 'Ticket';
                $ticket['nomUtilisateur'] = 'Urgent Public';
            }
        }
    }

    return $tickets;
}

function obtenirToutesLesArchivesAffichage($bdd) {
    $requete = $bdd->query("
        SELECT at.*,
               u.nomUtilisateur as nomUtilisateur, u.prenomUtilisateur as prenomUtilisateur,
               t.nomTechnicien as nomTechnicien, t.prenomTechnicien as prenomTechnicien
        FROM archiveTicket at
        LEFT JOIN utilisateur u ON at.idUtilisateur = u.idUtilisateur
        LEFT JOIN techniciens t ON at.idTechnicien = t.idTechnicien
        ORDER BY at.dateCreation DESC
    ");
    return $requete->fetchAll(PDO::FETCH_ASSOC);
}
