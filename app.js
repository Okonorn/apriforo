// ╔══════════════════════════════════════════════════════════════╗
// ║  NEXUS FORUM — app.js v2 (Rich editor + Perfiles)          ║
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

// ══════════════════════════════════════════════════
//  CANVAS BACKGROUND
// ══════════════════════════════════════════════════
(function() {
  var canvas = document.getElementById('bgCanvas');
  var ctx = canvas.getContext('2d');
  var W, H, pts;
  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    pts = [];
    for (var i = 0; i < 80; i++) pts.push({ x: Math.random()*W, y: Math.random()*H, r: Math.random()*1.5+0.3, vx: (Math.random()-0.5)*0.3, vy: (Math.random()-0.5)*0.3, a: Math.random()*0.5+0.1, h: Math.random()>0.6?260:Math.random()>0.5?320:170 });
  }
  function draw() {
    ctx.clearRect(0,0,W,H);
    for (var i=0; i<pts.length; i++) {
      var p=pts[i]; p.x=(p.x+p.vx+W)%W; p.y=(p.y+p.vy+H)%H;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle='hsla('+p.h+',70%,70%,'+p.a+')'; ctx.fill();
      for (var j=i+1; j<pts.length; j++) {
        var q=pts[j], dx=p.x-q.x, dy=p.y-q.y, d=Math.sqrt(dx*dx+dy*dy);
        if (d<120) { ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y); ctx.strokeStyle='hsla(260,60%,70%,'+(0.06*(1-d/120))+')'; ctx.lineWidth=0.5; ctx.stroke(); }
      }
    }
    requestAnimationFrame(draw);
  }
  window.addEventListener('resize', resize); resize(); draw();
})();

