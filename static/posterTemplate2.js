import { wrapLines, extractColorsFromImage } from './helpers.js';


export function drawPosterTemplate2(album, canvas) {
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.crossOrigin = "anonymous";

  img.onload = () => {
    const CW = canvas.width;
    const CH = canvas.height;
    const scale = CW / 2480;

    const padding = 110 * scale;
    const columnGap = 200 * scale;
    const baseTitleFontSize = 130 * scale;

    let trackFontSize = 50 * scale;
    let lineHeight = 60 * scale;
    let columnWidth = 680 * scale;

    // ===== BACKGROUND (blur + dark overlay, proporcional sem distorção) =====
    ctx.filter = 'blur(15px)';

    // ajusta a imagem pela altura do canvas
    const drawHeight = CH;
    const drawWidth = img.width * (CH / img.height);

    // centraliza horizontalmente
    const offsetX = (CW - drawWidth) / 2;
    const offsetY = 0;

    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

    ctx.filter = 'none';

    // overlay escuro
    ctx.fillStyle = 'rgba(0, 0, 0, 0.19)';
    ctx.fillRect(0, 0, CW, CH);


    // ===== ALBUM IMAGE (TOPO) =====
    const imageSize = 2250 * scale;
    const imageY = padding;
    ctx.drawImage(img, (CW - imageSize) / 2, imageY, imageSize, imageSize);

    // ===== ALBUM TITLE (abaixo da imagem) =====
    let currentTitleFontSize = baseTitleFontSize;
    ctx.font = `bold ${currentTitleFontSize}px 'Arial Black', Arial, sans-serif`;
    const maxTitleWidth = CW - 2 * padding;
    while (ctx.measureText((album.name || '').toUpperCase()).width * 0.85 > maxTitleWidth && currentTitleFontSize > 20) {
      currentTitleFontSize *= 0.95;
      ctx.font = `bold ${currentTitleFontSize}px 'Arial Black', Arial, sans-serif`;
    }
    const titleFontSize = baseTitleFontSize * 0.5;
    const titleY = imageY + titleFontSize + imageSize + 120 * scale;
    ctx.save();
    ctx.translate(padding / 0.85, 0);
    ctx.textAlign = "left";
    ctx.fillStyle = "#fff";
    ctx.font = `${currentTitleFontSize}px 'Arial Black', Arial, sans-serif`;
    ctx.fillText((album.name || ''), 0, titleY);
    ctx.restore();

    // ===== ARTIST NAME (à esquerda) + COLOR PALETTE (à direita) =====
    const artistFontSize = baseTitleFontSize * 0.5;
    const artistY = titleY + artistFontSize + 40 * scale;

    // Nome do artista
    ctx.save();
    ctx.translate(padding / 0.85, 0);
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffffe0";
    ctx.font = `${artistFontSize}px Arial, sans-serif`;
    ctx.fillText((album.artist || "UNKNOWN ARTIST"), 0, artistY);
    ctx.restore();

    // Paleta de cores (quadrados à direita da mesma row)
    const colors = extractColorsFromImage(img);
    const squareSize = artistFontSize * 1.2; // quadrados proporcionais à altura da linha
    const paletteX = CW - padding - (colors.length * (squareSize + 8 * scale));
    const paletteY = artistY - artistFontSize + 5 * scale; // alinhar com baseline do texto

    colors.forEach((color, index) => {
      ctx.fillStyle = color;
      const x = paletteX + index * (squareSize + 8 * scale);
      ctx.fillRect(x, paletteY, squareSize, squareSize);
    });


    // ===== HORIZONTAL LINE (abaixo do artista) =====
    const lineY = artistY + 60 * scale;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 7 * scale;
    ctx.beginPath();
    ctx.moveTo(padding, lineY);
    ctx.lineTo(CW - padding, lineY);
    ctx.stroke();

    // ===== TRACKLIST (DUAS COLUNAS, NUMERADAS, WRAP, AUTO-FONTSIZE) =====
    const tracksStartY = lineY + 100 * scale;
    if (album.tracks && album.tracks.length > 0) {
      ctx.fillStyle = "#ffffffe0";
      ctx.textAlign = "left";

      const availableHeight = CH - tracksStartY - padding; // espaço total para as tracks
      const totalColumns = 2;

      // === AJUSTE DE TAMANHO AUTOMÁTICO ===
      while (true) {
        ctx.font = `${trackFontSize}px Arial, sans-serif`;
        const linesPerColumn = Math.floor(availableHeight / lineHeight);
        const maxLines = linesPerColumn * totalColumns;

        // calcula total de linhas reais (com quebras)
        let totalLines = 0;
        album.tracks.forEach((track, i) => {
          const wrapped = wrapLines(ctx, `${i + 1}. ${track}`, columnWidth);
          totalLines += wrapped.length;
        });

        if (totalLines <= maxLines || trackFontSize < 10) {
          // cabeu (ou atingiu tamanho mínimo)
          break;
        }

        // reduz proporcionalmente
        trackFontSize *= 0.95;
        lineHeight *= 0.97;
      }

      // === RENDERIZA AS TRACKS ===
      ctx.font = `${trackFontSize}px Arial, sans-serif`;
      const linesPerColumn = Math.floor(availableHeight / lineHeight);
      let currentLine = 0;

      album.tracks.forEach((track, i) => {
        const wrappedLines = wrapLines(ctx, `${i + 1}. ${track}`, columnWidth);

        wrappedLines.forEach((line, li) => {
          const column = Math.floor(currentLine / linesPerColumn);
          if (column >= totalColumns) return;

          const row = currentLine % linesPerColumn;
          const x = padding + column * (columnWidth + columnGap);
          const y = tracksStartY + row * lineHeight;

          ctx.save();
          ctx.translate(x, y);
          ctx.fillText(line, 0, 0);
          ctx.restore();

          currentLine++;
        });
      });

      // === COLUNA EXTRA (Release Date, Length, Label) ===
      ctx.fillStyle = "#fff";
      ctx.textAlign = "right";

      const extraColX = CW - padding; // sempre fixo no lado direito
      let infoY = tracksStartY;
      const infoLineHeight = lineHeight ;
      const blockSpacing = lineHeight * 2; // espaço entre blocos

      // Função auxiliar para desenhar um bloco (título em bold + valor abaixo)
      function drawInfoBlock(title, value) {
        if (!value) return;

        // Título em bold
        ctx.font = `bold ${trackFontSize * 1.1}px Arial, sans-serif`;
        ctx.fillText(title, extraColX, infoY);
        infoY += infoLineHeight;

        // Valor normal
        ctx.font = `${trackFontSize}px Arial, sans-serif`;
        ctx.fillText(value, extraColX, infoY);
        ctx.fillStyle = "ffffffe0";

        // Avança para o próximo bloco
        infoY += blockSpacing;
      }

      // Renderiza os blocos
      drawInfoBlock("Release Date", album.release_date);
      drawInfoBlock("Album Length", album.length); // aqui depois você calcula automático
      drawInfoBlock("Record Label", album.label);

    } else {
      ctx.font = `${16 * scale}px 'Arial Black', Arial, sans-serif`;
      ctx.fillStyle = "#ffffffde";
      ctx.fillText("No tracks available", padding, tracksStartY);
    }

  };

  img.src = album.image;
}
