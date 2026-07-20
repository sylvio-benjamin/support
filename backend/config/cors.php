<?php
// Émission centralisée de l'en-tête Access-Control-Allow-Origin, pilotée par
// CORS_ORIGINS (config.php / .env) au lieu d'une valeur "localhost" figée
// dans chacun des ~60 endpoints.

if (!defined('CORS_ORIGINS')) {
    require_once __DIR__ . '/../config.php';
}

function envoyerEnteteCorsOrigin(): void {
    $originesAutorisees = array_filter(array_map('trim', explode(',', CORS_ORIGINS)));
    $origine = $_SERVER['HTTP_ORIGIN'] ?? '';

    if ($origine !== '' && in_array($origine, $originesAutorisees, true)) {
        header('Access-Control-Allow-Origin: ' . $origine);
    } elseif (!empty($originesAutorisees)) {
        header('Access-Control-Allow-Origin: ' . $originesAutorisees[0]);
    }

    header('Vary: Origin');
}

envoyerEnteteCorsOrigin();
