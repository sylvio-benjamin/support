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
require '../connexionBDD.php';
require_once __DIR__ . '/uploadHelper.php';

// Vérifier si l'utilisateur est connecté
if (!isset($_SESSION['user'])) {
    // Cas ticket urgent public (pas de session)
    $isUrgentPublic = true;
    $isTechnicien = false;
} else {
    // Vérifier si c'est un technicien qui crée un ticket pour un employé
    $creerParTechnicien = isset($_POST['creerParTechnicien']) && $_POST['creerParTechnicien'] === 'true';
    
    if ($creerParTechnicien && isset($_SESSION['user']['role']) && $_SESSION['user']['role'] === 'technicien') {
        // Cas technicien qui crée un ticket pour un employé
        $isTechnicien = true;
        $isUrgentPublic = false;
        $idUtilisateur = $_POST['idUtilisateur'] ?? null; // ID de l'employé pour qui le ticket est créé
        $idTechnicien = $_POST['idTechnicien'] ?? $_SESSION['user']['idTechnicien'] ?? $_SESSION['user']['id'];
        
        if (!$idUtilisateur) {
            echo json_encode(['success' => false, 'error' => 'ID utilisateur manquant pour la création par technicien']);
            exit();
        }
    } else {
        // Cas normal (employé qui crée son propre ticket)
        $isTechnicien = false;
        $isUrgentPublic = false;
        $idUtilisateur = $_SESSION['user']['idUtilisateur'] ?? null;

        if (!$idUtilisateur) {
            echo json_encode(['success' => false, 'error' => 'Session invalide pour ce type de compte. Veuillez vous reconnecter.']);
            exit();
        }
    }
}

// Les données sont envoyées via FormData, on utilise $_POST
$titre = $_POST['titre'] ?? '';
$description = $_POST['description'] ?? '';
$priorite = $_POST['priorite'] ?? 'normale';
$categorie = $_POST['categorie'] ?? '';
$serviceConcerne = $_POST['serviceConcerne'] ?? '';
$sousCategorie = $_POST['sousCategorie'] ?? null;
$email = $_POST['email'] ?? null;
$nomUtilisateur = $_POST['nomUtilisateur'] ?? null;
$telephone = $_POST['telephone'] ?? null;

// Validation de la limite de caractères pour le titre
if (strlen($titre) > 75) {
    echo json_encode(['success' => false, 'error' => 'Le titre du ticket ne peut pas dépasser 75 caractères. Veuillez raccourcir le titre.']);
    exit();
}

$cheminFichier = null;
$cheminsFichiers = [];

error_log("DEBUG ajouterTicket - Début traitement fichiers");
error_log("DEBUG ajouterTicket - _FILES keys: " . implode(', ', array_keys($_FILES)));

// Gestion des pièces jointes multiples - nouveau format (piecesJointes_0, piecesJointes_1, etc.)
$piecesJointesNouveau = [];

// Format 1: piecesJointes_0, piecesJointes_1, etc.
foreach ($_FILES as $key => $value) {
    if (strpos($key, 'piecesJointes_') === 0) {
        $piecesJointesNouveau[] = $value;
        error_log("DEBUG ajouterTicket - Fichier détecté format 1: $key -> " . $value['name']);
    }
}

// Format 2: piecesJointes[] (tableau PHP)
if (isset($_FILES['piecesJointes']) && is_array($_FILES['piecesJointes']['name'])) {
    $fileCount = count($_FILES['piecesJointes']['name']);
    for ($i = 0; $i < $fileCount; $i++) {
        if ($_FILES['piecesJointes']['error'][$i] === UPLOAD_ERR_OK) {
            $piecesJointesNouveau[] = [
                'name' => $_FILES['piecesJointes']['name'][$i],
                'tmp_name' => $_FILES['piecesJointes']['tmp_name'][$i],
                'error' => $_FILES['piecesJointes']['error'][$i],
                'size' => $_FILES['piecesJointes']['size'][$i],
                'type' => $_FILES['piecesJointes']['type'][$i]
            ];
            error_log("DEBUG ajouterTicket - Fichier détecté format 2: index $i -> " . $_FILES['piecesJointes']['name'][$i]);
        }
    }
}