// ══════════════════════════════════════════════════
//  BBCODE → HTML RENDERER
// ══════════════════════════════════════════════════
function bbToHtml(text) {
  if (!text) return '';
  var out = escapeHtml(text);
  // YouTube URLs auto-embed (also supports [youtube]url[/youtube])
  out = out.replace(/\[youtube\](https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)[^\s]*)\[\/youtube\]/gi, function(m, url, id) {
    return '<iframe src="https://www.youtube.com/embed/'+id+'" allowfullscreen></iframe>';
  });
  // Auto-detect bare YouTube URLs and embed
  out = out.replace(/(^|[\s\n])(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)[^\s<]*)/g, function(m, pre, url, id) {
    return pre + '<iframe src="https://www.youtube.com/embed/'+id+'" allowfullscreen></iframe>';
  });
  // BBCode tags
  out = out.replace(/\[b\]([\s\S]*?)\[\/b\]/gi, '<strong>$1</strong>');
  out = out.replace(/\[i\]([\s\S]*?)\[\/i\]/gi, '<em>$1</em>');
  out = out.replace(/\[u\]([\s\S]*?)\[\/u\]/gi, '<u>$1</u>');
  out = out.replace(/\[s\]([\s\S]*?)\[\/s\]/gi, '<s>$1</s>');
  out = out.replace(/\[quote\]([\s\S]*?)\[\/quote\]/gi, '<blockquote>$1</blockquote>');
  out = out.replace(/\[quote=([^\]]+)\]([\s\S]*?)\[\/quote\]/gi, '<blockquote><strong>$1:</strong><br>$2</blockquote>');
  out = out.replace(/\[code\]([\s\S]*?)\[\/code\]/gi, '<pre><code>$1</code></pre>');
  out = out.replace(/\[img\](https?:\/\/[^\s\[]+)\[\/img\]/gi, '<img src="$1" alt="imagen" loading="lazy">');
  out = out.replace(/\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi, '<a href="$1" target="_blank" rel="noopener">$2</a>');
  out = out.replace(/\[url\](https?:\/\/[^\s\[]+)\[\/url\]/gi, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  out = out.replace(/\[list\]([\s\S]*?)\[\/list\]/gi, function(m, inner) {
    var items = inner.split(/\[\*\]/).filter(function(s){ return s.trim(); });
    return '<ul style="padding-left:18px;margin:4px 0">' + items.map(function(i){ return '<li>'+i.trim()+'</li>'; }).join('') + '</ul>';
  });
  // Line breaks
  out = out.replace(/\n/g, '<br>');
  return out;
}

// ══════════════════════════════════════════════════
//  EMOJI PICKER
// ══════════════════════════════════════════════════
var EMOJIS = ['😀','😂','😍','🥰','😎','🤔','😅','😭','😤','🤩','👍','👎','❤️','🔥','💯','✅','⭐','🎮','🎵','🎉','🤣','😊','🙏','💪','🚀','👀','💀','🤯','😱','🥺','😴','🤦','🤷','👏','🫡','💬','📷','🎯','🏆','💥'];
function buildEmojiPicker(pickerEl, targetTextarea) {
  pickerEl.innerHTML = '';
  EMOJIS.forEach(function(em) {
    var sp = document.createElement('span');
    sp.textContent = em;
    sp.addEventListener('click', function() {
      insertAtCursor(targetTextarea, em);
      pickerEl.classList.add('hidden');
    });
    pickerEl.appendChild(sp);
  });
}

// ══════════════════════════════════════════════════
//  TOOLBAR LOGIC
// ══════════════════════════════════════════════════
function initToolbar(toolbarEl, textareaEl, emojiPickerEl) {
  if (!toolbarEl) return;
  buildEmojiPicker(emojiPickerEl, textareaEl);

  toolbarEl.querySelectorAll('.tb-btn[data-action]').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      var action = btn.dataset.action;
      if (action === 'emoji') {
        emojiPickerEl.classList.toggle('hidden');
        return;
      }
      emojiPickerEl.classList.add('hidden');
      var sel = getSelection(textareaEl);
      var selected = sel.text || 'texto';
      var tags = {
        bold: ['[b]','[/b]'], italic: ['[i]','[/i]'], underline: ['[u]','[/u]'],
        strike: ['[s]','[/s]'], quote: ['[quote]','[/quote]'], code: ['[code]','[/code]'],
        list: ['[list]\n[*]','[/list]']
      };
      if (tags[action]) {
        wrapSelection(textareaEl, tags[action][0], tags[action][1]);
      } else if (action === 'image') {
        var url = prompt('URL de la imagen:');
        if (url) insertAtCursor(textareaEl, '[img]' + url + '[/img]');
      } else if (action === 'youtube') {
        var url = prompt('URL de YouTube (ej: https://youtube.com/watch?v=xxx):');
        if (url) insertAtCursor(textareaEl, url + '\n');
      } else if (action === 'link') {
        var url = prompt('URL del enlace:');
        var label = prompt('Texto del enlace:', selected !== 'texto' ? selected : 'ver enlace');
        if (url) insertAtCursor(textareaEl, '[url=' + url + ']' + (label || url) + '[/url]');
      }
      textareaEl.focus();
    });
  });

  // Close emoji picker on outside click
  document.addEventListener('click', function(e) {
    if (!toolbarEl.contains(e.target) && !emojiPickerEl.contains(e.target)) {
      emojiPickerEl.classList.add('hidden');
    }
  });
}

function getSelection(ta) {
  return { start: ta.selectionStart, end: ta.selectionEnd, text: ta.value.substring(ta.selectionStart, ta.selectionEnd) };
}
function wrapSelection(ta, open, close) {
  var s = ta.selectionStart, e = ta.selectionEnd;
  var selected = ta.value.substring(s, e) || 'texto';
  var before = ta.value.substring(0, s);
  var after = ta.value.substring(e);
  ta.value = before + open + selected + close + after;
  ta.selectionStart = s + open.length;
  ta.selectionEnd = s + open.length + selected.length;
}
function insertAtCursor(ta, text) {
  var s = ta.selectionStart;
  ta.value = ta.value.substring(0, s) + text + ta.value.substring(ta.selectionEnd);
  ta.selectionStart = ta.selectionEnd = s + text.length;
}

