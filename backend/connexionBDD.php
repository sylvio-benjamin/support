<?php
require_once __DIR__ . '/config.php';

   try {
    if (defined('DB_SOCKET') && DB_SOCKET !== '') {
        $dsn = "mysql:unix_socket=" . DB_SOCKET . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
    } else {
        $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
    }
    $bdd = new PDO($dsn, DB_USER, DB_PASSWORD);
    $bdd->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
   } catch (PDOException $e) {
       error_log("Erreur de connexion BDD : " . $e->getMessage());
       http_response_code(500);
       die("Erreur de connexion à la base de données.");
   }

