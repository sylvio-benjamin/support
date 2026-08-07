# Migrations SQL — Support LyovaTech

Chronologie reconstituée du schéma de base de données, numérotée et datée
autant que l'information le permettait. Absence d'outil de migration au
sens strict (pas de table de suivi des migrations déjà appliquées) — ce
sont des fichiers `.sql` à lire et exécuter manuellement, dans l'ordre.

## Origine des fichiers

| Fichier | Source | Statut connu en production |
|---|---|---|
| `0001_schema_initial.sql` | `git show HEAD:backend/database.sql` (dump le plus ancien retrouvé) | Appliqué (base fondatrice) |
| `0002_tables_non_documentees.sql` | Reconstitué depuis `database/Support.sql` (dump complet du 29/07) pour les tables sans migration dédiée | Appliqué (tables déjà en usage actif) |
| `0003_notifications_et_pieces_jointes.sql` | `database/database_update.sql` | Appliqué |
| `0004_archive_ticket_id_original.sql` | `database/addIdTicketOriginal.sql` | Appliqué |
| `0005_contraintes_securite.sql` | `database/database_update_security.sql` | **Non confirmé** — à vérifier, voir ci-dessous |
| `0006_ecran_affichage_token.sql` | `database/database_update_affichage_token.sql` | Appliqué |
| `0007_messageslus_cle_unique_fix.sql` | Correctif appliqué en direct sur production cette session | Appliqué |

## Ce que ce n'est PAS

Ce n'est pas une reconstruction précise de l'ordre historique réel
d'exécution (inconnu pour les tables listées dans 0002 — créées à un
moment non tracé, probablement via les blocs `CREATE TABLE IF NOT EXISTS`
qui existent directement dans plusieurs fichiers PHP). C'est une
**photographie honnête** de l'état structurel connu, organisée en étapes
rejouables, pas une preuve d'audit de chaque `ALTER TABLE` exécuté un jour
sur le serveur.

## Utilisation

**Sur un environnement neuf** (recréer la base à l'identique, ex. pour un
nouveau serveur ou un environnement de recette) : exécuter les 7 fichiers
dans l'ordre numérique.

```bash
mysql -u <user> -p <base> < 0001_schema_initial.sql
mysql -u <user> -p <base> < 0002_tables_non_documentees.sql
# ... jusqu'à 0007
```

Testé de bout en bout sur MySQL 8.0.44 local (MAMP) le 06/08/2026, base
vide → 23 tables, aucune erreur.

**Contre la production actuelle** : NE PAS rejouer 0001 à 0004 et 0006 —
déjà appliqués, et 0003/0006 contiennent des `DROP TABLE`/`DELETE`
destructifs qui n'ont de sens que sur une base vide ou à l'état exact
d'avant leur première exécution. Seuls **0005** (à vérifier, voir
ci-dessous) et tout futur fichier `0008+` sont candidats à une exécution
contre la production.

## Action requise : vérifier 0005

`0005_contraintes_securite.sql` ajoute les contraintes d'unicité qui
auraient empêché le doublon de compte technicien trouvé et corrigé
manuellement cette session (deux comptes distincts pour la même personne,
id 12 et 56). Rien ne confirme que ce fichier ait jamais été exécuté en
production. Avant de l'appliquer :

```bash
mysql -u <user> -p <base> -e "
SELECT loginTechnicien, COUNT(*) FROM techniciens GROUP BY loginTechnicien HAVING COUNT(*) > 1;
SELECT loginUtilisateur, COUNT(*) FROM utilisateur GROUP BY loginUtilisateur HAVING COUNT(*) > 1;
SELECT emailUtilisateur, COUNT(*) FROM utilisateur GROUP BY emailUtilisateur HAVING COUNT(*) > 1;
SELECT nomEntreprise, COUNT(*) FROM entreprise GROUP BY nomEntreprise HAVING COUNT(*) > 1;
"
```

Si tout est vide : exécuter `0005_contraintes_securite.sql` directement.
Si des doublons apparaissent : les arbitrer un par un (fusion manuelle,
comme pour les comptes 12/56) avant d'ajouter les contraintes.

## Prochaine migration

À partir de `0008_...sql`, tout nouveau changement de schéma doit être
documenté ici plutôt que dans un `CREATE TABLE IF NOT EXISTS` isolé au
milieu d'un endpoint PHP — c'est exactement ce qui a produit le désordre
que ce dossier corrige.