// Format 3: files[] (format utilisé par le frontend technicien)
if (isset($_FILES['files']) && is_array($_FILES['files']['name'])) {
    $fileCount = count($_FILES['files']['name']);
    for ($i = 0; $i < $fileCount; $i++) {
        if ($_FILES['files']['error'][$i] === UPLOAD_ERR_OK) {
            $piecesJointesNouveau[] = [
                'name' => $_FILES['files']['name'][$i],
                'tmp_name' => $_FILES['files']['tmp_name'][$i],
                'error' => $_FILES['files']['error'][$i],
                'size' => $_FILES['files']['size'][$i],
                'type' => $_FILES['files']['type'][$i]
            ];
            error_log("DEBUG ajouterTicket - Fichier détecté format 3 (files[]): index $i -> " . $_FILES['files']['name'][$i]);
        }
    }
}

if (!empty($piecesJointesNouveau)) {
    error_log("=== Pièces jointes multiples Debug (nouveau format) ===");
    
    // Chemin absolu pour stockage serveur
    $dossier = __DIR__ . '/../../uploads/';
    if (!file_exists($dossier)) {
        error_log("📁 Création du dossier uploads: " . $dossier);
        mkdir($dossier, 0755, true);
    }

    // Traiter chaque fichier
    foreach ($piecesJointesNouveau as $i => $file) {
        if ($file['error'] === UPLOAD_ERR_OK) {
            error_log("Fichier reçu: " . $file['name'] . " (" . $file['size'] . " bytes)");

            $validation = validerPieceJointe($file);
            if (!$validation['success']) {
                error_log("❌ Pièce jointe rejetée: " . $file['name'] . " - " . $validation['error']);
                continue;
            }

            $nomFichier = nomPieceJointeSecurise($validation['extension']);
            $cheminFichierWeb = 'uploads/' . $nomFichier; // à stocker en BDD
            $cheminComplet = $dossier . $nomFichier;

            error_log("📁 Nom fichier: " . $nomFichier);
            error_log("📁 Chemin complet: " . $cheminComplet);

            if (move_uploaded_file($file['tmp_name'], $cheminComplet)) {
                error_log("✅ Pièce jointe uploadée avec succès: " . $cheminComplet);
                $cheminsFichiers[] = $cheminFichierWeb;
            } else {
                error_log("❌ Erreur lors de l'upload de la pièce jointe: " . $file['name']);
            }
        } else {
            error_log("❌ Erreur pièce jointe: " . $file['error'] . " pour " . $file['name']);
        }
    }
} else if (isset($_FILES['pieceJointe']) && $_FILES['pieceJointe']['error'] === UPLOAD_ERR_OK) {
    // Fallback pour l'ancien système (un seul fichier)
    error_log("=== Pièce jointe unique (fallback) ===");

    $dossier = __DIR__ . '/../../uploads/';
    if (!file_exists($dossier)) {
        error_log("📁 Création du dossier uploads: " . $dossier);
        mkdir($dossier, 0755, true);
    }

    $validation = validerPieceJointe($_FILES['pieceJointe']);
    if (!$validation['success']) {
        error_log("❌ Pièce jointe unique rejetée: " . $validation['error']);
    } else {
        $nomFichier = nomPieceJointeSecurise($validation['extension']);
        $cheminFichierWeb = 'uploads/' . $nomFichier;
        $cheminComplet = $dossier . $nomFichier;

        if (move_uploaded_file($_FILES['pieceJointe']['tmp_name'], $cheminComplet)) {
            error_log("✅ Pièce jointe unique uploadée avec succès: " . $cheminComplet);
            $cheminsFichiers[] = $cheminFichierWeb;
        } else {
            error_log("❌ Erreur lors de l'upload de la pièce jointe unique");
        }
    }
}

if (empty($description) || empty($categorie)) {
    echo json_encode(['success' => false, 'error' => 'La description et la catégorie sont requis.']);
    exit;
}

