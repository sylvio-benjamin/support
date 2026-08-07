<?php
require '../config/cors.php';
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/session.php';
startSecureSession();
if (!isset($_SESSION['user']) || empty($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['erreur' => 'Non authentifié']);
    exit;
}

try {
    require_once __DIR__ . '/../connexionBDD.php';
    
    $idTicket = $_GET['idTicket'] ?? 0;
    error_log('DEBUG getChatMessages: idTicket=' . $idTicket);
    
if (!$idTicket) {
        echo json_encode(['erreur' => 'ID ticket manquant']);
    exit;
}

    // Vérifier les permissions
    $user = $_SESSION['user'];
    $idUtilisateur = $user['idUtilisateur'] ?? $user['id'] ?? 0;
    $idTechnicien = $user['idTechnicien'] ?? 0;
    $role = $user['role'] ?? '';
    
    error_log("DEBUG getChatMessages: Utilisateur $idUtilisateur, Technicien $idTechnicien, rôle $role");
    
    // Vérifier si l'utilisateur a accès à ce ticket
    $requeteAcces = "
        SELECT
            t.idTicket,
            t.idUtilisateur,
            t.idTechnicien,
            u.nomUtilisateur,
            u.prenomUtilisateur,
            u.idEntreprise AS idEntrepriseTicket,
            tech.nomTechnicien,
            tech.prenomTechnicien
                     FROM ticket t
                     LEFT JOIN utilisateur u ON t.idUtilisateur = u.idUtilisateur
                     LEFT JOIN techniciens tech ON t.idTechnicien = tech.idTechnicien
        WHERE t.idTicket = ?
    ";
    
    $preparationAcces = $bdd->prepare($requeteAcces);
    $preparationAcces->execute([$idTicket]);
    $infoTicket = $preparationAcces->fetch(PDO::FETCH_ASSOC);
    
    if (!$infoTicket) {
    error_log('DEBUG getChatMessages: Ticket non trouvé');
        echo json_encode(['erreur' => 'Ticket non trouvé']);
    exit;
}

    // Vérifier les permissions selon le rôle
    $accesAutorise = false;
    
    if (estDirecteurPlateforme()) {
        // Directeur INTERNE (plateforme) : accès à tous les tickets.
        $accesAutorise = true;
        error_log('DEBUG getChatMessages: Accès autorisé (directeur plateforme)');
    } else if ($role === 'admin' || $role === 'directeur') {
        // Admin référent / directeur "client" : scopé à sa propre entreprise
        // (sinon accès à TOUS les tickets de TOUTES les entreprises — confirmé
        // exploitable par le même pattern que desactiverEntreprise.php).
        $idEntrepriseAppelant = $user['idEntreprise'] ?? null;
        if ($idEntrepriseAppelant !== null && $infoTicket['idEntrepriseTicket'] !== null
            && (int)$infoTicket['idEntrepriseTicket'] === (int)$idEntrepriseAppelant) {
            $accesAutorise = true;
            error_log('DEBUG getChatMessages: Accès autorisé (admin/directeur client, même entreprise)');
        }
    } else if ($role === 'technicien') {
        // Technicien : accès si assigné au ticket OU si c'est un technicien général
        if ($infoTicket['idTechnicien'] == $idTechnicien) {
            $accesAutorise = true;
            error_log('DEBUG getChatMessages: Accès autorisé (technicien assigné)');
        } else {
            // Vérifier si c'est un technicien général (sans assignation spécifique)
            $reqTechGeneral = $bdd->prepare("SELECT idTechnicien FROM techniciens WHERE idTechnicien = ? AND (role = 'technicien' OR role IS NULL)");
            $reqTechGeneral->execute([$idTechnicien]);
            if ($reqTechGeneral->fetch()) {
                $accesAutorise = true;
                error_log('DEBUG getChatMessages: Accès autorisé (technicien général)');
            }
        }
    } else {
        // Utilisateur normal (employé) : accès à ses propres tickets, ou à un
        // ticket d'un collègue de son entreprise sur lequel il a été ajouté
        // comme membre (cf. membresTicket.php).
        if ($infoTicket['idUtilisateur'] == $idUtilisateur) {
            $accesAutorise = true;
            error_log('DEBUG getChatMessages: Accès autorisé (utilisateur propriétaire)');
        } else {
            $reqMembre = $bdd->prepare("SELECT COUNT(*) FROM ticketMembres WHERE idTicket = ? AND idUtilisateur = ?");
            $reqMembre->execute([$idTicket, $idUtilisateur]);
            if ($reqMembre->fetchColumn() > 0) {
                $accesAutorise = true;
                error_log('DEBUG getChatMessages: Accès autorisé (membre du ticket)');
            } else {
                error_log("DEBUG getChatMessages: Accès refusé - Ticket appartient à {$infoTicket['idUtilisateur']}, utilisateur connecté: $idUtilisateur");
            }
        }
    }
    
    if (!$accesAutorise) {
        error_log('DEBUG getChatMessages: Accès refusé');
        echo json_encode(['erreur' => 'Accès non autorisé']);
        exit;
}

error_log('DEBUG getChatMessages: Accès autorisé, récupération des messages');

    // typeExpediteur/dateModification/estSupprime peuvent ne pas encore
    // exister selon l'état de la migration sur cet environnement (colonnes
    // ajoutées ultérieurement pour lever l'ambiguïté expéditeur, l'édition et
    // la suppression "pour tout le monde" des messages).
    $colonnesOptionnelles = ['typeExpediteur', 'dateModification', 'estSupprime'];
    $selectOptionnel = '';
    foreach ($colonnesOptionnelles as $col) {
        $check = $bdd->query("SHOW COLUMNS FROM conversation LIKE '$col'");
        if ($check->fetch() !== false) {
            $selectOptionnel .= "c.$col,\n            ";
        }
    }

    // Récupérer les messages et les fichiers joints avec une seule requête
    $sql = "
        SELECT
            c.idMessage,
            c.idTicket,
            c.idExpediteur,
            $selectOptionnel
            c.message,
            c.dateEnvoi,
            c.fichierJoint,
            c.nomExpediteur,
            c.prenomExpediteur,
            GROUP_CONCAT(cf.cheminFichier ORDER BY cf.id ASC) AS fichiersJoints_list
        FROM conversation c
        LEFT JOIN conversation_fichiers cf ON c.idMessage = cf.idMessage
        WHERE c.idTicket = ?
        GROUP BY c.idMessage
        ORDER BY c.dateEnvoi ASC
    ";

$stmt = $bdd->prepare($sql);
$stmt->execute([$idTicket]);
$messages = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Enrichir chaque message avec les informations de l'expéditeur. Le
    // TYPE (utilisateur vs technicien) ne doit JAMAIS être deviné quand on
    // peut le connaître avec certitude : un idUtilisateur et un idTechnicien
    // peuvent porter la même valeur numérique (deux personnes différentes,
    // deux tables distinctes), donc "chercher d'abord dans techniciens, puis
    // dans utilisateur" pouvait afficher le nom/la photo de la MAUVAISE
    // personne — d'où des messages qui semblaient "réassignés" à l'autre
    // interlocuteur du ticket.
foreach ($messages as &$msg) {
        $idExp = intval($msg['idExpediteur']);
        $typeConnu = $msg['typeExpediteur'] ?? null;

        if ($typeConnu === 'technicien' || $typeConnu === 'utilisateur') {
            // Type enregistré au moment de l'envoi (cf. saveChatMessage.php) :
            // on interroge UNIQUEMENT la bonne table, jamais l'autre.
            if ($typeConnu === 'technicien') {
                $reqInfo = $bdd->prepare("SELECT prenomTechnicien AS prenom, nomTechnicien AS nom, photoprofil FROM techniciens WHERE idTechnicien = ?");
            } else {
                $reqInfo = $bdd->prepare("SELECT prenomUtilisateur AS prenom, nomUtilisateur AS nom, photoprofil FROM utilisateur WHERE idUtilisateur = ?");
            }
            $reqInfo->execute([$idExp]);
            $info = $reqInfo->fetch(PDO::FETCH_ASSOC);

            if (isset($msg['nomExpediteur']) && $msg['nomExpediteur'] && $msg['nomExpediteur'] !== 'Utilisateur inconnu') {
                $msg['nom'] = $msg['nomExpediteur'];
                $msg['prenom'] = $msg['prenomExpediteur'] ?? '';
            } elseif ($info && $info['nom']) {
                $msg['nom'] = $info['nom'];
                $msg['prenom'] = $info['prenom'];
            } else {
                $msg['nom'] = 'Utilisateur inconnu';
                $msg['prenom'] = '';
            }
            $msg['photoprofil'] = ($info && isset($info['photoprofil'])) ? $info['photoprofil'] : null;
        } elseif (isset($msg['nomExpediteur']) && $msg['nomExpediteur'] && $msg['nomExpediteur'] !== 'Utilisateur inconnu') {
            // Message envoyé avant l'ajout de la colonne typeExpediteur : le
            // nom déjà figé reste fiable, on ne devine que pour la photo (au
            // pire un avatar manquant, jamais un nom erroné).
            $msg['nom'] = $msg['nomExpediteur'];
            $msg['prenom'] = $msg['prenomExpediteur'] ?? '';

            $reqTech = $bdd->prepare("SELECT photoprofil FROM techniciens WHERE idTechnicien = ?");
            $reqTech->execute([$idExp]);
            $tech = $reqTech->fetch(PDO::FETCH_ASSOC);
            if ($tech) {
                $msg['photoprofil'] = $tech['photoprofil'];
                $msg['typeExpediteur'] = 'technicien';
            } else {
                $reqUser = $bdd->prepare("SELECT photoprofil FROM utilisateur WHERE idUtilisateur = ?");
                $reqUser->execute([$idExp]);
                $user = $reqUser->fetch(PDO::FETCH_ASSOC);
                $msg['photoprofil'] = $user ? $user['photoprofil'] : null;
                $msg['typeExpediteur'] = $user ? 'utilisateur' : null;
            }
        } else {
            // Ancien message sans rien de figé : dernier recours, on devine
            // (comportement historique, imparfait en cas de collision d'ID
            // mais c'est le maximum possible sans information stockée).
            $reqTech = $bdd->prepare("SELECT prenomTechnicien AS prenom, nomTechnicien AS nom, photoprofil FROM techniciens WHERE idTechnicien = ?");
            $reqTech->execute([$idExp]);
            $tech = $reqTech->fetch(PDO::FETCH_ASSOC);

            if ($tech && $tech['nom']) {
                $msg['nom'] = $tech['nom'];
                $msg['prenom'] = $tech['prenom'];
                $msg['photoprofil'] = $tech['photoprofil'];
                $msg['typeExpediteur'] = 'technicien';
            } else {
                $reqUser = $bdd->prepare("SELECT prenomUtilisateur AS prenom, nomUtilisateur AS nom, photoprofil FROM utilisateur WHERE idUtilisateur = ?");
                $reqUser->execute([$idExp]);
                $user = $reqUser->fetch(PDO::FETCH_ASSOC);

                if ($user && $user['nom']) {
                    $msg['nom'] = $user['nom'];
                    $msg['prenom'] = $user['prenom'];
                    $msg['photoprofil'] = $user['photoprofil'];
                    $msg['typeExpediteur'] = 'utilisateur';
                } else {
                    $msg['nom'] = 'Utilisateur inconnu';
                    $msg['prenom'] = '';
                    $msg['photoprofil'] = null;
                    $msg['typeExpediteur'] = null;
                }
            }
        }

        // Traiter les fichiers joints multiples
        if ($msg['fichiersJoints_list']) {
            $msg['fichiersJoints'] = explode(',', $msg['fichiersJoints_list']);
        } else {
            $msg['fichiersJoints'] = [];
        }
        
        // Compatibilité : si pas de fichiers multiples mais un fichierJoint, l'ajouter
        if (empty($msg['fichiersJoints']) && !empty($msg['fichierJoint'])) {
            $msg['fichiersJoints'] = [$msg['fichierJoint']];
        }
        
        unset($msg['fichiersJoints_list']); // Nettoyer le champ temporaire
}
unset($msg);

echo json_encode($messages); 
    
} catch (Exception $e) {
    error_log('Erreur getChatMessages: ' . $e->getMessage());
    echo json_encode(['erreur' => 'Erreur serveur.']);
}
?> 
