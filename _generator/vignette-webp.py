pass
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
except Exception as erreur:
    sys.stderr.write(f"d�codage impossible : {erreur}\n")
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
