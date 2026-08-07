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

// Seul un directeur INTERNE (plateforme) peut créer des comptes
// technicien/référent/directeur (table `techniciens`, portée plateforme).
// role==='directeur' seul inclut aussi un directeur "client" (une seule
// entreprise) : sans cette distinction, n'importe quel directeur client
// pouvait se créer lui-même un compte directeur PLATEFORME — escalade de
// privilège complète, confirmée exploitable par le même pattern que
// desactiverEntreprise.php.
if (!estDirecteurPlateforme()) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Non autorisé.']);
    exit();
}

require_once '../connexionBDD.php';
require_once __DIR__ . '/emailCompteHelper.php';

$data = json_decode(file_get_contents("php://input"), true);

// Support pour POST et JSON
$login = $data['login'] ?? $_POST['login'] ?? '';
$nom = $data['nom'] ?? $_POST['nom'] ?? '';
$prenom = $data['prenom'] ?? $_POST['prenom'] ?? '';
$email = $data['email'] ?? $_POST['email'] ?? '';
$password = $data['password'] ?? $_POST['password'] ?? '';
$role = $data['role'] ?? $_POST['role'] ?? 'technicien'; // 'technicien', 'referent', 'directeur'
$idService = $data['idService'] ?? $_POST['idService'] ?? null; // Service à assigner au technicien (rétrocompatibilité)
$services = $data['services'] ?? $_POST['services'] ?? null; // Services multiples à assigner au technicien

// L'ancien rôle 'affichage' (compte kiosque en lecture seule) a été retiré :
// l'écran mural (support-it/app/affichage/) est désormais protégé soit par
// la session directeur, soit par le lien public à token (voir
// affichagePublic.php / getLienAffichage.php), plus besoin d'un compte dédié.
$rolesAutorises = ['technicien', 'referent', 'directeur'];
if (!in_array($role, $rolesAutorises, true)) {
    echo json_encode(['success' => false, 'error' => 'Rôle invalide.']);
    exit();
}

// Valeurs par défaut pour les champs supplémentaires. '0000-00-00' est rejeté
// par le sql_mode strict par défaut de MySQL (NO_ZERO_DATE) : NULL (comme dans
// inscriptionUtilisateur.php) est la valeur "champ non renseigné" correcte.
$telephone = '';
$naissance = $data['naissance'] ?? $_POST['naissance'] ?? null;

if (empty($login) || empty($nom) || empty($prenom) || empty($password) || empty($email) || empty($role)) {
    echo json_encode(['success' => false, 'error' => 'Tous les champs sont requis.']);
    exit;
}

// Vérifier si le login existe déjà
$stmt = $bdd->prepare("SELECT idTechnicien FROM techniciens WHERE loginTechnicien = :login");
$stmt->bindParam(':login', $login);
$stmt->execute();

if ($stmt->rowCount() > 0) {
    echo json_encode(['success' => false, 'error' => 'Ce login est déjà utilisé.']);
    exit;
}

$hashedPassword = password_hash($password, PASSWORD_DEFAULT);

// Comme pour inscriptionUtilisateur.php : le mot de passe est saisi par la
// personne qui crée le compte, pas par le futur titulaire — on force un
// changement à la première connexion.
$stmt = $bdd->prepare("INSERT INTO techniciens (loginTechnicien, nomTechnicien, prenomTechnicien, emailTechnicien, motDePasse, doitChangerMotDePasse, role, telephone, naissance) VALUES (:login, :nom, :prenom, :email, :password, 1, :role, :telephone, :naissance)");

$stmt->bindParam(':login', $login);
$stmt->bindParam(':nom', $nom);
$stmt->bindParam(':prenom', $prenom);
$stmt->bindParam(':email', $email);
$stmt->bindParam(':password', $hashedPassword);
$stmt->bindParam(':role', $role);
$stmt->bindParam(':telephone', $telephone);
$stmt->bindParam(':naissance', $naissance);

try {
    $inscriptionReussie = $stmt->execute();
} catch (PDOException $e) {
    error_log('inscriptionTechniciens.php : ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erreur lors de l\'inscription.']);
    exit;
}

if ($inscriptionReussie) {
    $idTechnicien = $bdd->lastInsertId();

    // Best-effort : un échec d'envoi ne doit jamais faire échouer la
    // création du compte (le mot de passe en clair n'existe qu'ici).
    envoyerEmailCompteCree($email, $prenom, $login, $password, 'lyovatech');
    
    // Gérer l'assignation de services (multiple ou unique)
    if ($role === 'technicien') {
        $servicesAAssigner = [];
        
        // Priorité aux services multiples, sinon service unique pour rétrocompatibilité
        if ($services !== null && is_array($services) && !empty($services)) {
            $servicesAAssigner = $services;
        } elseif ($idService !== null) {
            $servicesAAssigner = [$idService];
        }
        
        if (!empty($servicesAAssigner)) {
            try {
                $stmtRole = $bdd->prepare("INSERT INTO roleTechnicien (idTechnicien, idService) VALUES (:idTechnicien, :idService)");
                $servicesAssignes = 0;
                
                foreach ($servicesAAssigner as $serviceId) {
                    $stmtRole->bindParam(':idTechnicien', $idTechnicien);
                    $stmtRole->bindParam(':idService', $serviceId);
                    
                    if ($stmtRole->execute()) {
                        $servicesAssignes++;
                    }
                }
                
                if ($servicesAssignes > 0) {
                    $message = $servicesAssignes === 1 ? 
                        'Technicien inscrit avec succès et service assigné.' : 
                        "Technicien inscrit avec succès et $servicesAssignes services assignés.";
                    echo json_encode(['success' => true, 'message' => $message]);
                } else {
                    echo json_encode(['success' => true, 'message' => 'Technicien inscrit avec succès mais erreur lors de l\'assignation des services.']);
                }
            } catch (PDOException $e) {
                echo json_encode(['success' => true, 'message' => 'Technicien inscrit avec succès mais erreur lors de l\'assignation des services.']);
            }
        } else {
            echo json_encode(['success' => true, 'message' => 'Technicien inscrit avec succès.']);
        }
    } else {
        echo json_encode(['success' => true, 'message' => 'Technicien inscrit avec succès.']);
    }
} else {
    echo json_encode(['success' => false, 'error' => 'Erreur lors de l\'inscription.']);
}
?>  