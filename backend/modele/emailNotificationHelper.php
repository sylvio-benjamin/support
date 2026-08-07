<?php
// Notifications par email pour les événements d'un ticket (nouveau message
// de chat, proposition/réponse de RDV) — best-effort : ne doit jamais faire
// échouer l'action qui déclenche l'envoi (message/RDV enregistré même si le
// mail échoue). Respecte le réglage plateforme "notifEmail" (cf.
// parametresHelper.php), au même titre que notificationParEmailUtilisateur.php.
require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/parametresHelper.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

/**
 * URL de la page ticket adaptée au type de compte du destinataire : un
 * technicien/directeur (table techniciens) et un employé/admin référent
 * (table utilisateur) n'ont pas la même section de l'app.
 */
function resoudreUrlTicket(string $type, ?string $role, int $idTicket): string {
    if ($type === 'technicien') {
        $chemin = ($role === 'directeur') ? "/directeur/ticket/$idTicket" : "/technicien/ticket/$idTicket";
    } else {
        $chemin = ($role === 'admin') ? "/admin/ticket/$idTicket" : "/employe/tickets/$idTicket";
    }
    return rtrim(APP_URL, '/') . $chemin;
}

/**
 * @param array{type: string, role?: ?string, email?: ?string, prenom?: ?string} $destinataire
 */
function envoyerEmailEvenementTicket(PDO $bdd, array $destinataire, int $idTicket, string $sujet, string $introHtml, string $detailHtml): bool {
    if (empty($destinataire['email'])) {
        return false;
    }
    if (SMTP_HOST === '' || SMTP_USER === '') {
        error_log('envoyerEmailEvenementTicket: SMTP non configuré, email non envoyé.');
        return false;
    }

    $parametres = obtenirParametresPlateforme($bdd);
    if (empty($parametres['notifEmail'])) {
        return false;
    }

    $lien = resoudreUrlTicket($destinataire['type'], $destinataire['role'] ?? null, $idTicket);

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
        $mail->addAddress($destinataire['email'], $destinataire['prenom'] ?? '');

        $mail->isHTML(true);
        $mail->Subject = $sujet;

        // Logo intégré en pièce jointe CID, comme emailCompteHelper.php.
        $logoHtml = '';
        $cheminLogo = __DIR__ . '/../../support-it/public/images/logo_lyo-removebg-preview.png';
        if (is_file($cheminLogo)) {
            $mail->addEmbeddedImage($cheminLogo, 'logoLyovaTech');
            $logoHtml = '<img src="cid:logoLyovaTech" alt="Support LyovaTech" style="height: 48px; display: block; margin: 0 auto 4px;" />';
        }

        $lienAffiche = htmlspecialchars($lien, ENT_QUOTES);

        $mail->Body = <<<HTML
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; color: #1e293b;">
            <div style="text-align: center; margin-bottom: 8px;">
                {$logoHtml}
                <h2 style="color: #4f46e5; margin: 0; font-size: 18px;">Support LyovaTech</h2>
            </div>
            {$introHtml}
            {$detailHtml}
            <p style="text-align: center; margin: 28px 0;">
                <a href="{$lienAffiche}" style="background: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; display: inline-block;">Voir le ticket</a>
            </p>
        </div>
        HTML;

        $mail->AltBody = trim(strip_tags($introHtml)) . "\n\n" . trim(strip_tags($detailHtml)) . "\n\nVoir le ticket : $lien";

        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log('envoyerEmailEvenementTicket: échec envoi à ' . $destinataire['email'] . ' : ' . $e->getMessage());
        return false;
    }
}

/**
 * Toutes les personnes ayant accès au chat d'un ticket : le créateur, le
 * technicien assigné, les techniciens en partage (cf. PartageUnTicket.php)
 * et les membres ajoutés côté client (cf. membresTicket.php) — mêmes règles
 * d'accès que getChatMessages.php / saveChatMessage.php.
 *
 * @return array<int, array{type: string, id: int, email: ?string, prenom: ?string, nom: ?string, role: ?string}>
 */
