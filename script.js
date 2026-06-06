import { initializeApp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBPDbwyktWwDr3JkTzzxjvQgnJjZqxpI2k",
  authDomain: "apespilm.firebaseapp.com",
  projectId: "apespilm",
  storageBucket: "apespilm.firebasestorage.app",
  messagingSenderId: "167342778038",
  appId: "1:167342778038:web:b65f2708f579e5e6482817",
  measurementId: "G-BG76TKF9M8"
};

let app, db;
let films = [];
let activeFolder = 'all';
let activeId = null;
let isLandscape = false;
let heroFilm = null;

function isConfigured() {
  return firebaseConfig.apiKey && firebaseConfig.projectId;
}

window.addEventListener('DOMContentLoaded', () => {
  if (isConfigured()) {
    try {
      app = initializeApp(firebaseConfig);
      db = getFirestore(app);
      document.getElementById('setupOverlay').style.display = 'none';
      loadFilms();
    } catch(e) {
      showSetup('❌ Config error: ' + e.message);
    }
  } else {
    showSetup();
  }

  const posterInput = document.getElementById('uThumb');
  if (posterInput) {
    posterInput.addEventListener('input', previewPoster);
  }
});

function showSetup(msg) {
  document.getElementById('setupOverlay').style.display = 'flex';
  if (msg) document.getElementById('setupMsg').textContent = msg;
}

