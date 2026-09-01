/**
 * Pièces d'exemple du visualiseur.
 *
 * Chaque entrée décrit une photographie et le quadrilatère du sol, en
 * coordonnées normalisées (0 → 1 de l'image), dans l'ordre :
 * fond-gauche, fond-droite, proche-droite, proche-gauche.
 *
 * Remplacer une pièce = remplacer le fichier dans assets/images/ et ajuster
 * les quatre points ci-dessous. L'utilisateur peut de toute façon corriger
 * la zone à la main dans l'interface.
 */
export const ROOMS = [
  {
    id: 'sejour',
    label: 'Séjour lumineux',
    file: 'room-sejour.jpg',
    alt: 'Séjour vide et lumineux aux grandes fenêtres',
    credit: 'Curtis Adams / Pexels',
    room: { width: 4.6, depth: 4.2 },
    quad: [
      { x: 0.2, y: 0.585 },
      { x: 0.83, y: 0.585 },
      { x: 1.04, y: 0.995 },
      { x: -0.04, y: 0.995 },
    ],
  },
  {
    id: 'piece-claire',
    label: 'Pièce claire',
    file: 'room-piece-claire.jpg',
    alt: 'Pièce vide et moderne à la lumière douce',
    credit: 'Max Vakhtbovych / Pexels',
    room: { width: 4.2, depth: 4 },
    quad: [
      { x: 0.16, y: 0.59 },
      { x: 0.87, y: 0.59 },
      { x: 1.05, y: 0.995 },
      { x: -0.05, y: 0.995 },
    ],
  },
  {
    id: 'chambre',
    label: 'Chambre',
    file: 'room-chambre.jpg',
    alt: 'Chambre aux murs bleus ouverte sur le jardin',
    credit: 'Max Vakhtbovych / Pexels',
    room: { width: 4, depth: 4 },
    quad: [
      { x: 0.23, y: 0.578 },
      { x: 0.79, y: 0.578 },
      { x: 1.05, y: 0.995 },
      { x: -0.03, y: 0.995 },
    ],
  },
  {
    id: 'salon',
    label: 'Salon classique',
    file: 'room-salon.jpg',
    alt: 'Salon avec moulures et lustre',
    credit: 'Curtis Adams / Pexels',
    room: { width: 5, depth: 4.5 },
    quad: [
      { x: 0.18, y: 0.66 },
      { x: 0.84, y: 0.66 },
      { x: 1.02, y: 1.0 },
      { x: -0.02, y: 1.0 },
    ],
  },
  {
    id: 'contraste',
    label: 'Lumière contrastée',
    file: 'room-contraste.jpg',
    alt: 'Pièce traversée par l’ombre découpée d’une fenêtre',
    credit: 'sanket mahind / Pexels',
    room: { width: 4, depth: 3.8 },
    quad: [
      { x: 0.09, y: 0.6 },
      { x: 0.91, y: 0.6 },
      { x: 1.05, y: 1.02 },
      { x: -0.05, y: 1.02 },
    ],
  },
  {
    id: 'cuisine',
    label: 'Cuisine ouverte',
    file: 'room-cuisine.jpg',
    alt: 'Cuisine ouverte sur la salle à manger',
    credit: 'Max Vakhtbovych / Pexels',
    room: { width: 4.6, depth: 4.2 },
    quad: [
      { x: 0.2, y: 0.63 },
      { x: 0.82, y: 0.63 },
      { x: 1.04, y: 1 },
      { x: -0.04, y: 1 },
    ],
  },
];

export const getRoom = (id) => ROOMS.find((room) => room.id === id) || ROOMS[0];
