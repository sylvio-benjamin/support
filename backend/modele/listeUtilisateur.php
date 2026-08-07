<?php
require '../config/cors.php';
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
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

// Seul un directeur a une vue globale sur TOUTES les entreprises (cet endpoint
// ne filtre par aucun idEntreprise) — admin/technicien/referent doivent passer
// par listeUtilisateurParEntreprise.php, qui filtre sur leur propre entreprise.
// Le frontend respecte déjà cette distinction (app/directeur/utilisateur/page.tsx
// n'appelle cet endpoint que pour le rôle 'directeur') ; la restreindre ici
// aussi empêche un accès direct qui contournerait ce routage côté client et
// exposerait les utilisateurs de TOUTES les entreprises à un compte referent/
// admin/technicien d'une seule d'entre elles.
$rolesAutorises = ['directeur'];
if (!in_array($_SESSION['user']['role'], $rolesAutorises)) {
    http_response_code(403);
    echo json_encode(['erreur' => 'Accès non autorisé']);
    exit;
}

require_once __DIR__ . '/../connexionBDD.php';

// Endpoint pour récupérer tous les utilisateurs
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $utilisateurs = listeUtilisateur($bdd);
    echo json_encode(['success' => true, 'utilisateurs' => $utilisateurs]);
    exit;
}

function listeUtilisateur($bdd){
    // Colonnes explicites : jamais motDePasseUtilisateur (hash bcrypt), qu'aucun
    // affichage frontend ne doit recevoir.
    $stmt = $bdd->prepare("SELECT u.idUtilisateur, u.nomUtilisateur, u.prenomUtilisateur,
                                u.emailUtilisateur, u.idEntreprise, u.roleEntreprise,
                                u.loginUtilisateur, u.telephone, u.naissance, u.desactiver,
                                u.photoprofil, e.nomEntreprise
                         FROM utilisateur u
                         LEFT JOIN entreprise e ON u.idEntreprise = e.idEntreprise
                         ORDER BY u.nomUtilisateur, u.prenomUtilisateur");
    $stmt->execute();
    $utilisateurs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    return $utilisateurs;
}

function rechercheUtilisateur($login, $bdd){
    $stmt = $bdd->prepare("SELECT * FROM utilisateur WHERE loginUtilisateur = :login");
    $stmt->bindParam(':login', $login);
    $stmt->execute();
    return $stmt;
}
function rechercheUtilisateurParId($utilisateurId, $bdd){
    $stmt = $bdd->prepare("SELECT * FROM utilisateur WHERE utilisateurId = :utilisateurId");
    $stmt->bindParam(':utilisateurId', $utilisateurId);
    $stmt->execute();
    return $stmt;
}
?>
