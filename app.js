// ============================================================
// TETRIS ONLINE — Firebase Realtime Database
// ============================================================
// 1) Crea un proyecto en https://console.firebase.google.com
// 2) Activa "Realtime Database" (modo de prueba para empezar).
// 3) Copia tu config web aquí abajo.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase, ref, set, update, remove, onValue, onDisconnect, push, serverTimestamp, off
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ⚠️ SUSTITUYE ESTOS VALORES POR LOS DE TU PROYECTO FIREBASE
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  databaseURL: "https://TU_PROYECTO-default-rtdb.firebaseio.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "XXXXXXXX",
  appId: "1:XXXX:web:YYYY"
};

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

// ============================================================
// CONFIG TETRIS
// ============================================================
const COLS = 10, ROWS = 20, BLOCK = 24;
const COLORS = {
  0: "#05080f",
  I: "#4ad6ff", O: "#ffd24a", T: "#c87aff",
  S: "#5dd58a", Z: "#ff6b7a", J: "#5d8eff", L: "#ffae5d"
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
let username, roomCode, playerId;
let board, current, next, score, lines, gameOver;
let dropCounter = 0, dropInterval = 800, lastTime = 0;
let unsubscribers = [];

// DOM
const $ = (id) => document.getElementById(id);
const loginEl = $("login");
const gameEl = $("game");
const boardCanvas = $("board");
const ctx = boardCanvas.getContext("2d");
const nextCanvas = $("next");
const nctx = nextCanvas.getContext("2d");

// ============================================================
// LOGIN
// ============================================================
$("joinBtn").addEventListener("click", join);
$("roomcode").addEventListener("keydown", (e) => { if (e.key === "Enter") join(); });

function sanitize(s) { return s.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 16); }

async function join() {
  const u = sanitize($("username").value.trim());
  const r = sanitize($("roomcode").value.trim().toUpperCase());
  if (!u || !r) { alert("Rellena nombre y código de sala"); return; }
  username = u; roomCode = r;
  playerId = "p_" + Math.random().toString(36).slice(2, 10);

  loginEl.classList.add("hidden");
  gameEl.classList.remove("hidden");
  $("roomName").textContent = roomCode;
  $("playerName").textContent = username;

  const playerRef = ref(db, `rooms/${roomCode}/players/${playerId}`);
  await set(playerRef, {
    name: username, score: 0, lines: 0, gameOver: false,
    board: emptyBoardString(), joinedAt: serverTimestamp()
  });
  onDisconnect(playerRef).remove();

  // Mensaje de sistema
  pushChat(`🟢 ${username} se ha unido a la sala`, true);

  startGame();
  subscribeOpponents();
  subscribeChat();
}

$("leaveBtn").addEventListener("click", () => {
  cleanup();
  location.reload();
});

window.addEventListener("beforeunload", cleanup);

