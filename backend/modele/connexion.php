<?php
require '../config/cors.php';
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

require_once __DIR__ . '/../config/session.php';
require_once __DIR__ . '/../config/csrf.php';
startSecureSession();

require_once '../connexionBDD.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $identifiant = $_POST['login'];
    $motDePasse = $_POST['password'];
    $type = $_POST['type'] ?? 'technicien'; // Type de compte (technicien ou utilisateur)
    $ipAppelant = $_SERVER['REMOTE_ADDR'] ?? 'inconnu';

    $bdd->exec("CREATE TABLE IF NOT EXISTS login_attempts_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ip VARCHAR(45) NOT NULL,
        identifiant VARCHAR(100) NOT NULL,
        dateEssai TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ip_date (ip, dateEssai),
        INDEX idx_identifiant_date (identifiant, dateEssai)
    )");

    // Honeypot anti-bot : champ masqué en CSS côté frontend, qu'un humain ne
    // remplit jamais. Un script générique qui teste des identifiants sur ce
    // formulaire le remplira souvent aveuglément.
    $honeypotDeclenche = !empty($_POST['siteWeb']);

    // Limitation des tentatives échouées, par IP (brute-force distribué) ET
    // par identifiant ciblé (brute-force sur un seul compte) — les deux sont
    // nécessaires, une seule des deux se contourne trivialement.
    $stmtEchecsIp = $bdd->prepare("SELECT COUNT(*) FROM login_attempts_log WHERE ip = :ip AND dateEssai > DATE_SUB(NOW(), INTERVAL 15 MINUTE)");
    $stmtEchecsIp->execute([':ip' => $ipAppelant]);
    $stmtEchecsLogin = $bdd->prepare("SELECT COUNT(*) FROM login_attempts_log WHERE identifiant = :id AND dateEssai > DATE_SUB(NOW(), INTERVAL 15 MINUTE)");
    $stmtEchecsLogin->execute([':id' => $identifiant]);

    if ($honeypotDeclenche || (int)$stmtEchecsIp->fetchColumn() >= 10 || (int)$stmtEchecsLogin->fetchColumn() >= 5) {
        // Réponse identique à un échec normal : ne révèle ni le honeypot ni
        // le rate limit à l'appelant (bot ou attaquant).
        $stmtLogEchec = $bdd->prepare("INSERT INTO login_attempts_log (ip, identifiant) VALUES (:ip, :id)");
        $stmtLogEchec->execute([':ip' => $ipAppelant, ':id' => $identifiant]);
        http_response_code($honeypotDeclenche ? 200 : 429);
        echo json_encode(['success' => false, 'error' => $honeypotDeclenche ? 'Login ou mot de passe incorrect' : 'Trop de tentatives. Réessayez dans quelques minutes.']);
        exit;
    }

    // Enregistre une tentative échouée (IP + identifiant), appelé avant
    // chaque réponse success:false ci-dessous.
    $logEchecConnexion = function () use ($bdd, $ipAppelant, $identifiant) {
        $stmt = $bdd->prepare("INSERT INTO login_attempts_log (ip, identifiant) VALUES (:ip, :id)");
        $stmt->execute([':ip' => $ipAppelant, ':id' => $identifiant]);
    };

    if ($type === 'technicien') {
        // Connexion technicien ou directeur
        // D'abord, essayer de se connecter en tant que technicien
        $requete = $bdd->prepare("SELECT * FROM techniciens WHERE loginTechnicien = :identifiant");
        $requete->bindParam(':identifiant', $identifiant);
        $requete->execute();

        if ($requete->rowCount() > 0) {
            $utilisateur = $requete->fetch(PDO::FETCH_ASSOC);

            if (password_verify($motDePasse, $utilisateur['motDePasse'])) {
                // Nouvel identifiant de session après authentification (empêche la fixation de session).
                session_regenerate_id(true);
                emettreTokenCsrf();
                $role = !empty($utilisateur['role']) ? $utilisateur['role'] : 'technicien';
                $_SESSION['user'] = [
                    'idTechnicien' => $utilisateur['idTechnicien'],
                    'role' => $role,
                    'nom' => $utilisateur['nomTechnicien'],
                    'prenom' => $utilisateur['prenomTechnicien'],
                    'email' => $utilisateur['emailTechnicien']
                ];
                $_SESSION['user_type'] = 'technicien';
                $_SESSION['user_id'] = $utilisateur['idTechnicien'];
                echo json_encode([
                    'success' => true, 
                    'role' => $role,
                    'type' => 'technicien',
                    'user' => [
                        'id' => $utilisateur['idTechnicien'],
                        'photoprofil' => $utilisateur['photoprofil'] ?? null,
                        'nom' => $utilisateur['nomTechnicien'],
                        'prenom' => $utilisateur['prenomTechnicien'],
                        'email' => $utilisateur['emailTechnicien'],
                        'telephone' => $utilisateur['telephone'],
                        'naissance' => $utilisateur['naissance'],
                        'doitChangerMotDePasse' => (bool)($utilisateur['doitChangerMotDePasse'] ?? false)
                    ]
                ]);
                return;
            }
        }

        // Si pas de technicien trouvé ou mot de passe incorrect, essayer directeur
        $requete = $bdd->prepare("SELECT * FROM directeurs WHERE loginDirecteur = :identifiant");
        $requete->bindParam(':identifiant', $identifiant);
        $requete->execute();

        if ($requete->rowCount() > 0) {
            $utilisateur = $requete->fetch(PDO::FETCH_ASSOC);

            if (password_verify($motDePasse, $utilisateur['motDePasse'])) {
                // Nouvel identifiant de session après authentification (empêche la fixation de session).
                session_regenerate_id(true);
                emettreTokenCsrf();
                $role = !empty($utilisateur['role']) ? $utilisateur['role'] : 'directeur';
                $_SESSION['user'] = [
                    'idDirecteur' => $utilisateur['idDirecteur'],
                    'role' => $role,
                    'nom' => $utilisateur['nomDirecteur'],
                    'prenom' => $utilisateur['prenomDirecteur'],
                    'email' => $utilisateur['emailDirecteur']
                ];
                $_SESSION['user_type'] = 'directeur';
                $_SESSION['user_id'] = $utilisateur['idDirecteur'];
                echo json_encode([
                    'success' => true, 
                    'role' => $role,
                    'type' => 'directeur',
                    'user' => [
                        'id' => $utilisateur['idDirecteur'],
                        'photoprofil' => $utilisateur['photoprofil'] ?? null,
                        'nom' => $utilisateur['nomDirecteur'],
                        'prenom' => $utilisateur['prenomDirecteur'],
                        'email' => $utilisateur['emailDirecteur'],
                        'telephone' => $utilisateur['telephone'],
                        'naissance' => $utilisateur['naissance']
                    ]
                ]);
                return;
            }
        }

        // Si aucun des deux n'a fonctionné
        $logEchecConnexion();
        echo json_encode(['success' => false, 'error' => 'Login ou mot de passe incorrect']);

    } else {
        // Connexion utilisateur
        $requete = $bdd->prepare("SELECT * FROM utilisateur WHERE loginUtilisateur = :identifiant");
        $requete->bindParam(':identifiant', $identifiant);
        $requete->execute();

        if ($requete->rowCount() > 0) {
            $utilisateur = $requete->fetch(PDO::FETCH_ASSOC);

            // Vérifier si l'utilisateur est désactivé
            if ($utilisateur['desactiver'] == 1) {
                $logEchecConnexion();
                echo json_encode(['success' => false, 'error' => 'Votre compte a été désactivé. Veuillez contacter votre administrateur.']);
                return;
            }

            // Vérifier si l'entreprise est désactivée
            if ($utilisateur['idEntreprise']) {
                $stmtEntreprise = $bdd->prepare("SELECT desactiver FROM entreprise WHERE idEntreprise = :idEntreprise");
                $stmtEntreprise->bindParam(':idEntreprise', $utilisateur['idEntreprise']);
                $stmtEntreprise->execute();
                $entreprise = $stmtEntreprise->fetch(PDO::FETCH_ASSOC);
                
                if ($entreprise && $entreprise['desactiver'] == 1) {
                    $logEchecConnexion();
                    echo json_encode(['success' => false, 'error' => 'Votre entreprise a été désactivée. Veuillez contacter le support technique.']);
                    return;
                }
            }

            if (password_verify($motDePasse, $utilisateur['motDePasseUtilisateur'])) {
                // Nouvel identifiant de session après authentification (empêche la fixation de session).
                session_regenerate_id(true);
                emettreTokenCsrf();
                // Déterminer le type selon le rôle
                $type = 'utilisateur';
                if ($utilisateur['roleEntreprise'] === 'admin') {
                    $type = 'admin';
                } else if ($utilisateur['roleEntreprise'] === 'directeur') {
                    $type = 'directeur';
                }
                
                $_SESSION['user'] = [
                    'idUtilisateur' => $utilisateur['idUtilisateur'],
                    'role' => $utilisateur['roleEntreprise'],
                    'nom' => $utilisateur['nomUtilisateur'],
                    'prenom' => $utilisateur['prenomUtilisateur'],
                    'email' => $utilisateur['emailUtilisateur'],
                    'idEntreprise' => $utilisateur['idEntreprise'],
                    'telephone' => $utilisateur['telephone'],
                    'naissance' => $utilisateur['naissance']
                ];
                $_SESSION['user_type'] = $type;
                $_SESSION['user_id'] = $utilisateur['idUtilisateur'];
                echo json_encode([
                    'success' => true, 
                    'role' => $utilisateur['roleEntreprise'],
                    'type' => $type,
                    'user' => [
                        'id' => $utilisateur['idUtilisateur'],
                        'photoprofil' => $utilisateur['photoprofil'],
                        'nom' => $utilisateur['nomUtilisateur'],
                        'prenom' => $utilisateur['prenomUtilisateur'],
                        'email' => $utilisateur['emailUtilisateur'],
                        'idEntreprise' => $utilisateur['idEntreprise'],
                        'telephone' => $utilisateur['telephone'],
                        'naissance' => $utilisateur['naissance'],
                        'doitChangerMotDePasse' => (bool)($utilisateur['doitChangerMotDePasse'] ?? false)
                    ]
                ]);
            } else {
                $logEchecConnexion();
                echo json_encode(['success' => false, 'error' => 'Mot de passe incorrect.']);
            }
        } else {
            $logEchecConnexion();
            echo json_encode(['success' => false, 'error' => 'Login incorrect']);
        }
    }
}
?>