function recupererParticipantsChat(PDO $bdd, int $idTicket): array {
    $stmtTicket = $bdd->prepare("SELECT idUtilisateur, idTechnicien FROM ticket WHERE idTicket = ?");
    $stmtTicket->execute([$idTicket]);
    $ticket = $stmtTicket->fetch(PDO::FETCH_ASSOC);
    if (!$ticket) {
        return [];
    }

    $participants = [];

    if (!empty($ticket['idUtilisateur'])) {
        $stmt = $bdd->prepare("SELECT idUtilisateur AS id, emailUtilisateur AS email, prenomUtilisateur AS prenom, nomUtilisateur AS nom, roleEntreprise AS role FROM utilisateur WHERE idUtilisateur = ?");
        $stmt->execute([$ticket['idUtilisateur']]);
        if ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $row['type'] = 'utilisateur';
            $participants[] = $row;
        }
    }

    if (!empty($ticket['idTechnicien'])) {
        $stmt = $bdd->prepare("SELECT idTechnicien AS id, emailTechnicien AS email, prenomTechnicien AS prenom, nomTechnicien AS nom, role FROM techniciens WHERE idTechnicien = ?");
        $stmt->execute([$ticket['idTechnicien']]);
        if ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $row['type'] = 'technicien';
            $participants[] = $row;
        }
    }

    $stmt = $bdd->prepare("SELECT t.idTechnicien AS id, t.emailTechnicien AS email, t.prenomTechnicien AS prenom, t.nomTechnicien AS nom, t.role
                            FROM partagerTicket pt JOIN techniciens t ON pt.idTechnicien = t.idTechnicien
                            WHERE pt.idTicket = ?");
    $stmt->execute([$idTicket]);
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $row['type'] = 'technicien';
        $participants[] = $row;
    }

    $stmt = $bdd->prepare("SELECT u.idUtilisateur AS id, u.emailUtilisateur AS email, u.prenomUtilisateur AS prenom, u.nomUtilisateur AS nom, u.roleEntreprise AS role
                            FROM ticketMembres tm JOIN utilisateur u ON tm.idUtilisateur = u.idUtilisateur
                            WHERE tm.idTicket = ?");
    $stmt->execute([$idTicket]);
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $row['type'] = 'utilisateur';
        $participants[] = $row;
    }

    // Dédoublonnage (type + id) : un technicien peut être à la fois assigné
    // ET explicitement partagé, par exemple.
    $vus = [];
    $dedupe = [];
    foreach ($participants as $p) {
        $cle = $p['type'] . ':' . $p['id'];
        if (isset($vus[$cle])) {
            continue;
        }
        $vus[$cle] = true;
        $dedupe[] = $p;
    }
    return $dedupe;
}

/**
 * Les personnes concernées par un RDV : le technicien assigné, l'employé
 * pour qui le RDV est proposé, et le(s) admin(s) référent(s) de son
 * entreprise (qui doivent pouvoir suivre/relayer la décision).
 *
 * @return array<int, array{type: string, id: int, email: ?string, prenom: ?string, nom: ?string, role: ?string}>
 */
function recupererPartiesRdv(PDO $bdd, int $idUtilisateurTicket, ?int $idTechnicienTicket): array {
    $parties = [];

    $stmt = $bdd->prepare("SELECT idUtilisateur AS id, emailUtilisateur AS email, prenomUtilisateur AS prenom, nomUtilisateur AS nom, roleEntreprise AS role, idEntreprise FROM utilisateur WHERE idUtilisateur = ?");
    $stmt->execute([$idUtilisateurTicket]);
    $utilisateur = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($utilisateur) {
        $u = $utilisateur;
        unset($u['idEntreprise']);
        $u['type'] = 'utilisateur';
        $parties[] = $u;

        if (!empty($utilisateur['idEntreprise'])) {
            $stmtAdmins = $bdd->prepare("SELECT idUtilisateur AS id, emailUtilisateur AS email, prenomUtilisateur AS prenom, nomUtilisateur AS nom, roleEntreprise AS role
                                          FROM utilisateur WHERE idEntreprise = ? AND roleEntreprise = 'admin' AND idUtilisateur != ?");
            $stmtAdmins->execute([$utilisateur['idEntreprise'], $utilisateur['id']]);
            foreach ($stmtAdmins->fetchAll(PDO::FETCH_ASSOC) as $admin) {
                $admin['type'] = 'utilisateur';
                $parties[] = $admin;
            }
        }
    }

    if ($idTechnicienTicket) {
        $stmt = $bdd->prepare("SELECT idTechnicien AS id, emailTechnicien AS email, prenomTechnicien AS prenom, nomTechnicien AS nom, role FROM techniciens WHERE idTechnicien = ?");
        $stmt->execute([$idTechnicienTicket]);
        if ($tech = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $tech['type'] = 'technicien';
            $parties[] = $tech;
        }
    }

    return $parties;
}
