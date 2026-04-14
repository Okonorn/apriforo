// ╔══════════════════════════════════════════════════════════════╗
// ║  NEXUS FORUM — app.js v3                                    ║
// ╚══════════════════════════════════════════════════════════════╝

var firebaseConfig = {
  apiKey: "AIzaSyDe4Mkrxx3f1n1ulS_dbboaNJd3Zak7YQw",
  authDomain: "users-apricart.firebaseapp.com",
  projectId: "users-apricart",
  storageBucket: "users-apricart.firebasestorage.app",
  messagingSenderId: "879024803425",
  appId: "1:879024803425:web:e9f8d3da56c7524c542420"
};
firebase.initializeApp(firebaseConfig);
var auth = firebase.auth();
var db = firebase.firestore();

// ── ADMIN CONFIG ─────────────────────────────────────────────
// Usuarios con permisos de administrador (por displayName)
var ADMIN_USERS = ['apri'];
function isAdmin(profile) {
  if (!profile) return false;
  return ADMIN_USERS.indexOf(profile.displayName) > -1;
}
function canEditThread(thread) {
  if (!currentUser) return false;
  if (isAdmin(currentProfile)) return true;
  return thread && thread.authorId === currentUser.uid;
}
function canDeletePost(post) {
  if (!currentUser) return false;
  if (isAdmin(currentProfile)) return true;
  return post && post.authorId === currentUser.uid;
}

// ── CANVAS BG ────────────────────────────────────────────────
(function() {
  var cv = document.getElementById('bgCanvas'), ctx = cv.getContext('2d'), W, H, pts;
  function resize() {
    W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; pts = [];
    for (var i=0;i<80;i++) pts.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.5+0.3,vx:(Math.random()-0.5)*0.3,vy:(Math.random()-0.5)*0.3,a:Math.random()*0.5+0.1,h:Math.random()>0.6?260:Math.random()>0.5?320:170});
  }
  function draw() {
    ctx.clearRect(0,0,W,H);
    for (var i=0;i<pts.length;i++) {
      var p=pts[i]; p.x=(p.x+p.vx+W)%W; p.y=(p.y+p.vy+H)%H;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle='hsla('+p.h+',70%,70%,'+p.a+')'; ctx.fill();
      for (var j=i+1;j<pts.length;j++) {
        var q=pts[j],dx=p.x-q.x,dy=p.y-q.y,d=Math.sqrt(dx*dx+dy*dy);
        if(d<120){ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.strokeStyle='hsla(260,60%,70%,'+(0.06*(1-d/120))+')';ctx.lineWidth=0.5;ctx.stroke();}
      }
    }
    requestAnimationFrame(draw);
  }
  window.addEventListener('resize',resize); resize(); draw();
})();

