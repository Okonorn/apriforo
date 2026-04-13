// ╔══════════════════════════════════════════════════════════════╗
// ║  NEXUS FORUM — app.js (Firebase Compat — Neocities ready)  ║
// ╚══════════════════════════════════════════════════════════════╝

const firebaseConfig = {
  apiKey: "AIzaSyDe4Mkrxx3f1n1ulS_dbboaNJd3Zak7YQw",
  authDomain: "users-apricart.firebaseapp.com",
  projectId: "users-apricart",
  storageBucket: "users-apricart.firebasestorage.app",
  messagingSenderId: "879024803425",
  appId: "1:879024803425:web:e9f8d3da56c7524c542420"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ─── ANIMATED CANVAS BACKGROUND ──────────────────────────────
(function initCanvas() {
  const canvas = document.getElementById('bgCanvas');
  const ctx = canvas.getContext('2d');
  let W, H, particles;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    particles = Array.from({ length: 80 }, () => createParticle());
  }

  function createParticle() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.5 + 0.1,
      hue: Math.random() > 0.6 ? 260 : (Math.random() > 0.5 ? 320 : 170)
    };
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x = (p.x + p.vx + W) % W;
      p.y = (p.y + p.vy + H) % H;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 70%, 70%, ${p.alpha})`;
      ctx.fill();
    });
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `hsla(260, 60%, 70%, ${0.06 * (1 - d / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  draw();
})();

// ─── STATE ────────────────────────────────────────────────────
let currentUser = null;
let activeThread = null;
let activeThreadUnsubscribe = null;
let allThreads = { offtopic: [], videojuegos: [], musica: [] };
const CATS = ['offtopic', 'videojuegos', 'musica'];
const CAT_LABELS = { offtopic: '💬 Off-Topic', videojuegos: '🎮 Videojuegos', musica: '🎵 Música' };
let currentSearch = '';

// ─── AUTH STATE ───────────────────────────────────────────────
auth.onAuthStateChanged(user => {
  currentUser = user;
  const userInfo = document.getElementById('userInfo');
  const userAvatar = document.getElementById('userAvatar');
  const userName = document.getElementById('userName');
  const btnOpenAuth = document.getElementById('btnOpenAuth');
  const btnNewThread = document.getElementById('btnNewThread');
  const btnLogout = document.getElementById('btnLogout');
  const replyBox = document.getElementById('replyBox');

  if (user) {
    userInfo.classList.remove('hidden');
    btnNewThread.classList.remove('hidden');
    btnLogout.classList.remove('hidden');
    btnOpenAuth.classList.add('hidden');
    if (replyBox) replyBox.classList.remove('hidden');
    const name = user.displayName || user.email.split('@')[0];
    userName.textContent = name;
    userAvatar.textContent = name[0].toUpperCase();
    document.getElementById('authModal').classList.add('hidden');
  } else {
    userInfo.classList.add('hidden');
    btnNewThread.classList.add('hidden');
    btnLogout.classList.add('hidden');
    btnOpenAuth.classList.remove('hidden');
    if (replyBox) replyBox.classList.add('hidden');
  }
});

// ─── AVATAR COLORS ────────────────────────────────────────────
function avatarColors(letter) {
  const colors = [
    ['rgba(100,80,200,0.3)', '#a89ff0'],
    ['rgba(200,60,110,0.25)', '#e891b8'],
    ['rgba(60,160,120,0.25)', '#4fcfa0'],
    ['rgba(200,120,40,0.25)', '#f0a060'],
    ['rgba(60,100,200,0.25)', '#7ab0f0'],
  ];
  const idx = (letter.charCodeAt(0) || 0) % colors.length;
  return colors[idx];
}

// ─── RENDER THREADS ───────────────────────────────────────────
function renderThreads(cat, threads) {
  const list = document.getElementById('threads-' + cat);
  const countEl = document.getElementById('count-' + cat);
  if (!list) return;

  allThreads[cat] = threads;
  if (countEl) countEl.textContent = threads.length;

  const filtered = currentSearch
    ? threads.filter(t => t.title.toLowerCase().includes(currentSearch))
    : threads;

  if (filtered.length === 0) {
    list.innerHTML = '<div class="threads-empty">' + (currentSearch ? 'Sin resultados.' : 'No hay hilos todavía. ¡Sé el primero!') + '</div>';
    return;
  }

  list.innerHTML = filtered.map(t => {
    const letter = (t.authorName || 'A')[0].toUpperCase();
    const colors = avatarColors(letter);
    const bg = colors[0], col = colors[1];
    const isNew = t.createdAt && (Date.now() - t.createdAt.toMillis() < 3 * 3600 * 1000);
    const isHot = (t.replyCount || 0) > 10;
    const badgeHtml = isHot
      ? '<span class="badge badge-hot">🔥 Popular</span>'
      : isNew ? '<span class="badge badge-new">✨ Nuevo</span>' : '';
    const ago = timeAgo(t.createdAt);
    return '<div class="thread-row" data-id="' + t.id + '" data-cat="' + cat + '">' +
      '<div class="t-avatar" style="background:' + bg + ';color:' + col + '">' + letter + '</div>' +
      '<div class="t-body">' +
        '<div class="t-top"><span class="t-title">' + escapeHtml(t.title) + '</span>' + badgeHtml + '</div>' +
        '<div class="t-meta">por <b>' + escapeHtml(t.authorName || 'Anónimo') + '</b> · ' + ago + ' · 💬 ' + (t.replyCount || 0) + '</div>' +
      '</div>' +
      '<div class="t-right"><b>' + (t.views || 0) + '</b>vistas</div>' +
    '</div>';
  }).join('');

  list.querySelectorAll('.thread-row').forEach(row => {
    row.addEventListener('click', () => openThread(row.dataset.id, row.dataset.cat));
  });
}

function updateStats() {
  const total = CATS.reduce((s, c) => s + allThreads[c].length, 0);
  document.getElementById('statThreads').textContent = total;
}

// ─── LISTEN TO THREADS (realtime) ────────────────────────────
CATS.forEach(cat => {
  db.collection('cat_' + cat)
    .orderBy('createdAt', 'desc')
    .onSnapshot(function(snap) {
      const threads = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
      renderThreads(cat, threads);
      updateStats();
    }, function(err) {
      console.warn('Error en cat_' + cat + ':', err.message);
      const list = document.getElementById('threads-' + cat);
      if (list) list.innerHTML = '<div class="threads-empty">Error al cargar. Revisa las reglas de Firestore.</div>';
    });
});

// ─── OPEN THREAD ──────────────────────────────────────────────
function openThread(threadId, cat) {
  activeThread = { id: threadId, cat: cat };
  const modal = document.getElementById('viewThreadModal');
  const titleEl = document.getElementById('viewThreadTitle');
  const catBadge = document.getElementById('viewCatBadge');
  const postsList = document.getElementById('viewThreadPosts');

  modal.classList.remove('hidden');
  postsList.innerHTML = '<div style="color:var(--text-3);font-size:13px;padding:1rem">Cargando...</div>';

  db.collection('cat_' + cat).doc(threadId).update({
    views: firebase.firestore.FieldValue.increment(1)
  }).catch(function() {});

  db.collection('cat_' + cat).doc(threadId).get().then(function(docSnap) {
    if (docSnap.exists) {
      titleEl.textContent = docSnap.data().title;
      catBadge.textContent = CAT_LABELS[cat] || cat;
    }
  }).catch(function() {});

  if (activeThreadUnsubscribe) activeThreadUnsubscribe();

  activeThreadUnsubscribe = db.collection('cat_' + cat).doc(threadId)
    .collection('posts')
    .orderBy('createdAt', 'asc')
    .onSnapshot(function(snap) {
      const posts = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
      if (posts.length === 0) {
        postsList.innerHTML = '<div style="color:var(--text-3);font-size:13px;padding:1rem">Sin mensajes todavía.</div>';
        return;
      }
      postsList.innerHTML = posts.map(p => {
        const letter = (p.authorName || 'A')[0].toUpperCase();
        return '<div class="post-item">' +
          '<div class="post-author">' +
            '<div class="post-avatar">' + letter + '</div>' +
            '<span class="post-author-name">' + escapeHtml(p.authorName || 'Anónimo') + '</span>' +
            '<span class="post-author-date">' + timeAgo(p.createdAt) + '</span>' +
          '</div>' +
          '<div class="post-content">' + escapeHtml(p.content) + '</div>' +
        '</div>';
      }).join('');
    });

  const replyBox = document.getElementById('replyBox');
  if (currentUser) replyBox.classList.remove('hidden');
  else replyBox.classList.add('hidden');
}

document.getElementById('closeViewModal').addEventListener('click', function() {
  document.getElementById('viewThreadModal').classList.add('hidden');
  if (activeThreadUnsubscribe) { activeThreadUnsubscribe(); activeThreadUnsubscribe = null; }
  activeThread = null;
});

// ─── REPLY ────────────────────────────────────────────────────
document.getElementById('btnReply').addEventListener('click', function() {
  if (!currentUser || !activeThread) return;
  const content = document.getElementById('replyContent').value.trim();
  if (!content) return;

  db.collection('cat_' + activeThread.cat).doc(activeThread.id)
    .collection('posts').add({
      content: content,
      authorId: currentUser.uid,
      authorName: currentUser.displayName || currentUser.email.split('@')[0],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function() {
      db.collection('cat_' + activeThread.cat).doc(activeThread.id).update({
        replyCount: firebase.firestore.FieldValue.increment(1)
      });
      document.getElementById('replyContent').value = '';
    }).catch(function(err) { console.error(err); });
});

// ─── CREATE THREAD ────────────────────────────────────────────
document.getElementById('btnNewThread').addEventListener('click', function() {
  document.getElementById('newThreadModal').classList.remove('hidden');
});
document.getElementById('closeThreadModal').addEventListener('click', function() {
  document.getElementById('newThreadModal').classList.add('hidden');
});

document.getElementById('btnCreateThread').addEventListener('click', function() {
  if (!currentUser) return;
  const cat = document.getElementById('threadCategory').value;
  const title = document.getElementById('threadTitle').value.trim();
  const content = document.getElementById('threadContent').value.trim();
  const errEl = document.getElementById('threadError');
  errEl.textContent = '';

  if (!title) { errEl.textContent = 'El título no puede estar vacío.'; return; }
  if (!content) { errEl.textContent = 'Escribe al menos un mensaje inicial.'; return; }

  db.collection('cat_' + cat).add({
    title: title,
    authorId: currentUser.uid,
    authorName: currentUser.displayName || currentUser.email.split('@')[0],
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    replyCount: 0,
    views: 0
  }).then(function(threadRef) {
    return db.collection('cat_' + cat).doc(threadRef.id)
      .collection('posts').add({
        content: content,
        authorId: currentUser.uid,
        authorName: currentUser.displayName || currentUser.email.split('@')[0],
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
  }).then(function() {
    document.getElementById('newThreadModal').classList.add('hidden');
    document.getElementById('threadTitle').value = '';
    document.getElementById('threadContent').value = '';
  }).catch(function(err) {
    errEl.textContent = 'Error: ' + err.message;
  });
});

// ─── AUTH ─────────────────────────────────────────────────────
document.getElementById('btnOpenAuth').addEventListener('click', function() {
  document.getElementById('authModal').classList.remove('hidden');
});

document.querySelectorAll('.auth-tab').forEach(function(tab) {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.auth-tab').forEach(function(t) { t.classList.remove('active'); });
    tab.classList.add('active');
    const target = tab.dataset.tab;
    document.getElementById('loginForm').classList.toggle('hidden', target !== 'login');
    document.getElementById('registerForm').classList.toggle('hidden', target !== 'register');
  });
});

document.getElementById('btnLogin').addEventListener('click', function() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPass').value;
  const err = document.getElementById('loginError');
  err.textContent = '';
  auth.signInWithEmailAndPassword(email, pass)
    .catch(function(e) { err.textContent = friendlyError(e.code); });
});

document.getElementById('btnRegister').addEventListener('click', function() {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass = document.getElementById('regPass').value;
  const err = document.getElementById('regError');
  err.textContent = '';
  if (!name) { err.textContent = 'El nombre de usuario es obligatorio.'; return; }
  auth.createUserWithEmailAndPassword(email, pass)
    .then(function(cred) { return cred.user.updateProfile({ displayName: name }); })
    .then(function() { currentUser = auth.currentUser; })
    .catch(function(e) { err.textContent = friendlyError(e.code); });
});

document.getElementById('btnLogout').addEventListener('click', function() { auth.signOut(); });

// ─── CATEGORY FILTER ──────────────────────────────────────────
document.querySelectorAll('.cat-pill').forEach(function(pill) {
  pill.addEventListener('click', function() {
    document.querySelectorAll('.cat-pill').forEach(function(p) { p.classList.remove('active'); });
    pill.classList.add('active');
    const filter = pill.dataset.cat;
    document.querySelectorAll('.cat-block').forEach(function(block) {
      if (filter === 'all' || block.dataset.category === filter) {
        block.classList.remove('hidden');
      } else {
        block.classList.add('hidden');
      }
    });
  });
});

// ─── SEARCH ───────────────────────────────────────────────────
document.getElementById('searchInput').addEventListener('input', function(e) {
  currentSearch = e.target.value.toLowerCase().trim();
  CATS.forEach(function(cat) { renderThreads(cat, allThreads[cat]); });
});

// ─── HELPERS ──────────────────────────────────────────────────
function timeAgo(ts) {
  if (!ts) return 'ahora';
  const diff = (Date.now() - ts.toMillis()) / 1000;
  if (diff < 60) return 'ahora mismo';
  if (diff < 3600) return 'hace ' + Math.floor(diff / 60) + 'min';
  if (diff < 86400) return 'hace ' + Math.floor(diff / 3600) + 'h';
  return 'hace ' + Math.floor(diff / 86400) + 'd';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function friendlyError(code) {
  const map = {
    'auth/invalid-email': 'Correo no válido.',
    'auth/user-not-found': 'Usuario no encontrado.',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/email-already-in-use': 'El correo ya está registrado.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/invalid-credential': 'Credenciales incorrectas.',
  };
  return map[code] || 'Error: ' + code;
}
