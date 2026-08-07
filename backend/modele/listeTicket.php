<?php
require_once __DIR__ . '/../config/session.php';
startSecureSession();

// Forcer le rechargement et vider le cache
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");
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

// Vérifier que l'utilisateur a un ID (utilisateur ou technicien)
if (!isset($_SESSION['user']['idUtilisateur']) && !isset($_SESSION['user']['idTechnicien'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'ID utilisateur manquant']);
    exit;
}

require_once __DIR__ . '/../connexionBDD.php';

// Construction de la requête de comptage des messages non lus : extraite
// dans lib/messagesNonLus.php (fonction pure, testée en PHPUnit — voir
// backend/tests/MessagesNonLusTest.php).
require_once __DIR__ . '/lib/messagesNonLus.php';

// Ajout : si un idTicket est passé en GET, on retourne ce ticket précis
if (isset($_GET['idTicket'])) {
    error_log("DEBUG - Début de recherche ticket ID: " . $_GET['idTicket']);
    $idTicket = $_GET['idTicket'];
    $ticket = rechercherTicket($bdd, $idTicket);
    error_log("DEBUG - Ticket trouvé: " . ($ticket ? 'OUI' : 'NON'));
    if ($ticket) {
        error_log("DEBUG - Envoi de la réponse JSON");
        echo json_encode(['success' => true, 'tickets' => [$ticket]]);
    } else {
        error_log("DEBUG - Ticket non trouvé, envoi d'erreur");
        echo json_encode(['success' => false, 'error' => 'Ticket non trouvé']);
    }
    exit;
}

// Endpoint pour récupérer les tickets
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $role = $_SESSION['user']['role'];
        if ($role === 'referent' || $role === 'admin') {
            // Pour les admin référents (role 'referent' ou 'admin'), on récupère uniquement les tickets de leur entreprise
            $idEntreprise = $_SESSION['user']['idEntreprise'] ?? null;
            if ($idEntreprise) {
                $idUtilisateur = $_SESSION['user']['idUtilisateur'];
                // messagesLus.typeUtilisateur n'a pas de valeur 'referent' distincte
                // (enum: utilisateur/technicien/directeur/admin) ; les référents
                // partagent le filigrane de lecture 'admin'.
                $typeUtilisateur = 'admin';
                $tickets = obtenirTicketsParEntreprise($bdd, $idEntreprise, $idUtilisateur, $typeUtilisateur);
            } else {
                $tickets = [];
            }
        } else if ($role === 'technicien') {
            // Pour les techniciens, vérifier s'il faut filtrer par service
            $idTechnicien = $_SESSION['user']['idTechnicien'];
            $filtrerParService = isset($_GET['filtrerParService']) && $_GET['filtrerParService'] === 'true';
            
            if ($filtrerParService) {
                // Récupérer uniquement les tickets des services du technicien
                $tickets = obtenirTicketsParServiceTechnicien($bdd, $idTechnicien, 'technicien');
            } else {
                // Récupérer tous les tickets (comme un directeur)
                $tickets = obtenirTousLesTickets($bdd, $idTechnicien, 'technicien');
            }
        } else if ($role === 'directeur' || $role === 'affichage') {
            // Pour les directeurs et affichage, on récupère tous les tickets
            $idUtilisateur = $_SESSION['user']['idTechnicien'] ?? $_SESSION['user']['idUtilisateur'];
            $tickets = obtenirTousLesTickets($bdd, $idUtilisateur, $role);
        } else {
            // Pour les utilisateurs normaux, on récupère uniquement leurs tickets
            $idUtilisateur = $_SESSION['user']['idUtilisateur'];
            $tickets = obtenirTicketsUtilisateur($bdd, $idUtilisateur, 'utilisateur');
        }
        echo json_encode(['success' => true, 'tickets' => $tickets]);
    } catch (PDOException $erreur) {
        echo json_encode(['success' => false, 'error' => 'Erreur de base de données.']);
    }
    exit;
}

