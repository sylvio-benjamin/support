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
require_once __DIR__ . '/emailCompteHelper.php';

$data = json_decode(file_get_contents("php://input"), true);

// Récupération des données selon la structure de la BDD
$loginUtilisateur = $data['loginUtilisateur'] ?? '';
$nomUtilisateur = $data['nomUtilisateur'] ?? '';
$prenomUtilisateur = $data['prenomUtilisateur'] ?? '';
$emailUtilisateur = $data['emailUtilisateur'] ?? '';
$motDePasseUtilisateur = $data['motDePasseUtilisateur'] ?? '';
$telephone = $data['telephone'] ?? null;
$naissance = $data['naissance'] ?? null;

$photoprofil = $data['photoprofil'] ?? null;
$desactiver = $data['desactiver'] ?? 0;

// idEntreprise et roleEntreprise ne doivent JAMAIS être pris tels quels depuis
// le client : ni l'un ni l'autre n'étaient validés, ce qui permettait à un
// simple admin référent d'une entreprise de créer un compte 'directeur' dans
// N'IMPORTE QUELLE AUTRE entreprise (prise de contrôle complète). Le frontend
// lui-même n'envoie jamais roleEntreprise='directeur' via cet endpoint ("Admin
// référent ne peut créer que des employés", app/admin/liste-employes/page.tsx)
// et ne laisse un admin/referent choisir que sa PROPRE entreprise.
$rolesAutorisesParDefaut = ['employe', 'admin'];
$roleEntrepriseDemande = $data['roleEntreprise'] ?? 'employe';

if (estDirecteurPlateforme()) {
    // Seul le directeur INTERNE peut choisir l'entreprise cible et créer un
    // compte 'directeur' client (ex: onboarding d'une nouvelle entreprise).
    $idEntreprise = $data['idEntreprise'] ?? null;
    $roleEntreprise = in_array($roleEntrepriseDemande, ['employe', 'admin', 'directeur'], true)
        ? $roleEntrepriseDemande : 'employe';
} else {
    // Admin référent / directeur "client" : scopé à sa propre entreprise, et
    // ne peut jamais créer un compte 'directeur'.
    $idEntreprise = $_SESSION['user']['idEntreprise'] ?? null;
    $roleEntreprise = in_array($roleEntrepriseDemande, $rolesAutorisesParDefaut, true)
        ? $roleEntrepriseDemande : 'employe';
}

if (!$idEntreprise) {
    echo json_encode(['success' => false, 'error' => 'ID entreprise manquant']);
    exit;
}

// Validation des champs obligatoires
if (empty($loginUtilisateur) || empty($nomUtilisateur) || empty($prenomUtilisateur) || 
    empty($emailUtilisateur) || empty($motDePasseUtilisateur)) {
    echo json_encode(['success' => false, 'error' => 'Tous les champs obligatoires sont requis.']);
    exit;
}

// Vérifier si le login existe déjà
$stmt = $bdd->prepare("SELECT idUtilisateur FROM utilisateur WHERE loginUtilisateur = :login");
$stmt->bindParam(':login', $loginUtilisateur);
$stmt->execute();

if ($stmt->rowCount() > 0) {
    echo json_encode(['success' => false, 'error' => 'Ce login est déjà utilisé.']);
    exit;
}

// Vérifier si l'email existe déjà
$stmt = $bdd->prepare("SELECT idUtilisateur FROM utilisateur WHERE emailUtilisateur = :email");
$stmt->bindParam(':email', $emailUtilisateur);
$stmt->execute();

if ($stmt->rowCount() > 0) {
    echo json_encode(['success' => false, 'error' => 'Cet email est déjà utilisé.']);
    exit;
}

// Hashage du mot de passe
$hashedPassword = password_hash($motDePasseUtilisateur, PASSWORD_DEFAULT);

try {
    $stmt = $bdd->prepare(
        "INSERT INTO utilisateur (
            loginUtilisateur,
            nomUtilisateur,
            prenomUtilisateur,
            emailUtilisateur,
            motDePasseUtilisateur,
            doitChangerMotDePasse,
            roleEntreprise,
            telephone,
            naissance,
            photoprofil,
            idEntreprise,
            desactiver
        ) VALUES (
            :login,
            :nom,
            :prenom,
            :email,
            :password,
            1,
            :role,
            :telephone,
            :naissance,
            :photoprofil,
            :idEntreprise,
            :desactiver
        )"
    );

    // Le mot de passe est saisi par la personne qui crée le compte (directeur/
    // admin), pas par le futur titulaire : on force un changement à la
    // première connexion pour que le créateur ne connaisse plus le mot de
    // passe actif du compte.
    $stmt->bindParam(':login', $loginUtilisateur);
    $stmt->bindParam(':nom', $nomUtilisateur);
    $stmt->bindParam(':prenom', $prenomUtilisateur);
    $stmt->bindParam(':email', $emailUtilisateur);
    $stmt->bindParam(':password', $hashedPassword);
    $stmt->bindParam(':role', $roleEntreprise);
    $stmt->bindParam(':telephone', $telephone);
    $stmt->bindParam(':naissance', $naissance);
    $stmt->bindParam(':photoprofil', $photoprofil);
    $stmt->bindParam(':idEntreprise', $idEntreprise);
    $stmt->bindParam(':desactiver', $desactiver);

    $stmt->execute();

    // Best-effort : un échec d'envoi ne doit jamais faire échouer la
    // création du compte (le mot de passe en clair n'existe qu'ici, à cet
    // instant — impossible de le renvoyer plus tard si l'email échoue).
    envoyerEmailCompteCree($emailUtilisateur, $prenomUtilisateur, $loginUtilisateur, $motDePasseUtilisateur);

    echo json_encode(['success' => true, 'message' => 'Utilisateur créé avec succès.']);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Erreur lors de la création.']);
}
?>
