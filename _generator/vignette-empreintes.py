pass
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
    except Exception as erreur:
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