function cleanup() {
  if (playerId && roomCode) {
    remove(ref(db, `rooms/${roomCode}/players/${playerId}`));
  }
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
  }
}
function drop() {
  if (collide(current, 0, 1)) {
    merge(); clearLines();
    current = next; next = newPiece();
    if (collide(current)) {
      gameOver = true;
      $("gameOver").classList.remove("hidden");
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
  drop();
}

document.addEventListener("keydown", (e) => {
  if (loginEl && !loginEl.classList.contains("hidden")) return;
  if (gameOver) {
    if (e.key.toLowerCase() === "r") startGame();
    return;
  }
  switch (e.key) {
    case "ArrowLeft":  if (!collide(current, -1, 0)) current.x--; break;
    case "ArrowRight": if (!collide(current,  1, 0)) current.x++; break;
    case "ArrowDown":  drop(); dropCounter = 0; break;
    case "ArrowUp": {
      const r = rotate(current.shape);
      if (!collide(current, 0, 0, r)) current.shape = r;
      break;
    }
    case " ": e.preventDefault(); hardDrop(); break;
  }
});

// ============================================================
// DIBUJO
// ============================================================
function drawCell(c, x, y, key, size=BLOCK) {
  c.fillStyle = COLORS[key] || "#888";
  c.fillRect(x*size, y*size, size, size);
  c.strokeStyle = "rgba(0,0,0,.35)";
  c.strokeRect(x*size, y*size, size, size);
}
function draw() {
  ctx.fillStyle = "#05080f";
  ctx.fillRect(0,0,boardCanvas.width, boardCanvas.height);
  for (let y=0;y<ROWS;y++) for (let x=0;x<COLS;x++) if (board[y][x]) drawCell(ctx,x,y,board[y][x]);
  if (!gameOver) current.shape.forEach((row,y)=>row.forEach((v,x)=>{
    if (v) drawCell(ctx, current.x+x, current.y+y, current.key);
  }));
  // next
  nctx.fillStyle = "#05080f";
  nctx.fillRect(0,0,nextCanvas.width, nextCanvas.height);
  const s = next.shape;
  const off = { x: Math.floor((4 - s[0].length)/2), y: Math.floor((4 - s.length)/2) };
  s.forEach((row,y)=>row.forEach((v,x)=>{ if (v) drawCell(nctx, off.x+x, off.y+y, next.key, 24); }));
}

function updateUI() {
  $("score").textContent = score;
  $("lines").textContent = lines;
}

// ============================================================
// SINCRONIZACIÓN CON FIREBASE
// ============================================================
let lastSync = 0;
function syncToFirebase() {
  // Compactamos el board como string para reducir tráfico.
  const snapshot = board.map(row =>
    row.map(v => v === 0 ? "0" : v).join("")
  ).join("");
  // Añadimos pieza actual al snapshot mostrado a oponentes.
  const display = renderToString();
  update(ref(db, `rooms/${roomCode}/players/${playerId}`), {
    score, lines, gameOver, board: display
  });
}
function renderToString() {
  // Copia del tablero con pieza actual incrustada (solo para mostrar).
  const tmp = board.map(r => r.slice());
  if (!gameOver) current.shape.forEach((row,y)=>row.forEach((v,x)=>{
    const ny = current.y+y, nx = current.x+x;
    if (v && ny>=0 && ny<ROWS && nx>=0 && nx<COLS) tmp[ny][nx] = current.key;
  }));
  return tmp.map(r => r.map(v => v===0 ? "0" : v).join("")).join("|");
}

// Tick de sincronización ~5 veces por segundo (movimientos suaves)
setInterval(() => {
  if (!playerId || !roomCode) return;
  syncToFirebase();
}, 200);

// ============================================================
// OPONENTES
// ============================================================
function subscribeOpponents() {
  const playersRef = ref(db, `rooms/${roomCode}/players`);
  const cb = (snap) => {
    const players = snap.val() || {};
    renderOpponents(players);
  };
  onValue(playersRef, cb);
  unsubscribers.push(() => off(playersRef, "value", cb));
}

function renderOpponents(players) {
  const list = $("opponentsList");
  list.innerHTML = "";
  Object.entries(players).forEach(([pid, p]) => {
    if (pid === playerId) return;
    const div = document.createElement("div");
    div.className = "opponent";
    div.innerHTML = `
      <div class="name">${escapeHtml(p.name)}</div>
      <canvas width="${COLS*8}" height="${ROWS*8}"></canvas>
      <div class="meta">${p.score||0} pts · ${p.lines||0} L ${p.gameOver?"💀":""}</div>
    `;
    list.appendChild(div);
    drawMini(div.querySelector("canvas"), p.board);
  });
}

function drawMini(canvas, boardStr) {
  const c = canvas.getContext("2d");
  const cell = 8;
  c.fillStyle = "#05080f";
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
    text: text.slice(0, 200),
    system,
    ts: serverTimestamp()
  });
}

function subscribeChat() {
  const msgsRef = ref(db, `rooms/${roomCode}/messages`);
  const box = $("messages");
  const cb = (snap) => {
    const msgs = snap.val() || {};
    const ordered = Object.values(msgs).sort((a,b) => (a.ts||0)-(b.ts||0));
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
