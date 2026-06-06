import { initializeApp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─────────────────────────────────────────────
// 🔧 PASTE firebaseConfig KAMU DI SINI
// ─────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyBPDbwyktWwDr3JkTzzxjvQgnJjZqxpI2k",
  authDomain: "apespilm.firebaseapp.com",
  projectId: "apespilm",
  storageBucket: "apespilm.firebasestorage.app",
  messagingSenderId: "167342778038",
  appId: "1:167342778038:web:b65f2708f579e5e6482817",
  measurementId: "G-BG76TKF9M8"
};
// ─────────────────────────────────────────────
// ☁️ CLOUDINARY CONFIG
// Isi 2 data ini dari Cloudinary kamu.
// Cloud Name: Dashboard Cloudinary
// Upload Preset: Settings > Upload > Upload presets
// ─────────────────────────────────────────────
const cloudinaryConfig = {
  cloudName: "dl4kc4ybw",
  uploadPreset: "Raffz_edhan"
};
// ─────────────────────────────────────────────

let app, db;
let films        = [];
let activeFolder = 'all';
let activeId     = null;
let selectedFile = null;
let isLandscape  = false;
let heroFilm     = null;

function isConfigured() {
  return firebaseConfig.apiKey && firebaseConfig.projectId;
}

function isCloudinaryConfigured() {
  return cloudinaryConfig.cloudName &&
         cloudinaryConfig.uploadPreset &&
         !cloudinaryConfig.cloudName.includes("ISI_") &&
         !cloudinaryConfig.uploadPreset.includes("ISI_");
}

window.addEventListener('DOMContentLoaded', () => {
  if (isConfigured()) {
    try {
      app = initializeApp(firebaseConfig);
      db  = getFirestore(app);
      document.getElementById('setupOverlay').style.display = 'none';
      loadFilms();
    } catch(e) {
      showSetup('❌ Config error: ' + e.message);
    }
  } else {
    showSetup();
  }

  // File input
  document.getElementById('fileInput').addEventListener('change', function() {
    if (!this.files[0]) return;
    selectedFile = this.files[0];
    document.getElementById('selectedFile').textContent = '✅ ' + this.files[0].name;
    if (!document.getElementById('uTitle').value)
      document.getElementById('uTitle').value = this.files[0].name.replace(/\.[^.]+$/, '');
  });

  // Drag drop
  const dz = document.getElementById('dropZone');
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
  dz.addEventListener('drop', e => {
    e.preventDefault(); dz.classList.remove('drag');
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('video/')) {
      selectedFile = f;
      document.getElementById('selectedFile').textContent = '✅ ' + f.name;
      if (!document.getElementById('uTitle').value)
        document.getElementById('uTitle').value = f.name.replace(/\.[^.]+$/, '');
    }
  });
});

function showSetup(msg) {
  document.getElementById('setupOverlay').style.display = 'flex';
  if (msg) document.getElementById('setupMsg').textContent = msg;
}

