<?php
require '../config/cors.php';
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/session.php';
startSecureSession();
if (!isset($_SESSION['user']) || empty($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['erreur' => 'Non authentifié']);
    exit;
}

require_once '../connexionBDD.php';

// Récupérer les paramètres
$periode = $_GET['periode'] ?? 'month';
$entreprises = $_GET['entreprises'] ?? 'all';
$dateDebut = $_GET['dateDebut'] ?? null;
$dateFin = $_GET['dateFin'] ?? null;

// Vérifier les permissions
$role = $_SESSION['user']['role'];
if (!in_array($role, ['directeur', 'admin', 'referent'])) {
    http_response_code(403);
    echo json_encode(['erreur' => 'Accès non autorisé']);
    exit;
}

// entreprises='all' (la valeur par défaut !) ne doit être permis qu'à un
// directeur PLATEFORME : sans ce contrôle, un admin/referent/directeur
// "client" pouvait demander les statistiques agrégées de TOUTES les
// entreprises simplement en omettant le paramètre.
if (!estDirecteurPlateforme()) {
    $idEntrepriseAppelant = $_SESSION['user']['idEntreprise'] ?? null;
    if (!$idEntrepriseAppelant) {
        http_response_code(403);
        echo json_encode(['erreur' => 'Entreprise introuvable pour ce compte.']);
        exit;
    }
    $entreprises = (string)$idEntrepriseAppelant;
}

try {
    // Récupérer les données selon les filtres
    $donnees = obtenirDonneesStatistiques($bdd, $periode, $entreprises, $dateDebut, $dateFin);
    
    // Générer le PDF
    genererPDFStatistiques($donnees, $periode, $entreprises, $dateDebut, $dateFin);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['erreur' => 'Erreur lors de la génération du PDF.']);
}

function obtenirDonneesStatistiques($bdd, $periode, $entreprises, $dateDebut = null, $dateFin = null) {
    // Déterminer la plage de dates
    if ($periode === 'custom' && $dateDebut && $dateFin) {
        $debut = $dateDebut;
        $fin = $dateFin;
    } else {
        switch ($periode) {
            case 'week':
                $debut = date('Y-m-d', strtotime('monday this week'));
                $fin = date('Y-m-d', strtotime('sunday this week'));
                break;
            case 'quarter':
                $debut = date('Y-m-d', strtotime('first day of -2 months'));
                $fin = date('Y-m-d');
                break;
            case 'year':
                $debut = date('Y-01-01');
                $fin = date('Y-m-d');
                break;
            default: // month
                $debut = date('Y-m-01');
                $fin = date('Y-m-d');
                break;
        }
    }
    
    // Construire la clause WHERE pour les entreprises
    $whereEntreprises = '';
    $params = [$debut, $fin];
    
    if ($entreprises !== 'all') {
        $entrepriseIds = explode(',', $entreprises);
        $placeholders = str_repeat('?,', count($entrepriseIds) - 1) . '?';
        $whereEntreprises = " AND u.idEntreprise IN ($placeholders)";
        $params = array_merge($params, $entrepriseIds);
    }
    
    // Requête pour les statistiques générales
    $sql = "
        SELECT 
            COUNT(*) as total_tickets,
            SUM(CASE WHEN t.statut = 'en_attente' THEN 1 ELSE 0 END) as tickets_en_attente,
            SUM(CASE WHEN t.statut = 'en_cours' THEN 1 ELSE 0 END) as tickets_en_cours,
            SUM(CASE WHEN t.statut = 'resolu' THEN 1 ELSE 0 END) as tickets_resolus,
            SUM(CASE WHEN t.statut = 'ferme' THEN 1 ELSE 0 END) as tickets_fermes,
            SUM(CASE WHEN t.priorite = 'urgente' THEN 1 ELSE 0 END) as tickets_urgents,
            AVG(CASE 
                WHEN t.statut IN ('resolu', 'ferme') AND t.dateTicketCloture IS NOT NULL 
                THEN TIMESTAMPDIFF(HOUR, t.dateCreation, t.dateTicketCloture)
                ELSE NULL 
            END) as temps_moyen_resolution
        FROM ticket t
        JOIN utilisateur u ON t.idUtilisateur = u.idUtilisateur
        WHERE DATE(t.dateCreation) BETWEEN ? AND ?
        $whereEntreprises
    ";
    
    $stmt = $bdd->prepare($sql);
    $stmt->execute($params);
    $statistiques = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Requête pour les tickets par entreprise
    $sqlEntreprises = "
        SELECT 
            e.nomEntreprise,
            COUNT(*) as total_tickets,
            SUM(CASE WHEN t.statut = 'resolu' OR t.statut = 'ferme' THEN 1 ELSE 0 END) as tickets_resolus
        FROM ticket t
        JOIN utilisateur u ON t.idUtilisateur = u.idUtilisateur
        JOIN entreprise e ON u.idEntreprise = e.idEntreprise
        WHERE DATE(t.dateCreation) BETWEEN ? AND ?
        $whereEntreprises
        GROUP BY e.idEntreprise, e.nomEntreprise
        ORDER BY total_tickets DESC
    ";
    
    $stmt = $bdd->prepare($sqlEntreprises);
    $stmt->execute($params);
    $entreprisesStats = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    return [
        'statistiques' => $statistiques,
        'entreprises' => $entreprisesStats,
        'periode' => [
            'debut' => $debut,
            'fin' => $fin,
            'type' => $periode
        ]
    ];
}

