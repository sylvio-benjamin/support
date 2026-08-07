<?php
// Protection CSRF — motif "double soumission de cookie".
//
// Pourquoi ce motif plutôt qu'un token stocké en session : l'application a
// 81 endpoints indépendants sans état partagé au-delà de la session PHP
// elle-même ; un token par formulaire (synchronizer token classique)
// demanderait de le faire transiter dans chaque page/appel frontend
// existant, avec un vrai risque de casser des appels déjà en place. Le
// double-soumission ne demande qu'une chose de plus côté client : relire un
// cookie et le renvoyer dans un header — aucun état serveur supplémentaire.
//
// Principe : après connexion, un cookie `lyova_csrf` (lisible en JS, PAS
// httpOnly) est posé avec un token aléatoire. Un attaquant tiers peut faire
// exécuter une requête au navigateur de la victime (le cookie de SESSION
// part automatiquement), mais ne peut pas LIRE le cookie `lyova_csrf` pour
// le recopier dans un header (politique de même origine du navigateur).
// Le serveur vérifie donc juste que le header envoyé correspond au cookie.
//
// Périmètre actuel (pilote) : appliqué uniquement sur assignerTicket.php,
// supprimerMessage.php et fermerTicket.php — voir
// cybersecurity/rapports/absence_csrf.md pour le constat d'origine, et le
// README de ce dossier pour le plan de généralisation aux 81 endpoints.

const CSRF_COOKIE_NAME = 'lyova_csrf';
const CSRF_HEADER_NAME = 'HTTP_X_CSRF_TOKEN';

/**
 * Émet le cookie CSRF. À appeler juste après authentification réussie
 * (donc après session_regenerate_id(true) dans connexion.php), jamais
 * avant : un token émis avant l'authentification survivrait à la
 * régénération de session et resterait valide pour un attaquant qui aurait
 * pu l'observer sur une page publique.
 */
function emettreTokenCsrf(): void {
    $token = bin2hex(random_bytes(32));
    $secure = (defined('NODE_ENV') && NODE_ENV === 'production');

    setcookie(CSRF_COOKIE_NAME, $token, [
        'expires' => time() + DUREE_SESSION_SECONDES,
        'path' => '/',
        'secure' => $secure,
        'httponly' => false, // lu par le frontend en JS, c'est le principe du motif
        'samesite' => 'Lax',
    ]);

    // Copie côté serveur pour comparaison stricte (évite de comparer contre
    // une valeur que le client pourrait avoir altérée entre-temps côté
    // cookie sans que $_SESSION ne bouge).
    $_SESSION['csrf_token'] = $token;
}

/**
 * Vérifie le token CSRF sur une requête mutante. Doit être appelée après
 * startSecureSession(), avant toute écriture. Termine la requête en 403
 * si absent ou invalide.
 */
function verifierTokenCsrf(): void {
    $cookieToken = $_COOKIE[CSRF_COOKIE_NAME] ?? '';
    $headerToken = $_SERVER[CSRF_HEADER_NAME] ?? '';
    $sessionToken = $_SESSION['csrf_token'] ?? '';

    $valide = $cookieToken !== ''
        && $headerToken !== ''
        && $sessionToken !== ''
        && hash_equals($sessionToken, $cookieToken)
        && hash_equals($sessionToken, $headerToken);

    if (!$valide) {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => false, 'error' => 'Jeton CSRF manquant ou invalide.']);
        exit;
    }
}
