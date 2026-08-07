

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Le Router Cache côté client (App Router) pouvait réafficher le
    // contenu d'une page précédemment visitée après une navigation interne
    // (URL correctement mise à jour, mais composant affiché resté celui
    // d'avant — ex: cliquer "Profil" affichait encore "Mes tickets").
    // À 0, chaque navigation redemande vraiment le contenu de la page au
    // lieu de réutiliser une version en cache potentiellement obsolète.
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
};

module.exports = nextConfig;