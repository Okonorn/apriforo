// ============================================================
// POKÉTRIS ONLINE — Firebase Realtime Database
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase, ref, set, update, remove, onValue, onDisconnect, push, serverTimestamp, off
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDJJZATFBO5br9CqxFxnj7P6xURYkCn624",
  authDomain: "chat-59e19.firebaseapp.com",
  databaseURL: "https://chat-59e19-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "chat-59e19",
  storageBucket: "chat-59e19.firebasestorage.app",
  messagingSenderId: "877641155672",
  appId: "1:877641155672:web:6ba954de042ec7860ef62d"
};

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

// ============================================================
// AVATARES POKÉMON (sprites oficiales de PokeAPI)
// ============================================================
const POKE_SPRITE = (id) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
const AVATAR_IDS = [25,1,4,7,133,143,150,94,131,149,448,151];

// ============================================================
// AUDIO (WebAudio sintético — sin archivos externos)
// ============================================================
const Sound = (() => {
  let ctx = null, muted = false;
  const init = () => { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); };
  const tone = (freq, dur=0.08, type="square", vol=0.08) => {
    if (muted) return; init();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + dur);
  };
  return {
    move:   () => tone(220, 0.04, "square", 0.04),
    rotate: () => tone(440, 0.06, "triangle", 0.05),
    drop:   () => tone(160, 0.10, "sawtooth", 0.06),
    lock:   () => { tone(330,0.05); setTimeout(()=>tone(220,0.05),50); },
    line:   () => { [523,659,784,1046].forEach((f,i)=>setTimeout(()=>tone(f,0.10,"square",0.07),i*60)); },
    over:   () => { [400,330,260,180].forEach((f,i)=>setTimeout(()=>tone(f,0.18,"sawtooth",0.08),i*120)); },
    chat:   () => tone(880, 0.05, "sine", 0.04),
    join:   () => { [523,784].forEach((f,i)=>setTimeout(()=>tone(f,0.08,"triangle",0.06),i*80)); },
    toggle: () => { muted = !muted; return muted; },
    isMuted:() => muted,
  };
})();

// ============================================================
// CONFIG TETRIS
// ============================================================
const COLS = 10, ROWS = 20, BLOCK = 24;
const COLORS = {
  0: "#05060f",
  I: "#22d3ee", O: "#ffd24a", T: "#c87aff",
  S: "#4ade80", Z: "#ff5e7a", J: "#7c5cff", L: "#ffae5d"
};
const SHAPES = {
  I: [[1,1,1,1]],
  O: [[1,1],[1,1]],
  T: [[0,1,0],[1,1,1]],
  S: [[0,1,1],[1,1,0]],
  Z: [[1,1,0],[0,1,1]],
  J: [[1,0,0],[1,1,1]],
  L: [[0,0,1],[1,1,1]]
};
const KEYS = Object.keys(SHAPES);

// ============================================================
// ESTADO
// ============================================================
let username, roomCode, playerId, avatarId = 25;
let board, current, next, score, lines, gameOver;
let dropCounter = 0, dropInterval = 800, lastTime = 0;
let unsubscribers = [];

const $ = (id) => document.getElementById(id);
const loginEl = $("login");
const gameEl = $("game");
const boardCanvas = $("board");
const ctx = boardCanvas.getContext("2d");
const nextCanvas = $("next");
const nctx = nextCanvas.getContext("2d");

// ============================================================
// LOGIN + AVATARES
// ============================================================
function buildAvatars() {
  const grid = $("avatarGrid");
  AVATAR_IDS.forEach(id => {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.id = id;
    b.innerHTML = `<img src="${POKE_SPRITE(id)}" alt="poke-${id}" loading="lazy"/>`;
    if (id === avatarId) b.classList.add("selected");
    b.addEventListener("click", () => {
      avatarId = id;
      grid.querySelectorAll("button").forEach(x=>x.classList.remove("selected"));
      b.classList.add("selected");
      Sound.rotate();
    });
    grid.appendChild(b);
  });
}
buildAvatars();

$("joinBtn").addEventListener("click", join);
$("roomcode").addEventListener("keydown", (e) => { if (e.key === "Enter") join(); });
$("muteBtn").addEventListener("click", () => {
  const m = Sound.toggle();
  $("muteBtn").textContent = m ? "🔇" : "🔊";
});