async function loadFilms() {
  showShimmer();
  try {
    const q = query(collection(db, 'films'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    films = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderFolders();
    renderFilms();
    if (films.length) setHero(films[0]);
    else document.getElementById('hero').style.display = 'none';
  } catch(e) {
    document.getElementById('filmGrid').innerHTML =
      `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">⚠️</div><div class="empty-title">${esc(e.message)}</div></div>`;
  }
}

function showShimmer() {
  document.getElementById('filmGrid').innerHTML =
    '<div class="shimmer"></div><div class="shimmer"></div><div class="shimmer"></div>';
}

function setHero(film) {
  heroFilm = film;
  document.getElementById('heroTitle').textContent = film.title;
  document.getElementById('heroFolder').textContent = '📁 ' + (film.folder || 'Umum');
  document.getElementById('hero').style.display = 'block';
  document.getElementById('mainArea').style.paddingTop = '0';

  const bg = document.getElementById('heroBg');
  if (film.thumb) {
    bg.style.background = '';
    bg.style.backgroundImage = `url(${film.thumb})`;
  } else {
    bg.style.backgroundImage = 'none';
    bg.style.background = 'linear-gradient(135deg,#1a0533,#05081a)';
  }
}
window.playHero = () => { if (heroFilm) playFilm(heroFilm); };

function renderFolders() {
  const folders = [...new Set(films.map(f => f.folder).filter(Boolean))];
  const bar = document.getElementById('folderBar');
  bar.innerHTML = `<div class="folder-chip ${activeFolder==='all'?'active':''}" data-folder="all" onclick="filterFolder('all')">Semua</div>`;
  folders.forEach(f => {
    const c = document.createElement('div');
    c.className = `folder-chip ${activeFolder===f?'active':''}`;
    c.setAttribute('data-folder', f);
    c.textContent = f;
    c.onclick = () => filterFolder(f);
    bar.appendChild(c);
  });
  const dl = document.getElementById('folderSuggest');
  dl.innerHTML = '';
  folders.forEach(f => { const o = document.createElement('option'); o.value = f; dl.appendChild(o); });
}

window.filterFolder = function(f) {
  activeFolder = f;
  document.querySelectorAll('.folder-chip').forEach(c =>
    c.classList.toggle('active', c.getAttribute('data-folder') === f));
  renderFilms();
};

function renderFilms() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  const filtered = films.filter(f => {
    const fOk = activeFolder === 'all' || f.folder === activeFolder;
    const sOk = !q || (f.title || '').toLowerCase().includes(q);
    return fOk && sOk;
  });

  document.getElementById('sectionLabel').textContent =
    activeFolder === 'all' ? `Koleksi Film (${filtered.length})` : `📁 ${activeFolder} (${filtered.length})`;

  const grid = document.getElementById('filmGrid');
  if (!filtered.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🎬</div>
        <div class="empty-title">Belum ada film</div>
        <div class="empty-sub">Ketuk "Tambah" untuk simpan link film</div>
      </div>`;
    return;
  }

  grid.innerHTML = '';
  filtered.forEach(film => {
    const card = document.createElement('div');
    card.className = 'film-card' + (film.id === activeId ? ' active' : '');
    const thumbHtml = film.thumb
      ? `<img class="film-thumb" src="${escAttr(film.thumb)}" loading="lazy">`
      : `<div class="film-thumb-placeholder"><div class="big-icon">🎬</div></div>`;

    card.innerHTML = `
      ${thumbHtml}
      <div class="film-card-overlay"></div>
      <div class="film-card-info">
        <div class="film-card-title">${esc(film.title)}</div>
        <div class="film-card-folder">${esc(film.folder||'Umum')}</div>
      </div>
      <button class="film-card-del" onclick="delFilm('${film.id}', event)">✕</button>`;

    card.addEventListener('click', () => playFilm(film));
    grid.appendChild(card);
  });
}
window.renderFilms = renderFilms;

function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
function escAttr(s) { return String(s || '').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

function getDrivePreviewUrl(url) {
  if (!url) return '';
  const text = url.trim();
  const patterns = [
    /drive\.google\.com\/file\/d\/([^/]+)/,
    /drive\.google\.com\/open\?id=([^&]+)/,
    /drive\.google\.com\/uc\?[^#]*id=([^&]+)/
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) return `https://drive.google.com/file/d/${m[1]}/preview`;
  }
  return text;
}

function isDriveUrl(url) {
  return /drive\.google\.com/.test(url || '');
}

function playFilm(film) {
  activeId = film.id;
  document.getElementById('playerTitle').textContent = film.title;
  document.getElementById('playerFolder').textContent = '📁 ' + (film.folder || 'Umum');

  const overlay = document.getElementById('playerOverlay');
  const video = document.getElementById('playerVideo');
  const iframe = document.getElementById('drivePlayer');
  const url = film.url || '';

  video.pause();
  video.removeAttribute('src');
  iframe.removeAttribute('src');

  if (isDriveUrl(url)) {
    overlay.classList.add('drive-mode');
    iframe.src = getDrivePreviewUrl(url);
  } else {
    overlay.classList.remove('drive-mode');
    video.src = url;
    video.play().catch(() => {});
  }

  overlay.classList.add('show');
  document.body.style.overflow = 'hidden';
  setHero(film);
  renderFilms();
}

window.closePlayer = function() {
  if (isLandscape) toggleLandscape();
  const overlay = document.getElementById('playerOverlay');
  const video = document.getElementById('playerVideo');
  const iframe = document.getElementById('drivePlayer');
  overlay.classList.remove('show', 'drive-mode');
  document.body.style.overflow = '';
  video.pause();
  video.removeAttribute('src');
  iframe.removeAttribute('src');
};

window.delFilm = async function(id, e) {
  e.stopPropagation();
  if (!confirm('Hapus film ini dari daftar?\n\nCatatan: ini hanya menghapus data di Firestore, file di Google Drive tidak ikut terhapus.')) return;
  try {
    await deleteDoc(doc(db, 'films', id));
    films = films.filter(f => f.id !== id);
    renderFolders(); renderFilms();
    if (films.length) setHero(films[0]);
    else document.getElementById('hero').style.display = 'none';
  } catch(e) { alert('Gagal: ' + e.message); }
};

window.uploadFilm = async function() {
  const title = document.getElementById('uTitle').value.trim();
  const folder = document.getElementById('uFolder').value.trim() || 'Umum';
  const url = document.getElementById('uVideoUrl').value.trim();
  const thumb = document.getElementById('uThumb').value.trim();

  if (!title) { alert('Judul film wajib diisi!'); return; }
  if (!url) { alert('Link film Google Drive / video wajib diisi!'); return; }

  const btn = document.getElementById('btnSave');
  const fill = document.getElementById('progressFill');
  const pt = document.getElementById('progressText');
  btn.disabled = true;
  btn.textContent = 'Menyimpan...';
  document.getElementById('progressWrap').classList.add('show');
  fill.style.width = '45%';
  pt.textContent = 'Menyimpan ke Firestore...';

  try {
    const data = {
      title,
      folder,
      url: getDrivePreviewUrl(url),
      originalUrl: url,
      thumb,
      source: isDriveUrl(url) ? 'google-drive' : 'direct-link',
      createdAt: Date.now(),
    };

    const docRef = await addDoc(collection(db, 'films'), data);
    const newFilm = { id: docRef.id, ...data };
    films.unshift(newFilm);
    fill.style.width = '100%';
    pt.textContent = '✅ Berhasil disimpan!';
    setTimeout(() => { closeModal(); renderFolders(); renderFilms(); setHero(newFilm); }, 500);
  } catch(e) {
    pt.textContent = '❌ ' + e.message;
    btn.disabled = false;
    btn.textContent = 'Simpan Film';
  }
};

function previewPoster() {
  const box = document.getElementById('posterPreview');
  const url = document.getElementById('uThumb').value.trim();
  if (!url) {
    box.innerHTML = '<span>Preview poster akan muncul di sini</span>';
    return;
  }
  box.innerHTML = `<img src="${escAttr(url)}" onerror="this.parentElement.innerHTML='<span>Gambar tidak bisa dimuat. Coba pakai link gambar langsung.</span>'">`;
}

window.openModal = () => document.getElementById('modalOverlay').classList.add('show');
window.closeModal = () => {
  document.getElementById('modalOverlay').classList.remove('show');
  ['uTitle','uFolder','uVideoUrl','uThumb'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('posterPreview').innerHTML = '<span>Preview poster akan muncul di sini</span>';
  document.getElementById('progressWrap').classList.remove('show');
  document.getElementById('progressFill').style.width = '0%';
  document.getElementById('progressText').textContent = 'Memproses...';
  document.getElementById('btnSave').disabled = false;
  document.getElementById('btnSave').textContent = 'Simpan Film';
};
window.closeModalOutside = e => { if (e.target === document.getElementById('modalOverlay')) closeModal(); };

window.toggleLandscape = function() {
  isLandscape = !isLandscape;
  document.getElementById('playerOverlay').classList.toggle('fake-fs', isLandscape);
};

window.toggleSearch = function() {
  document.getElementById('searchWrap').classList.toggle('show');
  if (document.getElementById('searchWrap').classList.contains('show'))
    document.getElementById('searchInput').focus();
};

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (isLandscape) toggleLandscape(); else closePlayer();
  }
});
