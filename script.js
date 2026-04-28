/* =============================================================
   CJ Constructores — Galería dinámica por barrio
   -------------------------------------------------------------
   Estrategia de carga:
     1) Intenta leer img/barrios/manifest.json (producción / Pages).
     2) Si no existe, hace directory-listing sobre un servidor local
        que lo permita (p. ej. python -m http.server).
     3) Si ambos fallan, muestra estado vacío con instrucciones.
   ============================================================= */

const IMG_ROOT = 'img/barrios/';
const MANIFEST_URL = `${IMG_ROOT}manifest.json`;
const IMG_EXTS = /\.(jpe?g|png|webp|avif|gif|svg)$/i;
const IGNORED_HREFS = new Set(['../', './', '/', 'manifest.json']);

/* ------------ ESTRATEGIA 1 · manifest.json ------------------- */
async function loadFromManifest() {
  const res = await fetch(MANIFEST_URL, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`manifest HTTP ${res.status}`);
  const data = await res.json();
  if (!data.barrios || typeof data.barrios !== 'object') {
    throw new Error('manifest inválido');
  }

  // FIX: incluye barrios aunque tengan 0 fotos en el manifest,
  // para mostrarlos y que el usuario sepa que existen.
  // Solo se filtran si el array de imágenes está ausente o no es array.
  return Object.entries(data.barrios)
    .sort(([a], [b]) => a.localeCompare(b, 'es'))
    .map(([folder, images]) => ({
      folder,
      images: Array.isArray(images) ? images : []
    }))
    .filter(({ images }) => images.length > 0); // omite barrios sin fotos
}