// Init toolbars after DOM ready
initToolbar(
  document.getElementById('threadToolbar'),
  document.getElementById('threadContent'),
  document.getElementById('threadEmojiPicker')
);
initToolbar(
  document.getElementById('replyToolbar'),
  document.getElementById('replyContent'),
  document.getElementById('replyEmojiPicker')
);
initToolbar(
  document.getElementById('sigToolbar'),
  document.getElementById('profileSig'),
  document.createElement('div') // dummy
);

// Preview buttons
document.getElementById('threadPreviewBtn').addEventListener('click', function() {
  var pv = document.getElementById('threadPreview');
  pv.classList.toggle('hidden');
  if (!pv.classList.contains('hidden')) pv.innerHTML = bbToHtml(document.getElementById('threadContent').value);
});
document.getElementById('replyPreviewBtn').addEventListener('click', function() {
  var pv = document.getElementById('replyPreview');
  pv.classList.toggle('hidden');
  if (!pv.classList.contains('hidden')) pv.innerHTML = bbToHtml(document.getElementById('replyContent').value);
});

// ══════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════
var currentUser = null;
var currentProfile = {};
var activeThread = null;
var activeThreadUnsubscribe = null;
var allThreads = { offtopic: [], videojuegos: [], musica: [] };
var CATS = ['offtopic', 'videojuegos', 'musica'];
var CAT_LABELS = { offtopic: '💬 Off-Topic', videojuegos: '🎮 Videojuegos', musica: '🎵 Música' };
var currentSearch = '';

// ══════════════════════════════════════════════════
//  AVATAR HELPERS
// ══════════════════════════════════════════════════
var AVATAR_COLORS = ['#7c6fff','#e060a0','#00d4aa','#f0a060','#7ab0f0','#e86060','#60e890'];
var PRESET_EMOJIS = ['🐱','🐶','🦊','🐼','🐸','🤖','👾','🦁','🐺','🦝','🎭','🎃'];

function renderAvatarEl(profile, size) {
  size = size || 36;
  if (profile && profile.avatarUrl) {
    return '<img src="' + escapeAttr(profile.avatarUrl) + '" alt="avatar" style="width:'+size+'px;height:'+size+'px;object-fit:cover;border-radius:50%">';
  }
  if (profile && profile.avatarEmoji) {
    return '<span style="font-size:'+(size*0.55)+'px;line-height:1">' + profile.avatarEmoji + '</span>';
  }
  var letter = profile && profile.displayName ? profile.displayName[0].toUpperCase() : '?';
  var color = profile && profile.avatarColor ? profile.avatarColor : AVATAR_COLORS[0];
  return '<span style="font-size:'+(size*0.38)+'px;font-weight:700;font-family:var(--font-display)">' + letter + '</span>';
}
function avatarBg(profile) {
  if (profile && profile.avatarUrl) return 'transparent';
  if (profile && profile.avatarColor) return profile.avatarColor + '33';
  return 'rgba(124,111,255,0.15)';
}
function avatarColor(profile) {
  if (profile && profile.avatarColor) return profile.avatarColor;
  return '#7c6fff';
}

// ══════════════════════════════════════════════════
//  AUTH STATE
// ══════════════════════════════════════════════════
auth.onAuthStateChanged(function(user) {
  currentUser = user;
  var userChip = document.getElementById('userChip');
  var userAvatarNav = document.getElementById('userAvatarNav');
  var userName = document.getElementById('userName');
  var btnOpenAuth = document.getElementById('btnOpenAuth');
  var btnNewThread = document.getElementById('btnNewThread');
  var btnLogout = document.getElementById('btnLogout');

  if (user) {
    // Load profile from Firestore
    db.collection('profiles').doc(user.uid).get().then(function(snap) {
      currentProfile = snap.exists ? snap.data() : {};
      currentProfile.displayName = currentProfile.displayName || user.displayName || user.email.split('@')[0];
      updateNavAvatar();
    });
    userChip.classList.remove('hidden');
    btnNewThread.classList.remove('hidden');
    btnLogout.classList.remove('hidden');
    btnOpenAuth.classList.add('hidden');
    var name = user.displayName || user.email.split('@')[0];
    userName.textContent = name;
    document.getElementById('authModal').classList.add('hidden');
  } else {
    currentProfile = {};
    userChip.classList.add('hidden');
    btnNewThread.classList.add('hidden');
    btnLogout.classList.add('hidden');
    btnOpenAuth.classList.remove('hidden');
  }
});

