# TODO - Sidebar rétractable

- [x] Mettre à jour `frontend/contexts/SidebarContext.tsx` : ajouter état `sidebarHidden` + setters.

- [ ] Mettre à jour `frontend/components/SidebarAdminReferent.tsx` : gérer le mode hidden (rétracter complètement) et bouton toggle.
- [ ] Mettre à jour `frontend/pages/admin/dashboard.tsx` : remplacer `marginLeft: 280` par une valeur dépendante de l’état sidebar (hidden/collapsed/sidebarWidth).
- [ ] Appliquer le même comportement aux autres rôles (directeur, technicien, employé) : revoir leurs layouts / supprimer marges fixes.
- [ ] Lancer le dev/build et vérifier l’UI sur desktop + responsive.

