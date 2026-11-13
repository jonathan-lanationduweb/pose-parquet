import sys

from PIL import Image, ImageChops

MARGE = 0.02
LARGEUR_MAX = 480


def rogner(source, destination):
    image = Image.open(source).convert('RGBA')
    alpha = image.getchannel('A').point(lambda v: 255 if v > 10 else 0)
    cadre = alpha.getbbox()
    if cadre is None or cadre == (0, 0, image.width, image.height):
        fond = Image.new('RGBA', image.size, (255, 255, 255, 255))
        ecart = ImageChops.difference(image, fond).convert('L').point(lambda v: 255 if v > 18 else 0)
        cadre = ecart.getbbox() or (0, 0, image.width, image.height)
    gauche, haut, droite, bas = cadre
    marge = round(max(droite - gauche, bas - haut) * MARGE)
    cadre = (max(0, gauche - marge), max(0, haut - marge), min(image.width, droite + marge), min(image.height, bas + marge))
    rogne = image.crop(cadre)
    if rogne.width > LARGEUR_MAX:
        rogne = rogne.resize((LARGEUR_MAX, round(rogne.height * LARGEUR_MAX / rogne.width)), Image.LANCZOS)
    rogne.save(destination, 'PNG', optimize=True)
    print(rogne.width, rogne.height)


if __name__ == '__main__':
    rogner(sys.argv[1], sys.argv[2])