function updateNavAvatar() {
  var nav = document.getElementById('userAvatarNav');
  nav.style.background = avatarBg(currentProfile);
  nav.style.color = avatarColor(currentProfile);
  nav.innerHTML = renderAvatarEl(currentProfile, 28);
  if (currentProfile.displayName) document.getElementById('userName').textContent = currentProfile.displayName;
}

// ══════════════════════════════════════════════════
//  THREADS — RENDER
// ══════════════════════════════════════════════════
var profileCache = {};
function getProfile(uid) {
  if (profileCache[uid]) return Promise.resolve(profileCache[uid]);
  return db.collection('profiles').doc(uid).get().then(function(snap) {
    var p = snap.exists ? snap.data() : {};
    profileCache[uid] = p;
    return p;
  });
}

function renderThreads(cat, threads) {
  var list = document.getElementById('threads-' + cat);
  var countEl = document.getElementById('count-' + cat);
  if (!list) return;
  allThreads[cat] = threads;
  if (countEl) countEl.textContent = threads.length;
  var filtered = currentSearch ? threads.filter(function(t){ return t.title.toLowerCase().indexOf(currentSearch) > -1; }) : threads;
  if (filtered.length === 0) {
    list.innerHTML = '<div class="threads-empty">' + (currentSearch ? 'Sin resultados.' : 'No hay hilos todavía. ¡Sé el primero!') + '</div>';
    return;
  }
  list.innerHTML = filtered.map(function(t) {
    var letter = (t.authorName || 'A')[0].toUpperCase();
    var isNew = t.createdAt && (Date.now() - t.createdAt.toMillis() < 3 * 3600 * 1000);
    var isHot = (t.replyCount || 0) > 10;
    var badge = isHot ? '<span class="badge badge-hot">🔥 Popular</span>' : isNew ? '<span class="badge badge-new">✨ Nuevo</span>' : '';
    var ago = timeAgo(t.createdAt);
    var avHtml, avStyle;
    if (t.authorAvatarUrl) {
      avHtml = '<img src="'+escapeAttr(t.authorAvatarUrl)+'" alt="av">';
      avStyle = 'background:transparent';
    } else if (t.authorAvatarEmoji) {
      avHtml = '<span style="font-size:18px">'+t.authorAvatarEmoji+'</span>';
      avStyle = 'background:rgba(124,111,255,0.1)';
    } else {
      avHtml = letter;
      var ci = (letter.charCodeAt(0)||0) % AVATAR_COLORS.length;
      avStyle = 'background:'+AVATAR_COLORS[ci]+'22;color:'+AVATAR_COLORS[ci];
    }
    return '<div class="thread-row" data-id="'+t.id+'" data-cat="'+cat+'">' +
      '<div class="t-avatar" style="'+avStyle+'">'+avHtml+'</div>' +
      '<div class="t-body">' +
        '<div class="t-top"><span class="t-title">'+escapeHtml(t.title)+'</span>'+badge+'</div>' +
        '<div class="t-meta">por <b>'+escapeHtml(t.authorName||'Anónimo')+'</b> · '+ago+' · 💬 '+(t.replyCount||0)+'</div>' +
      '</div>' +
      '<div class="t-right"><b>'+(t.views||0)+'</b>vistas</div>' +
    '</div>';
  }).join('');
  list.querySelectorAll('.thread-row').forEach(function(row) {
    row.addEventListener('click', function() { openThread(row.dataset.id, row.dataset.cat); });
  });
}

function updateStats() {
  var total = CATS.reduce(function(s,c){ return s + allThreads[c].length; }, 0);
  document.getElementById('statThreads').textContent = total;
}

CATS.forEach(function(cat) {
  db.collection('cat_'+cat).orderBy('createdAt','desc').onSnapshot(function(snap) {
    var threads = snap.docs.map(function(d){ return Object.assign({id:d.id}, d.data()); });
    renderThreads(cat, threads);
    updateStats();
  }, function(err) {
    var list = document.getElementById('threads-'+cat);
    if (list) list.innerHTML = '<div class="threads-empty">Error al cargar. Revisa las reglas de Firestore.</div>';
  });
});

