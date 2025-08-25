import { getCanvasSize, getPaperSizeMM } from './helpers.js';
import { drawPosterTemplate1 } from './posterTemplate1.js';
import { drawPosterTemplate2 } from './posterTemplate2.js';

let lastAlbum = null;
let lastOpts = { format: 'A4', orientation: 'portrait', dpi: 300, template: 1 };

// === BUSCA PRINCIPAL ===
async function searchAlbum() {
  const query = document.getElementById('albumInput').value.trim();
  if (!query) return;

  try {
    const res = await fetch('/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data?.error || 'Álbum não encontrado');
      return;
    }

    lastAlbum = data;
    updateOptsFromUI();
    renderCurrent();
  } catch (err) {
    console.error(err);
    alert('Erro ao buscar álbum.');
  }
}

// === OPÇÕES (sem orientação) ===
function updateOptsFromUI() {
  const format = document.getElementById('paperFormat').value;
  const template = parseInt(document.getElementById('templateSelect').value, 10);
  lastOpts = { format, orientation: 'portrait', dpi: 300, template };
}

// === RENDER ===
function renderCurrent(callback) {
  if (!lastAlbum) return;

  const canvas = document.getElementById('posterPreview');
  canvas.width = 600;
  canvas.height = 848;

  if (lastOpts.template === 1) {
    drawPosterTemplate1(lastAlbum, canvas);
  } else {
    drawPosterTemplate2(lastAlbum, canvas);
  }

  if (typeof callback === 'function') {
    requestAnimationFrame(callback);
  }
}

// === PDF ===
function downloadPosterAsPDF() {
  if (!lastAlbum) {
    alert('Pesquise um álbum primeiro.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const { width, height } = getCanvasSize(lastOpts.format, lastOpts.dpi, 'portrait');

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;

  if (lastOpts.template === 1) {
    drawPosterTemplate1(lastAlbum, tempCanvas);
  } else {
    drawPosterTemplate2(lastAlbum, tempCanvas);
  }

  setTimeout(() => {
    const imgData = tempCanvas.toDataURL('image/jpeg', 1.0);
    const { wmm, hmm } = getPaperSizeMM(lastOpts.format, 'portrait');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [wmm, hmm]
    });
    pdf.addImage(imgData, 'JPEG', 0, 0, wmm, hmm);
    pdf.save(`album-poster-${lastOpts.format}-template${lastOpts.template}.pdf`);
  }, 400);
}

// === SUGESTÕES EM TEMPO REAL ===
function setupSuggestions() {
  const input = document.getElementById("albumInput");
  const suggestionsBox = document.getElementById("suggestions");

  input.addEventListener("input", async () => {
    const query = input.value.trim();
    if (query.length < 2) {
      suggestionsBox.style.display = "none";
      return;
    }

    try {
      const res = await fetch("/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
      });
      const data = await res.json();

      suggestionsBox.innerHTML = "";
      if (data.suggestions && data.suggestions.length > 0) {
        data.suggestions.forEach(s => {
          const div = document.createElement("div");
          div.textContent = `${s.name} — ${s.artist}`;
          div.onclick = () => {
            input.value = s.name;
            suggestionsBox.style.display = "none";
            searchAlbum();
          };
          suggestionsBox.appendChild(div);
        });
        suggestionsBox.style.display = "block";
      } else {
        suggestionsBox.style.display = "none";
      }
    } catch (e) {
      suggestionsBox.style.display = "none";
    }
  });

  // Buscar com Enter
  input.addEventListener("keypress", e => {
    if (e.key === "Enter") searchAlbum();
  });

  // Buscar com botão
  document.getElementById("searchBtn").addEventListener("click", searchAlbum);
}

// === EVENTOS ===
document.getElementById('pdfBtn').addEventListener('click', () => {
  updateOptsFromUI();
  renderCurrent(() => downloadPosterAsPDF());
});

// Inicializar sugestões
setupSuggestions();

// Expor para fora (se precisar)
window.searchAlbum = searchAlbum;
