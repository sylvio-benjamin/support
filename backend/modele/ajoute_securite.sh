#!/bin/bash
BLOC="session_start();
if (!isset(\$_SESSION['user']) || empty(\$_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['erreur' => 'Non authentifié']);
    exit;
}
"
for f in *.php; do
  # Vérifie si le bloc n'est pas déjà présent
  if ! grep -q "session_start();" "$f"; then
    # Insère le bloc juste après la première balise <?php
    awk -v bloc="$BLOC" '
      NR==1 && $0 ~ /^<\?php/ { print; print bloc; next }
      { print }
    ' "$f" > tmp && mv tmp "$f"
    echo "Sécurité ajoutée à $f"
  fi
done