// ══════════════════════════════════════════════════
//  OPEN THREAD
// ══════════════════════════════════════════════════
function openThread(threadId, cat) {
  activeThread = { id: threadId, cat: cat };
  var modal = document.getElementById('viewThreadModal');
  var titleEl = document.getElementById('viewThreadTitle');
  var catBadge = document.getElementById('viewCatBadge');
  var postsList = document.getElementById('viewThreadPosts');
  modal.classList.remove('hidden');
  postsList.innerHTML = '<div style="color:var(--text-3);font-size:13px;padding:1rem">Cargando...</div>';

  db.collection('cat_'+cat).doc(threadId).update({ views: firebase.firestore.FieldValue.increment(1) }).catch(function(){});
  db.collection('cat_'+cat).doc(threadId).get().then(function(snap) {
    if (snap.exists) { titleEl.textContent = snap.data().title; catBadge.textContent = CAT_LABELS[cat]||cat; }
  });

  if (activeThreadUnsubscribe) activeThreadUnsubscribe();

  activeThreadUnsubscribe = db.collection('cat_'+cat).doc(threadId)
    .collection('posts').orderBy('createdAt','asc')
    .onSnapshot(function(snap) {
      var posts = snap.docs.map(function(d){ return Object.assign({id:d.id}, d.data()); });
      if (posts.length === 0) { postsList.innerHTML = '<div style="color:var(--text-3);font-size:13px;padding:1rem">Sin mensajes todavía.</div>'; return; }
      // Render posts, then enrich with profiles
      postsList.innerHTML = posts.map(function(p) { return renderPost(p); }).join('');
      // Enrich avatars async
      posts.forEach(function(p, idx) {
        if (!p.authorId) return;
        getProfile(p.authorId).then(function(prof) {
          var el = postsList.querySelectorAll('.post-item')[idx];
          if (!el) return;
          var avWrap = el.querySelector('.post-avatar');
          if (avWrap) {
            avWrap.style.background = avatarBg(prof);
            avWrap.style.color = avatarColor(prof);
            avWrap.innerHTML = renderAvatarEl(prof, 44);
          }
          var sigEl = el.querySelector('.post-signature');
          if (prof.signature && !sigEl) {
            var body = el.querySelector('.post-body');
            var sig = document.createElement('div');
            sig.className = 'post-signature';
            sig.innerHTML = bbToHtml(prof.signature);
            body.appendChild(sig);
          }
          var bioEl = el.querySelector('.post-author-bio');
          if (bioEl && prof.bio) bioEl.textContent = prof.bio;
        });
      });
    });

  var replyBox = document.getElementById('replyBox');
  var replyHint = document.getElementById('replyLoginHint');
  if (currentUser) { replyBox.classList.remove('hidden'); replyHint.classList.add('hidden'); }
  else { replyBox.classList.add('hidden'); replyHint.classList.remove('hidden'); }
}

function renderPost(p) {
  var letter = (p.authorName||'A')[0].toUpperCase();
  var ago = timeAgo(p.createdAt);
  return '<div class="post-item">' +
    '<div class="post-header">' +
      '<div class="post-avatar-wrap">' +
        '<div class="post-avatar" style="background:rgba(124,111,255,0.15);color:#7c6fff">'+letter+'</div>' +
      '</div>' +
      '<div class="post-meta">' +
        '<div class="post-author-name">'+escapeHtml(p.authorName||'Anónimo')+'</div>' +
        '<div class="post-author-bio"></div>' +
        '<div class="post-author-date">'+ago+'</div>' +
      '</div>' +
    '</div>' +
    '<div class="post-body">' +
      '<div class="post-content-wrap">'+bbToHtml(p.content)+'</div>' +
    '</div>' +
  '</div>';
}

document.getElementById('closeViewModal').addEventListener('click', function() {
  document.getElementById('viewThreadModal').classList.add('hidden');
  if (activeThreadUnsubscribe) { activeThreadUnsubscribe(); activeThreadUnsubscribe = null; }
  activeThread = null;
  document.getElementById('replyContent').value = '';
  document.getElementById('replyPreview').classList.add('hidden');
});

