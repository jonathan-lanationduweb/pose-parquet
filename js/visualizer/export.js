/**
 * Enregistrement du rendu.
 *
 * Compose l'image visible (rendu simple ou comparaison), y ajoute une mention
 * discrète, puis déclenche un téléchargement. Tout se passe dans le
 * navigateur : aucun envoi, aucune conversion côté serveur.
 */
const MENTION = 'Simulation — pose-parquet.com';

function label(ctx, text, x, y, align) {
  ctx.font = `600 ${Math.round(ctx.canvas.width / 46)}px Inter, system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  const width = ctx.measureText(text).width;
  const padX = ctx.canvas.width / 90;
  const height = ctx.canvas.width / 30;
  const boxX = align === 'right' ? x - width - padX * 2 : x;
  ctx.fillStyle = 'rgba(23, 25, 24, 0.62)';
  ctx.fillRect(boxX, y - height / 2, width + padX * 2, height);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
  ctx.fillText(text, align === 'right' ? x - padX : x + padX, y + 1);
}

/**
 * @param {object} o
 * @param {HTMLCanvasElement} o.primary   rendu principal (version A)
 * @param {HTMLCanvasElement} [o.secondary] rendu de la version B
 * @param {HTMLImageElement|HTMLCanvasElement} [o.photo] photo d'origine
 * @param {'off'|'photo'|'ab'} o.mode
 * @param {number} o.ratio  position du curseur, 0 → 1
 * @returns {HTMLCanvasElement}
 */
export function composeRender({ primary, secondary, photo, mode = 'off', ratio = 0.5 }) {
  const out = document.createElement('canvas');
  out.width = primary.width;
  out.height = primary.height;
  const ctx = out.getContext('2d');
  const split = Math.round(out.width * ratio);

  if (mode === 'photo' && photo) {
    ctx.drawImage(photo, 0, 0, out.width, out.height);
    ctx.save();
    ctx.beginPath();
    ctx.rect(split, 0, out.width - split, out.height);
    ctx.clip();
    ctx.drawImage(primary, 0, 0);
    ctx.restore();
  } else if (mode === 'ab' && secondary) {
    ctx.drawImage(primary, 0, 0);
    ctx.save();
    ctx.beginPath();
    ctx.rect(split, 0, out.width - split, out.height);
    ctx.clip();
    ctx.drawImage(secondary, 0, 0);
    ctx.restore();
  } else {
    ctx.drawImage(primary, 0, 0);
  }

  if (mode !== 'off') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(split - 1, 0, 2, out.height);
    const y = out.height / 12;
    label(ctx, mode === 'photo' ? 'Avant' : 'Version A', out.width / 40, y, 'left');
    label(ctx, mode === 'photo' ? 'Après' : 'Version B', out.width - out.width / 40, y, 'right');
  }

  label(ctx, MENTION, out.width - out.width / 40, out.height - out.height / 16, 'right');
  return out;
}

/** Déclenche le téléchargement d'un canevas en JPEG. */
export function downloadCanvas(canvas, filename = 'simulation-parquet.jpg') {
  return new Promise((resolve) => {
    const finish = (url, revoke) => {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      if (revoke) window.setTimeout(() => URL.revokeObjectURL(url), 4000);
      resolve();
    };
    if (canvas.toBlob) canvas.toBlob((blob) => finish(URL.createObjectURL(blob), true), 'image/jpeg', 0.92);
    else finish(canvas.toDataURL('image/jpeg', 0.92), false);
  });
}