function obtenirTicketsParEntreprise($bdd, $idEntreprise, $idUtilisateur = null, $typeUtilisateur = 'utilisateur') {
    // S'assurer que la table messagesLus existe
    $checkTable = $bdd->query("SHOW TABLES LIKE 'messagesLus'");
    if ($checkTable->rowCount() == 0) {
        $bdd->exec("
            CREATE TABLE messagesLus (
                id INT AUTO_INCREMENT PRIMARY KEY,
                idTicket INT NOT NULL,
                idUtilisateur INT NULL,
                idTechnicien INT NULL,
                idPersonne INT GENERATED ALWAYS AS (COALESCE(idUtilisateur, idTechnicien)) STORED,
                typeUtilisateur ENUM('utilisateur', 'technicien', 'directeur', 'admin') NOT NULL,
                dateLecture TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_lecture (idTicket, idPersonne, typeUtilisateur),
                FOREIGN KEY (idTicket) REFERENCES ticket(idTicket) ON DELETE CASCADE
            )
        ");
    }

    $messagesQuery = getMessagesNonLusQuery($idUtilisateur, $typeUtilisateur);
    
    $requete = $bdd->prepare("SELECT t.*, 
                         u.nomUtilisateur, u.prenomUtilisateur, 
                         tech.nomTechnicien, tech.prenomTechnicien,
                         e.nomEntreprise,
                         $messagesQuery,
                         CASE WHEN t.description LIKE '%[Ticket créé par le technicien%' THEN true ELSE false END as creerParTechnicien
                         FROM ticket t 
                         INNER JOIN utilisateur u ON t.idUtilisateur = u.idUtilisateur 
                         LEFT JOIN techniciens tech ON t.idTechnicien = tech.idTechnicien 
                         LEFT JOIN entreprise e ON u.idEntreprise = e.idEntreprise
                         WHERE u.idEntreprise = :idEntreprise
                         ORDER BY t.dateCreation DESC");
    $requete->bindParam(':idEntreprise', $idEntreprise, PDO::PARAM_INT);
    $requete->execute();
    $tickets = $requete->fetchAll(PDO::FETCH_ASSOC);
    
    // Correction des données de technicien si nécessaire
    foreach ($tickets as &$ticket) {
        if ($ticket['idTechnicien'] && (!$ticket['nomTechnicien'] || !$ticket['prenomTechnicien'])) {
            $requeteTech = $bdd->prepare("SELECT nomTechnicien, prenomTechnicien FROM techniciens WHERE idTechnicien = :idTechnicien");
            $requeteTech->execute([':idTechnicien' => $ticket['idTechnicien']]);
            $technicien = $requeteTech->fetch(PDO::FETCH_ASSOC);
            
            if ($technicien) {
                $ticket['nomTechnicien'] = $technicien['nomTechnicien'];
                $ticket['prenomTechnicien'] = $technicien['prenomTechnicien'];
            }
        }
    }
    
    return $tickets;
}

function obtenirTicketsParServiceTechnicien($bdd, $idTechnicien, $typeUtilisateur = 'technicien') {
    // S'assurer que la table messagesLus existe
    $checkTable = $bdd->query("SHOW TABLES LIKE 'messagesLus'");
    if ($checkTable->rowCount() == 0) {
        $bdd->exec("
            CREATE TABLE messagesLus (
                id INT AUTO_INCREMENT PRIMARY KEY,
                idTicket INT NOT NULL,
                idUtilisateur INT NULL,
                idTechnicien INT NULL,
                idPersonne INT GENERATED ALWAYS AS (COALESCE(idUtilisateur, idTechnicien)) STORED,
                typeUtilisateur ENUM('utilisateur', 'technicien', 'directeur', 'admin') NOT NULL,
                dateLecture TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_lecture (idTicket, idPersonne, typeUtilisateur),
                FOREIGN KEY (idTicket) REFERENCES ticket(idTicket) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
    }

    // Récupérer les services assignés au technicien
    $requeteServices = $bdd->prepare("SELECT idService FROM roleTechnicien WHERE idTechnicien = :idTechnicien");
    $requeteServices->bindParam(':idTechnicien', $idTechnicien, PDO::PARAM_INT);
    $requeteServices->execute();
    $services = $requeteServices->fetchAll(PDO::FETCH_COLUMN);
    
    if (empty($services)) {
        // Si le technicien n'a pas de service assigné, il voit tous les tickets
        return obtenirTousLesTickets($bdd, $idTechnicien, $typeUtilisateur);
    }
    
    $messagesQuery = getMessagesNonLusQuery($idTechnicien, $typeUtilisateur);
    
    // Construire la requête avec les services
    $placeholders = str_repeat('?,', count($services) - 1) . '?';
    $requete = $bdd->prepare("SELECT t.*, 
                         u.nomUtilisateur, u.prenomUtilisateur, 
                         tech.nomTechnicien, tech.prenomTechnicien,
                         e.nomEntreprise,
                         s.nomService,
                         $messagesQuery,
                         CASE WHEN t.description LIKE '%[Ticket créé par le technicien%' THEN true ELSE false END as creerParTechnicien
                         FROM ticket t 
                         LEFT JOIN utilisateur u ON t.idUtilisateur = u.idUtilisateur 
                         LEFT JOIN techniciens tech ON t.idTechnicien = tech.idTechnicien 
                         LEFT JOIN entreprise e ON u.idEntreprise = e.idEntreprise
                         LEFT JOIN services s ON t.serviceConcerne = s.idService
                         WHERE t.serviceConcerne IN ($placeholders) OR t.serviceConcerne IS NULL OR t.serviceConcerne = ''
                         ORDER BY t.dateCreation DESC");
    $requete->execute($services);
    $tickets = $requete->fetchAll(PDO::FETCH_ASSOC);
    
    // Correction des données de technicien si nécessaire (comme dans obtenirTousLesTickets)
    foreach ($tickets as &$ticket) {
        if ($ticket['idTechnicien'] && (!$ticket['nomTechnicien'] || !$ticket['prenomTechnicien'])) {
            $requeteTech = $bdd->prepare("SELECT nomTechnicien, prenomTechnicien FROM techniciens WHERE idTechnicien = :idTechnicien");
            $requeteTech->execute([':idTechnicien' => $ticket['idTechnicien']]);
            $technicien = $requeteTech->fetch(PDO::FETCH_ASSOC);
            
            if ($technicien) {
                $ticket['nomTechnicien'] = $technicien['nomTechnicien'];
                $ticket['prenomTechnicien'] = $technicien['prenomTechnicien'];
            }
        }
        
        // Traitement des tickets urgents publics
        if (!$ticket['nomUtilisateur'] && !$ticket['prenomUtilisateur']) {
            if (preg_match('/\[Ticket urgent public\]\s*Email:\s*([^\n]+)\s*Nom utilisateur:\s*([^\n]+)/i', $ticket['description'], $matches)) {
                $ticket['prenomUtilisateur'] = 'Ticket';
                $ticket['nomUtilisateur'] = 'Urgent Public';
            }
        }
    }
    
    return $tickets;
}

function obtenirTousLesTickets($bdd, $idUtilisateur = null, $typeUtilisateur = 'directeur') {
    // S'assurer que la table messagesLus existe
    $checkTable = $bdd->query("SHOW TABLES LIKE 'messagesLus'");
    if ($checkTable->rowCount() == 0) {
        $bdd->exec("
            CREATE TABLE messagesLus (
                id INT AUTO_INCREMENT PRIMARY KEY,
                idTicket INT NOT NULL,
                idUtilisateur INT NULL,
                idTechnicien INT NULL,
                idPersonne INT GENERATED ALWAYS AS (COALESCE(idUtilisateur, idTechnicien)) STORED,
                typeUtilisateur ENUM('utilisateur', 'technicien', 'directeur', 'admin') NOT NULL,
                dateLecture TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_lecture (idTicket, idPersonne, typeUtilisateur),
                FOREIGN KEY (idTicket) REFERENCES ticket(idTicket) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
    }

    $messagesQuery = getMessagesNonLusQuery($idUtilisateur, $typeUtilisateur);
    
    $requete = $bdd->prepare("SELECT t.*, 
                         u.nomUtilisateur, u.prenomUtilisateur, 
                         tech.nomTechnicien, tech.prenomTechnicien,
                         e.nomEntreprise,
                         $messagesQuery,
                         CASE WHEN t.description LIKE '%[Ticket créé par le technicien%' THEN true ELSE false END as creerParTechnicien
                         FROM ticket t 
                         LEFT JOIN utilisateur u ON t.idUtilisateur = u.idUtilisateur 
                         LEFT JOIN techniciens tech ON t.idTechnicien = tech.idTechnicien 
                         LEFT JOIN entreprise e ON u.idEntreprise = e.idEntreprise
                         ORDER BY t.dateCreation DESC");
    $requete->execute();
    $tickets = $requete->fetchAll(PDO::FETCH_ASSOC);
    
    // SOLUTION ALTERNATIVE: Si les données du JOIN sont vides, on récupère manuellement
    foreach ($tickets as &$ticket) {
        if ($ticket['idTechnicien'] && (!$ticket['nomTechnicien'] || !$ticket['prenomTechnicien'])) {
            // Récupérer les données du technicien manuellement
            $requeteTech = $bdd->prepare("SELECT nomTechnicien, prenomTechnicien FROM techniciens WHERE idTechnicien = :idTechnicien");
            $requeteTech->execute([':idTechnicien' => $ticket['idTechnicien']]);
            $technicien = $requeteTech->fetch(PDO::FETCH_ASSOC);
            
            if ($technicien) {
                $ticket['nomTechnicien'] = $technicien['nomTechnicien'];
                $ticket['prenomTechnicien'] = $technicien['prenomTechnicien'];
            }
        }
    }
    
    // Pour les tickets sans utilisateur (tickets urgents publics), on extrait les infos de la description
    foreach ($tickets as &$ticket) {
        if (!$ticket['nomUtilisateur'] && !$ticket['prenomUtilisateur']) {
            // Essayer d'extraire les infos depuis la description
            if (preg_match('/\[Ticket urgent public\]\s*Email:\s*([^\n]+)\s*Nom utilisateur:\s*([^\n]+)/i', $ticket['description'], $matches)) {
                $ticket['prenomUtilisateur'] = 'Ticket';
                $ticket['nomUtilisateur'] = 'Urgent Public';
            }
        }
    }
    
    return $tickets;
}

function obtenirTicketsUtilisateur($bdd, $idUtilisateur, $typeUtilisateur = 'utilisateur') {
    // S'assurer que la table messagesLus existe
    $checkTable = $bdd->query("SHOW TABLES LIKE 'messagesLus'");
    if ($checkTable->rowCount() == 0) {
        $bdd->exec("
            CREATE TABLE messagesLus (
                id INT AUTO_INCREMENT PRIMARY KEY,
                idTicket INT NOT NULL,
                idUtilisateur INT NULL,
                idTechnicien INT NULL,
                idPersonne INT GENERATED ALWAYS AS (COALESCE(idUtilisateur, idTechnicien)) STORED,
                typeUtilisateur ENUM('utilisateur', 'technicien', 'directeur', 'admin') NOT NULL,
                dateLecture TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_lecture (idTicket, idPersonne, typeUtilisateur),
                FOREIGN KEY (idTicket) REFERENCES ticket(idTicket) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
    }

    $messagesQuery = getMessagesNonLusQuery($idUtilisateur, $typeUtilisateur);
    
    $requete = $bdd->prepare("SELECT t.*, 
                         u.nomUtilisateur, u.prenomUtilisateur,
                         tech.nomTechnicien, tech.prenomTechnicien,
                         $messagesQuery,
                         CASE WHEN t.description LIKE '%[Ticket créé par le technicien%' THEN true ELSE false END as creerParTechnicien
                         FROM ticket t
                         LEFT JOIN utilisateur u ON t.idUtilisateur = u.idUtilisateur
                         LEFT JOIN techniciens tech ON t.idTechnicien = tech.idTechnicien
                         WHERE t.idUtilisateur = :idUtilisateur
                            OR t.idTicket IN (SELECT idTicket FROM ticketMembres WHERE idUtilisateur = :idUtilisateurMembre)
                         ORDER BY t.dateCreation DESC");
    $requete->bindParam(':idUtilisateur', $idUtilisateur);
    $requete->bindParam(':idUtilisateurMembre', $idUtilisateur);
    $requete->execute();
    return $requete->fetchAll(PDO::FETCH_ASSOC);
}
function rechercherTicket($bdd, $idTicket) {
    error_log("DEBUG - rechercherTicket début pour ID: $idTicket");
    $requete = $bdd->prepare("SELECT t.*, u.nomUtilisateur, u.prenomUtilisateur, u.idEntreprise, e.nomEntreprise, tech.nomTechnicien, tech.prenomTechnicien, tech.role as roleTechnicien, tech.photoprofil as photoprofilTechnicien,
                         CASE WHEN t.description LIKE '%[Ticket créé par le technicien%' THEN true ELSE false END as creerParTechnicien
                         FROM ticket t
                         LEFT JOIN utilisateur u ON t.idUtilisateur = u.idUtilisateur
                         LEFT JOIN entreprise e ON u.idEntreprise = e.idEntreprise
                         LEFT JOIN techniciens tech ON t.idTechnicien = tech.idTechnicien
                         WHERE t.idTicket = :idTicket");
    $requete->bindParam(':idTicket', $idTicket);
    $requete->execute();
    $ticket = $requete->fetch(PDO::FETCH_ASSOC);
    error_log("DEBUG - rechercherTicket - requête exécutée, ticket trouvé: " . ($ticket ? 'OUI' : 'NON'));
    
    if ($ticket) {
        // Vérification de sécurité pour les techniciens
        if (isset($_SESSION['user']['role']) && $_SESSION['user']['role'] === 'technicien') {
            $idTechnicienConnecte = $_SESSION['user']['idTechnicien'] ?? $_SESSION['user']['id'];
            
            // Vérifier si le ticket est directement assigné au technicien
            $ticketDirectementAssigne = ($ticket['idTechnicien'] == $idTechnicienConnecte);
            
            // Si pas directement assigné, vérifier si le technicien a accès via ses services
            if (!$ticketDirectementAssigne) {
                // Récupérer les services du technicien depuis roleTechnicien
                $stmtServices = $bdd->prepare("SELECT rt.idService FROM roleTechnicien rt WHERE rt.idTechnicien = :idTechnicien");
                $stmtServices->bindParam(':idTechnicien', $idTechnicienConnecte);
                $stmtServices->execute();
                $servicesTechnicien = $stmtServices->fetchAll(PDO::FETCH_COLUMN);
                
                error_log("DEBUG - Technicien ID: $idTechnicienConnecte");
                error_log("DEBUG - Services du technicien (IDs): " . implode(', ', $servicesTechnicien));
                error_log("DEBUG - Service du ticket: " . ($ticket['serviceConcerne'] ?: 'NULL/VIDE'));
                
                // Vérifier si le technicien a accès au service du ticket
                $accesViaService = false;
                
                // Si le ticket n'a pas de service assigné (null ou vide), on autorise l'accès
                if (empty($ticket['serviceConcerne'])) {
                    $accesViaService = true;
                    error_log("DEBUG - Ticket sans service, accès autorisé");
                } else {
                    // serviceConcerne peut contenir soit un ID soit un nom
                    $serviceTicketId = null;
                    
                    // Vérifier si serviceConcerne est un ID numérique
                    if (is_numeric($ticket['serviceConcerne'])) {
                        $serviceTicketId = (int)$ticket['serviceConcerne'];
                        error_log("DEBUG - Service du ticket est un ID: $serviceTicketId");
                    } else {
                        // Sinon, c'est un nom, récupérer l'ID correspondant
                        $stmtServiceId = $bdd->prepare("SELECT idService FROM services WHERE nomService = :nomService");
                        $stmtServiceId->bindParam(':nomService', $ticket['serviceConcerne']);
                        $stmtServiceId->execute();
                        $serviceTicketId = $stmtServiceId->fetchColumn();
                        error_log("DEBUG - Service du ticket est un nom: " . $ticket['serviceConcerne'] . ", ID trouvé: " . ($serviceTicketId ?: 'NON_TROUVE'));
                    }
                    
                    // Vérifier si le technicien a accès à ce service
                    if ($serviceTicketId) {
                        $accesViaService = in_array($serviceTicketId, $servicesTechnicien);
                        error_log("DEBUG - Accès via service ID $serviceTicketId: " . ($accesViaService ? 'OUI' : 'NON'));
                    } else {
                        $accesViaService = false;
                        error_log("DEBUG - Service non trouvé, accès refusé");
                    }
                }
                
                error_log("DEBUG - Accès final: " . ($accesViaService ? 'AUTORISE' : 'REFUSE'));
                
                if (!$accesViaService) {
                    http_response_code(403);
                    echo json_encode(['success' => false, 'error' => 'Accès non autorisé : ce ticket ne vous est pas assigné et ne fait pas partie de vos services']);
                    exit;
                }
            }
        }
        
        // Vérification de sécurité pour les employés
        if (isset($_SESSION['user']['role']) && $_SESSION['user']['role'] === 'employe') {
            $idUtilisateurConnecte = $_SESSION['user']['idUtilisateur'] ?? $_SESSION['user']['id'];

            // Si le ticket n'appartient pas à l'utilisateur connecté et qu'il
            // n'y a pas non plus été ajouté comme membre (cf. membresTicket.php)
            if ($ticket['idUtilisateur'] != $idUtilisateurConnecte) {
                $reqMembre = $bdd->prepare("SELECT COUNT(*) FROM ticketMembres WHERE idTicket = ? AND idUtilisateur = ?");
                $reqMembre->execute([$ticket['idTicket'], $idUtilisateurConnecte]);
                if ($reqMembre->fetchColumn() == 0) {
                    http_response_code(403);
                    echo json_encode(['success' => false, 'error' => 'Accès non autorisé : ce ticket ne vous appartient pas']);
                    exit;
                }
            }
        }
        
        // Vérification de sécurité pour les administrateurs référents
        if (isset($_SESSION['user']['role']) && ($_SESSION['user']['role'] === 'referent' || $_SESSION['user']['role'] === 'admin')) {
            $idUtilisateurConnecte = $_SESSION['user']['idUtilisateur'] ?? $_SESSION['user']['id'];
            $idEntrepriseConnecte = $_SESSION['user']['idEntreprise'] ?? null;
            
            // Si le ticket n'appartient pas à l'admin connecté ET n'est pas de son entreprise
            if ($ticket['idUtilisateur'] != $idUtilisateurConnecte && $ticket['idEntreprise'] != $idEntrepriseConnecte) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Accès non autorisé : ce ticket ne fait pas partie de votre entreprise']);
                exit;
            }
        }
        
        $ticket['auteur'] = $ticket['prenomUtilisateur'] . ' ' . $ticket['nomUtilisateur'];
        $ticket['sousCategorie'] = isset($ticket['sousCategorie']) ? $ticket['sousCategorie'] : null;
        // Le rôle affiché doit toujours refléter la personne réellement
        // assignée au ticket (roleTechnicien, issu de la jointure sur
        // techniciens), jamais le rôle de la session qui consulte le ticket
        // — un directeur peut très bien regarder un ticket assigné à un
        // simple technicien, et inversement.
        if ($ticket['nomTechnicien'] || $ticket['prenomTechnicien']) {
            $ticket['assignee'] = [
                'nom' => $ticket['prenomTechnicien'] . ' ' . $ticket['nomTechnicien'],
                'nomSeul' => $ticket['nomTechnicien'],
                'prenom' => $ticket['prenomTechnicien'],
                'role' => $ticket['roleTechnicien'] === 'directeur' ? 'Directeur' : 'Technicien',
                'avatar' => strtoupper(substr($ticket['prenomTechnicien'] ?? '', 0, 1) . substr($ticket['nomTechnicien'] ?? '', 0, 1)),
                'photoprofil' => $ticket['photoprofilTechnicien'] ?? null
            ];
        } else {
            $ticket['assignee'] = null;
        }
        // AJOUT : récupérer les pièces jointes
        $reqFichiers = $bdd->prepare("SELECT cheminFichier FROM fichier WHERE idTicket = :idTicket");
        $reqFichiers->bindParam(':idTicket', $idTicket);
        $reqFichiers->execute();
        $fichiers = $reqFichiers->fetchAll(PDO::FETCH_COLUMN);
        $ticket['fichiers'] = $fichiers; // Nouveau champ pour les fichiers multiples
        $ticket['pieceJointe'] = !empty($fichiers) ? $fichiers[0] : null; // Compatibilité avec l'ancien système
    }
    return $ticket;
}

function rechercherTicketsParTechnicien($bdd, $idTechnicien) {
    $requete = $bdd->prepare("SELECT t.*, u.nomUtilisateur, u.prenomUtilisateur 
                         FROM ticket t 
                         LEFT JOIN utilisateur u ON t.idUtilisateur = u.idUtilisateur 
                         WHERE t.idTechnicien = :idTechnicien 
                         ORDER BY t.dateCreation DESC");
    $requete->bindParam(':idTechnicien', $idTechnicien);
    $requete->execute();
    $tickets = $requete->fetchAll(PDO::FETCH_ASSOC);
    return $tickets;
}

function rechercherTicketsParUtilisateur($bdd, $idUtilisateur) {
    $requete = $bdd->prepare("SELECT t.*, tech.nomTechnicien, tech.prenomTechnicien 
                         FROM ticket t 
                         LEFT JOIN techniciens tech ON t.idTechnicien = tech.idTechnicien 
                         WHERE t.idUtilisateur = :idUtilisateur 
                         ORDER BY t.dateCreation DESC");
    $requete->bindParam(':idUtilisateur', $idUtilisateur);
    $requete->execute();
    $tickets = $requete->fetchAll(PDO::FETCH_ASSOC);
    return $tickets;
}

// Fin du fichier - la logique principale est gérée ci-dessus