#!/usr/bin/env bash
#
# Construit le paquet livrable du plugin : le code qui tourne, et rien d'autre.
#
#   bash backend/deploy/faire-paquet.sh [destination]
#
# Sans argument, le paquet est écrit dans backend/deploy/paquet/ (ignoré par
# Git) et, si `zip` est disponible, une archive est produite à côté.
#
# POURQUOI CE SCRIPT EXISTE. Le dossier de développement du plugin est aussi
# celui qu'on recopiait dans wp-content/plugins/. Il embarque donc six scripts
# de test et onze kilo-octets de documentation interne, et le relevé du
# 28/09/2026 les a trouvés servis publiquement :
#
#   /wp-content/plugins/pose-parquet-core/readme.md          200   11 422 o
#   /wp-content/plugins/pose-parquet-core/tests/run-http.php 200   exécuté,
#                                                            fuite du chemin absolu
#
# Les règles Apache de htaccess-hardening.conf les ferment désormais. Mais
# fermer une porte est une seconde barrière, pas la première : ce qui n'est
# pas livré n'a pas de porte. Une règle de serveur peut être oubliée lors d'une
# migration, écrasée par un panneau d'hébergement, ou inapplicable sur nginx
# sans accès à la configuration. Un fichier absent, non.
#
# CE QUI EST LIVRÉ, ET RIEN D'AUTRE :
#
#   pose-parquet-core.php   en-tête d'extension, amorçage
#   uninstall.php           appelé par WordPress à la suppression
#   src/                    le code métier
#   templates/              les gabarits d'administration
#   assets/                 CSS et JS de l'administration
#
# CE QUI RESTE AU DÉPÔT :
#
#   tests/                  797 vérifications, exécutées depuis le dépôt
#   readme.md               documentation interne
#   .gitignore              outillage
#
# Les tests restent donc pleinement exécutables — depuis le dépôt, qui est
# leur place. Ils n'ont jamais eu besoin d'être sur le serveur.

set -euo pipefail

RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOURCE="$RACINE/backend/pose-parquet-core"
DESTINATION="${1:-$RACINE/backend/deploy/paquet}"
NOM="pose-parquet-core"
CIBLE="$DESTINATION/$NOM"

if [ ! -f "$SOURCE/pose-parquet-core.php" ]; then
  echo "Source introuvable : $SOURCE" >&2
  exit 1
fi

# Ce qui part. Tout le reste est laissé derrière, par construction : on liste
# ce qu'on emporte, jamais ce qu'on exclut. Une liste d'exclusions oublie le
# prochain fichier ; une liste d'inclusions ne peut pas.
A_LIVRER=(
  "pose-parquet-core.php"
  "uninstall.php"
  "src"
  "templates"
  "assets"
)

rm -rf "$CIBLE"
mkdir -p "$CIBLE"

for element in "${A_LIVRER[@]}"; do
  if [ -e "$SOURCE/$element" ]; then
    cp -r "$SOURCE/$element" "$CIBLE/"
  else
    echo "Absent de la source, ignoré : $element" >&2
  fi
done

# Contrôle : rien de ce qui ne doit pas partir n'est parti.
fuites=0
while IFS= read -r chemin; do
  echo "::erreur:: $chemin ne devrait pas être dans le paquet" >&2
  fuites=$((fuites + 1))
done < <(find "$CIBLE" \( -name "*.md" -o -name ".gitignore" -o -name "composer.json" \
  -o -path "*/tests/*" -o -path "*/tools/*" -o -name "*.dist" \) -print)

if [ "$fuites" -ne 0 ]; then
  echo "$fuites fichier(s) indésirable(s) dans le paquet." >&2
  exit 1
fi

# Contrôle inverse : ce qui DOIT être là y est. Une liste d'inclusions mal
# écrite produit un paquet propre et inutilisable.
for indispensable in "pose-parquet-core.php" "uninstall.php" "src/Plugin.php" "templates/admin-status.php"; do
  if [ ! -e "$CIBLE/$indispensable" ]; then
    echo "::erreur:: $indispensable manque au paquet" >&2
    exit 1
  fi
done

fichiers=$(find "$CIBLE" -type f | wc -l | tr -d ' ')
poids=$(du -sk "$CIBLE" | cut -f1)
source_fichiers=$(find "$SOURCE" -type f | wc -l | tr -d ' ')

echo "Paquet : $CIBLE"
echo "  $fichiers fichiers, ${poids} Ko (source : $source_fichiers fichiers)"

if command -v zip >/dev/null 2>&1; then
  ( cd "$DESTINATION" && rm -f "$NOM.zip" && zip -rq "$NOM.zip" "$NOM" )
  echo "  archive : $DESTINATION/$NOM.zip"
else
  echo "  (zip absent : dossier seul, à recopier tel quel dans wp-content/plugins/)"
fi