// ── LOAD FILMS ──────────────────────────────────────────
async function loadFilms() {
  showShimmer();
  try {
    const q    = query(collection(db, 'films'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    films = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderFolders();
    renderFilms();
    if (films.length) setHero(films[0]);
    else document.getElementById('hero').style.display = 'none';
  } catch(e) {
    document.getElementById('filmGrid').innerHTML =
      `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">⚠️</div><div class="empty-title">${e.message}</div></div>`;
  }
}

function showShimmer() {
  document.getElementById('filmGrid').innerHTML =
    '<div class="shimmer"></div><div class="shimmer"></div><div class="shimmer"></div>';
}

// ── HERO ────────────────────────────────────────────────
function setHero(film) {
  heroFilm = film;
  document.getElementById('heroTitle').textContent  = film.title;
  document.getElementById('heroFolder').textContent = '📁 ' + (film.folder || 'Umum');
  document.getElementById('hero').style.display     = 'block';
  document.getElementById('mainArea').style.paddingTop = '0';

  const bg = document.getElementById('heroBg');
  if (film.thumb) {
    bg.style.backgroundImage = `url(${film.thumb})`;
  } else {
    bg.style.backgroundImage = 'none';
    bg.style.background      = 'linear-gradient(135deg,#1a0533,#05081a)';
  }
}
window.playHero = () => { if (heroFilm) playFilm(heroFilm); };

// ── RENDER FOLDERS ──────────────────────────────────────
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

// ── RENDER FILMS ─────────────────────────────────────────
function renderFilms() {
  const q        = document.getElementById('searchInput').value.toLowerCase();
  const filtered = films.filter(f => {
    const fOk = activeFolder === 'all' || f.folder === activeFolder;
    const sOk = !q || f.title.toLowerCase().includes(q);
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
        <div class="empty-sub">Ketuk "+ Tambah" untuk upload film</div>
      </div>`;
    return;
  }

  grid.innerHTML = '';
  filtered.forEach(film => {
    const card = document.createElement('div');
    card.className = 'film-card' + (film.id === activeId ? ' active' : '');
    const thumbHtml = film.thumb
      ? `<img class="film-thumb" src="${film.thumb}" loading="lazy">`
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

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

// ── PLAY ────────────────────────────────────────────────
function playFilm(film) {
  activeId = film.id;
  document.getElementById('playerTitle').textContent  = film.title;
  document.getElementById('playerFolder').textContent = '📁 ' + (film.folder || 'Umum');
  const video = document.getElementById('playerVideo');
  video.src   = film.url;
  document.getElementById('playerOverlay').classList.add('show');
  document.body.style.overflow = 'hidden';
  video.play();
  setHero(film);
  renderFilms();
}

window.closePlayer = function() {
  if (isLandscape) toggleLandscape();
  document.getElementById('playerOverlay').classList.remove('show');
  document.body.style.overflow = '';
  document.getElementById('playerVideo').src = '';
};

// ── DELETE ──────────────────────────────────────────────
window.delFilm = async function(id, e) {
  e.stopPropagation();
  if (!confirm('Hapus film ini dari daftar?\n\nCatatan: ini menghapus data di Firestore. File video di Cloudinary perlu dihapus manual dari Media Library.')) return;
  try {
    await deleteDoc(doc(db, 'films', id));
    films = films.filter(f => f.id !== id);
    renderFolders(); renderFilms();
    if (films.length) setHero(films[0]);
    else document.getElementById('hero').style.display = 'none';
  } catch(e) { alert('Gagal: ' + e.message); }
};

// ── UPLOAD ──────────────────────────────────────────────
window.uploadFilm = async function() {
  if (!selectedFile) { alert('Pilih file video dulu!'); return; }
  if (!isCloudinaryConfigured()) {
    alert('Cloudinary belum diisi! Buka script.js lalu isi cloudName dan uploadPreset.');
    return;
  }

  const title  = document.getElementById('uTitle').value.trim()  || selectedFile.name.replace(/\.[^.]+$/, '');
  const folder = document.getElementById('uFolder').value.trim() || 'Umum';

  const btn  = document.getElementById('btnSave');
  const fill = document.getElementById('progressFill');
  const pt   = document.getElementById('progressText');
  btn.disabled = true; btn.textContent = 'Uploading...';
  document.getElementById('progressWrap').classList.add('show');
  fill.style.width = '5%'; pt.textContent = 'Membuat thumbnail...';

  try {
    // 1. Generate thumbnail lokal untuk poster
    const thumb = await generateThumb(selectedFile);

    // 2. Upload video ke Cloudinary
    fill.style.width = '10%'; pt.textContent = 'Mengupload ke Cloudinary...';
    const cloud = await uploadVideoToCloudinary(selectedFile, folder, pct => {
      const totalPct = Math.round(10 + (pct * 0.85));
      fill.style.width = totalPct + '%';
      pt.textContent = `Mengupload... ${totalPct}%`;
    });

    // 3. Simpan link Cloudinary ke Firestore
    pt.textContent = 'Menyimpan ke Firestore...'; fill.style.width = '98%';
    const docRef = await addDoc(collection(db, 'films'), {
      title,
      folder,
      url: cloud.secure_url,
      thumb,
      cloudinaryPublicId: cloud.public_id,
      createdAt: Date.now(),
    });

    const newFilm = {
      id: docRef.id,
      title,
      folder,
      url: cloud.secure_url,
      thumb,
      cloudinaryPublicId: cloud.public_id,
      createdAt: Date.now()
    };

    films.unshift(newFilm);
    fill.style.width = '100%'; pt.textContent = '✅ Berhasil!';
    setTimeout(() => { closeModal(); renderFolders(); renderFilms(); setHero(newFilm); }, 800);

  } catch(e) {
    pt.textContent = '❌ ' + e.message;
    btn.disabled = false; btn.textContent = 'Upload & Simpan';
  }
};

// ── CLOUDINARY UPLOAD ───────────────────────────────────
function uploadVideoToCloudinary(file, folder, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', cloudinaryConfig.uploadPreset);
    formData.append('folder', `raffzcinema/${folder || 'Umum'}`);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/video/upload`);

    xhr.upload.onprogress = e => {
      if (e.lengthComputable && typeof onProgress === 'function') {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new Error(data.error?.message || 'Upload Cloudinary gagal'));
      } catch (_) {
        reject(new Error('Response Cloudinary tidak valid'));
      }
    };

    xhr.onerror = () => reject(new Error('Koneksi upload gagal'));
    xhr.send(formData);
  });
};

