<?php
require '../config/cors.php';
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/session.php';
startSecureSession();
// Vérification de session pour les directeurs/admins
if (!isset($_SESSION['user']) || empty($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['erreur' => 'Non authentifié']);
    exit;
}

// Autoriser les rôles directeur et admin
$rolesAutorises = ['directeur', 'admin'];
if (!in_array($_SESSION['user']['role'], $rolesAutorises)) {
    http_response_code(403);
    echo json_encode(['erreur' => 'Accès non autorisé']);
    exit;
}

require_once '../connexionBDD.php';

try {
    // Récupérer les paramètres
    $periode = $_GET['periode'] ?? 'month'; // week, month, quarter, year
    $entreprises = $_GET['entreprises'] ?? 'all'; // 'all' ou IDs séparés par virgules
    
    // Définir les périodes et labels
    $periodesConfig = [
        'week' => [
            'interval' => '7 DAY',
            'groupBy' => 'DAYOFWEEK(t.dateCreation)',
            'labels' => ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
            'unite' => 'jours'
        ],
        'month' => [
            'interval' => '30 DAY',
            'groupBy' => 'CEILING(DAY(t.dateCreation)/7)',
            'labels' => ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
            'unite' => 'semaines'
        ],
        'quarter' => [
            'interval' => '90 DAY',
            'groupBy' => 'MONTH(t.dateCreation)',
            'labels' => ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
            'unite' => 'mois'
        ],
        'year' => [
            'interval' => '365 DAY',
            'groupBy' => 'YEAR(t.dateCreation)',
            'labels' => [(date('Y') - 2), (date('Y') - 1), date('Y')],
            'unite' => 'années'
        ]
    ];
    
    $config = $periodesConfig[$periode] ?? $periodesConfig['month'];
    
    // Construire la clause WHERE pour les entreprises
    $whereEntreprises = "";
    $params = [];
    if ($entreprises !== 'all') {
        $idsEntreprises = explode(',', $entreprises);
        $placeholders = str_repeat('?,', count($idsEntreprises) - 1) . '?';
        $whereEntreprises = " AND u.idEntreprise IN ($placeholders)";
        $params = array_merge($params, $idsEntreprises);
    }
    
    // Requête pour la période actuelle
    $sqlActuelle = "
        SELECT 
            {$config['groupBy']} as periode_key,
            COUNT(*) as nombre_tickets
        FROM ticket t
        LEFT JOIN utilisateur u ON t.idUtilisateur = u.idUtilisateur
        WHERE t.dateCreation >= DATE_SUB(NOW(), INTERVAL {$config['interval']})
        $whereEntreprises
        GROUP BY {$config['groupBy']}
        ORDER BY {$config['groupBy']} ASC
    ";
    
    $stmtActuelle = $bdd->prepare($sqlActuelle);
    $stmtActuelle->execute($params);
    $donneesActuelles = $stmtActuelle->fetchAll(PDO::FETCH_ASSOC);
    
    // Requête pour la période précédente (pour comparaison)
    $intervalDouble = (2 * intval(explode(' ', $config['interval'])[0])) . " " . explode(' ', $config['interval'])[1];
    $sqlPrecedente = "
        SELECT 
            {$config['groupBy']} as periode_key,
            COUNT(*) as nombre_tickets
        FROM ticket t
        LEFT JOIN utilisateur u ON t.idUtilisateur = u.idUtilisateur
        WHERE t.dateCreation >= DATE_SUB(NOW(), INTERVAL $intervalDouble)
        AND t.dateCreation < DATE_SUB(NOW(), INTERVAL {$config['interval']})
        $whereEntreprises
        GROUP BY {$config['groupBy']}
        ORDER BY {$config['groupBy']} ASC
    ";
    
    $stmtPrecedente = $bdd->prepare($sqlPrecedente);
    $stmtPrecedente->execute($params);
    $donneesPrecedentes = $stmtPrecedente->fetchAll(PDO::FETCH_ASSOC);
    
    // Traitement des données selon la période
    $nbLabels = count($config['labels']);
    
    // Initialiser les tableaux avec zéros
    $donneesActuellesArray = array_fill(0, $nbLabels, 0);
    $donneesPrecedentesArray = array_fill(0, $nbLabels, 0);
    
    // Remplir les données actuelles
    foreach ($donneesActuelles as $donnee) {
        $cle = intval($donnee['periode_key']);
        
        // Ajuster les clés selon la période
        if ($periode === 'week') {
            // DAYOFWEEK() retourne 1-7 (1=Dimanche, 2=Lundi, ... 7=Samedi)
            // Labels: [Lun, Mar, Mer, Jeu, Ven, Sam, Dim]
            if ($cle == 1) { // Dimanche
                $index = 6;
            } else { // Lundi=2 -> index 0, Mardi=3 -> index 1, etc.
                $index = $cle - 2;
            }
        } elseif ($periode === 'month') {
            // CEILING(DAY/7) retourne 1-4, on veut 0-3
            $index = max(0, min(3, $cle - 1));
        } elseif ($periode === 'quarter') {
            // MONTH() retourne 1-12, on veut 0-11
            $index = max(0, min(11, $cle - 1));
        } else { // year
            // Pour l'année, mapper les années aux indices [2022, 2023, 2024]
            $anneeActuelle = date('Y');
            if ($cle == $anneeActuelle - 2) $index = 0; // 2022
            elseif ($cle == $anneeActuelle - 1) $index = 1; // 2023  
            elseif ($cle == $anneeActuelle) $index = 2; // 2024
            else continue; // Ignorer si hors plage
        }
        
        if ($index >= 0 && $index < $nbLabels) {
            $donneesActuellesArray[$index] += intval($donnee['nombre_tickets']);
        }
    }
    
    // Remplir les données précédentes
    foreach ($donneesPrecedentes as $donnee) {
        $cle = intval($donnee['periode_key']);
        
        // Même logique que pour les données actuelles
        if ($periode === 'week') {
            // DAYOFWEEK() retourne 1-7 (1=Dimanche, 2=Lundi, ... 7=Samedi)
            // Labels: [Lun, Mar, Mer, Jeu, Ven, Sam, Dim]
            if ($cle == 1) { // Dimanche
                $index = 6;
            } else { // Lundi=2 -> index 0, Mardi=3 -> index 1, etc.
                $index = $cle - 2;
            }
        } elseif ($periode === 'month') {
            $index = max(0, min(3, $cle - 1));
        } elseif ($periode === 'quarter') {
            $index = max(0, min(11, $cle - 1));
        } else { // year
            // Pour la période précédente, décaler de 3 ans
            $anneeActuelle = date('Y');
            if ($cle == $anneeActuelle - 5) $index = 0; // 2019 -> 2022
            elseif ($cle == $anneeActuelle - 4) $index = 1; // 2020 -> 2023  
            elseif ($cle == $anneeActuelle - 3) $index = 2; // 2021 -> 2024
            else continue; // Ignorer si hors plage
        }
        
        if ($index >= 0 && $index < $nbLabels) {
            $donneesPrecedentesArray[$index] += intval($donnee['nombre_tickets']);
        }
    }
    
    $donneesFinales = [
        'actuelle' => $donneesActuellesArray,
        'precedente' => $donneesPrecedentesArray
    ];
    
    // Statistiques totales pour cette période
    $totalActuel = array_sum($donneesFinales['actuelle']);
    $totalPrecedent = array_sum($donneesFinales['precedente']);
    $pourcentageEvolution = $totalPrecedent > 0 ? round((($totalActuel - $totalPrecedent) / $totalPrecedent) * 100, 1) : 0;
    
    $resultat = [
        'success' => true,
        'periode' => $periode,
        'entreprises' => $entreprises,
        'labels' => $config['labels'],
        'donnees' => $donneesFinales,
        'statistiques' => [
            'total_actuel' => $totalActuel,
            'total_precedent' => $totalPrecedent,
            'evolution_pourcentage' => $pourcentageEvolution,
            'unite' => $config['unite']
        ]
    ];
    
    echo json_encode($resultat, JSON_UNESCAPED_UNICODE);
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false, 
        'error' => 'Erreur lors de la récupération des données: '
    ], JSON_UNESCAPED_UNICODE);
}
?>