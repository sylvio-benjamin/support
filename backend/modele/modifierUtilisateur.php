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

$data = json_decode(file_get_contents("php://input"), true);

// Récupération des données selon la structure de la BDD
$idUtilisateur = $data['idUtilisateur'] ?? 0;
$loginUtilisateur = $data['loginUtilisateur'] ?? '';
$nomUtilisateur = $data['nomUtilisateur'] ?? '';
$prenomUtilisateur = $data['prenomUtilisateur'] ?? '';
$emailUtilisateur = $data['emailUtilisateur'] ?? '';
$motDePasseUtilisateur = $data['motDePasseUtilisateur'] ?? '';
$telephone = $data['telephone'] ?? null;
$naissance = empty($_POST['naissance']) ? null : $_POST['naissance'];

$photoprofil = $data['photoprofil'] ?? null;
$desactiver = $data['desactiver'] ?? 0;

// Un directeur "client" (compte de la table `utilisateur`, avec une
// idEntreprise en session) gère sa propre entreprise comme un admin référent :
// il peut fixer le rôle de ses employés, mais reste scopé à sa propre
// entreprise. Seul un directeur INTERNE (plateforme, sans idEntreprise en
// session) a une portée globale (toutes entreprises, idEntreprise arbitraire).
// Sans cette distinction, un directeur client pouvait modifier/déplacer
// N'IMPORTE QUEL utilisateur de N'IMPORTE QUELLE AUTRE entreprise (confirmé
// en conditions réelles).
$estDirecteur = ($_SESSION['user']['role'] === 'directeur');
$estDirecteurInterne = estDirecteurPlateforme();
$roleEntreprise = $estDirecteur ? ($data['roleEntreprise'] ?? 'employe') : 'employe';
$idEntreprise = $estDirecteurInterne ? ($data['idEntreprise'] ?? null) : ($_SESSION['user']['idEntreprise'] ?? null);

if (!$idEntreprise) {
    echo json_encode(['success' => false, 'error' => 'ID entreprise manquant.']);
    exit;
}

// Validation des champs obligatoires
if (empty($idUtilisateur) || empty($loginUtilisateur) || empty($nomUtilisateur) ||
    empty($prenomUtilisateur) || empty($emailUtilisateur)) {
    echo json_encode(['success' => false, 'error' => 'Tous les champs obligatoires sont requis.']);
    exit;
}

// Vérifier si l'utilisateur existe (scope entreprise pour tout le monde sauf
// le directeur INTERNE, qui peut gérer les utilisateurs de toutes les entreprises)
if ($estDirecteurInterne) {
    $stmt = $bdd->prepare("SELECT idUtilisateur FROM utilisateur WHERE idUtilisateur = :id");
    $stmt->bindParam(':id', $idUtilisateur);
} else {
    $stmt = $bdd->prepare("SELECT idUtilisateur FROM utilisateur WHERE idUtilisateur = :id AND idEntreprise = :idEntreprise");
    $stmt->bindParam(':id', $idUtilisateur);
    $stmt->bindParam(':idEntreprise', $idEntreprise);
}
$stmt->execute();

if ($stmt->rowCount() === 0) {
    echo json_encode(['success' => false, 'error' => 'Utilisateur non trouvé ou n\'appartient pas à votre entreprise.']);
    exit;
}

// Vérifier si le login existe déjà (sauf pour cet utilisateur)
$stmt = $bdd->prepare("SELECT idUtilisateur FROM utilisateur WHERE loginUtilisateur = :login AND idUtilisateur != :id");
$stmt->bindParam(':login', $loginUtilisateur);
$stmt->bindParam(':id', $idUtilisateur);
$stmt->execute();

if ($stmt->rowCount() > 0) {
    echo json_encode(['success' => false, 'error' => 'Ce login est déjà utilisé par un autre utilisateur.']);
    exit;
}

// Vérifier si l'email existe déjà (sauf pour cet utilisateur)
$stmt = $bdd->prepare("SELECT idUtilisateur FROM utilisateur WHERE emailUtilisateur = :email AND idUtilisateur != :id");
$stmt->bindParam(':email', $emailUtilisateur);
$stmt->bindParam(':id', $idUtilisateur);
$stmt->execute();

if ($stmt->rowCount() > 0) {
    echo json_encode(['success' => false, 'error' => 'Cet email est déjà utilisé par un autre utilisateur.']);
    exit;
}

try {
    // Construction de la requête SQL
    $sql = "UPDATE utilisateur SET 
            loginUtilisateur = :login,
            nomUtilisateur = :nom,
            prenomUtilisateur = :prenom,
            emailUtilisateur = :email,
            roleEntreprise = :role,
            telephone = :telephone,
            naissance = :naissance,
            photoprofil = :photoprofil,
            idEntreprise = :idEntreprise,
            desactiver = :desactiver";
    
    $params = [
        ':id' => $idUtilisateur,
        ':login' => $loginUtilisateur,
        ':nom' => $nomUtilisateur,
        ':prenom' => $prenomUtilisateur,
        ':email' => $emailUtilisateur,
        ':role' => $roleEntreprise,
        ':telephone' => $telephone,
        ':naissance' => $naissance,
        ':photoprofil' => $photoprofil,
        ':idEntreprise' => $idEntreprise,
        ':desactiver' => $desactiver
    ];
    
    // Si un nouveau mot de passe est fourni, l'ajouter à la requête
    if (!empty($motDePasseUtilisateur)) {
        $hashedPassword = password_hash($motDePasseUtilisateur, PASSWORD_DEFAULT);
        $sql .= ", motDePasseUtilisateur = :password";
        $params[':password'] = $hashedPassword;
    }
    
    $sql .= " WHERE idUtilisateur = :id";
    
    $stmt = $bdd->prepare($sql);
    
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    
    $stmt->execute();

    echo json_encode(['success' => true, 'message' => 'Utilisateur modifié avec succès.']);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Erreur lors de la modification.']);
}
?> 