function sanitize(s) { return s.replace(/[^a-zA-Z0-9_\- ]/g, "").slice(0, 16); }

async function join() {
  const u = sanitize($("username").value.trim());
  const r = sanitize($("roomcode").value.trim().toUpperCase()).replace(/\s/g,"");
  if (!u || !r) { alert("Rellena nombre y código de sala"); return; }
  username = u; roomCode = r;
  playerId = "p_" + Math.random().toString(36).slice(2, 10);

  loginEl.classList.add("hidden");
  gameEl.classList.remove("hidden");
  $("roomName").textContent = roomCode;
  $("playerName").textContent = username;
  $("myAvatar").src = POKE_SPRITE(avatarId);

  const playerRef = ref(db, `rooms/${roomCode}/players/${playerId}`);
  await set(playerRef, {
    name: username, avatar: avatarId, score: 0, lines: 0, gameOver: false,
    board: emptyBoardString(), joinedAt: serverTimestamp()
  });
  onDisconnect(playerRef).remove();

  pushChat(`🟢 ${username} se ha unido a la sala`, true);
  Sound.join();

  startGame();
  subscribeOpponents();
  subscribeChat();
}

$("leaveBtn").addEventListener("click", () => { cleanup(); location.reload(); });
window.addEventListener("beforeunload", cleanup);

function cleanup() {
  if (playerId && roomCode) remove(ref(db, `rooms/${roomCode}/players/${playerId}`));
  unsubscribers.forEach(fn => fn());
  unsubscribers = [];
}

// ============================================================
// JUEGO
// ============================================================
function emptyBoard() { return Array.from({length: ROWS}, () => Array(COLS).fill(0)); }
function emptyBoardString() { return "0".repeat(ROWS * COLS); }

function newPiece() {
  const k = KEYS[Math.floor(Math.random() * KEYS.length)];
  const shape = SHAPES[k].map(row => row.slice());
  return { key: k, shape, x: Math.floor((COLS - shape[0].length)/2), y: 0 };
}

function startGame() {
  board = emptyBoard();
  current = newPiece(); next = newPiece();
  score = 0; lines = 0; gameOver = false;
  dropInterval = 800;
  $("gameOver").classList.add("hidden");
  updateUI();
  requestAnimationFrame(loop);
}

function loop(time = 0) {
  const delta = time - lastTime; lastTime = time;
  if (!gameOver) {
    dropCounter += delta;
    if (dropCounter > dropInterval) { drop(); dropCounter = 0; }
  }
  draw();
  requestAnimationFrame(loop);
}

function collide(piece, dx=0, dy=0, shape=piece.shape) {
  for (let y=0; y<shape.length; y++) for (let x=0; x<shape[y].length; x++) {
    if (!shape[y][x]) continue;
    const nx = piece.x + x + dx, ny = piece.y + y + dy;
    if (nx<0||nx>=COLS||ny>=ROWS) return true;
    if (ny>=0 && board[ny][nx]) return true;
  }
  return false;
}
function merge() {
  current.shape.forEach((row,y)=>row.forEach((v,x)=>{
    if (v && current.y+y >= 0) board[current.y+y][current.x+x] = current.key;
  }));
}
function rotate(shape) {
  const N = shape.length, M = shape[0].length;
  const r = Array.from({length:M},()=>Array(N).fill(0));
  for (let y=0;y<N;y++) for (let x=0;x<M;x++) r[x][N-1-y] = shape[y][x];
  return r;
}
function clearLines() {
  let cleared = 0;
  for (let y=ROWS-1; y>=0; y--) {
    if (board[y].every(v=>v)) { board.splice(y,1); board.unshift(Array(COLS).fill(0)); cleared++; y++; }
  }
  if (cleared) {
    const pts = [0,40,100,300,1200][cleared] || 0;
    score += pts; lines += cleared;
    dropInterval = Math.max(120, 800 - Math.floor(lines/10) * 60);
    Sound.line();
  }
}
function drop() {
  if (collide(current, 0, 1)) {
    merge(); clearLines();
    Sound.lock();
    current = next; next = newPiece();
    if (collide(current)) {
      gameOver = true;
      $("gameOver").classList.remove("hidden");
      Sound.over();
      pushChat(`💀 ${username} ha perdido (${score} pts)`, true);
    }
    syncToFirebase();
    updateUI();
  } else {
    current.y++;
  }
}
function hardDrop() {
  while (!collide(current, 0, 1)) current.y++;
  Sound.drop();
  drop();
}

