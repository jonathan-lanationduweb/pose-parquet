"""
Empreinte de vignettes : de quoi reconnaître une même photo sous deux SKU.

    python _generator/vignette-empreintes.py < chemins.txt > empreintes.json

Une ligne par chemin de fichier en entrée ; en sortie, un objet JSON
{ chemin: { "empreinte": "<64 hex>", "couleur": [r, g, b] } }.

- empreinte : dHash 256 bits (niveaux de gris 17 × 16, gradient horizontal).
  Robuste au réencodage et au redimensionnement ; deux photos identiques
  diffèrent de 0 à 9 bits sur le catalogue Premibel.
- couleur : moyenne RGB. Une même scène dont le SOL a été recoloré garde une
  empreinte voisine mais change de couleur moyenne — ce n'est pas la même
  photo produit, et ce champ permet de le dire.

Utilisé par _generator/sync-premibel.js, comme vignette-webp.py, et seulement
par la synchronisation : le build et les contrôles relisent le résultat dans
_generator/premibel-thumbs.json.
"""
import json
import sys

try:
    from PIL import Image
except ImportError:
    sys.stderr.write("Pillow absent : pip install Pillow\n")
    sys.exit(3)

out = {}
for ligne in sys.stdin.read().splitlines():
    chemin = ligne.strip()
    if not chemin:
        continue
    try:
        im = Image.open(chemin).convert("RGB")
    except Exception as erreur:  # noqa: BLE001
        sys.stderr.write(f"{chemin} : {erreur}\n")
        continue
    g = im.convert("L").resize((17, 16), Image.LANCZOS)
    px = list(g.getdata()) if not hasattr(g, "get_flattened_data") else list(g.get_flattened_data())
    bits = "".join("1" if px[r * 17 + c] > px[r * 17 + c + 1] else "0" for r in range(16) for c in range(16))
    petit = im.resize((32, 32), Image.LANCZOS)
    p = list(petit.getdata()) if not hasattr(petit, "get_flattened_data") else list(petit.get_flattened_data())
    couleur = [round(sum(c[i] for c in p) / len(p), 1) for i in range(3)]
    out[chemin] = {"empreinte": format(int(bits, 2), "064x"), "couleur": couleur}
sys.stdout.write(json.dumps(out))
