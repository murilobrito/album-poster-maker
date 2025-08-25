import { wrapLines, extractColorsFromImage } from './helpers.js';

/**
 * Draws poster template 1.
 * @param {Object} album - Album data.
 * @param {HTMLCanvasElement} canvas - Target canvas.
 */
export function drawPosterTemplate1(album, canvas) {
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.crossOrigin = "anonymous";

  img.onload = () => {
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const scale = canvasWidth / 2480;

    const padding = 110 * scale;
    const imageSize = 2250 * scale;
    const columnGap = 14 * scale;
    const yearFontSize = 85 * scale;
    const baseTitleFontSize = 170 * scale;
    const footerHeight = 92 * scale;
    const rowsPerColumn = 5;

    let trackFontSize = 40 * scale;
    let lineHeight = 42 * scale;
    let columnWidth = 660 * scale;

    if (album.tracks && album.tracks.length > 0) {
      const totalLines = (fontSize, colWidth) => {
        ctx.font = `${fontSize}px Arial, sans-serif`;
        return album.tracks.reduce((acc, t) => acc + wrapLines(ctx, t.toUpperCase(), colWidth).length, 0);
      };
      while (true) {
        const total = totalLines(trackFontSize, columnWidth);
        const cols = Math.ceil(total / rowsPerColumn);
        const totalWidth = cols * columnWidth + (cols - 1) * columnGap;
        if (totalWidth <= canvasWidth - 2 * padding || trackFontSize < 7.9) break;
        trackFontSize *= 0.95;
        lineHeight *= 1.04;
        columnWidth *= 0.84;
      }
    }

    ctx.fillStyle = "#f4f2ecff";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.strokeStyle = "#000";
    ctx.lineWidth = 7 * scale;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(canvasWidth - padding, padding);
    ctx.stroke();

    ctx.save();
    ctx.translate(canvasWidth - padding, padding + 100 * scale);
    ctx.scale(0.85, 1);
    ctx.font = `bold ${yearFontSize}px 'Arial Black', Arial, sans-serif`;
    ctx.fillStyle = "#444";
    ctx.textAlign = "right";
    ctx.fillText(album.year || "----", 0, 0);
    ctx.restore();

    const maxTitleWidth = canvasWidth - 2 * padding;
    let currentTitleFontSize = baseTitleFontSize;
    ctx.font = `bold ${currentTitleFontSize}px 'Arial Black', Arial, sans-serif`;
    while (ctx.measureText(album.name.toUpperCase()).width * 0.85 > maxTitleWidth && currentTitleFontSize > 20) {
      currentTitleFontSize *= 0.95;
      ctx.font = `bold ${currentTitleFontSize}px 'Arial Black', Arial, sans-serif`;
    }

    ctx.save();
    ctx.translate(padding / 0.85, padding + 255 * scale);
    ctx.scale(0.85, 1);
    ctx.textAlign = "left";
    ctx.font = `bold ${currentTitleFontSize}px 'Arial Black', Arial, sans-serif`;
    ctx.fillStyle = "#444";
    ctx.fillText(album.name.toUpperCase(), 0, 0);
    ctx.restore();

    const imageY = padding + 380 * scale;
    ctx.drawImage(img, (canvasWidth - imageSize) / 2, imageY, imageSize, imageSize);

    ctx.font = `${baseTitleFontSize * 0.5}px 'Arial Black', Arial, sans-serif`;
    ctx.fillStyle = "#444";
    ctx.textAlign = "right";
    ctx.fillText(album.artist.toUpperCase() || "UNKNOWN ARTIST", canvasWidth - padding, padding + 2780 * scale);

    const tracksStartY = imageY + imageSize + 250 * scale;
    if (album.tracks && album.tracks.length > 0) {
      ctx.font = `${trackFontSize}px Arial, sans-serif`;
      ctx.fillStyle = "#000";
      ctx.textAlign = "left";
      let col = 0, row = 0;
      for (let i = 0; i < album.tracks.length; i++) {
        const lines = wrapLines(ctx, album.tracks[i].toUpperCase(), columnWidth);
        for (let li = 0; li < lines.length; li++) {
          if (row >= rowsPerColumn) { col++; row = 0; }
          const x = padding + col * (columnWidth + columnGap);
          const y = tracksStartY + row * lineHeight;
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(0.85, 1);
          ctx.fillText(lines[li], 0, 0);
          ctx.restore();
          row++;
        }
      }
    }

    const footerY = canvasHeight - footerHeight - padding;
    const colors = extractColorsFromImage(img);
    const rectWidth = (canvasWidth - padding * 2) / colors.length;
    colors.forEach((color, index) => {
      ctx.fillStyle = color;
      ctx.fillRect(padding + index * rectWidth, footerY, rectWidth, footerHeight);
    });
  };

  img.src = album.image;
}