document.getElementById('btnOpenAuthFromThread').addEventListener('click', function() {
  document.getElementById('viewThreadModal').classList.add('hidden');
  document.getElementById('authModal').classList.remove('hidden');
});

// ══════════════════════════════════════════════════
//  REPLY
// ══════════════════════════════════════════════════
document.getElementById('btnReply').addEventListener('click', function() {
  if (!currentUser || !activeThread) return;
  var content = document.getElementById('replyContent').value.trim();
  if (!content) return;
  var name = currentProfile.displayName || currentUser.displayName || currentUser.email.split('@')[0];
  db.collection('cat_'+activeThread.cat).doc(activeThread.id).collection('posts').add({
    content: content,
    authorId: currentUser.uid,
    authorName: name,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(function() {
    db.collection('cat_'+activeThread.cat).doc(activeThread.id).update({ replyCount: firebase.firestore.FieldValue.increment(1) });
    document.getElementById('replyContent').value = '';
    document.getElementById('replyPreview').classList.add('hidden');
    document.getElementById('replyPreview').innerHTML = '';
  }).catch(function(err){ console.error(err); });
});

// ══════════════════════════════════════════════════
//  CREATE THREAD
// ══════════════════════════════════════════════════
document.getElementById('btnNewThread').addEventListener('click', function() {
  document.getElementById('newThreadModal').classList.remove('hidden');
});
document.getElementById('closeThreadModal').addEventListener('click', function() {
  document.getElementById('newThreadModal').classList.add('hidden');
});

document.getElementById('btnCreateThread').addEventListener('click', function() {
  if (!currentUser) return;
  var cat = document.getElementById('threadCategory').value;
  var title = document.getElementById('threadTitle').value.trim();
  var content = document.getElementById('threadContent').value.trim();
  var errEl = document.getElementById('threadError');
  errEl.textContent = '';
  if (!title) { errEl.textContent = 'El título no puede estar vacío.'; return; }
  if (!content) { errEl.textContent = 'Escribe al menos un mensaje inicial.'; return; }
  var name = currentProfile.displayName || currentUser.displayName || currentUser.email.split('@')[0];
  var threadData = {
    title: title,
    authorId: currentUser.uid,
    authorName: name,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    replyCount: 0,
    views: 0
  };
  if (currentProfile.avatarUrl) threadData.authorAvatarUrl = currentProfile.avatarUrl;
  if (currentProfile.avatarEmoji) threadData.authorAvatarEmoji = currentProfile.avatarEmoji;

  db.collection('cat_'+cat).add(threadData).then(function(ref) {
    return db.collection('cat_'+cat).doc(ref.id).collection('posts').add({
      content: content,
      authorId: currentUser.uid,
      authorName: name,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }).then(function() {
    document.getElementById('newThreadModal').classList.add('hidden');
    document.getElementById('threadTitle').value = '';
    document.getElementById('threadContent').value = '';
    document.getElementById('threadPreview').classList.add('hidden');
  }).catch(function(err) { errEl.textContent = 'Error: ' + err.message; });
});

// ══════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════
document.getElementById('btnOpenAuth').addEventListener('click', function() {
  document.getElementById('authModal').classList.remove('hidden');
});
document.querySelectorAll('.auth-tab').forEach(function(tab) {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.auth-tab').forEach(function(t){ t.classList.remove('active'); });
    tab.classList.add('active');
    var target = tab.dataset.tab;
    document.getElementById('loginForm').classList.toggle('hidden', target !== 'login');
    document.getElementById('registerForm').classList.toggle('hidden', target !== 'register');
  });
});
document.getElementById('btnLogin').addEventListener('click', function() {
  var email = document.getElementById('loginEmail').value.trim();
  var pass = document.getElementById('loginPass').value;
  var err = document.getElementById('loginError');
  err.textContent = '';
  auth.signInWithEmailAndPassword(email, pass).catch(function(e){ err.textContent = friendlyError(e.code); });
});
document.getElementById('btnRegister').addEventListener('click', function() {
  var name = document.getElementById('regName').value.trim();
  var email = document.getElementById('regEmail').value.trim();
  var pass = document.getElementById('regPass').value;
  var err = document.getElementById('regError');
  err.textContent = '';
  if (!name) { err.textContent = 'El nombre de usuario es obligatorio.'; return; }
  auth.createUserWithEmailAndPassword(email, pass)
    .then(function(cred) { return cred.user.updateProfile({ displayName: name }).then(function(){ return cred; }); })
    .then(function(cred) {
      return db.collection('profiles').doc(cred.user.uid).set({ displayName: name }, { merge: true });
    })
    .catch(function(e){ err.textContent = friendlyError(e.code); });
});
document.getElementById('btnLogout').addEventListener('click', function(){ auth.signOut(); });

// ══════════════════════════════════════════════════
//  PROFILE MODAL
// ══════════════════════════════════════════════════
var selectedAvatarColor = AVATAR_COLORS[0];
var selectedAvatarType = 'initials';

function buildProfileModal() {
  // Color swatches
  var row = document.getElementById('avatarColorRow');
  row.innerHTML = '';
  AVATAR_COLORS.forEach(function(c) {
    var sw = document.createElement('div');
    sw.className = 'avatar-color-swatch' + (c === selectedAvatarColor ? ' selected' : '');
    sw.style.background = c;
    sw.addEventListener('click', function() {
      selectedAvatarColor = c;
      row.querySelectorAll('.avatar-color-swatch').forEach(function(s){ s.classList.remove('selected'); });
      sw.classList.add('selected');
      updateProfilePreview();
    });
    row.appendChild(sw);
  });
  // Preset emojis
  var grid = document.getElementById('presetGrid');
  grid.innerHTML = '';
  PRESET_EMOJIS.forEach(function(em) {
    var el = document.createElement('div');
    el.className = 'preset-avatar';
    el.textContent = em;
    el.addEventListener('click', function() {
      grid.querySelectorAll('.preset-avatar').forEach(function(e){ e.classList.remove('selected'); });
      el.classList.add('selected');
      updateProfilePreview();
    });
    grid.appendChild(el);
  });
}

function updateProfilePreview() {
  var preview = document.getElementById('profileAvatarPreview');
  var urlInput = document.getElementById('avatarUrlInput').value.trim();
  var selectedEmoji = document.querySelector('.preset-avatar.selected');
  if (selectedAvatarType === 'url' && urlInput) {
    preview.innerHTML = '<img src="'+escapeAttr(urlInput)+'" alt="avatar">';
    preview.style.background = 'transparent';
  } else if (selectedAvatarType === 'preset' && selectedEmoji) {
    preview.innerHTML = '<span style="font-size:36px">'+selectedEmoji.textContent+'</span>';
    preview.style.background = 'rgba(255,255,255,0.06)';
  } else {
    var name = document.getElementById('profileName').value.trim() || (currentUser && currentUser.displayName) || '?';
    preview.innerHTML = '<span style="font-size:28px;font-weight:800;font-family:var(--font-display)">'+name[0].toUpperCase()+'</span>';
    preview.style.background = selectedAvatarColor + '33';
    preview.style.color = selectedAvatarColor;
  }
}

document.getElementById('avatarUrlInput').addEventListener('input', updateProfilePreview);
document.getElementById('profileName').addEventListener('input', updateProfilePreview);

document.querySelectorAll('.avatar-tab').forEach(function(tab) {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.avatar-tab').forEach(function(t){ t.classList.remove('active'); });
    tab.classList.add('active');
    selectedAvatarType = tab.dataset.avtype;
    document.getElementById('avInitials').classList.toggle('hidden', selectedAvatarType !== 'initials');
    document.getElementById('avUrl').classList.toggle('hidden', selectedAvatarType !== 'url');
    document.getElementById('avPreset').classList.toggle('hidden', selectedAvatarType !== 'preset');
    updateProfilePreview();
  });
});

