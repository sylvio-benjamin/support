<?php
// Bootstrap de session centralisé et durci, utilisé par tous les endpoints
// au lieu d'un session_start() nu répété (et incohérent) dans chaque fichier.

if (!defined('DB_HOST')) {
    require_once __DIR__ . '/../config.php';
}

function startSecureSession(): void {
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $secure = (NODE_ENV === 'production');

    ini_set('session.cookie_httponly', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.cookie_secure', $secure ? '1' : '0');
    ini_set('session.cookie_samesite', 'Lax');

    session_start();

    if (!isset($_SESSION['login_time'])) {
        $_SESSION['login_time'] = time();
    }
}

function isSessionValid(): bool {
    return isset($_SESSION['user'])
        && is_array($_SESSION['user'])
        && (isset($_SESSION['user']['idUtilisateur']) || isset($_SESSION['user']['idTechnicien']) || isset($_SESSION['user']['idDirecteur']));
}

function clearSession(): void {
    $_SESSION = [];

    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params['path'], $params['domain'], $params['secure'], $params['httponly']
        );
    }

    session_destroy();
}
