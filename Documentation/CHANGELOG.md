# Changelog

Récapitulatif des correctifs et évolutions récentes apportés au projet.

## Tickets — clôture, archivage, réouverture

- **Archivage cassé** : `ticketArchive.php` rechargeait ses propres en-têtes CORS en double lors de son inclusion par `fermerTicket.php`, provoquant une erreur fatale PHP à chaque fermeture de ticket. Le fichier est maintenant une pure bibliothèque de fonctions.
- **Réouverture cassée** : `rouvrirTicket.php` liait l'identifiant d'archive (texte) en `PDO::PARAM_INT`, empêchant toute recherche de ticket archivé. Le nouvel identifiant de ticket réutilisait aussi le mauvais champ (`idTicketArchive` au lieu de `idTicketOriginal`).
- Le front ne vérifiait jamais la réponse de `fermerTicket.php` : en cas d'échec serveur, l'utilisateur était quand même redirigé comme si tout s'était bien passé.
- Notification "directeur" sur ticket urgent fermé : table `directeur` inexistante (la vraie table est `directeurs`, et les comptes directeur réels sont en fait des lignes de `techniciens`). Sécurisé pour ne plus jamais faire échouer la fermeture du ticket.

## Notifications

- Ajout d'une notification aux techniciens concernés (par service, ou tous si aucun service dédié) à la création d'un nouveau ticket.
- Migration du schéma `notifications` : colonne `idTechnicien` nullable + nouveau type `nouveau_ticket`, car la table ne pouvait cibler que des comptes `utilisateur`.
- Les pages Notifications (employé, technicien, directeur, admin) n'envoyaient pas `credentials: 'include'` vers `getNotifications.php` : la session n'étant jamais transmise, la page affichait silencieusement "aucune notification" au lieu d'une erreur.

## CRUD utilisateurs / entreprises (espace directeur)

- Ajout de la gestion complète (modifier / supprimer) des employés depuis `directeur/utilisateur`, jusque-là non implémentée côté employés.
- `modifierUtilisateur.php` / `supprimerUtilisateur.php` étaient inutilisables pour un directeur (scoping forcé sur l'entreprise d'un admin référent) : corrigé pour distinguer les deux rôles.
- `supprimerTechnicien.php` n'avait aucun en-tête CORS, bloquant systématiquement la requête côté navigateur.
- Nouvelle page `directeur/entreprises` avec CRUD complet (création, modification, activation/désactivation, suppression avec garde-fou si des utilisateurs sont rattachés).

## Données dynamiques (suppression des données fictives)

- Tableau de bord employé (`/employe`) : stats, camembert, graphique hebdomadaire et activité récente étaient 100 % des données de démonstration codées en dur. Remplacés par les vraies données (tickets + archives de l'employé).
- Page Administration (`/directeur/administration`) : métriques d'entreprises, activités récentes et liste "entreprises récemment ajoutées" étaient fictives. Remplacées par de vraies requêtes.
- Page Statistiques (`/directeur/statistiques`) : classement des techniciens et onglet Comparaison utilisaient 5 noms et chiffres inventés. Nouvel endpoint `performanceTechniciens.php` calculant les vraies statistiques par technicien. Suppression du filet de secours qui générait des données aléatoires en cas d'erreur réseau.
- Correction d'un bug d'affichage `NaN% du total` (division par zéro non gérée) sur les cartes de stats tickets.

## Interface

- Calendrier technicien et employé (`TechnicianCalendar` / `EmployeeCalendar`) : refonte complète pour utiliser la charte graphique du reste du site (Tailwind, composants `Card`/`Button`) au lieu d'un design en dégradé isolé.
- Sidebar : bouton de rétractation repositionné pour ne plus être coupé par le conteneur, et ne plus chevaucher le logo en mode rétracté.
- Page ticket technicien/directeur : bouton "Retour" utilise désormais l'historique de navigation réel ; zone de saisie de message réorganisée (bouton d'envoi sous le champ, pièce jointe alignée).

## Infrastructure

- Migration complète de la base de données et reconfiguration d'Apache suite au remplacement de MAMP PRO par MAMP standard (nouvel emplacement de `htdocs`, utilisateur applicatif recréé).
- Nettoyage d'espaces parasites en tête de `connexionBDD.php` qui polluaient toutes les réponses JSON du backend.
