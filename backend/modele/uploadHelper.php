<?php
// Validation centralisée des pièces jointes uploadées (tickets, chat).
// Vérifie taille, extension ET type MIME réel du contenu (pas seulement l'extension déclarée).

const PIECES_JOINTES_MIMES_AUTORISES = [
    'pdf'  => ['application/pdf'],
    'png'  => ['image/png'],
    'jpg'  => ['image/jpeg'],
    'jpeg' => ['image/jpeg'],
    'gif'  => ['image/gif'],
    'txt'  => ['text/plain'],
    'csv'  => ['text/plain', 'text/csv', 'application/csv', 'application/vnd.ms-excel'],
    'doc'  => ['application/msword'],
    // docx/xlsx sont des zip OOXML : finfo rapporte souvent application/zip
    'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'],
    'xls'  => ['application/vnd.ms-excel'],
    'xlsx' => ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip'],
];

const PIECE_JOINTE_TAILLE_MAX = 20 * 1024 * 1024; // 20 Mo

/**
 * Valide un fichier issu de $_FILES : taille, extension whitelistée et type MIME réel du contenu.
 * @return array{success:bool, error?:string, extension?:string}
 */
function validerPieceJointe(array $file): array {
    if ($file['size'] > PIECE_JOINTE_TAILLE_MAX) {
        return ['success' => false, 'error' => 'Fichier trop volumineux (max ' . (PIECE_JOINTE_TAILLE_MAX / 1024 / 1024) . 'MB)'];
    }

    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!isset(PIECES_JOINTES_MIMES_AUTORISES[$extension])) {
        return ['success' => false, 'error' => 'Type de fichier non autorisé (.' . $extension . ')'];
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeReel = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mimeReel, PIECES_JOINTES_MIMES_AUTORISES[$extension], true)) {
        return ['success' => false, 'error' => 'Le contenu du fichier ne correspond pas à son extension (.' . $extension . ')'];
    }

    return ['success' => true, 'extension' => $extension];
}

/** Génère un nom de fichier de destination sûr, indépendant du nom original. */
function nomPieceJointeSecurise(string $extension): string {
    return time() . '_' . bin2hex(random_bytes(8)) . '.' . $extension;
}
