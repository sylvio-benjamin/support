<?php
require_once __DIR__ . '/config/session.php';
startSecureSession();

// Toujours utiliser le chemin absolu pour éviter les erreurs
require_once __DIR__ . '/connexionBDD.php';
