import os
import sys

from PIL import Image

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(RACINE, '_generator', 'icones', 'symbole-maison.webp')
SORTIE = os.path.join(RACINE, 'assets', 'icons')
CREME = (244, 237, 228, 255)
ENCRE = (27, 26, 24, 255)

ICONES = [
    ('favicon-16.png', 16, 0.96, None),
    ('favicon-24.png', 24, 0.94, None),
    ('favicon-32.png', 32, 0.92, None),
    ('favicon-48.png', 48, 0.9, None),
    ('apple-touch-icon.png', 180, 0.74, CREME),
    ('icon-192.png', 192, 0.8, None),
    ('icon-512.png', 512, 0.8, None),
    ('icon-512-dark.png', 512, 0.66, ENCRE),
    ('maskable-512.png', 512, 0.58, CREME),
]


def symbole():
    image = Image.open(SOURCE).convert('RGBA')
    cadre = image.getchannel('A').point(lambda v: 255 if v > 10 else 0).getbbox()
    return image.crop(cadre) if cadre else image


def icone(dessin, taille, couverture, fond):
    toile = Image.new('RGBA', (taille, taille), fond or (0, 0, 0, 0))
    cote = taille * couverture
    echelle = cote / max(dessin.width, dessin.height)
    reduit = dessin.resize((max(1, round(dessin.width * echelle)), max(1, round(dessin.height * echelle))), Image.LANCZOS)
    toile.alpha_composite(reduit, ((taille - reduit.width) // 2, (taille - reduit.height) // 2))
    return toile


def main():
    dessin = symbole()
    for nom, taille, couverture, fond in ICONES:
        icone(dessin, taille, couverture, fond).save(os.path.join(SORTIE, nom), 'PNG', optimize=True)
        print(nom)
    icone(dessin, 48, 0.9, None).save(os.path.join(RACINE, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)])
    print('favicon.ico')


if __name__ == '__main__':
    sys.exit(main())
