<?php
// Configuration centralisée pour l'application PHP

// Charge les variables du fichier .env (racine du projet) dans l'environnement PHP,
// car rien ne le fait automatiquement (pas de dotenv, pas de SetEnv Apache).
$envFile = __DIR__ . '/../.env';
if (is_readable($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || strpos($line, '=') === false) {
            continue;
        }
        [$name, $value] = explode('=', $line, 2);
        $name = trim($name);
        if (getenv($name) === false) {
            putenv($name . '=' . trim($value));
        }
    }
}

// Fonction pour lire les variables d'environnement avec valeurs par défaut
function getEnvVar($name, $default = null) {
    $value = getenv($name);
    return $value !== false ? $value : $default;
}

// Lit une variable d'environnement obligatoire : jamais de valeur secrète par
// défaut dans le code source. Si elle est absente, on arrête net plutôt que
// de démarrer silencieusement avec un identifiant de production codé en dur.
function requireEnvVar($name) {
    $value = getenv($name);
    if ($value === false || $value === '') {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => "Configuration serveur incomplète (variable $name manquante)."]);
        error_log("Variable d'environnement requise manquante : $name");
        exit;
    }
    return $value;
}

// Configuration base de données
define('DB_HOST', getEnvVar('DB_HOST', '127.0.0.1'));
define('DB_PORT', getEnvVar('DB_PORT', '3306'));
define('DB_USER', getEnvVar('DB_USER', 'pma4support'));
define('DB_PASSWORD', requireEnvVar('DB_PASSWORD'));
define('DB_NAME', getEnvVar('DB_NAME', 'Support'));
define('DB_CHARSET', getEnvVar('DB_CHARSET', 'utf8'));
define('DB_SOCKET', getEnvVar('DB_SOCKET', ''));

// Configuration SMTP (envoi d'emails) — plus aucun identifiant en dur dans le code.
define('SMTP_HOST', getEnvVar('SMTP_HOST', ''));
define('SMTP_PORT', getEnvVar('SMTP_PORT', '587'));
define('SMTP_USER', getEnvVar('SMTP_USER', ''));
define('SMTP_PASSWORD', getEnvVar('SMTP_PASSWORD', ''));
define('SMTP_FROM_NAME', getEnvVar('SMTP_FROM_NAME', 'Support LyovaTech'));

// Configuration URLs
define('APP_URL', getEnvVar('APP_URL', 'http://localhost'));
define('FRONTEND_PORT', getEnvVar('FRONTEND_PORT', '3000'));
define('BACKEND_PORT', getEnvVar('BACKEND_PORT', '3001'));
define('API_BASE_URL', getEnvVar('NEXT_PUBLIC_API_BASE_URL', APP_URL . '/backend'));
define('WEBSOCKET_URL', getEnvVar('NEXT_PUBLIC_WEBSOCKET_URL', APP_URL . ':' . BACKEND_PORT));

// Configuration CORS
define('CORS_ORIGINS', getEnvVar('CORS_ORIGINS', APP_URL . ',' . APP_URL . ':' . FRONTEND_PORT));

// Configuration environnement
define('NODE_ENV', getEnvVar('NODE_ENV', 'production'));