#!/usr/bin/env bash








































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
