<?php
require '../config/cors.php';
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

// Inclure la configuration de session centralisée
require_once '../config/session.php';

// Démarrer la session avec la configuration sécurisée
startSecureSession();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Vérifier si la session est valide
if (!isSessionValid()) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'Session invalide ou expirée',
        'session_expired' => true
    ]);
    exit;
}

// Vérifier si la session n'a pas expiré (8 heures)
$sessionDuration = 28800; // 8 heures
$loginTime = $_SESSION['login_time'] ?? 0;
$currentTime = time();

if (($currentTime - $loginTime) > $sessionDuration) {
    // Session expirée, nettoyer
    clearSession();
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'Session expirée',
        'session_expired' => true
    ]);
    exit;
}

// Session valide, aucune écriture supplémentaire nécessaire à partir d'ici :
// on referme le verrou de fichier de session PHP avant de répondre, plutôt
// que de le garder jusqu'à la fin du script (implicite sinon). Sans ça, cet
// endpoint — appelé à CHAQUE navigation par middleware.ts, en plus du
// sondage périodique côté client — sérialise toutes les autres requêtes
// concurrentes pour la même session (PHP verrouille le fichier de session en
// exclusif pendant toute la durée du script), ce qui peut les ralentir ou les
// faire échouer/timeout et donner l'impression d'une déconnexion aléatoire
// alors que la session est en réalité valide.
$reponse = [
    'success' => true,
    'user' => $_SESSION['user'],
    'session_time_remaining' => $sessionDuration - ($currentTime - $loginTime)
];
session_write_close();
echo json_encode($reponse);
?> 