document.getElementById('btnProfile').addEventListener('click', function() {
  if (!currentUser) return;
  buildProfileModal();
  // Pre-fill
  document.getElementById('profileName').value = currentProfile.displayName || currentUser.displayName || '';
  document.getElementById('profileBio').value = currentProfile.bio || '';
  document.getElementById('profileSig').value = currentProfile.signature || '';
  document.getElementById('avatarUrlInput').value = currentProfile.avatarUrl || '';
  if (currentProfile.avatarColor) selectedAvatarColor = currentProfile.avatarColor;
  updateProfilePreview();
  document.getElementById('profileModal').classList.remove('hidden');
});

document.getElementById('closeProfileModal').addEventListener('click', function() {
  document.getElementById('profileModal').classList.add('hidden');
});

document.getElementById('btnSaveProfile').addEventListener('click', function() {
  if (!currentUser) return;
  var errEl = document.getElementById('profileError');
  errEl.textContent = '';
  var name = document.getElementById('profileName').value.trim();
  var bio = document.getElementById('profileBio').value.trim();
  var sig = document.getElementById('profileSig').value.trim();
  var urlInput = document.getElementById('avatarUrlInput').value.trim();
  var selectedEmoji = document.querySelector('.preset-avatar.selected');

  var profileData = { displayName: name, bio: bio, signature: sig, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };

  // Avatar
  if (selectedAvatarType === 'url' && urlInput) {
    profileData.avatarUrl = urlInput;
    delete profileData.avatarEmoji;
    delete profileData.avatarColor;
  } else if (selectedAvatarType === 'preset' && selectedEmoji) {
    profileData.avatarEmoji = selectedEmoji.textContent;
    delete profileData.avatarUrl;
    delete profileData.avatarColor;
  } else {
    profileData.avatarColor = selectedAvatarColor;
    delete profileData.avatarUrl;
    delete profileData.avatarEmoji;
  }

  db.collection('profiles').doc(currentUser.uid).set(profileData, { merge: true })
    .then(function() {
      currentProfile = Object.assign(currentProfile, profileData);
      profileCache[currentUser.uid] = currentProfile;
      if (name) currentUser.updateProfile({ displayName: name });
      updateNavAvatar();
      document.getElementById('profileModal').classList.add('hidden');
    })
    .catch(function(err) { errEl.textContent = 'Error: ' + err.message; });
});