// Validation des champs principaux
if (empty($titre) || empty($description) || empty($categorie)) {
    echo json_encode(['success' => false, 'error' => 'Le titre, la description et la catégorie sont requis.']);
    exit;
}
function insererPieceJointe($bdd, $idTicket, $cheminFichier) {
    if ($cheminFichier) {
        $stmt = $bdd->prepare("INSERT INTO fichier (idTicket, cheminFichier) VALUES (:idTicket, :cheminFichier)");
        $stmt->bindParam(':idTicket', $idTicket, PDO::PARAM_INT);
        $stmt->bindParam(':cheminFichier', $cheminFichier);
        return $stmt->execute();
    }
    return true; // Pas de pièce jointe à insérer
}
try {
    if ($isUrgentPublic) {
        // Pour les tickets urgents publics, on va d'abord créer un utilisateur temporaire
        // ou utiliser un utilisateur système existant
        $stmtCheck = $bdd->prepare("SELECT idUtilisateur FROM utilisateur WHERE loginUtilisateur = 'system_urgent' LIMIT 1");
        $stmtCheck->execute();
        $userSystem = $stmtCheck->fetch(PDO::FETCH_ASSOC);
        
        if (!$userSystem) {
            // Créer un utilisateur système pour les tickets urgents
            $stmtCreateUser = $bdd->prepare(
                "INSERT INTO utilisateur (loginUtilisateur, nomUtilisateur, prenomUtilisateur, emailUtilisateur, motDePasseUtilisateur, roleEntreprise, idEntreprise, desactiver, telephone, naissance) 
                 VALUES ('system_urgent', 'Système', 'Urgent', 'system@lyovatech.com', :password, 'employe', 1, 0, '', '1900-01-01')"
            );
            $hashedPassword = password_hash('system_urgent_2024', PASSWORD_DEFAULT);
            $stmtCreateUser->bindParam(':password', $hashedPassword);
            $stmtCreateUser->execute();
            $idUtilisateurSystem = $bdd->lastInsertId();
        } else {
            $idUtilisateurSystem = $userSystem['idUtilisateur'];
        }
        
        // Ticket urgent public : on utilise l'utilisateur système
        $descriptionComplet = $description . "\n\n[Ticket urgent public]\nEmail: $email\nNom utilisateur: $nomUtilisateur\nTéléphone: $telephone";
        $stmt = $bdd->prepare(
            "INSERT INTO ticket (idUtilisateur, titre, description, priorite, categorie, sousCategorie, serviceConcerne) 
             VALUES (:idUtilisateur, :titre, :description, :priorite, :categorie, :sousCategorie, :serviceConcerne)"
        );
        $stmt->bindParam(':idUtilisateur', $idUtilisateurSystem, PDO::PARAM_INT);
        $stmt->bindParam(':titre', $titre);
        $stmt->bindParam(':description', $descriptionComplet);
        $stmt->bindParam(':priorite', $priorite);
        $stmt->bindParam(':categorie', $categorie);
        $stmt->bindParam(':sousCategorie', $sousCategorie);
        $stmt->bindParam(':serviceConcerne', $serviceConcerne);
    } else if ($isTechnicien) {
        // Cas technicien qui crée un ticket pour un employé
        $descriptionComplet = $description . "\n\n[Ticket créé par le technicien " . $_SESSION['user']['prenom'] . " " . $_SESSION['user']['nom'] . "]";
        $stmt = $bdd->prepare(
            "INSERT INTO ticket (idUtilisateur, titre, description, priorite, categorie, sousCategorie, serviceConcerne, idTechnicien) 
             VALUES (:idUtilisateur, :titre, :description, :priorite, :categorie, :sousCategorie, :serviceConcerne, :idTechnicien)"
        );
        $stmt->bindParam(':idUtilisateur', $idUtilisateur, PDO::PARAM_INT);
        $stmt->bindParam(':titre', $titre);
        $stmt->bindParam(':description', $descriptionComplet);
        $stmt->bindParam(':priorite', $priorite);
        $stmt->bindParam(':categorie', $categorie);
        $stmt->bindParam(':sousCategorie', $sousCategorie);
        $stmt->bindParam(':serviceConcerne', $serviceConcerne);
        $stmt->bindParam(':idTechnicien', $idTechnicien, PDO::PARAM_INT);
    } else {
        $stmt = $bdd->prepare(
            "INSERT INTO ticket (idUtilisateur, titre, description, priorite, categorie, sousCategorie, serviceConcerne) 
             VALUES (:idUtilisateur, :titre, :description, :priorite, :categorie, :sousCategorie, :serviceConcerne)"
        );
        $stmt->bindParam(':idUtilisateur', $idUtilisateur, PDO::PARAM_INT);
        $stmt->bindParam(':titre', $titre);
        $stmt->bindParam(':description', $description);
        $stmt->bindParam(':priorite', $priorite);
        $stmt->bindParam(':categorie', $categorie);
        $stmt->bindParam(':sousCategorie', $sousCategorie);
        $stmt->bindParam(':serviceConcerne', $serviceConcerne);
    }

    if ($stmt->execute()) {
        $idTicketCree = $bdd->lastInsertId();
        error_log("DEBUG ajouterTicket - Ticket créé avec ID: $idTicketCree");
        error_log("DEBUG ajouterTicket - Nombre de fichiers à sauvegarder: " . count($cheminsFichiers));
        error_log("DEBUG ajouterTicket - Fichiers: " . print_r($cheminsFichiers, true));
        
        foreach ($cheminsFichiers as $cheminFichierWeb) {
            $result = insererPieceJointe($bdd, $idTicketCree, $cheminFichierWeb);
            error_log("DEBUG ajouterTicket - Sauvegarde fichier $cheminFichierWeb: " . ($result ? 'SUCCESS' : 'FAILED'));
        }

        // Notifier les techniciens concernés (ceux du service demandé, ou tous
        // les techniciens si aucun service dédié ne correspond) — best-effort,
        // ne doit jamais faire échouer la création du ticket elle-même.
        try {
            $techniciensANotifier = [];
            if (!empty($serviceConcerne)) {
                $stmtService = $bdd->prepare("SELECT idService FROM services WHERE idService = :sc OR nomService = :sc2 LIMIT 1");
                $stmtService->execute([':sc' => $serviceConcerne, ':sc2' => $serviceConcerne]);
                $idServiceTrouve = $stmtService->fetchColumn();
                if ($idServiceTrouve) {
                    $stmtTechs = $bdd->prepare("SELECT DISTINCT idTechnicien FROM roleTechnicien WHERE idService = :idService");
                    $stmtTechs->execute([':idService' => $idServiceTrouve]);
                    $techniciensANotifier = $stmtTechs->fetchAll(PDO::FETCH_COLUMN);
                }
            }
            if (empty($techniciensANotifier)) {
                // Aucun service ciblé, ou aucun technicien dédié à ce service : on notifie tous les techniciens
                $stmtAllTechs = $bdd->prepare("SELECT idTechnicien FROM techniciens WHERE role = 'technicien'");
                $stmtAllTechs->execute();
                $techniciensANotifier = $stmtAllTechs->fetchAll(PDO::FETCH_COLUMN);
            }

            // Nom du créateur pour le message de la notification
            if ($isUrgentPublic) {
                $nomCreateur = trim(($nomUtilisateur ?: 'Ticket urgent public'));
                $idExpediteurNotif = null;
            } elseif ($isTechnicien) {
                $nomCreateur = trim(($_SESSION['user']['prenom'] ?? '') . ' ' . ($_SESSION['user']['nom'] ?? ''));
                $idExpediteurNotif = $idTechnicien;
            } else {
                $stmtCreateur = $bdd->prepare("SELECT nomUtilisateur, prenomUtilisateur FROM utilisateur WHERE idUtilisateur = ?");
                $stmtCreateur->execute([$idUtilisateur]);
                $createur = $stmtCreateur->fetch(PDO::FETCH_ASSOC);
                $nomCreateur = $createur ? trim($createur['prenomUtilisateur'] . ' ' . $createur['nomUtilisateur']) : 'Un employé';
                $idExpediteurNotif = $idUtilisateur;
            }

            $stmtNotifTech = $bdd->prepare("
                INSERT INTO notifications (idTechnicien, idTicket, type, titre, message, idExpediteur, nomExpediteur, prenomExpediteur)
                VALUES (:idTechnicien, :idTicket, 'nouveau_ticket', :titre, :message, :idExpediteur, :nomExpediteur, :prenomExpediteur)
            ");
            foreach ($techniciensANotifier as $idTechADest) {
                if ($isTechnicien && (int)$idTechADest === (int)$idTechnicien) {
                    continue; // ne pas se notifier soi-même
                }
                $stmtNotifTech->execute([
                    ':idTechnicien' => $idTechADest,
                    ':idTicket' => $idTicketCree,
                    ':titre' => 'Nouveau ticket : ' . $titre,
                    ':message' => $nomCreateur . ' a créé un nouveau ticket : "' . $titre . '"',
                    ':idExpediteur' => $idExpediteurNotif,
                    ':nomExpediteur' => $isUrgentPublic ? null : ($isTechnicien ? ($_SESSION['user']['nom'] ?? null) : ($createur['nomUtilisateur'] ?? null)),
                    ':prenomExpediteur' => $isUrgentPublic ? null : ($isTechnicien ? ($_SESSION['user']['prenom'] ?? null) : ($createur['prenomUtilisateur'] ?? null)),
                ]);
            }
        } catch (\Throwable $e) {
            error_log('Notification techniciens (nouveau ticket) ignorée : ' . $e->getMessage());
        }

        // Créer une notification pour les directeurs si le ticket est urgent ou non assigné
        if ($priorite === 'Urgent' || $priorite === 'urgent') {
            // Récupérer tous les directeurs
            $requeteDirecteurs = $bdd->prepare("SELECT idDirecteur, nomDirecteur, prenomDirecteur FROM directeur WHERE desactiver = 0");
            $requeteDirecteurs->execute();
            $directeurs = $requeteDirecteurs->fetchAll(PDO::FETCH_ASSOC);
            
            // Récupérer les infos de l'utilisateur qui a créé le ticket
            $requeteUtilisateur = $bdd->prepare("SELECT nomUtilisateur, prenomUtilisateur FROM utilisateur WHERE idUtilisateur = ?");
            $requeteUtilisateur->execute([$idUtilisateur]);
            $utilisateur = $requeteUtilisateur->fetch(PDO::FETCH_ASSOC);
            
            $nomUtilisateur = $utilisateur ? $utilisateur['nomUtilisateur'] : 'Utilisateur';
            $prenomUtilisateur = $utilisateur ? $utilisateur['prenomUtilisateur'] : '';
            
            // Créer une notification pour chaque directeur
            foreach ($directeurs as $directeur) {
                $requeteNotification = $bdd->prepare("
                    INSERT INTO notifications 
                    (idUtilisateur, idTicket, type, titre, message, idExpediteur, nomExpediteur, prenomExpediteur) 
                    VALUES 
                    (?, ?, 'nouveau_ticket_urgent', ?, ?, ?, ?, ?)
                ");
                
                $titreNotification = "Nouveau ticket urgent - " . $titre;
                $messageNotification = "Ticket urgent créé par " . $prenomUtilisateur . " " . $nomUtilisateur . " : " . 
                                      (strlen($description) > 50 ? substr($description, 0, 50) . '...' : $description);
                
                $requeteNotification->execute([
                    $directeur['idDirecteur'],
                    $idTicketCree,
                    $titreNotification,
                    $messageNotification,
                    $idUtilisateur,
                    $nomUtilisateur,
                    $prenomUtilisateur
                ]);
            }
        }
        
        // Notifier le serveur WebSocket Node.js pour le temps réel
        try {
            @file_get_contents('http://localhost:3001/notify', false, stream_context_create([
                'http' => [
                    'method' => 'POST',
                    'header' => 'Content-Type: application/json',
                    'content' => json_encode([])
                ]
            ]));
        } catch (Exception $e) {
            // On ignore l'erreur pour ne pas bloquer la création du ticket
        }
        echo json_encode(['success' => true, 'message' => 'Ticket créé avec succès.']);
    } else {
        echo json_encode(['success' => false, 'error' => 'Erreur lors de la création du ticket.']);
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Exception.']);
}
?>
