<?php
require_once __DIR__ . '/../config/session.php';
startSecureSession();
require '../config/cors.php';
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if (!isset($_SESSION['user']) || !isset($_SESSION['user']['role']) || (!isset($_SESSION['user']['idUtilisateur']) && !isset($_SESSION['user']['idTechnicien']))) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Utilisateur non connecté']);
    exit;
}

require_once __DIR__ . '/../connexionBDD.php';
require __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/parametresHelper.php';

$data = json_decode(file_get_contents("php://input"), true);
$utilsiateurId = $data['idUtilisateur'] ?? '';

function rechercheUtilisateurParId($utilisateurId, $bdd){
    $stmt = $bdd->prepare("SELECT * FROM utilisateur WHERE idUtilisateur = :utilisateurId");
    $stmt->bindParam(':utilisateurId', $utilisateurId);
    $stmt->execute();
    return $stmt;
}

use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

$parametresPlateforme = obtenirParametresPlateforme($bdd);
if (empty($parametresPlateforme['notifEmail'])) {
    echo json_encode(['success' => false, 'error' => 'Notifications par email désactivées dans les paramètres de la plateforme.']);
    exit;
}

$emailUtilisateur = rechercheUtilisateurParId($utilsiateurId, $bdd)->fetch(PDO::FETCH_ASSOC);
if (!$emailUtilisateur || empty($emailUtilisateur['emailUtilisateur'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Utilisateur ou adresse email introuvable.']);
    exit;
}

try {
    $mail = new PHPMailer(true);
    $mail->CharSet    = PHPMailer::CHARSET_UTF8;
    $mail->isSMTP();
    $mail->Host       = SMTP_HOST;
    $mail->SMTPAuth   = true;
    $mail->Username   = SMTP_USER;
    $mail->Password   = SMTP_PASSWORD;
    $mail->Port       = SMTP_PORT;
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;

    $mail->setFrom(SMTP_USER, SMTP_FROM_NAME);
    $mail->addAddress($emailUtilisateur['emailUtilisateur'], 'Utilisateur');

    $mail->isHTML(true);
    $mail->Subject = 'Support LyovaTech';
    $mail->Body    = 'Le technicien a répondu à votre ticket';
    $mail->AltBody = 'Ceci est un email automatique en texte brut.';

    $mail->SMTPOptions = [
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false,
            'allow_self_signed' => true,
        ],
    ];

    $mail->send();
    echo json_encode(['success' => true, 'message' => 'Email envoyé avec succès.']);
} catch (Exception $e) {
    error_log("Erreur envoi mail à {$emailUtilisateur['emailUtilisateur']} : {$mail->ErrorInfo}");
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erreur lors de l\'envoi de l\'email : ' . $mail->ErrorInfo]);
}
