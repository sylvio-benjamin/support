#!/bin/bash

echo "======================================"
echo "🚀 INSTALLATION AUTOMATISÉE DU PROJET"
echo "======================================"

# 1. Mise à jour des paquets
apt update

# 2. Outils de base
apt install -y curl git unzip

# 3. Node.js + npm (Node 18 recommandé)
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# 4. PM2 (global)
npm install -g pm2

# 5. PHP + extensions
apt install -y php php-mysql php-xml php-curl php-zip php-mbstring

# 6. Nginx + MySQL
apt install -y nginx mysql-server

# 7. Dépendances frontend
if [ -d "/var/www/html/support/frontend" ]; then
  cd /var/www/html/support/frontend
  npm install
  npm run build
fi

# 8. Dépendances backend Node.js (WebSocket)
if [ -f "/var/www/html/support/package.json" ]; then
  cd /var/www/html/support
  npm install
fi

echo ""
echo "✅ Installation terminée !"
echo "Vérifie la base de données et la configuration Nginx si besoin."
echo "Tu peux maintenant lancer tes services avec PM2."