// ── THUMBNAIL ────────────────────────────────────────────
function generateThumb(file) {
  return new Promise(res => {
    const video      = document.createElement('video');
    const url        = URL.createObjectURL(file);
    video.src        = url;
    video.muted      = true;
    video.currentTime = 3;
    video.addEventListener('seeked', () => {
      const canvas  = document.createElement('canvas');
      canvas.width  = 300; canvas.height = 450;
      const ctx     = canvas.getContext('2d');
      const vw = video.videoWidth, vh = video.videoHeight;
      const ar = 2/3, var_ = vw/vh;
      let sx, sy, sw, sh;
      if (var_ > ar) { sh = vh; sw = vh*ar; sx = (vw-sw)/2; sy = 0; }
      else           { sw = vw; sh = vw/ar; sx = 0; sy = (vh-sh)/2; }
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, 300, 450);
      URL.revokeObjectURL(url);
      res(canvas.toDataURL('image/jpeg', 0.7));
    }, { once: true });
    video.addEventListener('error', () => { URL.revokeObjectURL(url); res(null); }, { once: true });
    video.load();
  });
}

// ── MODAL ───────────────────────────────────────────────
window.openModal  = () => document.getElementById('modalOverlay').classList.add('show');
window.closeModal = () => {
  document.getElementById('modalOverlay').classList.remove('show');
  ['uTitle','uFolder'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('selectedFile').textContent = '';
  document.getElementById('fileInput').value          = '';
  document.getElementById('progressWrap').classList.remove('show');
  document.getElementById('progressFill').style.width = '0%';
  document.getElementById('progressText').textContent = 'Memproses...';
  document.getElementById('btnSave').disabled    = false;
  document.getElementById('btnSave').textContent = 'Upload & Simpan';
  selectedFile = null;
};
window.closeModalOutside = e => { if (e.target === document.getElementById('modalOverlay')) closeModal(); };

// ── LANDSCAPE ───────────────────────────────────────────
window.toggleLandscape = function() {
  isLandscape = !isLandscape;
  document.getElementById('playerOverlay').classList.toggle('fake-fs', isLandscape);
};

// ── SEARCH ──────────────────────────────────────────────
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
