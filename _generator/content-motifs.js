const { tip, warn, key, table, steps, linkArrow } = require('./ui');

const MOTIFS = [
  {
    slug: 'pose-droite',
    pattern: 'longueur',
    title: 'Pose droite du parquet : principe et mise en œuvre | Pose Parquet',
    h1: 'La pose droite',
    description:
      "La pose droite reste la référence : lames parallèles aux murs, joints décalés. Principe, variantes en longueur ou en largeur, chutes et mise en œuvre.",
    reading: '5 min',
    excerpt: "Le motif de référence : sobre, économique, compatible avec tous les formats.",
    lead:
      "Lames parallèles à un mur, joints décalés d'une rangée à l'autre : la pose droite est le motif le plus répandu, et le plus économique en matière et en temps.",
    stats: [
      ['Chutes estimées', '7 à 8 %'],
      ['Difficulté', 'Accessible'],
      ['Poses compatibles', 'Flottante, collée, clouée'],
    ],
    body: `
      <h2 id="principe">Principe</h2>
      <p>Les lames sont alignées dans une seule direction, avec un décalage des joints d'extrémité d'une rangée à l'autre. Ce décalage, généralement d'un tiers ou d'une demi-lame, évite les alignements de joints qui affaiblissent visuellement et mécaniquement le plancher.</p>
      <p>Deux variantes selon la direction retenue : ${linkArrow('pose-longueur.html', 'dans la longueur')} ou ${linkArrow('pose-largeur.html', 'dans la largeur')}.</p>

      <h2 id="avantages">Avantages et points de vigilance</h2>
      <ul>
        <li>Le meilleur rendement matière de tous les motifs.</li>
        <li>Compatible avec tous les types de pose et tous les formats de lames.</li>
        <li>Rendu discret, qui laisse le bois et la finition s'exprimer.</li>
      </ul>
      ${warn("<p>Un décalage de joints régulier — toujours au même endroit — produit un effet d'escalier peu heureux. Alternez les décalages, ou piochez dans plusieurs paquets pour varier les longueurs.</p>")}

      <h2 id="mise-en-oeuvre">Mise en œuvre</h2>
      ${steps([
        { title: 'Tracer la ligne de départ', text: "Au cordeau, parallèlement au mur le plus visible, en tenant compte du jeu périphérique de 8 à 10 mm." },
        { title: 'Répartir les coupes', text: "Calculez la largeur de la dernière rangée : si elle est inférieure au tiers d'une lame, réduisez la première rangée d'autant." },
        { title: 'Décaler les joints', text: "Un tiers de lame minimum entre deux rangées consécutives, sans jamais aligner trois rangées de suite." },
        { title: 'Terminer par les rives', text: 'Coupes au millimètre le long des murs, plinthes posées ensuite pour masquer le jeu.' },
      ])}
      ${tip("<p>Gardez les chutes de plus de 30 cm : elles serviront de lame de départ pour la rangée suivante et amélioreront votre rendement matière.</p>")}
    `,
    faq: [
      { q: 'Quel décalage entre les joints ?', a: "Au minimum un tiers de la longueur de lame, idéalement variable d'une rangée à l'autre pour éviter tout motif d'escalier." },
      { q: 'La pose droite convient-elle aux grandes surfaces ?', a: "Oui, à condition de respecter les joints de fractionnement au-delà de 8 mètres dans une direction en pose flottante." },
    ],
  },

  {
    slug: 'pose-longueur',
    pattern: 'longueur',
    title: 'Poser un parquet dans la longueur : effets et limites | Pose Parquet',
    h1: 'La pose dans la longueur',
    description:
      "Lames parallèles au grand côté de la pièce : l'orientation la plus courante. Effets visuels, cas favorables, limites et chutes attendues.",
    reading: '4 min',
    excerpt: "L'orientation par défaut, qui prolonge l'espace et limite les coupes.",
    lead:
      "Poser dans la longueur consiste à aligner les lames sur le grand côté de la pièce. C'est l'orientation la plus fréquente, et souvent la plus économe en coupes.",
    stats: [
      ['Chutes estimées', '≈ 7 %'],
      ['Effet visuel', 'Allonge la pièce'],
      ['Cas favorable', 'Séjour large et lumineux'],
    ],
    body: `
      <h2 id="effet">Ce que cette orientation produit</h2>
      <p>Les lames guident le regard vers le fond de la pièce et accentuent la profondeur. Dans un séjour de proportions équilibrées, l'effet est harmonieux ; dans une pièce déjà très allongée, il accentue le défaut.</p>

      <h2 id="quand">Quand la retenir</h2>
      <ul>
        <li>Fenêtre située sur un petit côté : les lames filent alors dans le sens des rayons.</li>
        <li>Pièce large, dont le rapport longueur / largeur reste inférieur à 1,6.</li>
        <li>Recherche du rendement matière maximal.</li>
      </ul>
      ${table(
        ['Contexte', 'Verdict'],
        [
          ['Séjour de 6 × 4 m, fenêtre en pignon', 'Recommandée'],
          ['Couloir de 8 × 1,2 m', "Recommandée, dans l'axe"],
          ['Pièce de 7 × 2,8 m, fenêtre sur le grand côté', 'À éviter : préférez la largeur ou la diagonale'],
        ]
      )}
      ${tip('<p>Dans un logement traversant, garder cette même direction sur tout le niveau donne une continuité très efficace, y compris dans les circulations.</p>')}
    `,
    faq: [
      { q: 'Est-ce toujours le choix le plus économique ?', a: "Presque toujours : les coupes de rive sont limitées à deux longs murs, et les chutes se réutilisent en début de rangée." },
    ],
  },

  {
    slug: 'pose-largeur',
    pattern: 'largeur',
    title: 'Poser un parquet dans la largeur : quand et pourquoi | Pose Parquet',
    h1: 'La pose dans la largeur',
    description:
      "Lames perpendiculaires au grand côté : une correction visuelle efficace pour les pièces allongées, à condition d'accepter davantage de coupes.",
    reading: '4 min',
    excerpt: "Une correction visuelle assumée pour les pièces trop longues.",
    lead:
      "Poser dans la largeur revient à traverser la pièce. Le regard bute sur les lignes de joints, ce qui raccourcit visuellement l'espace.",
    stats: [
      ['Chutes estimées', '≈ 8 %'],
      ['Effet visuel', 'Élargit la pièce'],
      ['Cas favorable', 'Pièce très allongée'],
    ],
    body: `
      <h2 id="effet">Un effet de correction réel</h2>
      <p>Les lignes transversales interrompent la fuite du regard : une pièce de 7 mètres de long paraît nettement moins profonde. L'effet est proportionnel à la largeur des lames et au contraste de la teinte.</p>

      <h2 id="limites">Les limites à connaître</h2>
      <ul>
        <li>Les coupes de rive sont plus nombreuses, donc les chutes légèrement supérieures.</li>
        <li>Si la fenêtre est sur le grand côté, tous les joints se trouvent perpendiculaires aux rayons : les lignes ressortent en lumière rasante.</li>
        <li>Avec des lames très larges, l'effet peut devenir un barreaudage.</li>
      </ul>
      ${warn("<p>Évitez cette orientation dans un couloir étroit : l'effet d'échelle y est immédiat et difficile à rattraper.</p>")}
      ${key('<ul><li>À réserver aux pièces dont le rapport longueur / largeur dépasse 1,6.</li><li>Vérifier la position de la fenêtre avant de trancher.</li></ul>')}
    `,
    faq: [
      { q: 'Peut-on mélanger largeur et longueur dans un même logement ?', a: "Oui, à condition de marquer chaque changement de direction par une coupe nette au droit des portes." },
    ],
  },

  {
    slug: 'pose-diagonale',
    pattern: 'diagonale',
    title: 'Pose en diagonale du parquet : rendu et mise en œuvre | Pose Parquet',
    h1: 'La pose en diagonale',
    description:
      "Lames à 45° des murs : un motif dynamique qui agrandit les petits volumes et rattrape les murs non parallèles. Chutes, traçage et précautions.",
    reading: '5 min',
    excerpt: "Un motif qui agrandit et rattrape les murs faux — au prix de 14 % de chutes.",
    lead:
      "La pose en diagonale reprend le principe de la pose droite, mais à 45° des murs. Le regard n'a plus de ligne de référence : la pièce paraît plus large et les murs non parallèles se font oublier.",
    stats: [
      ['Chutes estimées', '12 à 15 %'],
      ['Difficulté', 'Intermédiaire'],
      ['Effet visuel', 'Agrandit, dynamise'],
    ],
    body: `
      <h2 id="atouts">Ses atouts</h2>
      <ul>
        <li>Agrandit visuellement les petites pièces, surtout carrées.</li>
        <li>Rattrape des murs non parallèles, fréquents en rénovation ancienne.</li>
        <li>Crée un rythme sans recourir à un motif complexe.</li>
      </ul>

      <h2 id="tracage">Le traçage, étape décisive</h2>
      ${steps([
        { title: "Tracer la diagonale de référence", text: "Depuis un angle, en vérifiant l'angle à 45° avec un triangle 3-4-5 plutôt qu'avec une équerre de poche." },
        { title: 'Poser la rangée maîtresse au centre', text: 'On travaille ensuite de part et d’autre de cette rangée, ce qui répartit les écarts.' },
        { title: 'Préparer les coupes de rive', text: 'Toutes les rives sont coupées à 45° : préparez-les par lots et vérifiez chaque angle contre le mur réel.' },
      ])}
      ${warn('<p>Prévoyez la matière : 12 à 15 % de chutes, et davantage dans une pièce comportant de nombreux décrochés ou une cheminée.</p>')}
      ${tip("<p>Dans une pièce carrée, orientez la diagonale de manière à ce qu'elle parte de l'entrée : le motif accompagne alors le regard dès le seuil.</p>")}
    `,
    faq: [
      { q: 'La diagonale est-elle plus difficile à poser ?', a: "Techniquement, la pose est identique à une pose droite : la difficulté tient au traçage initial et aux coupes de rive, toutes en biais." },
      { q: 'Convient-elle à un parquet flottant ?', a: 'Oui, sans contrainte particulière, tant que les jeux périphériques sont respectés sur tout le pourtour.' },
    ],
  },

  {
    slug: 'point-de-hongrie',
    pattern: 'point-de-hongrie',
    title: 'Point de Hongrie : le motif, sa pose et ses contraintes | Pose Parquet',
    h1: 'Le Point de Hongrie',
    description:
      "Lames coupées à l'onglet formant une pointe continue : origine, rendu, approvisionnement, traçage et budget du Point de Hongrie.",
    reading: '6 min',
    excerpt: "Des pointes continues, un axe impitoyable : le motif le plus exigeant.",
    lead:
      "Le Point de Hongrie assemble des lames coupées à 45° à leurs extrémités. Les pointes se rejoignent en colonnes parfaitement alignées : c'est ce qui le distingue du bâton rompu.",
    stats: [
      ['Chutes estimées', '12 à 15 %'],
      ['Difficulté', 'Élevée'],
      ["Coupe des lames", "Onglet, gauches et droites"],
    ],
    body: `
      <h2 id="rendu">Un motif orienté</h2>
      <p>La pointe crée une flèche qui file dans une direction. Cet axe doit être choisi avant tout : il suit généralement la longueur de la pièce ou l'axe d'entrée, rarement la fenêtre.</p>

      <h2 id="approvisionnement">Approvisionnement</h2>
      <p>Les lames sont vendues par lots de gauches et de droites, en quantités égales. Une commande complémentaire arrive rarement dans la même teinte : prévoyez la marge dès la première commande.</p>
      ${table(
        ['Format courant', 'Usage'],
        [
          ['600 × 90 mm', 'Pièces courantes, appartements'],
          ['700 × 120 mm', 'Grands séjours, plateaux'],
          ['500 × 70 mm', 'Petites pièces, couloirs larges'],
        ]
      )}

      <h2 id="pose">La pose, étape par étape</h2>
      ${steps([
        { title: "Définir l'axe principal", text: "Tracé au cordeau, vérifié à l'équerre sur toute la longueur de la pièce." },
        { title: 'Monter la première colonne à blanc', text: 'Sans colle, pour valider l’angle et le positionnement des pointes.' },
        { title: 'Coller en progressant par colonnes', text: "Chaque pointe est contrôlée : une dérive d'un demi-degré se cumule et devient visible." },
        { title: 'Traiter les rives', text: 'Coupes en pointe le long des murs, ou frise périphérique pour rattraper les murs faux.' },
      ])}
      ${warn("<p>Ne posez jamais un Point de Hongrie sur un support non ragréé. Le motif multiplie les joints : le moindre creux se traduit par un point souple sous le pied.</p>")}
      ${tip("<p>Une frise de rive de deux à trois lames simplifie énormément les finitions et donne au motif un cadre très net.</p>")}
    `,
    faq: [
      { q: 'Quelle différence avec le bâton rompu ?', a: "La coupe : le Point de Hongrie utilise des lames coupées à l'onglet, le bâton rompu des lames droites. Le premier forme une pointe continue, le second des décrochés en escalier." },
      { q: 'Est-il compatible avec un chauffage au sol ?', a: 'Oui, en pose collée avec un contrecollé adapté et un support parfaitement plan et sec.' },
    ],
  },

  {
    slug: 'baton-rompu',
    pattern: 'baton-rompu',
    title: 'Bâton rompu : le motif, sa pose et ses atouts | Pose Parquet',
    h1: 'Le bâton rompu',
    description:
      "Lames droites assemblées à angle droit : le motif à chevrons le plus accessible. Rendu, formats, traçage et différences avec le Point de Hongrie.",
    reading: '5 min',
    excerpt: "Des lames droites, un rendu tressé : le motif graphique le plus accessible.",
    lead:
      "Le bâton rompu assemble des lames droites, bout contre chant, à angle droit. Le dessin forme des décrochés en escalier, très reconnaissables.",
    stats: [
      ['Chutes estimées', '10 à 12 %'],
      ['Difficulté', 'Élevée'],
      ['Coupe des lames', 'Lames droites standard'],
    ],
    body: `
      <h2 id="atouts">Pourquoi le préférer</h2>
      <ul>
        <li>Aucune lame spéciale : les formats courants suffisent, ce qui simplifie l'approvisionnement.</li>
        <li>Chutes légèrement inférieures à celles du Point de Hongrie.</li>
        <li>Un rendu graphique qui anime les grandes surfaces sans imposer d'axe fort.</li>
      </ul>

      <h2 id="formats">Choisir le format</h2>
      <p>Le rapport longueur / largeur des lames conditionne le dessin. Un rapport 2:1 (par exemple 600 × 300 mm) donne un motif serré et régulier ; un rapport plus allongé produit un tressage plus étiré.</p>
      ${table(
        ['Rapport', 'Rendu', 'Pièce adaptée'],
        [
          ['2:1', 'Serré, très régulier', 'Petites et moyennes pièces'],
          ['3:1', 'Étiré, dynamique', 'Séjours, plateaux'],
          ['4:1', 'Très allongé, graphique', 'Grandes surfaces uniquement'],
        ]
      )}

      <h2 id="pose">Points clés de la pose</h2>
      ${steps([
        { title: 'Tracer deux axes perpendiculaires', text: "Le motif se construit à partir du centre de la pièce, pas depuis un mur." },
        { title: 'Vérifier l’équerrage tous les deux rangs', text: 'Le cumul des tolérances est le principal risque de ce motif.' },
        { title: 'Prévoir la rive', text: "Frise, coupe droite ou double bande : décidez avant de commencer, cela change le calepinage." },
      ])}
      ${key("<ul><li>Lames droites : approvisionnement simple.</li><li>Construction depuis le centre, jamais depuis un mur.</li><li>Le format des lames détermine le caractère du motif.</li></ul>")}
    `,
    faq: [
      { q: 'Bâton rompu et point de Hongrie, est-ce la même chose ?', a: "Non. Le bâton rompu utilise des lames droites assemblées à angle droit ; le Point de Hongrie des lames coupées à 45° formant une pointe continue." },
      { q: 'Peut-on le poser en flottant ?', a: "C'est déconseillé : le motif multiplie les joints et supporte mal les mouvements d'un plancher flottant. La pose collée est la règle." },
    ],
  },
];

module.exports = { MOTIFS };
