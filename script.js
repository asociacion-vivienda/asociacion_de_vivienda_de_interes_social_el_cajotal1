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
const IGNORED_HREFS = new Set(['../', './', '/']);

/* ------------ ESTRATEGIA 1 · manifest.json ------------------- */
async function loadFromManifest() {
  const res = await fetch(MANIFEST_URL, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`manifest HTTP ${res.status}`);
  const data = await res.json();
  if (!data.barrios || typeof data.barrios !== 'object') {
    throw new Error('manifest inválido');
  }
  return Object.entries(data.barrios)
    .sort(([a], [b]) => a.localeCompare(b, 'es'))
    .map(([folder, images]) => ({ folder, images }));
}

/* ------------ ESTRATEGIA 2 · directory listing --------------- */
async function listDirectory(path) {
  const res = await fetch(path, { headers: { Accept: 'text/html' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} al listar ${path}`);
  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return [...doc.querySelectorAll('a')]
    .map((a) => a.getAttribute('href'))
    .filter((h) => h && !IGNORED_HREFS.has(h) && !h.startsWith('/') && !h.startsWith('?'));
}

async function loadFromListing() {
  const entries = await listDirectory(IMG_ROOT);
  const folders = entries
    .filter((h) => h.endsWith('/'))
    .map((h) => decodeURIComponent(h.replace(/\/$/, '')))
    .sort((a, b) => a.localeCompare(b, 'es'));

  const results = await Promise.all(
    folders.map(async (folder) => {
      const items = await listDirectory(`${IMG_ROOT}${encodeURIComponent(folder)}/`);
      const images = items.filter((h) => IMG_EXTS.test(h)).map((h) => decodeURIComponent(h));
      return { folder, images };
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
  } catch (err) {
    console.info('[galería] manifest no disponible, probando directory listing…', err.message);
    try {
      results = await loadFromListing();
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
    if (!images || images.length === 0) return;
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
    const url = `${IMG_ROOT}${encodeURIComponent(folder)}/${encodeURIComponent(img)}`;
    const fig = document.createElement('figure');
    fig.className = 'g-item';
    if (idx === 0 && images.length >= 3) fig.classList.add('g-tall');
    fig.innerHTML = `
      <img src="${url}" alt="${escapeHtml(folder)} — ${escapeHtml(img)}" loading="lazy">
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
    <span><b>${barrios}</b> barrios</span>
    <span class="dot-sep"></span>
    <span><b>${fotos}</b> fotografías</span>
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
    pin.addEventListener('blur', () => pin.classList.remove('is-active'));
  });
});
