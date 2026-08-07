<?php
// Email envoyé automatiquement à un employé/admin (table utilisateur) quand
// son compte est créé, avec ses identifiants temporaires — le mot de passe
// n'est disponible qu'à cet instant précis (en clair, avant hachage) ; il ne
// peut plus jamais être récupéré ensuite, l'email doit donc partir MAINTENANT
// ou pas du tout.
require_once __DIR__ . '/../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

/**
 * @param string $typeCompte 'entreprise' (employé/admin/directeur client,
 *   table utilisateur) ou 'lyovatech' (technicien/directeur/référent/
 *   affichage, table techniciens) — détermine vers quelle page de connexion
 *   pointe le bouton de l'email (voir app/affichage/page.tsx pour la même
 *   distinction côté déconnexion).
 * @return bool true si l'email a été envoyé avec succès (best-effort : ne
 * doit jamais faire échouer la création du compte elle-même).
 */
function envoyerEmailCompteCree(string $emailDestinataire, string $prenom, string $login, string $motDePasseClair, string $typeCompte = 'entreprise'): bool {
    if (SMTP_HOST === '' || SMTP_USER === '') {
        error_log('envoyerEmailCompteCree: SMTP non configuré, email non envoyé.');
        return false;
    }

    $chemin = $typeCompte === 'lyovatech' ? '/connexion/lyovatech' : '/connexion/entreprise';
    $lienConnexion = rtrim(APP_URL, '/') . $chemin;

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
        $mail->addAddress($emailDestinataire, $prenom);

        $mail->isHTML(true);
        $mail->Subject = 'Votre compte Support LyovaTech est prêt';

        // Logo intégré en pièce jointe CID (plutôt qu'une URL publique) :
        // s'affiche directement dans la plupart des clients mail sans
        // dépendre du blocage "afficher les images distantes".
        $logoHtml = '';
        $cheminLogo = __DIR__ . '/../../support-it/public/images/logo_lyo-removebg-preview.png';
        if (is_file($cheminLogo)) {
            $mail->addEmbeddedImage($cheminLogo, 'logoLyovaTech');
            $logoHtml = '<img src="cid:logoLyovaTech" alt="Support LyovaTech" style="height: 48px; display: block; margin: 0 auto 4px;" />';
        }

        $prenomAffiche = htmlspecialchars($prenom, ENT_QUOTES);
        $loginAffiche = htmlspecialchars($login, ENT_QUOTES);
        $mdpAffiche = htmlspecialchars($motDePasseClair, ENT_QUOTES);
        $lienAffiche = htmlspecialchars($lienConnexion, ENT_QUOTES);

        $mail->Body = <<<HTML
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; color: #1e293b;">
            <div style="text-align: center; margin-bottom: 8px;">
                {$logoHtml}
                <h2 style="color: #4f46e5; margin: 0; font-size: 18px;">Support LyovaTech</h2>
            </div>
            <p>Bonjour {$prenomAffiche},</p>
            <p>Votre compte est prêt pour la connexion. Voici vos identifiants temporaires :</p>
            <div style="background: #f1f5f9; border-radius: 8px; padding: 16px 20px; margin: 16px 0;">
                <p style="margin: 4px 0;"><strong>Identifiant :</strong> {$loginAffiche}</p>
                <p style="margin: 4px 0;"><strong>Mot de passe temporaire :</strong> {$mdpAffiche}</p>
            </div>
            <p style="text-align: center; margin: 28px 0;">
                <a href="{$lienAffiche}" style="background: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; display: inline-block;">Se connecter</a>
            </p>
            <p style="font-size: 13px; color: #64748b;">Pour votre sécurité, il vous sera demandé de choisir un nouveau mot de passe dès votre première connexion.</p>
            <p style="font-size: 13px; color: #64748b;">Si vous n'êtes pas à l'origine de cette création de compte, ignorez cet email.</p>
        </div>
        HTML;

        $mail->AltBody = "Bonjour $prenom,\n\n"
            . "Votre compte est pret pour la connexion.\n"
            . "Identifiant : $login\n"
            . "Mot de passe temporaire : $motDePasseClair\n\n"
            . "Connexion : $lienConnexion\n\n"
            . "Il vous sera demande de choisir un nouveau mot de passe des votre premiere connexion.";

        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log('envoyerEmailCompteCree: échec envoi à ' . $emailDestinataire . ' : ' . $e->getMessage());
        return false;
    }
}