document.addEventListener("keydown", (e) => {
  if (loginEl && !loginEl.classList.contains("hidden")) return;
  if (document.activeElement && document.activeElement.tagName === "INPUT") return;
  if (gameOver) {
    if (e.key.toLowerCase() === "r") startGame();
    return;
  }
  switch (e.key) {
    case "ArrowLeft":  if (!collide(current, -1, 0)) { current.x--; Sound.move(); } break;
    case "ArrowRight": if (!collide(current,  1, 0)) { current.x++; Sound.move(); } break;
    case "ArrowDown":  drop(); dropCounter = 0; break;
    case "ArrowUp": {
      const r = rotate(current.shape);
      if (!collide(current, 0, 0, r)) { current.shape = r; Sound.rotate(); }
      break;
    }
    case " ": e.preventDefault(); hardDrop(); break;
  }
});

// ============================================================
// DIBUJO con efecto glow
// ============================================================
function drawCell(c, x, y, key, size=BLOCK) {
  const col = COLORS[key] || "#888";
  const px = x*size, py = y*size;
  const grad = c.createLinearGradient(px, py, px+size, py+size);
  grad.addColorStop(0, col);
  grad.addColorStop(1, shade(col, -25));
  c.fillStyle = grad;
  c.fillRect(px, py, size, size);
  // highlight
  c.fillStyle = "rgba(255,255,255,.18)";
  c.fillRect(px, py, size, 2);
  c.fillRect(px, py, 2, size);
  // border
  c.strokeStyle = "rgba(0,0,0,.45)";
  c.strokeRect(px+.5, py+.5, size-1, size-1);
}
function shade(hex, percent) {
  const n = hex.replace("#","");
  const num = parseInt(n,16);
  let r = (num>>16)+percent, g=((num>>8)&0xff)+percent, b=(num&0xff)+percent;
  r=Math.max(0,Math.min(255,r)); g=Math.max(0,Math.min(255,g)); b=Math.max(0,Math.min(255,b));
  return "#"+((r<<16)|(g<<8)|b).toString(16).padStart(6,"0");
}
function drawGrid(c, w, h, size) {
  c.strokeStyle = "rgba(255,255,255,.04)";
  c.lineWidth = 1;
  for (let x=0;x<=w;x+=size){ c.beginPath(); c.moveTo(x,0); c.lineTo(x,h); c.stroke(); }
  for (let y=0;y<=h;y+=size){ c.beginPath(); c.moveTo(0,y); c.lineTo(w,y); c.stroke(); }
}
function draw() {
  ctx.fillStyle = "#05060f";
  ctx.fillRect(0,0,boardCanvas.width, boardCanvas.height);
  drawGrid(ctx, boardCanvas.width, boardCanvas.height, BLOCK);
  for (let y=0;y<ROWS;y++) for (let x=0;x<COLS;x++) if (board[y][x]) drawCell(ctx,x,y,board[y][x]);
  // ghost piece
  if (!gameOver) {
    let gy = 0; while (!collide(current, 0, gy+1)) gy++;
    ctx.globalAlpha = 0.22;
    current.shape.forEach((row,y)=>row.forEach((v,x)=>{
      if (v) drawCell(ctx, current.x+x, current.y+y+gy, current.key);
    }));
    ctx.globalAlpha = 1;
    current.shape.forEach((row,y)=>row.forEach((v,x)=>{
      if (v) drawCell(ctx, current.x+x, current.y+y, current.key);
    }));
  }
  // next
  nctx.fillStyle = "#05060f";
  nctx.fillRect(0,0,nextCanvas.width, nextCanvas.height);
  const s = next.shape;
  const off = { x: Math.floor((4 - s[0].length)/2), y: Math.floor((4 - s.length)/2) };
  s.forEach((row,y)=>row.forEach((v,x)=>{ if (v) drawCell(nctx, off.x+x, off.y+y, next.key, 22); }));
}

function updateUI() {
  $("score").textContent = score;
  $("lines").textContent = lines;
}

