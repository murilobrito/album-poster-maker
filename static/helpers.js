/**
 * Standard paper sizes in millimeters (ISO 216).
 * Used to define dimensions for poster rendering.
 * @constant
 * @type {Object<string, { w: number, h: number }>}
 */
export const PAPER_MM = {
  A0: { w: 841, h: 1189 },
  A1: { w: 594, h: 841 },
  A2: { w: 420, h: 594 },
  A3: { w: 297, h: 420 },
  A4: { w: 210, h: 297 },
  A5: { w: 148, h: 210 },
  A6: { w: 105, h: 148 }
};

/**
 * Converts millimeters to pixels based on the specified DPI (dots per inch).
 * @param {number} mm - Measurement in millimeters.
 * @param {number} dpi - Desired DPI resolution.
 * @returns {number} The converted pixel value.
 */
export function mmToPx(mm, dpi) {
  return Math.round((mm / 25.4) * dpi);
}

/**
 * Returns the canvas size in pixels based on paper format, DPI, and orientation.
 * @param {string} [format='A4'] - Paper format.
 * @param {number} [dpi=300] - Dots per inch.
 * @param {string} [orientation='portrait'] - Orientation of the paper.
 * @returns {{ width: number, height: number }}
 */
export function getCanvasSize(format = 'A4', dpi = 300, orientation = 'portrait') {
  const f = PAPER_MM[format] || PAPER_MM.A4;
  const wmm = orientation === 'portrait' ? f.w : f.h;
  const hmm = orientation === 'portrait' ? f.h : f.w;
  return { width: mmToPx(wmm, dpi), height: mmToPx(hmm, dpi) };
}

/**
 * Returns the paper dimensions in millimeters based on format and orientation.
 * @param {string} [format='A4'] - Paper format.
 * @param {string} [orientation='portrait'] - Paper orientation.
 * @returns {{ wmm: number, hmm: number }}
 */
export function getPaperSizeMM(format = 'A4', orientation = 'portrait') {
  const f = PAPER_MM[format] || PAPER_MM.A4;
  return orientation === 'portrait' ? { wmm: f.w, hmm: f.h } : { wmm: f.h, hmm: f.w };
}

/**
 * Splits a given string of text into multiple lines to fit within maxWidth.
 * @param {CanvasRenderingContext2D} ctx - Canvas rendering context.
 * @param {string} text - Text to wrap.
 * @param {number} maxWidth - Max width for each line.
 * @returns {string[]} Wrapped lines.
 */
export function wrapLines(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    if (ctx.measureText(testLine).width > maxWidth && line !== '') {
      lines.push(line.trim());
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  if (line.trim().length > 0) lines.push(line.trim());
  return lines;
}

/**
 * Extracts a color palette sorted from darkest to lightest.
 * @param {HTMLImageElement} image - Loaded image element.
 * @returns {string[]} RGB color strings.
 */
export function extractColorsFromImage(image) {
  const colorThief = new ColorThief();
  let colors;
  try {
    colors = colorThief.getPalette(image, 6);
  } catch {
    return ["#000", "#333", "#666", "#999", "#ccc", "#fff"];
  }

  colors.sort((a, b) => {
    const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return lum(a) - lum(b);
  });

  return colors.map(([r, g, b]) => `rgb(${r},${g},${b})`);
}

/**
 * Draws a Spotify scannable code on the canvas.
 * @param {CanvasRenderingContext2D} ctx - Canvas context.
 * @param {string} uri - Spotify album URI.
 * @param {number} x - X position.
 * @param {number} y - Y position.
 * @param {number} width - Width of code.
 * @param {number} height - Height of code.
 */
export function drawSpotifyCode(ctx, uri, x, y, width, height) {
  if (!uri) return;
  const codeImg = new Image();
  codeImg.crossOrigin = "anonymous";
  codeImg.onload = () => ctx.drawImage(codeImg, x, y, width, height);

  const id = uri.split(':')[2];
  const spotifyUrl = `https://open.spotify.com/album/${id}`;
  codeImg.src = `https://scannables.scdn.co/uri/plain/png/black/white/640/${encodeURIComponent(spotifyUrl)}`;
}