/* ------------ ESTRATEGIA 2 · directory listing --------------- */
async function listDirectory(path) {
  const res = await fetch(path, { headers: { Accept: 'text/html' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} al listar ${path}`);
  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return [...doc.querySelectorAll('a')]
    .map((a) => a.getAttribute('href'))
    .filter((h) => {
      if (!h) return false;
      if (IGNORED_HREFS.has(h)) return false;
      if (h.startsWith('/')) return false;
      if (h.startsWith('?')) return false;  // FIX: descartar parámetros de ordenación del servidor
      if (h.startsWith('http')) return false; // FIX: descartar enlaces externos
      return true;
    });
}

async function loadFromListing() {
  const entries = await listDirectory(IMG_ROOT);

  // FIX: acepta carpetas con o sin barra final
  const folders = entries
    .filter((h) => h.endsWith('/') || !h.includes('.')) // directorios
    .map((h) => decodeURIComponent(h.replace(/\/$/, '')))
    .filter((name) => name.length > 0)
    .sort((a, b) => a.localeCompare(b, 'es'));

  if (folders.length === 0) {
    throw new Error('No se encontraron carpetas en directory listing');
  }

  const results = await Promise.all(
    folders.map(async (folder) => {
      try {
        const items = await listDirectory(`${IMG_ROOT}${encodeURIComponent(folder)}/`);
        const images = items
          .filter((h) => IMG_EXTS.test(h))
          .map((h) => decodeURIComponent(h));
        return { folder, images };
      } catch {
        // FIX: si falla listar una carpeta, la omite sin romper toda la galería
        console.warn(`[galería] No se pudo listar la carpeta "${folder}"`);
        return { folder, images: [] };
      }
    })
  );

  return results.filter((r) => r.images.length > 0);
}

/* ------------ ORQUESTADOR ------------------------------------ */
async function loadGallery() {
  const container = document.getElementById('gallery-dynamic');
  if (!container) return;

  container.innerHTML = `
    <div class="gallery-loading">
      <span class="loader"></span>
      <p>Cargando galería de proyectos…</p>
    </div>`;

  let results = null;
  try {
    results = await loadFromManifest();
    console.info(`[galería] Cargado desde manifest: ${results.length} barrios`);
  } catch (err) {
    console.info('[galería] manifest no disponible, probando directory listing…', err.message);
    try {
      results = await loadFromListing();
      console.info(`[galería] Cargado desde directory listing: ${results.length} barrios`);
    } catch (err2) {
      console.warn('[galería] directory listing también falló:', err2.message);
      renderError(container);
      return;
    }
  }

  if (!results || results.length === 0) {
    renderEmpty(container);
    return;
  }

  container.innerHTML = '';
  let totalPhotos = 0;

  results.forEach(({ folder, images }) => {
    // FIX: ya no se salta barrios aquí — el filtrado ocurrió arriba.
    // Si llega aquí, tiene al menos 1 imagen.
    totalPhotos += images.length;
    container.appendChild(buildBarrioSection(folder, images));
  });

  updateGalleryStats(results.length, totalPhotos);
}

/* ------------ PINTADO ---------------------------------------- */
function buildBarrioSection(folder, images) {
  const section = document.createElement('article');
  section.className = 'barrio-section';
  section.dataset.barrio = folder;

  const head = document.createElement('header');
  head.className = 'barrio-head';
  head.innerHTML = `
    <div class="barrio-title">
      <span class="barrio-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 11 L12 4 L21 11 V20 A1 1 0 0 1 20 21 H4 A1 1 0 0 1 3 20 Z"/>
          <path d="M9 21 V12 H15 V21"/>
        </svg>
      </span>
      <div>
        <h3>${escapeHtml(folder)}</h3>
        <span class="barrio-meta">${images.length} foto${images.length === 1 ? '' : 's'}</span>
      </div>
    </div>
    <span class="barrio-chip">Proyecto CJ</span>
  `;
  section.appendChild(head);

  const grid = document.createElement('div');
  grid.className = 'barrio-grid';

  images.forEach((img, idx) => {
    // FIX: construye la URL correctamente sin doble encode
    const encodedFolder = encodeURIComponent(folder);
    const encodedImg    = encodeURIComponent(img);
    const url = `${IMG_ROOT}${encodedFolder}/${encodedImg}`;

    const fig = document.createElement('figure');
    fig.className = 'g-item';

    // FIX: g-tall solo si hay 3+ imágenes Y es la primera
    if (idx === 0 && images.length >= 3) fig.classList.add('g-tall');

    fig.innerHTML = `
      <img src="${url}"
           alt="${escapeHtml(folder)} — foto ${idx + 1}"
           loading="lazy"
           onerror="this.closest('figure').style.display='none'">
      <figcaption>${escapeHtml(folder)}</figcaption>
    `;
    grid.appendChild(fig);
  });

  section.appendChild(grid);
  return section;
}

function updateGalleryStats(barrios, fotos) {
  const el = document.getElementById('gallery-stats');
  if (!el) return;
  el.innerHTML = `
    <span><b>${barrios}</b> barrio${barrios === 1 ? '' : 's'}</span>
    <span class="dot-sep"></span>
    <span><b>${fotos}</b> fotografía${fotos === 1 ? '' : 's'}</span>
  `;
}

function renderEmpty(container) {
  container.innerHTML = `
    <div class="gallery-empty">
      <span class="empty-icon">📁</span>
      <h3>Galería en construcción</h3>
      <p>Crea carpetas dentro de <code>img/barrios/</code> y pega fotos.<br>
      Se mostrarán automáticamente aquí tras regenerar el manifest.</p>
    </div>`;
}

function renderError(container) {
  container.innerHTML = `
    <div class="gallery-empty error">
      <span class="empty-icon">⚠️</span>
      <h3>No se pudo cargar la galería</h3>
      <p>Sirve el sitio con un servidor local o regenera el manifest:<br>
      <code>python generate_manifest.py</code></p>
    </div>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

document.addEventListener('DOMContentLoaded', loadGallery);

/* ------------ Mapa: accesibilidad por teclado ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.pin').forEach((pin) => {
    pin.setAttribute('tabindex', '0');
    pin.addEventListener('focus', () => pin.classList.add('is-active'));
    pin.addEventListener('blur',  () => pin.classList.remove('is-active'));
  });
});
