<?php
require '../config/cors.php';
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

require_once __DIR__ . '/../config/session.php';
startSecureSession();

require '../connexionBDD.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $identifiant = $_POST['login'];
    $motDePasse = $_POST['password'];
    $type = $_POST['type'] ?? 'technicien'; // Type de compte (technicien ou utilisateur)

    if ($type === 'technicien') {
        // Connexion technicien ou directeur
        // D'abord, essayer de se connecter en tant que technicien
        $requete = $bdd->prepare("SELECT * FROM techniciens WHERE loginTechnicien = :identifiant");
        $requete->bindParam(':identifiant', $identifiant);
        $requete->execute();

        if ($requete->rowCount() > 0) {
            $utilisateur = $requete->fetch(PDO::FETCH_ASSOC);

            if (password_verify($motDePasse, $utilisateur['motDePasse'])) {
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
                        'naissance' => $utilisateur['naissance']
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
                    echo json_encode(['success' => false, 'error' => 'Votre entreprise a été désactivée. Veuillez contacter le support technique.']);
                    return;
                }
            }

            if (password_verify($motDePasse, $utilisateur['motDePasseUtilisateur'])) {
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
                        'naissance' => $utilisateur['naissance']
                    ]
                ]);
            } else {
                echo json_encode(['success' => false, 'error' => 'Mot de passe incorrect.']);
            }
        } else {
            echo json_encode(['success' => false, 'error' => 'Login incorrect']);
        }
    }
}
?>
