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
require_once '../connexionBDD.php';
require_once __DIR__ . '/uploadHelper.php';
require_once __DIR__ . '/parametresHelper.php';
require_once __DIR__ . '/../config/notifications.php';

// Vérifier si l'utilisateur est connecté
if (!isset($_SESSION['user'])) {
    // Cas ticket urgent public (pas de session)
    $isUrgentPublic = true;
    $isTechnicien = false;

    // Honeypot anti-bot : champ masqué en CSS (pas type="hidden", que
    // beaucoup de bots ignorent déjà) que seul un script remplit
    // aveuglément. Réponse "succès" factice pour ne pas révéler la
    // détection, sans rien écrire en base.
    if (!empty($_POST['siteWeb'])) {
        echo json_encode(['success' => true, 'message' => 'Ticket créé avec succès.']);
        exit();
    }

    // Limitation par IP : ce endpoint est public, sans CAPTCHA ni session,
    // donc la seule friction anti-spam disponible est un throttle serveur.
    $ipAppelant = $_SERVER['REMOTE_ADDR'] ?? 'inconnu';
    $bdd->exec("CREATE TABLE IF NOT EXISTS ticket_urgent_public_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ip VARCHAR(45) NOT NULL,
        dateEnvoi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ip_date (ip, dateEnvoi)
    )");
    $stmtRate = $bdd->prepare("SELECT COUNT(*) FROM ticket_urgent_public_log WHERE ip = :ip AND dateEnvoi > DATE_SUB(NOW(), INTERVAL 1 HOUR)");
    $stmtRate->execute([':ip' => $ipAppelant]);
    if ((int)$stmtRate->fetchColumn() >= 5) {
        http_response_code(429);
        echo json_encode(['success' => false, 'error' => 'Trop de tickets envoyés récemment. Réessayez plus tard.']);
        exit();
    }
    $stmtLogRate = $bdd->prepare("INSERT INTO ticket_urgent_public_log (ip) VALUES (:ip)");
    $stmtLogRate->execute([':ip' => $ipAppelant]);
} else {
    // Vérifier si c'est un technicien (ou un directeur) qui crée un ticket pour un employé
    $creerParTechnicien = isset($_POST['creerParTechnicien']) && $_POST['creerParTechnicien'] === 'true';
    $roleSession = $_SESSION['user']['role'] ?? null;

    if ($creerParTechnicien && in_array($roleSession, ['technicien', 'directeur'], true)) {
        // Cas technicien/directeur qui crée un ticket pour un employé
        $isTechnicien = true;
        $isUrgentPublic = false;
        $idUtilisateur = $_POST['idUtilisateur'] ?? null; // ID de l'employé pour qui le ticket est créé
        // Un directeur peut venir de la table `techniciens` (idTechnicien) ou
        // de la table dédiée `directeurs` (idDirecteur, pas de ligne
        // technicien correspondante) : dans ce second cas, le ticket reste
        // simplement non assigné (idTechnicien NULL) plutôt que de forcer un
        // identifiant erroné.
        $idTechnicien = $_POST['idTechnicien'] ?? $_SESSION['user']['idTechnicien'] ?? null;
        
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
$idSousCategorie = $_POST['idSousCategorie'] ?? null;
$email = $_POST['email'] ?? null;
$nomUtilisateur = $_POST['nomUtilisateur'] ?? null;
$telephone = $_POST['telephone'] ?? null;

// Le client n'envoie que idSousCategorie : on résout ici le nom de catégorie,
// le nom de sous-catégorie et le service concerné via la relation
// souscategorie -> categorie -> services, pour conserver le format de
// stockage existant dans `ticket` (colonnes texte categorie/sousCategorie/
// serviceConcerne) sans toucher aux autres endpoints qui les lisent.
$categorie = '';
$sousCategorie = '';
$serviceConcerne = '';
$idServiceResolu = null;
if ($idSousCategorie) {
    $stmtResolu = $bdd->prepare("
        SELECT sc.nomSousCategorie, c.nomCategorie, c.idService
        FROM souscategorie sc
        JOIN categorie c ON sc.idCategorie = c.idCategorie
        WHERE sc.idSousCategorie = :idSousCategorie
    ");
    $stmtResolu->bindParam(':idSousCategorie', $idSousCategorie, PDO::PARAM_INT);
    $stmtResolu->execute();
    $resolu = $stmtResolu->fetch(PDO::FETCH_ASSOC);
    if ($resolu) {
        $sousCategorie = $resolu['nomSousCategorie'];
        $categorie = $resolu['nomCategorie'];
        $idServiceResolu = (int)$resolu['idService'];
        $serviceConcerne = (string)$idServiceResolu;
    }
}

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

if (empty($description) || empty($idSousCategorie)) {
    echo json_encode(['success' => false, 'error' => 'La description et la sous-catégorie sont requises.']);
    exit;
}

// Validation des champs principaux
if (empty($titre) || empty($description) || empty($idSousCategorie)) {
    echo json_encode(['success' => false, 'error' => 'Le titre, la description et la sous-catégorie sont requis.']);
    exit;
}

if (empty($categorie)) {
    // idSousCategorie fourni mais introuvable en base (id invalide/obsolète)
    echo json_encode(['success' => false, 'error' => 'Sous-catégorie invalide.']);
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
            // Créer un utilisateur système pour les tickets urgents. Mot de
            // passe aléatoire (jamais stocké/connu nulle part) ET compte
            // désactivé (connexion.php refuse explicitement la connexion des
            // comptes désactivé=1) : ce compte n'existe que pour porter la
            // clé étrangère idUtilisateur sur les tickets publics, il ne doit
            // JAMAIS être connectable. Un mot de passe codé en dur ici serait
            // une porte dérobée triviale vers l'entreprise idEntreprise=1.
            $stmtCreateUser = $bdd->prepare(
                "INSERT INTO utilisateur (loginUtilisateur, nomUtilisateur, prenomUtilisateur, emailUtilisateur, motDePasseUtilisateur, roleEntreprise, idEntreprise, desactiver, telephone, naissance)
                 VALUES ('system_urgent', 'Système', 'Urgent', 'system@lyovatech.com', :password, 'employe', 1, 1, '', '1900-01-01')"
            );
            $hashedPassword = password_hash(bin2hex(random_bytes(32)), PASSWORD_DEFAULT);
            $stmtCreateUser->bindParam(':password', $hashedPassword);
            $stmtCreateUser->execute();
            $idUtilisateurSystem = $bdd->lastInsertId();
        } else {
            $idUtilisateurSystem = $userSystem['idUtilisateur'];
        }
        // Le reste du fichier (notification directeurs, auto-assignation...)
        // référence uniformément $idUtilisateur quel que soit le chemin.
        $idUtilisateur = $idUtilisateurSystem;

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
        // Cas technicien/directeur qui crée un ticket pour un employé
        $libelleCreateur = ($_SESSION['user']['role'] ?? '') === 'directeur' ? 'le directeur' : 'le technicien';
        $descriptionComplet = $description . "\n\n[Ticket créé par $libelleCreateur " . $_SESSION['user']['prenom'] . " " . $_SESSION['user']['nom'] . "]";
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

        $parametresPlateforme = obtenirParametresPlateforme($bdd);

        // Assignation automatique au technicien le moins chargé (ticket créé
        // par un employé, pas déjà assigné par un technicien lui-même) —
        // best-effort, ne doit jamais faire échouer la création du ticket.
        $autoAssigne = false;
        $technicienAutoAssigne = null;
        if (!$isTechnicien && !$isUrgentPublic && !empty($parametresPlateforme['autoAssign'])) {
            try {
                $candidatsAutoAssign = [];
                if (!empty($idServiceResolu)) {
                    $stmtCandidats = $bdd->prepare("SELECT DISTINCT idTechnicien FROM roleTechnicien WHERE idService = :idService");
                    $stmtCandidats->execute([':idService' => $idServiceResolu]);
                    $candidatsAutoAssign = $stmtCandidats->fetchAll(PDO::FETCH_COLUMN);
                }
                if (empty($candidatsAutoAssign)) {
                    $stmtCandidats = $bdd->prepare("SELECT idTechnicien FROM techniciens WHERE role = 'technicien'");
                    $stmtCandidats->execute();
                    $candidatsAutoAssign = $stmtCandidats->fetchAll(PDO::FETCH_COLUMN);
                }

                if (!empty($candidatsAutoAssign)) {
                    // Charge actuelle de chaque candidat (tickets non résolus/fermés)
                    $placeholders = implode(',', array_fill(0, count($candidatsAutoAssign), '?'));
                    $stmtCharge = $bdd->prepare("
                        SELECT idTechnicien, COUNT(*) AS nbTickets
                        FROM ticket
                        WHERE idTechnicien IN ($placeholders) AND statut IN ('en_attente', 'en_cours')
                        GROUP BY idTechnicien
                    ");
                    $stmtCharge->execute($candidatsAutoAssign);
                    $charges = [];
                    foreach ($stmtCharge->fetchAll(PDO::FETCH_ASSOC) as $ligne) {
                        $charges[$ligne['idTechnicien']] = (int)$ligne['nbTickets'];
                    }

                    $meilleureCharge = null;
                    foreach ($candidatsAutoAssign as $idCandidat) {
                        $charge = $charges[$idCandidat] ?? 0;
                        if ($meilleureCharge === null || $charge < $meilleureCharge) {
                            $meilleureCharge = $charge;
                            $technicienAutoAssigne = $idCandidat;
                        }
                    }

                    if ($technicienAutoAssigne) {
                        $stmtAssign = $bdd->prepare("UPDATE ticket SET idTechnicien = :idTechnicien, statut = 'en_cours', dateTicketAssigné = CURRENT_TIMESTAMP WHERE idTicket = :idTicket");
                        $stmtAssign->execute([':idTechnicien' => $technicienAutoAssigne, ':idTicket' => $idTicketCree]);
                        $autoAssigne = true;

                        $stmtTechInfo = $bdd->prepare("SELECT nomTechnicien, prenomTechnicien FROM techniciens WHERE idTechnicien = ?");
                        $stmtTechInfo->execute([$technicienAutoAssigne]);
                        $techInfo = $stmtTechInfo->fetch(PDO::FETCH_ASSOC);

                        creerNotification($bdd, [
                            'type' => NOTIF_ASSIGNATION,
                            'idTicket' => $idTicketCree,
                            'destinataireUtilisateur' => $idUtilisateur,
                            'titre' => 'Technicien assigné à votre ticket',
                            'message' => ($techInfo ? trim($techInfo['prenomTechnicien'] . ' ' . $techInfo['nomTechnicien']) : 'Un technicien') . ' a été assigné automatiquement à votre ticket "' . $titre . '"',
                            'idExpediteur' => $technicienAutoAssigne,
                            'nomExpediteur' => $techInfo['nomTechnicien'] ?? null,
                            'prenomExpediteur' => $techInfo['prenomTechnicien'] ?? null,
                        ]);
                    }
                }
            } catch (\Throwable $e) {
                error_log('Assignation automatique ignorée : ' . $e->getMessage());
            }
        }

        // Notifier les techniciens concernés (ceux du service demandé, ou tous
        // les techniciens si aucun service dédié ne correspond ; seulement le
        // technicien auto-assigné le cas échéant) — best-effort, ne doit
        // jamais faire échouer la création du ticket elle-même.
        if (!empty($parametresPlateforme['notifTicketNouveau'])) {
        try {
            $techniciensANotifier = [];
            if ($autoAssigne) {
                $techniciensANotifier = [$technicienAutoAssigne];
            } elseif (!empty($idServiceResolu)) {
                $stmtTechs = $bdd->prepare("SELECT DISTINCT idTechnicien FROM roleTechnicien WHERE idService = :idService");
                $stmtTechs->execute([':idService' => $idServiceResolu]);
                $techniciensANotifier = $stmtTechs->fetchAll(PDO::FETCH_COLUMN);
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

            foreach ($techniciensANotifier as $idTechADest) {
                if ($isTechnicien && (int)$idTechADest === (int)$idTechnicien) {
                    continue; // ne pas se notifier soi-même
                }
                creerNotification($bdd, [
                    'type' => NOTIF_NOUVEAU_TICKET,
                    'idTicket' => $idTicketCree,
                    'destinataireTechnicien' => $idTechADest,
                    'titre' => 'Nouveau ticket : ' . $titre,
                    'message' => $nomCreateur . ' a créé un nouveau ticket : "' . $titre . '"',
                    'idExpediteur' => $idExpediteurNotif,
                    'nomExpediteur' => $isUrgentPublic ? null : ($isTechnicien ? ($_SESSION['user']['nom'] ?? null) : ($createur['nomUtilisateur'] ?? null)),
                    'prenomExpediteur' => $isUrgentPublic ? null : ($isTechnicien ? ($_SESSION['user']['prenom'] ?? null) : ($createur['prenomUtilisateur'] ?? null)),
                ]);
            }
        } catch (\Throwable $e) {
            error_log('Notification techniciens (nouveau ticket) ignorée : ' . $e->getMessage());
        }
        }

        // Créer une notification pour les directeurs si le ticket est urgent
        if (!empty($parametresPlateforme['notifTicketUrgent']) && $priorite === 'urgente') {
          try {
            // Les comptes directeur sont des lignes de la table techniciens (role = 'directeur')
            $requeteDirecteurs = $bdd->prepare("SELECT idTechnicien AS idDirecteur, nomTechnicien AS nomDirecteur, prenomTechnicien AS prenomDirecteur FROM techniciens WHERE role = 'directeur'");
            $requeteDirecteurs->execute();
            $directeurs = $requeteDirecteurs->fetchAll(PDO::FETCH_ASSOC);

            // Récupérer les infos de l'utilisateur qui a créé le ticket
            $requeteUtilisateur = $bdd->prepare("SELECT nomUtilisateur, prenomUtilisateur FROM utilisateur WHERE idUtilisateur = ?");
            $requeteUtilisateur->execute([$idUtilisateur]);
            $utilisateur = $requeteUtilisateur->fetch(PDO::FETCH_ASSOC);

            $nomUtilisateur = $utilisateur ? $utilisateur['nomUtilisateur'] : 'Utilisateur';
            $prenomUtilisateur = $utilisateur ? $utilisateur['prenomUtilisateur'] : '';

            // Créer une notification pour chaque directeur
            $titreNotification = "Nouveau ticket urgent - " . $titre;
            $messageNotification = "Ticket urgent créé par " . $prenomUtilisateur . " " . $nomUtilisateur . " : " .
                                  (strlen($description) > 50 ? substr($description, 0, 50) . '...' : $description);
            foreach ($directeurs as $directeur) {
                creerNotification($bdd, [
                    'type' => NOTIF_NOUVEAU_TICKET_URGENT,
                    'idTicket' => $idTicketCree,
                    'destinataireTechnicien' => $directeur['idDirecteur'],
                    'titre' => $titreNotification,
                    'message' => $messageNotification,
                    'idExpediteur' => $idUtilisateur,
                    'nomExpediteur' => $nomUtilisateur,
                    'prenomExpediteur' => $prenomUtilisateur,
                ]);
            }
          } catch (\Throwable $e) {
              error_log('Notification directeurs (ticket urgent créé) ignorée : ' . $e->getMessage());
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