// ============================================================
// SINCRONIZACIÓN
// ============================================================
function syncToFirebase() {
  const display = renderToString();
  update(ref(db, `rooms/${roomCode}/players/${playerId}`), {
    score, lines, gameOver, board: display, avatar: avatarId, name: username
  });
}
function renderToString() {
  const tmp = board.map(r => r.slice());
  if (!gameOver) current.shape.forEach((row,y)=>row.forEach((v,x)=>{
    const ny = current.y+y, nx = current.x+x;
    if (v && ny>=0 && ny<ROWS && nx>=0 && nx<COLS) tmp[ny][nx] = current.key;
  }));
  return tmp.map(r => r.map(v => v===0 ? "0" : v).join("")).join("|");
}
setInterval(() => {
  if (!playerId || !roomCode) return;
  syncToFirebase();
}, 200);

// ============================================================
// OPONENTES
// ============================================================
function subscribeOpponents() {
  const playersRef = ref(db, `rooms/${roomCode}/players`);
  const cb = (snap) => renderOpponents(snap.val() || {});
  onValue(playersRef, cb);
  unsubscribers.push(() => off(playersRef, "value", cb));
}

function renderOpponents(players) {
  const list = $("opponentsList");
  list.innerHTML = "";
  const others = Object.entries(players).filter(([pid]) => pid !== playerId);
  if (!others.length) {
    list.innerHTML = `<div style="color:var(--muted);font-size:12px;text-align:center;padding:20px">Esperando rivales...<br>Comparte el código <b>${roomCode}</b></div>`;
    return;
  }
  others.forEach(([pid, p]) => {
    const div = document.createElement("div");
    div.className = "opponent" + (p.gameOver ? " dead" : "");
    div.innerHTML = `
      <img src="${POKE_SPRITE(p.avatar || 25)}" alt=""/>
      <div class="info">
        <div class="row">
          <span class="name">${escapeHtml(p.name)}</span>
          <span class="meta">${p.gameOver?"💀":""}</span>
        </div>
        <canvas width="${COLS*8}" height="${ROWS*8}"></canvas>
        <div class="row">
          <span class="meta">⭐ ${p.score||0}</span>
          <span class="meta">📏 ${p.lines||0}</span>
        </div>
      </div>
    `;
    list.appendChild(div);
    drawMini(div.querySelector("canvas"), p.board);
  });
}

function drawMini(canvas, boardStr) {
  const c = canvas.getContext("2d");
  const cell = 8;
  c.fillStyle = "#05060f";
  c.fillRect(0,0,canvas.width, canvas.height);
  if (!boardStr) return;
  const rows = boardStr.includes("|") ? boardStr.split("|") : chunk(boardStr, COLS);
  rows.forEach((row,y) => {
    for (let x=0; x<row.length; x++) {
      const v = row[x];
      if (v && v !== "0") {
        c.fillStyle = COLORS[v] || "#888";
        c.fillRect(x*cell, y*cell, cell, cell);
      }
    }
  });
}
function chunk(str, n) {
  const out=[]; for (let i=0; i<str.length; i+=n) out.push(str.slice(i,i+n)); return out;
}

// ============================================================
// CHAT
// ============================================================
$("chatForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const txt = $("chatInput").value.trim();
  if (!txt) return;
  pushChat(txt, false);
  $("chatInput").value = "";
});

function pushChat(text, system=false) {
  const msgRef = push(ref(db, `rooms/${roomCode}/messages`));
  set(msgRef, {
    user: system ? "" : username,
    avatar: system ? null : avatarId,
    text: text.slice(0, 200),
    system,
    ts: serverTimestamp()
  });
}

let lastMsgCount = 0;
function subscribeChat() {
  const msgsRef = ref(db, `rooms/${roomCode}/messages`);
  const box = $("messages");
  const cb = (snap) => {
    const msgs = snap.val() || {};
    const ordered = Object.values(msgs).sort((a,b) => (a.ts||0)-(b.ts||0));
    if (ordered.length > lastMsgCount && lastMsgCount !== 0) Sound.chat();
    lastMsgCount = ordered.length;
    box.innerHTML = "";
    ordered.slice(-100).forEach(m => {
      const div = document.createElement("div");
      div.className = "msg" + (m.system ? " system" : "");
      div.innerHTML = m.system
        ? escapeHtml(m.text)
        : `<span class="u">${escapeHtml(m.user)}:</span> ${escapeHtml(m.text)}`;
      box.appendChild(div);
    });
    box.scrollTop = box.scrollHeight;
  };
  onValue(msgsRef, cb);
  unsubscribers.push(() => off(msgsRef, "value", cb));
}

function escapeHtml(s="") {
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[c]));
}