// ══════════════════════════════════════════════════
//  CATEGORY FILTER
// ══════════════════════════════════════════════════
document.querySelectorAll('.cat-pill').forEach(function(pill) {
  pill.addEventListener('click', function() {
    document.querySelectorAll('.cat-pill').forEach(function(p){ p.classList.remove('active'); });
    pill.classList.add('active');
    var filter = pill.dataset.cat;
    document.querySelectorAll('.cat-block').forEach(function(block) {
      if (filter === 'all' || block.dataset.category === filter) block.classList.remove('hidden');
      else block.classList.add('hidden');
    });
  });
});

// ══════════════════════════════════════════════════
//  SEARCH
// ══════════════════════════════════════════════════
document.getElementById('searchInput').addEventListener('input', function(e) {
  currentSearch = e.target.value.toLowerCase().trim();
  CATS.forEach(function(cat){ renderThreads(cat, allThreads[cat]); });
});

// ══════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════
function timeAgo(ts) {
  if (!ts) return 'ahora';
  var diff = (Date.now() - ts.toMillis()) / 1000;
  if (diff < 60) return 'ahora mismo';
  if (diff < 3600) return 'hace ' + Math.floor(diff/60) + 'min';
  if (diff < 86400) return 'hace ' + Math.floor(diff/3600) + 'h';
  return 'hace ' + Math.floor(diff/86400) + 'd';
}
function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escapeAttr(str) {
  return String(str).replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function friendlyError(code) {
  var map = { 'auth/invalid-email':'Correo no válido.','auth/user-not-found':'Usuario no encontrado.','auth/wrong-password':'Contraseña incorrecta.','auth/email-already-in-use':'El correo ya está registrado.','auth/weak-password':'La contraseña debe tener al menos 6 caracteres.','auth/invalid-credential':'Credenciales incorrectas.' };
  return map[code] || 'Error: ' + code;
}
