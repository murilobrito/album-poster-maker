import { wrapLines, extractColorsFromImage } from './helpers.js';

/**
 * Draws poster template 2 with a blurred background,
 * centered album cover, title, artist name, color palette,
 * tracklist, and album metadata.
 *
 * Layout highlights:
 * - Background: blurred and darkened, full canvas (no distortion).
 * - Album image: centered at the top.
 * - Title: below the album image, resizes automatically to fit width.
 * - Artist: left-aligned below title.
 * - Color palette: right-aligned, same row as artist name.
 * - Divider line: horizontal separator below artist row.
 * - Tracklist: two columns, auto font-size adjustment, line wrapping, numbered.
 * - Metadata: right column with Release Date, Album Length, Record Label.
 *
 * @param {Object} album - Album data.
 * @param {string} album.name - Album title.
 * @param {string} album.artist - Artist name.
 * @param {string} album.release_date - Album release date (string).
 * @param {string} album.length - Album total length (formatted).
 * @param {string} album.label - Record label.
 * @param {string[]} album.tracks - Track names list.
 * @param {string} album.image - Album cover image URL.
 * @param {HTMLCanvasElement} canvas - Target canvas for rendering.
 */
export function drawPosterTemplate2(album, canvas) {
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.crossOrigin = "anonymous"; // prevent CORS issues

  img.onload = () => {
    // ===== DIMENSIONS & SCALE =====
    const CW = canvas.width;   // Canvas width
    const CH = canvas.height;  // Canvas height
    const scale = CW / 2480;   // Scale based on reference width

    // Layout constants
    const padding = 110 * scale;
    const columnGap = 200 * scale;
    const baseTitleFontSize = 130 * scale;

    // Tracklist font setup (will shrink dynamically if needed)
    let trackFontSize = 50 * scale;
    let lineHeight = 60 * scale;
    let columnWidth = 680 * scale;

    // ===== BACKGROUND (blurred, dark overlay, proportional no distortion) =====
    ctx.filter = 'blur(15px)';

    // Scale background image proportionally by height
    const drawHeight = CH;
    const drawWidth = img.width * (CH / img.height);

    // Center horizontally
    const offsetX = (CW - drawWidth) / 2;
    const offsetY = 0;

    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    ctx.filter = 'none';

    // Dark overlay for contrast
    ctx.fillStyle = 'rgba(0, 0, 0, 0.19)';
    ctx.fillRect(0, 0, CW, CH);

    // ===== ALBUM COVER (top, centered) =====
    const imageSize = 2250 * scale;
    const imageY = padding;
    ctx.drawImage(img, (CW - imageSize) / 2, imageY, imageSize, imageSize);

    // ===== TITLE (below album cover, auto-resizing) =====
    let currentTitleFontSize = baseTitleFontSize;
    ctx.font = `bold ${currentTitleFontSize}px 'Arial Black', Arial, sans-serif`;
    const maxTitleWidth = CW - 2 * padding;

    // Shrink title font until it fits canvas width
    while (
      ctx.measureText(album.name || '').width > maxTitleWidth &&
      currentTitleFontSize > 20
    ) {
      currentTitleFontSize *= 0.95;
      ctx.font = `bold ${currentTitleFontSize}px 'Arial Black', Arial, sans-serif`;
    }

    const titleY = imageY + imageSize + (currentTitleFontSize * 1.2); // espaçamento proporcional ao tamanho final

    ctx.save();
    ctx.translate(padding, 0);
    ctx.textAlign = "left";
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${currentTitleFontSize}px 'Arial Black', Arial, sans-serif`;
    ctx.fillText(album.name || '', 0, titleY);
    ctx.restore();


    // ===== ARTIST NAME (left) + COLOR PALETTE (right) =====
    const artistFontSize = baseTitleFontSize * 0.5;
    const artistY = titleY + artistFontSize + 40 * scale;

    // Artist name
    ctx.save();
    ctx.translate(padding / 0.85, 0);
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffffe0";
    ctx.font = `${artistFontSize}px Arial, sans-serif`;
    ctx.fillText((album.artist || "UNKNOWN ARTIST"), 0, artistY);
    ctx.restore();

    // Extract palette colors and draw squares aligned to right
    const colors = extractColorsFromImage(img);
    const squareSize = artistFontSize * 1.2;
    const paletteX = CW - padding - (colors.length * (squareSize + 8 * scale));
    const paletteY = artistY - artistFontSize + 5 * scale;

    colors.forEach((color, index) => {
      ctx.fillStyle = color;
      const x = paletteX + index * (squareSize + 8 * scale);
      ctx.fillRect(x, paletteY, squareSize, squareSize);
    });

    // ===== DIVIDER LINE (below artist row) =====
    const lineY = artistY + 60 * scale;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 7 * scale;
    ctx.beginPath();
    ctx.moveTo(padding, lineY);
    ctx.lineTo(CW - padding, lineY);
    ctx.stroke();

    // ===== TRACKLIST (2 columns, wrapped, auto-resizing) =====
    const tracksStartY = lineY + 100 * scale;

    if (album.tracks && album.tracks.length > 0) {
      ctx.fillStyle = "#ffffffe0";
      ctx.textAlign = "left";

      const availableHeight = CH - tracksStartY - padding;
      const totalColumns = 2;

      // Auto font-size adjustment to fit all tracks
      while (true) {
        ctx.font = `${trackFontSize}px Arial, sans-serif`;
        const linesPerColumn = Math.floor(availableHeight / lineHeight);
        const maxLines = linesPerColumn * totalColumns;

        // Count total required lines (wrapped text)
        let totalLines = 0;
        album.tracks.forEach((track, i) => {
          const wrapped = wrapLines(ctx, `${i + 1}. ${track}`, columnWidth);
          totalLines += wrapped.length;
        });

        if (totalLines <= maxLines || trackFontSize < 10) break;

        // Shrink proportionally
        trackFontSize *= 0.95;
        lineHeight *= 0.97;
      }

      // Render tracklist across 2 columns
      ctx.font = `${trackFontSize}px Arial, sans-serif`;
      const linesPerColumn = Math.floor(availableHeight / lineHeight);
      let currentLine = 0;

      album.tracks.forEach((track, i) => {
        const wrappedLines = wrapLines(ctx, `${i + 1}. ${track}`, columnWidth);

        wrappedLines.forEach((line) => {
          const column = Math.floor(currentLine / linesPerColumn);
          if (column >= totalColumns) return; // Stop if out of space

          const row = currentLine % linesPerColumn;
          const x = padding + column * (columnWidth + columnGap);
          const y = tracksStartY + row * lineHeight;

          ctx.fillText(line, x, y);
          currentLine++;
        });
      });

      // ===== EXTRA INFO COLUMN (Release Date, Album Length, Label) =====
      ctx.fillStyle = "#fff";
      ctx.textAlign = "right";

      const extraColX = CW - padding;
      let infoY = tracksStartY;
      const infoLineHeight = lineHeight;
      const blockSpacing = lineHeight * 2;

      /**
       * Helper to render a metadata block (title + value).
       * @param {string} title - Label of the field.
       * @param {string} value - Value of the field.
       */
      function drawInfoBlock(title, value) {
        if (!value) return;

        // Title (bold)
        ctx.font = `bold ${trackFontSize * 1.1}px Arial, sans-serif`;
        ctx.fillText(title, extraColX, infoY);
        infoY += infoLineHeight;

        // Value (normal)
        ctx.font = `${trackFontSize}px Arial, sans-serif`;
        ctx.fillText(value, extraColX, infoY);

        // Move down for next block
        infoY += blockSpacing;
      }

      // Render metadata blocks
      drawInfoBlock("Release Date", album.release_date);
      drawInfoBlock("Album Length", album.length);
      drawInfoBlock("Record Label", album.label);

    } else {
      // ===== FALLBACK (no tracks available) =====
      ctx.font = `${16 * scale}px 'Arial Black', Arial, sans-serif`;
      ctx.fillStyle = "#ffffffde";
      ctx.fillText("No tracks available", padding, tracksStartY);
    }
  };

  // Trigger image load
  img.src = album.image;
}
