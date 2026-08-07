<?php
header('Content-Type: application/json');
require '../config/cors.php';
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../config/session.php';
startSecureSession();
if (!isset($_SESSION['user']) || empty($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['erreur' => 'Non authentifié']);
    exit;
}

require_once '../connexionBDD.php';

try {
    // Même dérivation rôle/id depuis la SESSION que markNotificationRead.php
    // (jamais du corps envoyé par le client — même raisonnement IDOR).
    $sessionUser = $_SESSION['user'];
    if (estDirecteurPlateforme()) {
        $idUtilisateur = $sessionUser['idDirecteur'] ?? $sessionUser['idTechnicien'] ?? $sessionUser['idUtilisateur'] ?? 0;
        $typeUtilisateur = 'directeur';
    } elseif (isset($sessionUser['idTechnicien'])) {
        $idUtilisateur = $sessionUser['idTechnicien'];
        $typeUtilisateur = 'technicien';
    } else {
        $idUtilisateur = $sessionUser['idUtilisateur'] ?? 0;
        $typeUtilisateur = 'utilisateur';
    }

    if (!$idUtilisateur) {
        echo json_encode(['succes' => false, 'erreur' => 'Session invalide.']);
        exit;
    }

    // Même portée que getNotifications.php pour chaque rôle : un directeur
    // plateforme a une vue globale (toutes les notifications), un technicien
    // voit les siennes + celles des tickets qui lui sont assignés, un employé
    // ne voit que les siennes.
    if ($typeUtilisateur === 'directeur') {
        $requete = "UPDATE notifications SET lu = 1 WHERE lu = 0";
        $preparation = $bdd->prepare($requete);
        $preparation->execute();
    } elseif ($typeUtilisateur === 'technicien') {
        $requete = "
            UPDATE notifications n
            LEFT JOIN ticket t ON n.idTicket = t.idTicket
            SET n.lu = 1
            WHERE n.lu = 0 AND (n.idTechnicien = ? OR t.idTechnicien = ?)
        ";
        $preparation = $bdd->prepare($requete);
        $preparation->execute([$idUtilisateur, $idUtilisateur]);
    } else {
        $requete = "UPDATE notifications SET lu = 1 WHERE lu = 0 AND idUtilisateur = ?";
        $preparation = $bdd->prepare($requete);
        $preparation->execute([$idUtilisateur]);
    }

    echo json_encode([
        'succes' => true,
        'nombreMisAJour' => $preparation->rowCount(),
    ]);

} catch (Exception $e) {
    error_log('Erreur markAllNotificationsRead: ' . $e->getMessage());
    echo json_encode([
        'succes' => false,
        'erreur' => 'Erreur lors du marquage des notifications',
    ]);
}
