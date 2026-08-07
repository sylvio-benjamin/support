<?php
// Bootstrap de session centralisé et durci, utilisé par tous les endpoints
// au lieu d'un session_start() nu répété (et incohérent) dans chaque fichier.

if (!defined('DB_HOST')) {
    require_once __DIR__ . '/../config.php';
}

// Durée de session : 24h. Sans ça, ni la durée de vie du cookie ni celle du
// nettoyage côté serveur (gc_maxlifetime) n'étaient fixées explicitement — le
// cookie redevenait "de session" (perdu à la fermeture de l'onglet) et
// php.ini pouvait purger les données de session dès ~24 minutes d'inactivité
// selon la config serveur, déconnectant les utilisateurs sans prévenir
// ("session instable").
const DUREE_SESSION_SECONDES = 86400;

function startSecureSession(): void {
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $secure = (NODE_ENV === 'production');

    ini_set('session.cookie_httponly', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.cookie_secure', $secure ? '1' : '0');
    ini_set('session.cookie_samesite', 'Lax');
    ini_set('session.cookie_lifetime', (string)DUREE_SESSION_SECONDES);
    ini_set('session.gc_maxlifetime', (string)DUREE_SESSION_SECONDES);

    session_start();

    if (!isset($_SESSION['login_time'])) {
        $_SESSION['login_time'] = time();
    }

    // PHP ne renouvelle PAS l'expiration du cookie à chaque requête par
    // défaut (seulement à sa création) : sans ce rafraîchissement, un
    // utilisateur actif depuis plus de cookie_lifetime perdait quand même sa
    // session malgré une activité continue. On glisse la fenêtre de 24h à
    // chaque requête authentifiée.
    if (isset($_SESSION['user']) && ini_get('session.use_cookies') && isset($_COOKIE[session_name()])) {
        $params = session_get_cookie_params();
        setcookie(session_name(), session_id(), [
            'expires' => time() + DUREE_SESSION_SECONDES,
            'path' => $params['path'],
            'domain' => $params['domain'],
            'secure' => $params['secure'],
            'httponly' => $params['httponly'],
            'samesite' => $params['samesite'],
        ]);
    }
}

function isSessionValid(): bool {
    return isset($_SESSION['user'])
        && is_array($_SESSION['user'])
        && (isset($_SESSION['user']['idUtilisateur']) || isset($_SESSION['user']['idTechnicien']) || isset($_SESSION['user']['idDirecteur']));
}

/**
 * True UNIQUEMENT pour un directeur INTERNE (plateforme, compte des tables
 * `techniciens`/`directeurs`), jamais pour un directeur "client" (table
 * `utilisateur`, roleEntreprise='directeur', scopé à sa propre entreprise).
 *
 * Le rôle 'directeur' est ambigu dans ce schéma : la même chaîne désigne deux
 * niveaux de privilège radicalement différents (plateforme entière vs une
 * seule entreprise). Le signal ici est POSITIF (présence d'idTechnicien ou
 * idDirecteur en session, preuve qu'on vient bien d'une table interne) et non
 * l'ABSENCE d'idEntreprise : un champ manquant (session mal reconstruite,
 * migration incomplète, bug ailleurs) ne doit jamais, à lui seul, élever un
 * compte au rang de directeur plateforme. Fail-closed par construction : en
 * cas de doute, retourne false.
 */
function estDirecteurPlateforme(): bool {
    $user = $_SESSION['user'] ?? null;
    if (!is_array($user) || ($user['role'] ?? null) !== 'directeur') {
        return false;
    }
    return isset($user['idTechnicien']) || isset($user['idDirecteur']);
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
