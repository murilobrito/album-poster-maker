import { getCanvasSize, getPaperSizeMM } from './helpers.js';
import { drawPosterTemplate1 } from './posterTemplate1.js';
import { drawPosterTemplate2 } from './posterTemplate2.js';

/**
 * Stores the last fetched album data.
 * @type {Object|null}
 */
let lastAlbum = null;

/**
 * Stores rendering/export options.
 * Default: A4 portrait, 300dpi, template 1.
 * @type {Object}
 */
let lastOpts = { format: 'A4', orientation: 'portrait', dpi: 300, template: 1 };

/**
 * === ALBUM SEARCH ===
 * Fetches album data from the backend by user input query.
 * Updates `lastAlbum`, syncs options from UI, and triggers render.
 */
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
      alert(data?.error || 'Album not found');
      return;
    }

    lastAlbum = data;
    updateOptsFromUI();
    renderCurrent();
  } catch (err) {
    console.error(err);
    alert('Error while searching album.');
  }
}

/**
 * === OPTIONS (without orientation toggle, always portrait) ===
 * Reads current UI options (paper format and template) and
 * updates global `lastOpts` configuration.
 */
function updateOptsFromUI() {
  const format = document.getElementById('paperFormat').value;
  const template = parseInt(document.getElementById('templateSelect').value, 10);
  lastOpts = { format, orientation: 'portrait', dpi: 300, template };
}

/**
 * === RENDER ===
 * Renders the currently loaded album into the preview canvas,
 * using the selected poster template.
 *
 * @param {Function} [callback] - Optional callback executed after render.
 */
function renderCurrent(callback) {
  if (!lastAlbum) return;

  const canvas = document.getElementById('posterPreview');
  // Preview resolution fixed for UI (low DPI, just preview)
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

/**
 * === EXPORT AS PDF ===
 * Generates a full-resolution poster (based on selected paper size & DPI),
 * draws album poster into a temporary canvas, converts it to image,
 * and exports as PDF using jsPDF.
 */
function downloadPosterAsPDF() {
  if (!lastAlbum) {
    alert('Please search an album first.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const { width, height } = getCanvasSize(lastOpts.format, lastOpts.dpi, 'portrait');

  // Create high-resolution off-screen canvas
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;

  // Render with chosen template
  if (lastOpts.template === 1) {
    drawPosterTemplate1(lastAlbum, tempCanvas);
  } else {
    drawPosterTemplate2(lastAlbum, tempCanvas);
  }

  // Convert canvas to image and add to PDF
  setTimeout(() => {
    const imgData = tempCanvas.toDataURL('image/jpeg', 1.0);
    const { wmm, hmm } = getPaperSizeMM(lastOpts.format, 'portrait');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [wmm, hmm]
    });
    pdf.addImage(imgData, 'JPEG', 0, 0, wmm, hmm);
    pdf.save(`album-poster-${lastAlbum.name}.pdf`);
  }, 400);
}

/**
 * === REAL-TIME SUGGESTIONS ===
 * Sets up dynamic dropdown with album suggestions while typing.
 * - Shows possible matches in a floating list below input.
 * - Click suggestion → autofills and runs search.
 * - Search can be triggered by pressing Enter or Search button.
 */
function setupSuggestions() {
  const input = document.getElementById("albumInput");
  const suggestionsBox = document.getElementById("suggestions");

  // On typing → fetch suggestions
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

  // Search on Enter key
  input.addEventListener("keypress", e => {
    if (e.key === "Enter") searchAlbum();
  });

  // Search on button click
  document.getElementById("searchBtn").addEventListener("click", searchAlbum);
}

/**
 * === EVENTS ===
 * PDF export button → refresh options, re-render, then export as PDF.
 */
document.getElementById('pdfBtn').addEventListener('click', () => {
  updateOptsFromUI();
  renderCurrent(() => downloadPosterAsPDF());
});

// Initialize suggestions on page load
setupSuggestions();

// Expose search function globally (optional external access)
window.searchAlbum = searchAlbum;
