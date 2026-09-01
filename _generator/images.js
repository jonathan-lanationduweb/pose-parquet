/* Génère des visuels SVG placeholders : compositions d'intérieur abstraites. */
const fs = require('fs');
const path = require('path');

function rng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

const PALETTES = [
  { wall: '#efece5', wall2: '#e3e0d7', floor: '#d9c3a5', plank: '#c9ad8a', accent: '#7c8f7b', object: '#33383a' },
  { wall: '#eae7e0', wall2: '#dcdad2', floor: '#e0cdb4', plank: '#cdb493', accent: '#6d7b84', object: '#2b302f' },
  { wall: '#f2efe8', wall2: '#e6e2d9', floor: '#cbb094', plank: '#b99a7c', accent: '#c17a5b', object: '#3a3f3e' },
  { wall: '#e8e6df', wall2: '#dad7ce', floor: '#c6ab8d', plank: '#b1937a', accent: '#5c6d5c', object: '#24282a' },
];

/**
 * Composition : mur, sol en perspective avec lames, nappe de lumière,
 * quelques volumes mobiliers. Le tout reste très abstrait et remplaçable.
 */
function cover({ w = 1200, h = 750, seed = 1, variant = 0, label = '' }) {
  const random = rng(seed * 977 + 13);
  const pal = PALETTES[variant % PALETTES.length];
  const horizon = h * (0.42 + random() * 0.08);
  const vpx = w * (0.3 + random() * 0.4);

  // Lames en perspective : lignes convergeant vers le point de fuite
  const planks = [];
  const count = 14;
  for (let i = 0; i <= count; i += 1) {
    const x = (i / count) * w * 2 - w * 0.5;
    planks.push(
      `<line x1="${vpx.toFixed(0)}" y1="${horizon.toFixed(0)}" x2="${x.toFixed(0)}" y2="${h}" stroke="${pal.plank}" stroke-width="2" opacity="0.55" />`
    );
  }
  const rows = [];
  for (let i = 1; i <= 9; i += 1) {
    const t = i / 9;
    const y = horizon + (h - horizon) * Math.pow(t, 1.9);
    rows.push(
      `<line x1="0" y1="${y.toFixed(1)}" x2="${w}" y2="${y.toFixed(1)}" stroke="${pal.plank}" stroke-width="1.6" opacity="0.4" />`
    );
  }

  const objects = [];
  const objectCount = 1 + Math.floor(random() * 3);
  for (let i = 0; i < objectCount; i += 1) {
    const ow = w * (0.06 + random() * 0.1);
    const oh = h * (0.1 + random() * 0.22);
    const ox = w * (0.05 + random() * 0.8);
    const oy = horizon - oh + h * 0.06 * random();
    const round = random() > 0.5 ? ow / 2 : 6;
    objects.push(
      `<rect x="${ox.toFixed(0)}" y="${oy.toFixed(0)}" width="${ow.toFixed(0)}" height="${(oh + h * 0.08).toFixed(0)}" rx="${round.toFixed(0)}" fill="${i % 2 ? pal.accent : pal.object}" opacity="${(0.72 + random() * 0.2).toFixed(2)}" />`
    );
  }

  const lightX = w * (0.55 + random() * 0.3);
  const lightW = w * 0.24;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${label || 'Illustration intérieure'}">
  <defs>
    <linearGradient id="floor-${seed}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${pal.floor}" />
      <stop offset="100%" stop-color="${pal.plank}" />
    </linearGradient>
    <linearGradient id="light-${seed}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fff8e6" stop-opacity="0.85" />
      <stop offset="100%" stop-color="#fff8e6" stop-opacity="0" />
    </linearGradient>
    <clipPath id="floor-clip-${seed}"><rect x="0" y="${horizon.toFixed(0)}" width="${w}" height="${(h - horizon).toFixed(0)}" /></clipPath>
  </defs>
  <rect width="${w}" height="${h}" fill="${pal.wall}" />
  <rect x="0" y="0" width="${w}" height="${horizon.toFixed(0)}" fill="${pal.wall2}" />
  <rect x="${lightX.toFixed(0)}" y="${(horizon * 0.12).toFixed(0)}" width="${lightW.toFixed(0)}" height="${(horizon * 0.76).toFixed(0)}" fill="#fdfaf0" opacity="0.9" />
  <rect x="0" y="${horizon.toFixed(0)}" width="${w}" height="${(h - horizon).toFixed(0)}" fill="url(#floor-${seed})" />
  <g clip-path="url(#floor-clip-${seed})">${planks.join('')}${rows.join('')}</g>
  <polygon points="${lightX.toFixed(0)},${horizon.toFixed(0)} ${(lightX + lightW).toFixed(0)},${horizon.toFixed(0)} ${(lightX + lightW * 2.1).toFixed(0)},${h} ${(lightX - lightW * 0.6).toFixed(0)},${h}" fill="url(#light-${seed})" />
  ${objects.join('')}
  <line x1="0" y1="${horizon.toFixed(0)}" x2="${w}" y2="${horizon.toFixed(0)}" stroke="${pal.object}" stroke-width="2" opacity="0.35" />
</svg>
`;
}

/** Vignette carrée pour les tutoriels : pictogramme géométrique. */
function tile({ seed = 1, label = '' }) {
  const random = rng(seed * 31 + 7);
  const pal = PALETTES[seed % PALETTES.length];
  const bars = [];
  for (let i = 0; i < 5; i += 1) {
    const y = 14 + i * 15;
    const width = 22 + random() * 60;
    bars.push(
      `<rect x="${(10 + random() * 12).toFixed(0)}" y="${y}" width="${width.toFixed(0)}" height="9" rx="2" fill="${i % 2 ? pal.plank : pal.accent}" opacity="${(0.55 + random() * 0.4).toFixed(2)}" />`
    );
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" role="img" aria-label="${label}">
  <rect width="100" height="100" fill="${pal.wall}" />
  ${bars.join('')}
</svg>
`;
}

function favicon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <rect width="32" height="32" rx="7" fill="#1c1e1d" />
  <rect x="5" y="8" width="22" height="4" rx="1.4" fill="#e8ece6" />
  <rect x="5" y="14" width="14" height="4" rx="1.4" fill="#7c8f7b" />
  <rect x="5" y="20" width="19" height="4" rx="1.4" fill="#e8ece6" />
</svg>
`;
}

function og() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <rect width="1200" height="630" fill="#f6f4ef" />
  <g opacity="0.5">
    ${Array.from({ length: 9 }, (_, i) => `<rect x="0" y="${430 + i * 24}" width="1200" height="12" fill="#d9c3a5" opacity="${0.25 + i * 0.06}" />`).join('')}
  </g>
  <text x="80" y="250" font-family="Georgia, serif" font-size="76" fill="#1c1e1d">Pose Parquet</text>
  <text x="80" y="320" font-family="ui-sans-serif, system-ui, sans-serif" font-size="30" fill="#6d7b84">Comprendre, préparer, visualiser et réussir la pose de son parquet.</text>
  <rect x="80" y="360" width="120" height="4" fill="#7c8f7b" />
</svg>
`;
}

function write(dir, files) {
  fs.mkdirSync(dir, { recursive: true });
  Object.entries(files).forEach(([name, content]) => {
    fs.writeFileSync(path.join(dir, name), content, 'utf8');
  });
}

module.exports = { cover, tile, favicon, og, write };
