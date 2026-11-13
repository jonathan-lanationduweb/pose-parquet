const MAX_WIDTH = 1600;
const MAX_HEIGHT = 1200;
export const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];


export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(prepare(img));
    img.onerror = () => reject(new Error('Image illisible'));
    img.src = src;
  });
}


export function prepare(img) {



  const small = typeof window !== 'undefined' && window.innerWidth < 600;
  const maxWidth = small ? 1100 : MAX_WIDTH;
  const maxHeight = small ? 825 : MAX_HEIGHT;
  const ratio = Math.min(1, maxWidth / img.naturalWidth, maxHeight / img.naturalHeight);
  const width = Math.round(img.naturalWidth * ratio);
  const height = Math.round(img.naturalHeight * ratio);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);
  return { canvas, width, height };
}



export async function loadFile(file) {
  if (!file) throw new Error('Aucun fichier');
  const type = (file.type || '').toLowerCase();
  if (!ACCEPTED.includes(type)) {
    throw new Error('Format non pris en charge. Utilisez un JPG, un PNG ou un WebP.');
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error('Photo trop lourde (20 Mo maximum).');
  }

  const url = URL.createObjectURL(file);
  try {
    const prepared = await loadImage(url);
    return { ...prepared, name: file.name };
  } finally {
    URL.revokeObjectURL(url);
  }
}