// ── BBCODE ────────────────────────────────────────────────────
function bbToHtml(text) {
  if (!text) return '';
  var out = escapeHtml(text);
  out = out.replace(/\[youtube\](https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)[^\s]*)\[\/youtube\]/gi, function(m,u,id){ return '<iframe src="https://www.youtube.com/embed/'+id+'" allowfullscreen></iframe>'; });
  out = out.replace(/(^|[\s\n])(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)[^\s<]*)/g, function(m,pre,u,id){ return pre+'<iframe src="https://www.youtube.com/embed/'+id+'" allowfullscreen></iframe>'; });
  out = out.replace(/\[b\]([\s\S]*?)\[\/b\]/gi,'<strong>$1</strong>');
  out = out.replace(/\[i\]([\s\S]*?)\[\/i\]/gi,'<em>$1</em>');
  out = out.replace(/\[u\]([\s\S]*?)\[\/u\]/gi,'<u>$1</u>');
  out = out.replace(/\[s\]([\s\S]*?)\[\/s\]/gi,'<s>$1</s>');
  out = out.replace(/\[quote\]([\s\S]*?)\[\/quote\]/gi,'<blockquote>$1</blockquote>');
  out = out.replace(/\[quote=([^\]]+)\]([\s\S]*?)\[\/quote\]/gi,'<blockquote><strong>$1:</strong><br>$2</blockquote>');
  out = out.replace(/\[code\]([\s\S]*?)\[\/code\]/gi,'<pre><code>$1</code></pre>');
  out = out.replace(/\[img\](https?:\/\/[^\s\[]+)\[\/img\]/gi,'<img src="$1" alt="img" loading="lazy">');
  out = out.replace(/\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi,'<a href="$1" target="_blank" rel="noopener">$2</a>');
  out = out.replace(/\[url\](https?:\/\/[^\s\[]+)\[\/url\]/gi,'<a href="$1" target="_blank" rel="noopener">$1</a>');
  out = out.replace(/\[list\]([\s\S]*?)\[\/list\]/gi,function(m,inner){
    return '<ul style="padding-left:18px;margin:4px 0">'+inner.split(/\[\*\]/).filter(function(s){return s.trim();}).map(function(i){return '<li>'+i.trim()+'</li>';}).join('')+'</ul>';
  });
  out = out.replace(/\n/g,'<br>');
  return out;
}

// ── EMOJI PICKER ─────────────────────────────────────────────
var EMOJIS = ['😀','😂','😍','🥰','😎','🤔','😅','😭','😤','🤩','👍','👎','❤️','🔥','💯','✅','⭐','🎮','🎵','🎉','🤣','😊','🙏','💪','🚀','👀','💀','🤯','😱','🥺','😴','🤦','🤷','👏','🫡','💬','📷','🎯','🏆','💥'];
function buildEmojiPicker(pickerEl, ta) {
  pickerEl.innerHTML = '';
  EMOJIS.forEach(function(em){
    var sp = document.createElement('span'); sp.textContent = em;
    sp.addEventListener('click',function(){ insertAtCursor(ta,em); pickerEl.classList.add('hidden'); });
    pickerEl.appendChild(sp);
  });
}
function initToolbar(toolbarEl, ta, pickerEl) {
  if (!toolbarEl) return;
  buildEmojiPicker(pickerEl, ta);
  toolbarEl.querySelectorAll('.tb-btn[data-action]').forEach(function(btn){
    btn.addEventListener('click',function(e){
      e.preventDefault();
      var action = btn.dataset.action;
      if (action==='emoji'){ pickerEl.classList.toggle('hidden'); return; }
      pickerEl.classList.add('hidden');
      var tags = {bold:['[b]','[/b]'],italic:['[i]','[/i]'],underline:['[u]','[/u]'],strike:['[s]','[/s]'],quote:['[quote]','[/quote]'],code:['[code]','[/code]'],list:['[list]\n[*]','[/list]']};
      if (tags[action]) { wrapSelection(ta, tags[action][0], tags[action][1]); }
      else if (action==='image'){ var u=prompt('URL de la imagen:'); if(u) insertAtCursor(ta,'[img]'+u+'[/img]'); }
      else if (action==='youtube'){ var u=prompt('URL de YouTube:'); if(u) insertAtCursor(ta,u+'\n'); }
      else if (action==='link'){ var u=prompt('URL del enlace:'); var l=prompt('Texto:','ver enlace'); if(u) insertAtCursor(ta,'[url='+u+']'+(l||u)+'[/url]'); }
      ta.focus();
    });
  });
  document.addEventListener('click',function(e){ if(!toolbarEl.contains(e.target)&&!pickerEl.contains(e.target)) pickerEl.classList.add('hidden'); });
}
function wrapSelection(ta,open,close){ var s=ta.selectionStart,e=ta.selectionEnd,sel=ta.value.substring(s,e)||'texto'; ta.value=ta.value.substring(0,s)+open+sel+close+ta.value.substring(e); ta.selectionStart=s+open.length; ta.selectionEnd=s+open.length+sel.length; }
function insertAtCursor(ta,text){ var s=ta.selectionStart; ta.value=ta.value.substring(0,s)+text+ta.value.substring(ta.selectionEnd); ta.selectionStart=ta.selectionEnd=s+text.length; }

initToolbar(document.getElementById('threadToolbar'),document.getElementById('threadContent'),document.getElementById('threadEmojiPicker'));
initToolbar(document.getElementById('replyToolbar'),document.getElementById('replyContent'),document.getElementById('replyEmojiPicker'));
initToolbar(document.getElementById('sigToolbar'),document.getElementById('profileSig'),document.createElement('div'));

document.getElementById('threadPreviewBtn').addEventListener('click',function(){ var pv=document.getElementById('threadPreview'); pv.classList.toggle('hidden'); if(!pv.classList.contains('hidden')) pv.innerHTML=bbToHtml(document.getElementById('threadContent').value); });
document.getElementById('replyPreviewBtn').addEventListener('click',function(){ var pv=document.getElementById('replyPreview'); pv.classList.toggle('hidden'); if(!pv.classList.contains('hidden')) pv.innerHTML=bbToHtml(document.getElementById('replyContent').value); });

// ── STATE ─────────────────────────────────────────────────────
var currentUser = null;
var currentProfile = {};
var activeThread = null;   // { id, cat, data }
var activeThreadUnsub = null;
var allThreads = { offtopic:[], videojuegos:[], musica:[] };
var CATS = ['offtopic','videojuegos','musica'];
var CAT_LABELS = { offtopic:'💬 Off-Topic', videojuegos:'🎮 Videojuegos', musica:'🎵 Música' };
var currentSearch = '';
var THREAD_PREVIEW_LIMIT = 5;
var profileCache = {};
var AVATAR_COLORS = ['#7c6fff','#e060a0','#00d4aa','#f0a060','#7ab0f0','#e86060','#60e890'];
var PRESET_EMOJIS = ['🐱','🐶','🦊','🐼','🐸','🤖','👾','🦁','🐺','🦝','🎭','🎃'];

// ── AVATAR HELPERS ────────────────────────────────────────────
function renderAvatarEl(profile, size) {
  size = size||36;
  if (profile&&profile.avatarUrl) return '<img src="'+escapeAttr(profile.avatarUrl)+'" alt="av" style="width:'+size+'px;height:'+size+'px;object-fit:cover;border-radius:50%">';
  if (profile&&profile.avatarEmoji) return '<span style="font-size:'+(size*0.55)+'px;line-height:1">'+profile.avatarEmoji+'</span>';
  var letter = profile&&profile.displayName ? profile.displayName[0].toUpperCase() : '?';
  return '<span style="font-size:'+(size*0.38)+'px;font-weight:700;font-family:var(--font-display)">'+letter+'</span>';
}
function avatarBg(profile) {
  if (profile&&profile.avatarUrl) return 'transparent';
  if (profile&&profile.avatarColor) return profile.avatarColor+'33';
  return 'rgba(124,111,255,0.15)';
}
function avatarColor(profile) { return (profile&&profile.avatarColor) ? profile.avatarColor : '#7c6fff'; }

// ── AUTH STATE ────────────────────────────────────────────────
auth.onAuthStateChanged(function(user){
  currentUser = user;
  var chip=document.getElementById('userChip'), nav=document.getElementById('userAvatarNav');
  var btnAuth=document.getElementById('btnOpenAuth'), btnNew=document.getElementById('btnNewThread'), btnOut=document.getElementById('btnLogout');
  if (user) {
    db.collection('profiles').doc(user.uid).get().then(function(snap){
      currentProfile = snap.exists ? snap.data() : {};
      currentProfile.displayName = currentProfile.displayName||user.displayName||user.email.split('@')[0];
      profileCache[user.uid] = currentProfile;
      updateNavAvatar();
    });
    chip.classList.remove('hidden'); btnNew.classList.remove('hidden'); btnOut.classList.remove('hidden'); btnAuth.classList.add('hidden');
    document.getElementById('userName').textContent = user.displayName||user.email.split('@')[0];
    document.getElementById('authModal').classList.add('hidden');
  } else {
    currentProfile = {}; chip.classList.add('hidden'); btnNew.classList.add('hidden'); btnOut.classList.add('hidden'); btnAuth.classList.remove('hidden');
    // refresh post actions
    refreshViewModal();
  }
});
function updateNavAvatar() {
  var nav=document.getElementById('userAvatarNav');
  nav.style.background=avatarBg(currentProfile); nav.style.color=avatarColor(currentProfile);
  nav.innerHTML=renderAvatarEl(currentProfile,28);
  if(currentProfile.displayName) document.getElementById('userName').textContent=currentProfile.displayName;
  refreshViewModal();
}
function refreshViewModal() {
  // Show/hide reply box and admin controls based on auth state
  var replyBox=document.getElementById('replyBox'), hint=document.getElementById('replyLoginHint');
  if (currentUser) { replyBox.classList.remove('hidden'); hint.classList.add('hidden'); }
  else { replyBox.classList.add('hidden'); hint.classList.remove('hidden'); }
  // Thread edit/delete buttons
  if (activeThread) {
    var canEdit = canEditThread(activeThread.data);
    document.getElementById('btnEditThread').classList.toggle('hidden', !canEdit);
    document.getElementById('btnDeleteThread').classList.toggle('hidden', !canEdit);
  }
}

// ── PROFILE CACHE ─────────────────────────────────────────────
function getProfile(uid) {
  if (profileCache[uid]) return Promise.resolve(profileCache[uid]);
  return db.collection('profiles').doc(uid).get().then(function(snap){ var p=snap.exists?snap.data():{}; profileCache[uid]=p; return p; });
}

// ── RENDER THREADS ────────────────────────────────────────────
function renderThreads(cat, threads) {
  var list=document.getElementById('threads-'+cat), countEl=document.getElementById('count-'+cat), moreEl=document.getElementById('more-'+cat), moreCount=document.getElementById('morecount-'+cat);
  if (!list) return;
  allThreads[cat] = threads;
  if (countEl) countEl.textContent = threads.length;

  var filtered = currentSearch ? threads.filter(function(t){ return t.title.toLowerCase().indexOf(currentSearch)>-1; }) : threads;
  var shown = filtered.slice(0, THREAD_PREVIEW_LIMIT);
  var remaining = filtered.length - shown.length;

  if (filtered.length===0) { list.innerHTML='<div class="threads-empty">'+(currentSearch?'Sin resultados.':'No hay hilos todavía. ¡Sé el primero!')+'</div>'; moreEl.classList.add('hidden'); return; }

  list.innerHTML = shown.map(function(t){ return renderThreadRow(t, cat); }).join('');
  list.querySelectorAll('.thread-row').forEach(function(row){ row.addEventListener('click',function(){ openThread(row.dataset.id, row.dataset.cat); }); });
  list.querySelectorAll('.nick-link').forEach(function(el){ el.addEventListener('click',function(e){ e.stopPropagation(); openPublicProfile(el.dataset.uid, el.dataset.name); }); });

  if (remaining > 0) { moreEl.classList.remove('hidden'); if(moreCount) moreCount.textContent='('+remaining+' más)'; }
  else { moreEl.classList.add('hidden'); }
}

function renderThreadRow(t, cat) {
  var letter=(t.authorName||'A')[0].toUpperCase();
  var isNew=t.createdAt&&(Date.now()-t.createdAt.toMillis()<3*3600*1000);
  var isHot=(t.replyCount||0)>10;
  var badge=isHot?'<span class="badge badge-hot">🔥 Popular</span>':isNew?'<span class="badge badge-new">✨ Nuevo</span>':'';
  var ago=timeAgo(t.createdAt);
  var avHtml, avStyle;
  if (t.authorAvatarUrl) { avHtml='<img src="'+escapeAttr(t.authorAvatarUrl)+'" alt="av">'; avStyle='background:transparent'; }
  else if (t.authorAvatarEmoji) { avHtml='<span style="font-size:18px">'+t.authorAvatarEmoji+'</span>'; avStyle='background:rgba(124,111,255,0.1)'; }
  else { var ci=(letter.charCodeAt(0)||0)%AVATAR_COLORS.length; avHtml=letter; avStyle='background:'+AVATAR_COLORS[ci]+'22;color:'+AVATAR_COLORS[ci]; }
  return '<div class="thread-row" data-id="'+t.id+'" data-cat="'+cat+'">'+
    '<div class="t-avatar" style="'+avStyle+'">'+avHtml+'</div>'+
    '<div class="t-body">'+
      '<div class="t-top"><span class="t-title">'+escapeHtml(t.title)+'</span>'+badge+'</div>'+
      '<div class="t-meta">por <b class="nick-link" data-uid="'+(t.authorId||'')+'" data-name="'+escapeAttr(t.authorName||'')+'">'+escapeHtml(t.authorName||'Anónimo')+'</b> · '+ago+' · 💬 '+(t.replyCount||0)+'</div>'+
    '</div>'+
    '<div class="t-right"><b>'+(t.views||0)+'</b>vistas</div>'+
  '</div>';
}

function updateStats() {
  document.getElementById('statThreads').textContent = CATS.reduce(function(s,c){ return s+allThreads[c].length; },0);
}

// Show-more buttons
document.querySelectorAll('.btn-show-more').forEach(function(btn){
  btn.addEventListener('click',function(){
    var cat=btn.dataset.cat;
    // Show all threads for that category in a full-screen-style expanded view
    var list=document.getElementById('threads-'+cat);
    var all=allThreads[cat];
    list.innerHTML = all.map(function(t){ return renderThreadRow(t,cat); }).join('');
    list.querySelectorAll('.thread-row').forEach(function(row){ row.addEventListener('click',function(){ openThread(row.dataset.id,row.dataset.cat); }); });
    list.querySelectorAll('.nick-link').forEach(function(el){ el.addEventListener('click',function(e){ e.stopPropagation(); openPublicProfile(el.dataset.uid,el.dataset.name); }); });
    document.getElementById('more-'+cat).classList.add('hidden');
  });
});

CATS.forEach(function(cat){
  db.collection('cat_'+cat).orderBy('createdAt','desc').onSnapshot(function(snap){
    renderThreads(cat, snap.docs.map(function(d){ return Object.assign({id:d.id},d.data()); }));
    updateStats();
  }, function(){ document.getElementById('threads-'+cat).innerHTML='<div class="threads-empty">Error al cargar.</div>'; });
});

// ── OPEN THREAD ───────────────────────────────────────────────
function openThread(threadId, cat) {
  var modal=document.getElementById('viewThreadModal');
  var titleEl=document.getElementById('viewThreadTitle');
  var catBadge=document.getElementById('viewCatBadge');
  var postsList=document.getElementById('viewThreadPosts');
  modal.classList.remove('hidden');
  postsList.innerHTML='<div style="color:var(--text-3);font-size:13px;padding:1rem">Cargando...</div>';

  db.collection('cat_'+cat).doc(threadId).update({ views: firebase.firestore.FieldValue.increment(1) }).catch(function(){});
  db.collection('cat_'+cat).doc(threadId).get().then(function(snap){
    if (!snap.exists) return;
    var data = snap.data();
    activeThread = { id:threadId, cat:cat, data: Object.assign({id:threadId},data) };
    titleEl.textContent = data.title;
    catBadge.textContent = CAT_LABELS[cat]||cat;
    var canEdit = canEditThread(activeThread.data);
    document.getElementById('btnEditThread').classList.toggle('hidden',!canEdit);
    document.getElementById('btnDeleteThread').classList.toggle('hidden',!canEdit);
  });

  if (activeThreadUnsub) activeThreadUnsub();
  activeThreadUnsub = db.collection('cat_'+cat).doc(threadId).collection('posts').orderBy('createdAt','asc').onSnapshot(function(snap){
    var posts = snap.docs.map(function(d){ return Object.assign({id:d.id},d.data()); });
    if (posts.length===0) { postsList.innerHTML='<div style="color:var(--text-3);font-size:13px;padding:1rem">Sin mensajes.</div>'; return; }
    postsList.innerHTML = posts.map(function(p){ return renderPost(p); }).join('');
    // Enrich with profiles
    posts.forEach(function(p,idx){
      if (!p.authorId) return;
      getProfile(p.authorId).then(function(prof){
        var el=postsList.querySelectorAll('.post-item')[idx]; if(!el) return;
        var av=el.querySelector('.post-avatar');
        if(av){ av.style.background=avatarBg(prof); av.style.color=avatarColor(prof); av.innerHTML=renderAvatarEl(prof,44); }
        var bioEl=el.querySelector('.post-author-bio'); if(bioEl&&prof.bio) bioEl.textContent=prof.bio;
        var roleEl=el.querySelector('.post-author-role');
        if(roleEl) { roleEl.innerHTML = isAdmin(prof)?'<span class="badge-admin">⚡ Admin</span>':''; }
        var body=el.querySelector('.post-body');
        if(prof.signature&&body&&!body.querySelector('.post-signature')){
          var sig=document.createElement('div'); sig.className='post-signature'; sig.innerHTML=bbToHtml(prof.signature); body.appendChild(sig);
        }
      });
    });
    // Nick click → public profile
    postsList.querySelectorAll('.nick-link').forEach(function(el){
      el.addEventListener('click',function(e){ e.stopPropagation(); openPublicProfile(el.dataset.uid,el.dataset.name); });
    });
  });

  refreshViewModal();
}

function renderPost(p) {
  var letter=(p.authorName||'A')[0].toUpperCase();
  var canDel=canDeletePost(p);
  return '<div class="post-item" data-postid="'+p.id+'">'+
    '<div class="post-header">'+
      '<div class="post-avatar-wrap">'+
        '<div class="post-avatar" style="background:rgba(124,111,255,0.15);color:#7c6fff">'+letter+'</div>'+
      '</div>'+
      '<div class="post-meta">'+
        '<div class="post-author-name"><span class="nick-link" data-uid="'+(p.authorId||'')+'" data-name="'+escapeAttr(p.authorName||'')+'">'+escapeHtml(p.authorName||'Anónimo')+'</span></div>'+
        '<div class="post-author-bio"></div>'+
        '<div class="post-author-role"></div>'+
        '<div class="post-author-date">'+timeAgo(p.createdAt)+'</div>'+
      '</div>'+
    '</div>'+
    '<div class="post-body">'+
      '<div class="post-content-wrap">'+bbToHtml(p.content)+'</div>'+
      (canDel?'<div class="post-actions"><button class="post-act-btn" data-action="edit-post" data-id="'+p.id+'">✏ Editar</button><button class="post-act-btn danger" data-action="del-post" data-id="'+p.id+'">🗑 Borrar</button></div>':'')+''+
    '</div>'+
  '</div>';
}

// ── EDIT / DELETE THREAD ──────────────────────────────────────
document.getElementById('btnEditThread').addEventListener('click',function(){
  if (!activeThread) return;
  var newTitle = prompt('Nuevo título:', activeThread.data.title);
  if (newTitle&&newTitle.trim()) {
    db.collection('cat_'+activeThread.cat).doc(activeThread.id).update({ title: newTitle.trim() }).then(function(){
      document.getElementById('viewThreadTitle').textContent=newTitle.trim();
      activeThread.data.title=newTitle.trim();
      // Update in allThreads list
      var idx=allThreads[activeThread.cat].findIndex(function(t){ return t.id===activeThread.id; });
      if(idx>-1) allThreads[activeThread.cat][idx].title=newTitle.trim();
      renderThreads(activeThread.cat, allThreads[activeThread.cat]);
    });
  }
});

document.getElementById('btnDeleteThread').addEventListener('click',function(){
  if (!activeThread) return;
  if (!confirm('¿Seguro que quieres eliminar este hilo y todos sus mensajes?')) return;
  var cat=activeThread.cat, id=activeThread.id;
  // Delete all posts first
  db.collection('cat_'+cat).doc(id).collection('posts').get().then(function(snap){
    var batch=db.batch();
    snap.forEach(function(d){ batch.delete(d.ref); });
    batch.delete(db.collection('cat_'+cat).doc(id));
    return batch.commit();
  }).then(function(){
    document.getElementById('viewThreadModal').classList.add('hidden');
    if(activeThreadUnsub){ activeThreadUnsub(); activeThreadUnsub=null; }
    activeThread=null;
  });
});

// ── EDIT / DELETE POST (event delegation) ────────────────────
document.getElementById('viewThreadPosts').addEventListener('click',function(e){
  var btn=e.target.closest('[data-action]'); if(!btn) return;
  var action=btn.dataset.action, postId=btn.dataset.id;
  if (!activeThread) return;
  if (action==='del-post') {
    if (!confirm('¿Borrar este mensaje?')) return;
    db.collection('cat_'+activeThread.cat).doc(activeThread.id).collection('posts').doc(postId).delete()
      .then(function(){ db.collection('cat_'+activeThread.cat).doc(activeThread.id).update({ replyCount: firebase.firestore.FieldValue.increment(-1) }); });
  }
  if (action==='edit-post') {
    var postEl=btn.closest('.post-item');
    var contentWrap=postEl.querySelector('.post-content-wrap');
    // Get current raw content from Firestore
    db.collection('cat_'+activeThread.cat).doc(activeThread.id).collection('posts').doc(postId).get().then(function(snap){
      if (!snap.exists) return;
      var raw=snap.data().content;
      var ta=document.createElement('textarea'); ta.value=raw; ta.rows=5; ta.style.cssText='width:100%;background:var(--surface);border:0.5px solid var(--border-strong);border-radius:8px;color:var(--text-1);font-family:var(--font-body);font-size:14px;padding:10px;resize:vertical;outline:none;margin-top:6px;box-sizing:border-box';
      var saveBtn=document.createElement('button'); saveBtn.textContent='Guardar'; saveBtn.className='btn-accent btn-sm'; saveBtn.style.marginTop='6px';
      var cancelBtn=document.createElement('button'); cancelBtn.textContent='Cancelar'; cancelBtn.className='btn-ghost btn-sm'; cancelBtn.style.marginTop='6px';
      contentWrap.innerHTML=''; contentWrap.appendChild(ta); contentWrap.appendChild(saveBtn); contentWrap.appendChild(cancelBtn);
      saveBtn.addEventListener('click',function(){
        var newContent=ta.value.trim(); if(!newContent) return;
        db.collection('cat_'+activeThread.cat).doc(activeThread.id).collection('posts').doc(postId).update({ content:newContent }).then(function(){ contentWrap.innerHTML=bbToHtml(newContent); });
      });
      cancelBtn.addEventListener('click',function(){ contentWrap.innerHTML=bbToHtml(raw); });
    });
  }
});

document.getElementById('closeViewModal').addEventListener('click',function(){
  document.getElementById('viewThreadModal').classList.add('hidden');
  if(activeThreadUnsub){ activeThreadUnsub(); activeThreadUnsub=null; }
  activeThread=null;
  document.getElementById('replyContent').value='';
  document.getElementById('replyPreview').classList.add('hidden');
});
document.getElementById('btnOpenAuthFromThread').addEventListener('click',function(){
  document.getElementById('viewThreadModal').classList.add('hidden');
  document.getElementById('authModal').classList.remove('hidden');
});

// ── REPLY ─────────────────────────────────────────────────────
document.getElementById('btnReply').addEventListener('click',function(){
  if(!currentUser||!activeThread) return;
  var content=document.getElementById('replyContent').value.trim(); if(!content) return;
  var name=currentProfile.displayName||currentUser.displayName||currentUser.email.split('@')[0];
  db.collection('cat_'+activeThread.cat).doc(activeThread.id).collection('posts').add({
    content:content, authorId:currentUser.uid, authorName:name, createdAt:firebase.firestore.FieldValue.serverTimestamp()
  }).then(function(){
    db.collection('cat_'+activeThread.cat).doc(activeThread.id).update({ replyCount:firebase.firestore.FieldValue.increment(1) });
    document.getElementById('replyContent').value='';
    document.getElementById('replyPreview').classList.add('hidden');
  });
});

// ── CREATE THREAD ─────────────────────────────────────────────
document.getElementById('btnNewThread').addEventListener('click',function(){ document.getElementById('newThreadModal').classList.remove('hidden'); });
document.getElementById('closeThreadModal').addEventListener('click',function(){ document.getElementById('newThreadModal').classList.add('hidden'); });
document.getElementById('btnCreateThread').addEventListener('click',function(){
  if(!currentUser) return;
  var cat=document.getElementById('threadCategory').value;
  var title=document.getElementById('threadTitle').value.trim();
  var content=document.getElementById('threadContent').value.trim();
  var err=document.getElementById('threadError'); err.textContent='';
  if(!title){ err.textContent='El título no puede estar vacío.'; return; }
  if(!content){ err.textContent='Escribe al menos un mensaje inicial.'; return; }
  var name=currentProfile.displayName||currentUser.displayName||currentUser.email.split('@')[0];
  var data={ title:title, authorId:currentUser.uid, authorName:name, createdAt:firebase.firestore.FieldValue.serverTimestamp(), replyCount:0, views:0 };
  if(currentProfile.avatarUrl) data.authorAvatarUrl=currentProfile.avatarUrl;
  if(currentProfile.avatarEmoji) data.authorAvatarEmoji=currentProfile.avatarEmoji;
  db.collection('cat_'+cat).add(data).then(function(ref){
    return db.collection('cat_'+cat).doc(ref.id).collection('posts').add({ content:content, authorId:currentUser.uid, authorName:name, createdAt:firebase.firestore.FieldValue.serverTimestamp() });
  }).then(function(){
    document.getElementById('newThreadModal').classList.add('hidden');
    document.getElementById('threadTitle').value=''; document.getElementById('threadContent').value='';
    document.getElementById('threadPreview').classList.add('hidden');
  }).catch(function(e){ err.textContent='Error: '+e.message; });
});

// ── AUTH ──────────────────────────────────────────────────────
document.getElementById('btnOpenAuth').addEventListener('click',function(){ document.getElementById('authModal').classList.remove('hidden'); });
document.querySelectorAll('.auth-tab').forEach(function(tab){
  tab.addEventListener('click',function(){
    document.querySelectorAll('.auth-tab').forEach(function(t){ t.classList.remove('active'); }); tab.classList.add('active');
    var tgt=tab.dataset.tab;
    document.getElementById('loginForm').classList.toggle('hidden',tgt!=='login');
    document.getElementById('registerForm').classList.toggle('hidden',tgt!=='register');
  });
});
document.getElementById('btnLogin').addEventListener('click',function(){
  var email=document.getElementById('loginEmail').value.trim(), pass=document.getElementById('loginPass').value, err=document.getElementById('loginError'); err.textContent='';
  auth.signInWithEmailAndPassword(email,pass).catch(function(e){ err.textContent=friendlyError(e.code); });
});
document.getElementById('btnRegister').addEventListener('click',function(){
  var name=document.getElementById('regName').value.trim(), email=document.getElementById('regEmail').value.trim(), pass=document.getElementById('regPass').value, err=document.getElementById('regError'); err.textContent='';
  if(!name){ err.textContent='El nombre es obligatorio.'; return; }
  auth.createUserWithEmailAndPassword(email,pass)
    .then(function(cred){ return cred.user.updateProfile({displayName:name}).then(function(){ return cred; }); })
    .then(function(cred){ return db.collection('profiles').doc(cred.user.uid).set({ displayName:name, joinedAt:firebase.firestore.FieldValue.serverTimestamp() },{merge:true}); })
    .catch(function(e){ err.textContent=friendlyError(e.code); });
});
document.getElementById('btnLogout').addEventListener('click',function(){ auth.signOut(); });

// ── PROFILE MODAL ─────────────────────────────────────────────
var selAvatarColor=AVATAR_COLORS[0], selAvatarType='initials';
function buildProfileModal() {
  var row=document.getElementById('avatarColorRow'); row.innerHTML='';
  AVATAR_COLORS.forEach(function(c){
    var sw=document.createElement('div'); sw.className='avatar-color-swatch'+(c===selAvatarColor?' selected':''); sw.style.background=c;
    sw.addEventListener('click',function(){ selAvatarColor=c; row.querySelectorAll('.avatar-color-swatch').forEach(function(s){ s.classList.remove('selected'); }); sw.classList.add('selected'); updateProfilePreview(); });
    row.appendChild(sw);
  });
  var grid=document.getElementById('presetGrid'); grid.innerHTML='';
  PRESET_EMOJIS.forEach(function(em){
    var el=document.createElement('div'); el.className='preset-avatar'; el.textContent=em;
    el.addEventListener('click',function(){ grid.querySelectorAll('.preset-avatar').forEach(function(e){ e.classList.remove('selected'); }); el.classList.add('selected'); updateProfilePreview(); });
    grid.appendChild(el);
  });
}
function updateProfilePreview() {
  var pv=document.getElementById('profileAvatarPreview');
  var url=document.getElementById('avatarUrlInput').value.trim();
  var emoji=document.querySelector('.preset-avatar.selected');
  if(selAvatarType==='url'&&url){ pv.innerHTML='<img src="'+escapeAttr(url)+'" alt="av">'; pv.style.background='transparent'; }
  else if(selAvatarType==='preset'&&emoji){ pv.innerHTML='<span style="font-size:36px">'+emoji.textContent+'</span>'; pv.style.background='rgba(255,255,255,0.06)'; }
  else { var n=(document.getElementById('profileName').value.trim()||(currentUser&&currentUser.displayName)||'?'); pv.innerHTML='<span style="font-size:28px;font-weight:800;font-family:var(--font-display)">'+n[0].toUpperCase()+'</span>'; pv.style.background=selAvatarColor+'33'; pv.style.color=selAvatarColor; }
}
document.getElementById('avatarUrlInput').addEventListener('input',updateProfilePreview);
document.getElementById('profileName').addEventListener('input',updateProfilePreview);
document.querySelectorAll('.avatar-tab').forEach(function(tab){
  tab.addEventListener('click',function(){
    document.querySelectorAll('.avatar-tab').forEach(function(t){ t.classList.remove('active'); }); tab.classList.add('active');
    selAvatarType=tab.dataset.avtype;
    document.getElementById('avInitials').classList.toggle('hidden',selAvatarType!=='initials');
    document.getElementById('avUrl').classList.toggle('hidden',selAvatarType!=='url');
    document.getElementById('avPreset').classList.toggle('hidden',selAvatarType!=='preset');
    updateProfilePreview();
  });
});
document.getElementById('btnProfile').addEventListener('click',function(){
  if(!currentUser) return;
  buildProfileModal();
  document.getElementById('profileName').value=currentProfile.displayName||currentUser.displayName||'';
  document.getElementById('profileBio').value=currentProfile.bio||'';
  document.getElementById('profileSig').value=currentProfile.signature||'';
  document.getElementById('avatarUrlInput').value=currentProfile.avatarUrl||'';
  if(currentProfile.avatarColor) selAvatarColor=currentProfile.avatarColor;
  updateProfilePreview();
  document.getElementById('profileModal').classList.remove('hidden');
});
document.getElementById('closeProfileModal').addEventListener('click',function(){ document.getElementById('profileModal').classList.add('hidden'); });
document.getElementById('btnSaveProfile').addEventListener('click',function(){
  if(!currentUser) return;
  var err=document.getElementById('profileError'); err.textContent='';
  var name=document.getElementById('profileName').value.trim();
  var bio=document.getElementById('profileBio').value.trim();
  var sig=document.getElementById('profileSig').value.trim();
  var url=document.getElementById('avatarUrlInput').value.trim();
  var emoji=document.querySelector('.preset-avatar.selected');
  var data={ displayName:name, bio:bio, signature:sig, updatedAt:firebase.firestore.FieldValue.serverTimestamp() };
  if(selAvatarType==='url'&&url){ data.avatarUrl=url; data.avatarEmoji=firebase.firestore.FieldValue.delete(); data.avatarColor=firebase.firestore.FieldValue.delete(); }
  else if(selAvatarType==='preset'&&emoji){ data.avatarEmoji=emoji.textContent; data.avatarUrl=firebase.firestore.FieldValue.delete(); data.avatarColor=firebase.firestore.FieldValue.delete(); }
  else { data.avatarColor=selAvatarColor; data.avatarUrl=firebase.firestore.FieldValue.delete(); data.avatarEmoji=firebase.firestore.FieldValue.delete(); }
  db.collection('profiles').doc(currentUser.uid).set(data,{merge:true}).then(function(){
    currentProfile=Object.assign(currentProfile,data); profileCache[currentUser.uid]=currentProfile;
    if(name) currentUser.updateProfile({displayName:name});
    updateNavAvatar(); document.getElementById('profileModal').classList.add('hidden');
  }).catch(function(e){ err.textContent='Error: '+e.message; });
});

// ── PUBLIC PROFILE PAGE ───────────────────────────────────────
function openPublicProfile(uid, fallbackName) {
  if (!uid) return;
  var modal=document.getElementById('publicProfileModal');
  modal.classList.remove('hidden');
  // Reset
  document.getElementById('pubName').textContent='Cargando...';
  document.getElementById('pubBio').textContent='';
  document.getElementById('pubRoleBadge').textContent='';
  document.getElementById('pubJoined').textContent='';
  document.getElementById('pubThreadsList').innerHTML='<div class="pub-empty">Cargando...</div>';
  document.getElementById('pubSigWrap').classList.add('hidden');
  document.getElementById('pubAvatar').innerHTML='';
  document.getElementById('pubThreadCount').textContent='0';
  document.getElementById('pubPostCount').textContent='0';

  getProfile(uid).then(function(prof){
    var name=prof.displayName||fallbackName||'Usuario';
    document.getElementById('pubName').textContent=name;
    document.getElementById('pubBio').textContent=prof.bio||'';

    // Avatar
    var av=document.getElementById('pubAvatar');
    av.style.background=avatarBg(prof); av.style.color=avatarColor(prof);
    av.innerHTML=renderAvatarEl(prof,80);

    // Role badge
    var roleEl=document.getElementById('pubRoleBadge');
    if(isAdmin(prof)){ roleEl.className='badge-admin'; roleEl.textContent='⚡ Admin'; }
    else { roleEl.className='pub-badge'; roleEl.style.background='rgba(124,111,255,0.15)'; roleEl.style.color='#a89ff0'; roleEl.textContent='Miembro'; }

    // Join date
    if(prof.joinedAt){ document.getElementById('pubJoined').textContent='Miembro desde '+formatDate(prof.joinedAt); }

    // Signature
    if(prof.signature){ document.getElementById('pubSigWrap').classList.remove('hidden'); document.getElementById('pubSignature').innerHTML=bbToHtml(prof.signature); }

    // Count threads and posts
    var threadCount=0, postCount=0;
    var promises=[];
    CATS.forEach(function(cat){
      promises.push(
        db.collection('cat_'+cat).where('authorId','==',uid).get().then(function(snap){
          threadCount+=snap.size;
          // Count posts in each thread
          var pps=snap.docs.map(function(d){
            return db.collection('cat_'+cat).doc(d.id).collection('posts').where('authorId','==',uid).get().then(function(ps){ postCount+=ps.size; });
          });
          return Promise.all(pps);
        })
      );
    });
    Promise.all(promises).then(function(){
      document.getElementById('pubThreadCount').textContent=threadCount;
      document.getElementById('pubPostCount').textContent=postCount;
    });

    // Last threads across all categories
    var allUserThreads=[];
    var catPromises=CATS.map(function(cat){
      return db.collection('cat_'+cat).where('authorId','==',uid).orderBy('createdAt','desc').limit(5).get().then(function(snap){
        snap.forEach(function(d){ allUserThreads.push(Object.assign({id:d.id,cat:cat},d.data())); });
      });
    });
    Promise.all(catPromises).then(function(){
      allUserThreads.sort(function(a,b){ return (b.createdAt?b.createdAt.toMillis():0)-(a.createdAt?a.createdAt.toMillis():0); });
      var shown=allUserThreads.slice(0,6);
      var listEl=document.getElementById('pubThreadsList');
      if(shown.length===0){ listEl.innerHTML='<div class="pub-empty">Sin hilos publicados.</div>'; return; }
      listEl.innerHTML=shown.map(function(t){
        return '<div class="pub-thread-row" data-id="'+t.id+'" data-cat="'+t.cat+'">'+
          '<div class="t-title">'+escapeHtml(t.title)+'</div>'+
          '<div class="t-meta">'+CAT_LABELS[t.cat]+' · '+timeAgo(t.createdAt)+' · 💬 '+(t.replyCount||0)+'</div>'+
        '</div>';
      }).join('');
      listEl.querySelectorAll('.pub-thread-row').forEach(function(row){
        row.addEventListener('click',function(){
          document.getElementById('publicProfileModal').classList.add('hidden');
          openThread(row.dataset.id,row.dataset.cat);
        });
      });
    });
  });
}

document.getElementById('closePublicProfile').addEventListener('click',function(){ document.getElementById('publicProfileModal').classList.add('hidden'); });

// ── CAT FILTER ────────────────────────────────────────────────
document.querySelectorAll('.cat-pill').forEach(function(pill){
  pill.addEventListener('click',function(){
    document.querySelectorAll('.cat-pill').forEach(function(p){ p.classList.remove('active'); }); pill.classList.add('active');
    var filter=pill.dataset.cat;
    document.querySelectorAll('.cat-block').forEach(function(block){ block.classList.toggle('hidden',filter!=='all'&&block.dataset.category!==filter); });
  });
});

// ── SEARCH ────────────────────────────────────────────────────
document.getElementById('searchInput').addEventListener('input',function(e){
  currentSearch=e.target.value.toLowerCase().trim();
  CATS.forEach(function(cat){ renderThreads(cat,allThreads[cat]); });
});

// ── HELPERS ───────────────────────────────────────────────────
function timeAgo(ts) {
  if(!ts) return 'ahora';
  var d=(Date.now()-ts.toMillis())/1000;
  if(d<60) return 'ahora mismo';
  if(d<3600) return 'hace '+Math.floor(d/60)+'min';
  if(d<86400) return 'hace '+Math.floor(d/3600)+'h';
  return 'hace '+Math.floor(d/86400)+'d';
}
function formatDate(ts) {
  if(!ts) return '';
  var d=new Date(ts.toMillis());
  return d.toLocaleDateString('es-ES',{year:'numeric',month:'long'});
}
function escapeHtml(str) { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function escapeAttr(str) { return String(str).replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function friendlyError(code) {
  var m={'auth/invalid-email':'Correo no válido.','auth/user-not-found':'Usuario no encontrado.','auth/wrong-password':'Contraseña incorrecta.','auth/email-already-in-use':'El correo ya está registrado.','auth/weak-password':'La contraseña debe tener al menos 6 caracteres.','auth/invalid-credential':'Credenciales incorrectas.'};
  return m[code]||'Error: '+code;
}