function genererPDFStatistiques($donnees, $periode, $entreprises, $dateDebut, $dateFin) {
    // Configuration du PDF
    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="statistiques_' . $periode . '_' . date('Y-m-d') . '.pdf"');
    
    // Utiliser une approche plus simple avec des données JSON pour éviter les problèmes de formatage
    // Le frontend pourra gérer l'affichage du PDF
    
    $pdfData = [
        'titre' => 'Rapport de Statistiques Support',
        'periode' => [
            'debut' => date('d/m/Y', strtotime($donnees['periode']['debut'])),
            'fin' => date('d/m/Y', strtotime($donnees['periode']['fin'])),
            'type' => $periode
        ],
        'date_generation' => date('d/m/Y H:i'),
        'statistiques' => $donnees['statistiques'],
        'entreprises' => $donnees['entreprises'],
        'filtres' => [
            'periode' => $periode,
            'entreprises' => $entreprises,
            'dateDebut' => $dateDebut,
            'dateFin' => $dateFin
        ]
    ];
    
    // Retourner les données en JSON pour que le frontend puisse les traiter
    echo json_encode($pdfData);
    return;
    ?>
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Statistiques Support</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
            .stat-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; text-align: center; }
            .stat-value { font-size: 24px; font-weight: bold; color: #333; }
            .stat-label { font-size: 14px; color: #666; margin-top: 5px; }
            .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .table th { background-color: #f5f5f5; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Rapport de Statistiques Support</h1>
            <p>Période: <?php echo date('d/m/Y', strtotime($donnees['periode']['debut'])); ?> - <?php echo date('d/m/Y', strtotime($donnees['periode']['fin'])); ?></p>
            <p>Généré le: <?php echo date('d/m/Y H:i'); ?></p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value"><?php echo $donnees['statistiques']['total_tickets']; ?></div>
                <div class="stat-label">Total Tickets</div>
            </div>
            <div class="stat-card">
                <div class="stat-value"><?php echo $donnees['statistiques']['tickets_en_attente']; ?></div>
                <div class="stat-label">En Attente</div>
            </div>
            <div class="stat-card">
                <div class="stat-value"><?php echo $donnees['statistiques']['tickets_en_cours']; ?></div>
                <div class="stat-label">En Cours</div>
            </div>
            <div class="stat-card">
                <div class="stat-value"><?php echo $donnees['statistiques']['tickets_resolus'] + $donnees['statistiques']['tickets_fermes']; ?></div>
                <div class="stat-label">Résolus/Fermés</div>
            </div>
            <div class="stat-card">
                <div class="stat-value"><?php echo $donnees['statistiques']['tickets_urgents']; ?></div>
                <div class="stat-label">Urgents</div>
            </div>
            <div class="stat-card">
                <div class="stat-value"><?php echo $donnees['statistiques']['temps_moyen_resolution'] ? round($donnees['statistiques']['temps_moyen_resolution'], 1) . 'h' : 'N/A'; ?></div>
                <div class="stat-label">Temps Moyen Résolution</div>
            </div>
        </div>
        
        <?php if (!empty($donnees['entreprises'])): ?>
        <h2>Répartition par Entreprise</h2>
        <table class="table">
            <thead>
                <tr>
                    <th>Entreprise</th>
                    <th>Total Tickets</th>
                    <th>Tickets Résolus</th>
                    <th>Taux de Résolution</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($donnees['entreprises'] as $entreprise): ?>
                <tr>
                    <td><?php echo htmlspecialchars($entreprise['nomEntreprise']); ?></td>
                    <td><?php echo $entreprise['total_tickets']; ?></td>
                    <td><?php echo $entreprise['tickets_resolus']; ?></td>
                    <td><?php echo $entreprise['total_tickets'] > 0 ? round(($entreprise['tickets_resolus'] / $entreprise['total_tickets']) * 100, 1) . '%' : '0%'; ?></td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
        <?php endif; ?>
    </body>
    </html>
    <?php
    
    $html = ob_get_clean();
    
    // Utiliser DomPDF pour convertir HTML en PDF
    // Note: Il faudrait installer DomPDF via Composer pour une vraie implementation
    // Pour cet exemple, on retourne le HTML qui sera traité par le navigateur
    echo $html;
}
?>