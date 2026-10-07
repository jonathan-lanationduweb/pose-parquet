"""
Convertit une image source (JPEG, PNG, WebP…) en vignette WebP carrée.

    python _generator/vignette-webp.py <taille> < source > vignette.webp

Utilisé par `_generator/sync-premibel.js`, et seulement par lui, pour les
vignettes que Premibel ne sert pas en WebP (fichier original téléversé, sans
déclinaison 324 px ni version WebP côté serveur). Le format est lu dans le
CONTENU, jamais dans l'extension ni dans l'en-tête Content-Type.

Traitement : décodage (Pillow), orientation EXIF appliquée, transparence posée
sur fond blanc (une photo produit PNG détourée ne doit pas devenir noire),
recadrage centré au carré, réduction à <taille> px, encodage WebP qualité 80.

Codes de sortie : 0 succès (WebP sur la sortie standard) ; 2 source illisible
ou format non pris en charge ; 3 Pillow absent. Le message d'erreur va sur la
sortie d'erreur, la synchronisation le reprend tel quel dans son rapport.
"""
import io
import sys

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.stderr.write("Pillow absent : pip install Pillow\n")
    sys.exit(3)

taille = int(sys.argv[1]) if len(sys.argv) > 1 else 324
donnees = sys.stdin.buffer.read()
try:
    image = Image.open(io.BytesIO(donnees))
    image.load()
except Exception as erreur:  # noqa: BLE001 — tout échec de décodage est un refus
    sys.stderr.write(f"décodage impossible : {erreur}\n")
    sys.exit(2)

if image.format not in ("JPEG", "PNG", "WEBP", "GIF"):
    sys.stderr.write(f"format non pris en charge : {image.format}\n")
    sys.exit(2)

image = ImageOps.exif_transpose(image)
if image.mode in ("RGBA", "LA", "P"):
    image = image.convert("RGBA")
    fond = Image.new("RGB", image.size, (255, 255, 255))
    fond.paste(image, mask=image.split()[-1])
    image = fond
else:
    image = image.convert("RGB")

vignette = ImageOps.fit(image, (taille, taille), method=Image.LANCZOS, centering=(0.5, 0.5))
sortie = io.BytesIO()
vignette.save(sortie, format="WEBP", quality=80, method=6)
sys.stdout.buffer.write(sortie.getvalue())
