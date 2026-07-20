<?php
// Point d'entrée manquant du flux "mot de passe oublié" : génère un token
// côté serveur (jamais fourni par le client) et l'envoie par email, au lieu
// de laisser reinitialiserMotDePasse.php faire confiance à un token arbitraire
// fourni par la requête.

require '../config/cors.php';
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require '../connexionBDD.php';
require_once __DIR__ . '/../vendor/autoload.php';
require_once 'verifierDateExpi.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

$data = json_decode(file_get_contents("php://input"), true);
$email = trim($data['email'] ?? '');

// Réponse générique unique, envoyée dans tous les cas, pour ne jamais révéler
// si l'email correspond à un compte existant (anti-énumération de comptes).
$reponseGenerique = ['success' => true, 'message' => "Si un compte existe pour cette adresse, un email de réinitialisation vient d'être envoyé."];

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Adresse email invalide.']);
    exit();
}

try {
    expirerAnciensTokens();

    $stmt = $bdd->prepare("SELECT loginUtilisateur FROM utilisateur WHERE emailUtilisateur = ?");
    $stmt->execute([$email]);
    $utilisateur = $stmt->fetch();

    if ($utilisateur) {
        $login = $utilisateur['loginUtilisateur'];

        // Anti-spam simple : pas plus d'une demande par minute pour ce compte.
        $recent = $bdd->prepare("SELECT idToken FROM reinitialiserMotDePasse WHERE login = ? AND expire = 0 AND date > (NOW() - INTERVAL 60 SECOND)");
        $recent->execute([$login]);

        if (!$recent->fetch()) {
            // On invalide les anciens tokens actifs de ce compte avant d'en émettre un nouveau.
            $invalidate = $bdd->prepare("UPDATE reinitialiserMotDePasse SET expire = 1 WHERE login = ? AND expire = 0");
            $invalidate->execute([$login]);

            $token = bin2hex(random_bytes(32));
            $insert = $bdd->prepare("INSERT INTO reinitialiserMotDePasse (idToken, login, expire, date) VALUES (?, ?, 0, NOW())");
            $insert->execute([$token, $login]);

            if (SMTP_HOST !== '' && SMTP_USER !== '') {
                try {
                    $mail = new PHPMailer(true);
                    $mail->isSMTP();
                    $mail->Host       = SMTP_HOST;
                    $mail->SMTPAuth   = true;
                    $mail->Username   = SMTP_USER;
                    $mail->Password   = SMTP_PASSWORD;
                    $mail->Port       = SMTP_PORT;
                    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;

                    $mail->setFrom(SMTP_USER, SMTP_FROM_NAME);
                    $mail->addAddress($email);

                    $lienReset = rtrim(APP_URL, '/') . '/reset-mdp?token=' . urlencode($token);

                    $mail->isHTML(true);
                    $mail->Subject = 'Réinitialisation de votre mot de passe';
                    $mail->Body    = 'Vous avez demandé la réinitialisation de votre mot de passe.<br>'
                        . 'Cliquez sur ce lien (valable 15 minutes) : <a href="' . htmlspecialchars($lienReset) . '">' . htmlspecialchars($lienReset) . '</a><br>'
                        . "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.";
                    $mail->AltBody = "Lien de réinitialisation (valable 15 minutes) : $lienReset";

                    $mail->send();
                } catch (Exception $e) {
                    error_log('demanderReinitialisationMotDePasse.php (envoi email) : ' . $e->getMessage());
                }
            } else {
                error_log('demanderReinitialisationMotDePasse.php : SMTP non configuré, email non envoyé.');
            }
        }
    }

    echo json_encode($reponseGenerique);

} catch (PDOException $e) {
    error_log('demanderReinitialisationMotDePasse.php : ' . $e->getMessage());
    // On répond quand même de façon générique pour ne pas révéler d'information.
    echo json_encode($reponseGenerique);
}
