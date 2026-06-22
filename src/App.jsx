import React, { useState, useEffect, useMemo, useRef } from "react";
import { Crown, RotateCcw, ChevronLeft, Trophy, Download, Upload, Trash2, ClipboardCopy } from "lucide-react";

/* ------------------------------------------------------------------ *
 * Thirteen — scorecard for the card game 13, where a different
 * rank is wild each of the 13 rounds (A,2,3 … K) plus jokers always.
 * Lowest total after 13 rounds wins. Each round's high scorer deals
 * the next round.
 * ------------------------------------------------------------------ */

const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const RANK_NAMES = {
  A: "Aces", 2: "Twos", 3: "Threes", 4: "Fours", 5: "Fives", 6: "Sixes",
  7: "Sevens", 8: "Eights", 9: "Nines", 10: "Tens", J: "Jacks", Q: "Queens", K: "Kings",
};
const SUITS = ["♠", "♥", "♦", "♣"];
const isRed = (s) => s === "♥" || s === "♦";
const STORAGE_KEY = "thirteen:game:v1";
const HISTORY_KEY = "thirteen:history:v1";

const ordinal = (n) => {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const newId = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,900&family=Archivo:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

.t13 { --ink:#14110E; --ink2:#1E1A16; --ink3:#2A241D; --bone:#EFE7D6; --bone2:#E3D9C4;
  --line:#CBBEA2; --line-soft:#3A332B; --oxblood:#A32638; --oxblood-d:#7C1C2A;
  --brass:#C7A24A; --brass-d:#9A7C2F; --muted:#9A8F7E; --ink-on-bone:#241F19;
  font-family:'Archivo',system-ui,sans-serif; color:var(--bone);
  min-height:100vh; min-height:100dvh; background:
    radial-gradient(120% 90% at 50% -10%, #221C16 0%, var(--ink) 55%, #100D0B 100%);
  -webkit-font-smoothing:antialiased; }
.t13 *{ box-sizing:border-box; }
.t13-wrap{ max-width:780px; margin:0 auto; padding:22px 16px 64px; }

.t13-mast{ display:flex; align-items:flex-end; justify-content:space-between; gap:12px;
  border-bottom:1px solid var(--line-soft); padding-bottom:14px; margin-bottom:20px; }
.t13-title{ font-family:'Fraunces',serif; font-weight:900; font-size:40px; line-height:.9;
  letter-spacing:-.01em; margin:0; }
.t13-title small{ display:block; font-family:'Archivo'; font-weight:500; font-size:11px;
  letter-spacing:.22em; text-transform:uppercase; color:var(--muted); margin-top:8px; }
.t13-suits{ font-size:22px; letter-spacing:2px; }
.t13-suits .r{ color:var(--oxblood); } .t13-suits .b{ color:var(--bone2); }

/* setup */
.t13-panel{ background:var(--ink2); border:1px solid var(--line-soft); border-radius:14px; padding:20px; }
.t13-h{ font-family:'Fraunces',serif; font-weight:600; font-size:18px; margin:0 0 4px; }
.t13-sub{ color:var(--muted); font-size:13px; margin:0 0 18px; }
.t13-countrow{ display:flex; gap:8px; flex-wrap:wrap; margin-bottom:18px; }
.t13-count{ width:42px; height:42px; border-radius:10px; border:1px solid var(--line-soft);
  background:var(--ink3); color:var(--bone); font-family:'DM Mono'; font-size:16px; cursor:pointer;
  transition:transform .12s, border-color .12s, background .12s; }
.t13-count:hover{ border-color:var(--brass-d); }
.t13-count.on{ background:var(--brass); color:#1a1510; border-color:var(--brass); font-weight:500; }
.t13-names{ display:grid; gap:9px; margin-bottom:20px; }
.t13-nrow{ display:flex; align-items:center; gap:10px; }
.t13-seat{ font-family:'DM Mono'; font-size:12px; color:var(--muted); width:20px; text-align:right; }
.t13-input{ flex:1; background:var(--ink); border:1px solid var(--line-soft); color:var(--bone);
  border-radius:9px; padding:11px 13px; font-family:'Archivo'; font-size:16px; outline:none;
  transition:border-color .12s; }
.t13-input:focus{ border-color:var(--brass); }
.t13-input::placeholder{ color:#6a6052; }

.t13-btn{ width:100%; border:none; cursor:pointer; border-radius:10px; padding:13px;
  font-family:'Archivo'; font-weight:600; font-size:15px; letter-spacing:.01em;
  background:var(--oxblood); color:#fff; transition:background .12s, transform .08s; }
.t13-btn:hover{ background:var(--oxblood-d); }
.t13-btn:active{ transform:translateY(1px); }
.t13-btn[disabled]{ opacity:.4; cursor:not-allowed; }

/* standings rail */
.t13-rail{ display:flex; flex-wrap:wrap; gap:8px; padding:2px 0 8px; margin-bottom:14px; }
.t13-chip{ flex:1 1 90px; min-width:0; background:var(--ink2); border:1px solid var(--line-soft);
  border-radius:12px; padding:10px 12px; position:relative; }
.t13-chip.lead{ border-color:var(--brass); }
.t13-chip.last{ border-color:var(--oxblood-d); }
.t13-chip .nm{ font-size:12px; color:var(--muted); white-space:nowrap; max-width:120px;
  overflow:hidden; text-overflow:ellipsis; display:flex; align-items:center; gap:5px; }
.t13-chip .tot{ font-family:'DM Mono'; font-size:26px; margin-top:2px; line-height:1; }
.t13-chip.lead .tot{ color:var(--brass); }
.t13-chip.last .tot{ color:var(--oxblood); }
.t13-crown{ color:var(--brass); }
.t13-rank{ font-family:'DM Mono'; font-size:10px; color:var(--muted); background:var(--ink3);
  border:1px solid var(--line-soft); border-radius:5px; padding:1px 5px; flex:none; }
.t13-chip.lead .t13-rank{ color:var(--brass); border-color:var(--brass-d); }
.t13-chip.last .t13-rank{ color:var(--oxblood); border-color:var(--oxblood-d); }
.t13-poop{ font-size:12px; line-height:1; flex:none; }

.t13-banner{ display:flex; align-items:center; gap:9px; background:var(--ink2);
  border:1px solid var(--line-soft); border-left:3px solid var(--brass); border-radius:10px;
  padding:11px 14px; margin-bottom:16px; font-size:14px; }
.t13-banner b{ font-weight:600; }
.t13-banner .pip{ color:var(--brass); font-size:16px; }

/* scorecard */
.t13-card{ background:var(--bone); border-radius:14px; padding:6px; overflow:visible;
  box-shadow:0 18px 40px -18px rgba(0,0,0,.7); }
.t13-grid{ display:grid; width:100%; }
.t13-cell{ border-bottom:1px solid var(--line); display:flex; align-items:center;
  justify-content:center; min-height:46px; min-width:0; }
.t13-sep{ border-right:1px solid var(--line); }
.t13-col1{ position:sticky; left:0; z-index:2; background:var(--bone);
  border-right:1px solid var(--line); }
.t13-hd{ font-family:'Archivo'; font-weight:600; font-size:11px; color:var(--ink-on-bone);
  padding:5px 3px; min-height:40px; text-align:center; line-height:1.12;
  position:sticky; top:0; z-index:3; background:var(--bone); }
.t13-col1.t13-hd{ z-index:4; }
.t13-name{ display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;
  overflow:hidden; word-break:break-word; max-width:100%; }
.t13-corner{ color:var(--muted); font-size:10px; letter-spacing:.14em; text-transform:uppercase; }

/* the signature: round card-faces */
.t13-face{ width:38px; height:50px; border-radius:6px; background:#fff; position:relative;
  border:1px solid #d7cbb0; box-shadow:0 1px 0 rgba(0,0,0,.04); margin:4px auto;
  display:flex; align-items:center; justify-content:center;
  transition:transform .15s, box-shadow .15s, opacity .15s; }
.t13-face .ix{ position:absolute; top:2px; left:4px; font-family:'Fraunces',serif; font-weight:600;
  font-size:11px; line-height:1; }
.t13-face .pip{ font-size:18px; }
.t13-face.red .ix,.t13-face.red .pip{ color:var(--oxblood); }
.t13-face.blk .ix,.t13-face.blk .pip{ color:#241F19; }
.t13-face.now{ transform:translateY(-2px) scale(1.04); box-shadow:0 0 0 2px var(--brass), 0 8px 16px -6px rgba(0,0,0,.4); }
.t13-face.done{ opacity:.45; }
.t13-rnum{ font-family:'DM Mono'; font-size:10px; color:var(--muted); text-align:center; margin-top:-1px; }

.t13-score{ width:100%; min-width:0; height:100%; min-height:46px; border:none; background:transparent;
  text-align:center; font-family:'DM Mono'; font-size:clamp(14px, 3.6vw, 17px); color:var(--ink-on-bone);
  outline:none; -moz-appearance:textfield; padding:0 1px; }
.t13-score::-webkit-outer-spin-button,.t13-score::-webkit-inner-spin-button{ -webkit-appearance:none; margin:0; }
.t13-score:focus{ background:#fff7e6; box-shadow:inset 0 -2px 0 var(--brass); }
.t13-scorecell{ padding:0; }
.t13-scorecell.dealer{ box-shadow:inset 3px 0 0 var(--brass); background:#fbf3df; }
.t13-scorecell.dealer .t13-score{ color:var(--brass-d); font-weight:500; }

.t13-totcell{ min-height:50px; font-family:'DM Mono'; font-size:18px; color:var(--ink-on-bone);
  border-bottom:none; font-weight:500; }
.t13-totlabel{ font-family:'Archivo'; font-weight:700; font-size:9px; letter-spacing:.08em;
  text-transform:uppercase; color:var(--muted); }
.t13-totcell.best{ color:var(--brass-d); font-weight:500; }

.t13-foot{ display:flex; gap:10px; margin-top:18px; }
.t13-ghost{ flex:1; background:transparent; border:1px solid var(--line-soft); color:var(--muted);
  border-radius:10px; padding:11px; font-family:'Archivo'; font-size:13px; cursor:pointer;
  display:flex; align-items:center; justify-content:center; gap:6px; transition:border-color .12s,color .12s; }
.t13-ghost:hover{ border-color:var(--oxblood); color:var(--bone); }

.t13-win{ text-align:center; background:var(--ink2); border:1px solid var(--brass);
  border-radius:12px; padding:16px; margin-bottom:16px; }
.t13-win .ttl{ font-family:'Fraunces',serif; font-weight:900; font-size:22px; color:var(--brass); }
.t13-win .sub{ color:var(--muted); font-size:13px; margin-top:3px; }

.t13-legend{ color:var(--muted); font-size:11.5px; text-align:center; margin-top:14px; line-height:1.5; }

.t13-savebtn{ margin-top:12px; border:1px solid var(--brass); background:transparent; color:var(--brass);
  border-radius:9px; padding:9px 16px; font-family:'Archivo'; font-weight:600; font-size:13px; cursor:pointer;
  display:inline-flex; align-items:center; gap:6px; transition:background .12s,color .12s; }
.t13-savebtn:hover{ background:var(--brass); color:#1a1510; }
.t13-savebtn[disabled]{ opacity:.55; cursor:default; background:transparent; color:var(--brass); }

/* ---- history / leaderboard view ---- */
.t13-mastright{ display:flex; flex-direction:column; align-items:flex-end; gap:8px; }
.t13-navbtn{ background:transparent; border:1px solid var(--line-soft); color:var(--muted);
  border-radius:9px; padding:7px 11px; font-family:'Archivo'; font-size:12px; font-weight:600; cursor:pointer;
  display:flex; align-items:center; gap:6px; transition:border-color .12s,color .12s; }
.t13-navbtn:hover{ border-color:var(--brass-d); color:var(--bone); }

.t13-vh{ font-family:'Fraunces',serif; font-weight:600; font-size:18px; margin:22px 0 10px;
  display:flex; align-items:center; gap:8px; }
.t13-count2{ font-family:'DM Mono'; font-size:12px; color:var(--muted); }
.t13-empty{ color:var(--muted); font-size:13px; background:var(--ink2); border:1px solid var(--line-soft);
  border-radius:10px; padding:14px; }
.t13-flash{ background:var(--ink2); border:1px solid var(--brass); border-left:3px solid var(--brass);
  border-radius:10px; padding:10px 14px; margin-bottom:12px; font-size:13px; color:var(--bone); }

.t13-lb{ padding:10px 12px; }
.t13-lbgrid{ display:grid; grid-template-columns:minmax(0,1.6fr) repeat(4, minmax(0,1fr)); }
.t13-lbhd{ font-family:'Archivo'; font-weight:700; font-size:9px; letter-spacing:.08em; text-transform:uppercase;
  color:var(--muted); padding:4px 4px 8px; text-align:center; border-bottom:1px solid var(--line); }
.t13-lbcell{ font-family:'DM Mono'; font-size:15px; color:var(--ink-on-bone); padding:9px 4px; text-align:center;
  border-bottom:1px solid var(--line); display:flex; align-items:center; justify-content:center; gap:5px; min-width:0; }
.t13-lbname{ justify-content:flex-start; text-align:left; font-family:'Archivo'; font-weight:600; font-size:13px;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.t13-lbgrid > .t13-lbcell:nth-last-child(-n+5){ border-bottom:none; }

.t13-gcard{ background:var(--ink2); border:1px solid var(--line-soft); border-radius:12px;
  padding:12px 14px; margin-bottom:10px; }
.t13-gmeta{ display:flex; justify-content:space-between; align-items:center; font-size:11px; color:var(--muted);
  margin-bottom:9px; font-family:'DM Mono'; letter-spacing:.02em; }
.t13-gmeta-r{ display:flex; align-items:center; gap:10px; }
.t13-gdel{ background:transparent; border:none; color:var(--muted); cursor:pointer; padding:2px;
  display:flex; align-items:center; border-radius:6px; transition:color .12s,background .12s; }
.t13-gdel:hover{ color:var(--oxblood); background:var(--ink3); }
.t13-gresults{ display:grid; grid-template-columns:repeat(auto-fill, minmax(120px,1fr)); gap:6px 14px; }
.t13-gp{ display:flex; align-items:center; justify-content:space-between; gap:8px; font-size:13px; min-width:0; }
.t13-gp .nm{ color:var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  display:flex; align-items:center; gap:5px; min-width:0; }
.t13-gp .pts{ font-family:'DM Mono'; color:var(--bone2); flex:none; }
.t13-gp.win .nm,.t13-gp.win .pts{ color:var(--brass); }

.t13-io{ display:flex; flex-direction:column; gap:9px; margin-bottom:10px; }
.t13-iorow{ display:flex; gap:9px; }
.t13-iotext{ width:100%; min-height:64px; resize:vertical; background:var(--ink); border:1px solid var(--line-soft);
  color:var(--bone); border-radius:9px; padding:10px 12px; font-family:'DM Mono'; font-size:12px; outline:none; }
.t13-iotext:focus{ border-color:var(--brass); }
.t13-ghost[disabled]{ opacity:.4; cursor:not-allowed; }
.t13-filelbl{ cursor:pointer; }
.t13-danger:hover{ border-color:var(--oxblood); color:var(--oxblood); }

@media (prefers-reduced-motion: reduce){ .t13 *{ transition:none !important; } }
`;

function emptyScores(nPlayers) {
  return Array.from({ length: 13 }, () => Array(nPlayers).fill(""));
}

/* synchronous load from localStorage at startup */
function loadGame() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    /* corrupt or unavailable — start fresh */
  }
  return null;
}

/* ---- permanent game history (separate key, never wiped by reset) ---- */
function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
    }
  } catch (e) {
    /* corrupt or unavailable — start with no history */
  }
  return [];
}
function saveHistory(arr) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
  } catch (e) {
    /* storage full or blocked — keep working for this session */
  }
}

/* union two history lists, de-duped by record id, oldest-first */
function mergeHistories(a, b) {
  const byId = new Map();
  for (const g of [...a, ...b]) if (g && g.id) byId.set(g.id, g);
  return [...byId.values()].sort(
    (x, y) => (Date.parse(x.finishedAt) || 0) - (Date.parse(y.finishedAt) || 0)
  );
}

/* aggregate a leaderboard keyed by normalized player name */
function buildLeaderboard(history) {
  const map = new Map();
  for (const g of history) {
    const results = (g && g.results) || [];
    if (!results.length) continue;
    const min = Math.min(...results.map((r) => r.total));
    const at = g.finishedAt ? Date.parse(g.finishedAt) : 0;
    for (const r of results) {
      const key = (r.name || "").trim().toLowerCase() || "—";
      let e = map.get(key);
      if (!e) {
        e = { key, name: r.name, games: 0, wins: 0, sumTotal: 0, best: Infinity, lastAt: 0 };
        map.set(key, e);
      }
      e.games += 1;
      e.sumTotal += r.total;
      if (r.total < e.best) e.best = r.total;
      if (r.total === min) e.wins += 1;
      if (at >= e.lastAt) { e.lastAt = at; e.name = r.name; } // freshest spelling
    }
  }
  return [...map.values()]
    .map((e) => ({ ...e, avg: e.games ? e.sumTotal / e.games : 0 }))
    .sort((a, b) => b.wins - a.wins || a.avg - b.avg || b.games - a.games);
}

export default function Thirteen() {
  const saved = useMemo(loadGame, []);
  const [started, setStarted] = useState(saved ? !!saved.started : false);
  const [count, setCount] = useState(saved?.count || 4);
  const [names, setNames] = useState(saved?.names || ["", "", "", "", "", "", ""]);
  const [scores, setScores] = useState(saved?.scores || emptyScores(saved?.count || 4));
  const [savedId, setSavedId] = useState(saved?.savedId || null);

  /* "game" scorecard vs "history" leaderboard view */
  const [view, setView] = useState("game");

  /* history list + import textbox + transient status message */
  const [history, setHistory] = useState(loadHistory);
  const [importText, setImportText] = useState("");
  const [flash, setFlash] = useState("");
  const flashTimer = useRef(null);
  const flashMsg = (m) => {
    setFlash(m);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(""), 2600);
  };

  /* persist live game (savedId included; additive — no version bump) */
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ started, count, names, scores, savedId }));
    } catch (e) {
      /* storage full or blocked — game still works for this session */
    }
  }, [started, count, names, scores, savedId]);

  /* persist history whenever it changes */
  useEffect(() => { saveHistory(history); }, [history]);

  const leaderboard = useMemo(() => buildLeaderboard(history), [history]);
  const gamesDesc = useMemo(
    () => [...history].sort((a, b) => (Date.parse(b.finishedAt) || 0) - (Date.parse(a.finishedAt) || 0)),
    [history]
  );

  const players = useMemo(
    () => names.slice(0, count).map((n, i) => (n.trim() ? n.trim() : `Player ${i + 1}`)),
    [names, count]
  );

  const totals = useMemo(
    () => players.map((_, p) =>
      scores.reduce((s, row) => s + (parseInt(row[p], 10) || 0), 0)
    ),
    [scores, players]
  );

  const roundComplete = (r) =>
    scores[r].slice(0, count).every((v) => v !== "" && v !== null && v !== undefined);

  /* current round = first incomplete */
  const currentRound = useMemo(() => {
    for (let r = 0; r < 13; r++) if (!roundComplete(r)) return r;
    return 13; // all done
  }, [scores, count]);

  const gameOver = currentRound === 13;

  const dealerInfo = useMemo(() => {
    let last = -1;
    for (let r = 12; r >= 0; r--) { if (roundComplete(r)) { last = r; break; } }
    if (last === -1) return null;
    const row = scores[last].slice(0, count).map((v) => parseInt(v, 10) || 0);
    const max = Math.max(...row);
    const dealers = players.filter((_, i) => row[i] === max);
    return { round: last, dealers, nextRound: last + 1 };
  }, [scores, players, count]);

  const bestTotal = totals.length ? Math.min(...totals) : 0;
  const worstTotal = totals.length ? Math.max(...totals) : 0;

  // standings ordered by rank (lowest total = 1st). Ties share a place
  // (competition ranking: 1, 2, 2, 4).
  const ranked = useMemo(() => {
    const rows = players.map((nm, i) => ({ i, nm, total: totals[i] }));
    rows.sort((a, b) => a.total - b.total);
    let place = 0, prev = null;
    rows.forEach((row, idx) => {
      if (row.total !== prev) { place = idx + 1; prev = row.total; }
      row.place = place;
    });
    return rows;
  }, [players, totals]);

  // within row r, mark its high scorer(s) — they deal the NEXT round.
  // skipped on round 13 (no round after it) and on all-zero rows.
  const nextDealerForRow = (r) => {
    if (r >= 12) return new Set();
    if (!roundComplete(r)) return new Set();
    const row = scores[r].slice(0, count).map((v) => parseInt(v, 10) || 0);
    const max = Math.max(...row);
    if (max <= 0) return new Set();
    const set = new Set();
    row.forEach((v, i) => { if (v === max) set.add(i); });
    return set;
  };

  function setScore(r, p, raw) {
    const v = raw.replace(/[^\d]/g, "").slice(0, 4);
    setScores((prev) => {
      const next = prev.map((row) => row.slice());
      next[r][p] = v;
      return next;
    });
  }

  function start() {
    setScores(emptyScores(count));
    setSavedId(null);
    setStarted(true);
  }
  function resetGame() {
    setStarted(false);
    setScores(emptyScores(count));
    setSavedId(null);
  }

  /* archive the finished game (manual, guarded against double-save) */
  function saveToHistory() {
    if (savedId) return;
    const id = newId();
    const record = {
      id,
      finishedAt: new Date().toISOString(),
      count,
      results: players.map((nm, i) => ({ name: nm, total: totals[i] })),
      scores: scores.map((row) => row.slice(0, count)),
    };
    setHistory((prev) => [...prev, record]);
    setSavedId(id);
    flashMsg("Saved to history");
  }

  /* ---- backup / share ---- */
  const exportPayload = () =>
    JSON.stringify({ app: "thirteen", type: "history", v: 1, games: history });

  function downloadHistory() {
    const blob = new Blob([exportPayload()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `thirteen-history-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function copyCode() {
    const code = btoa(unescape(encodeURIComponent(exportPayload())));
    try {
      await navigator.clipboard.writeText(code);
      flashMsg("Code copied to clipboard");
    } catch (e) {
      setImportText(code); // fallback: drop it in the box to copy manually
      flashMsg("Copy failed — code placed in the box below");
    }
  }

  /* accept raw JSON or a base64 code; returns valid game records or null */
  function parsePayload(text) {
    const raw = (text || "").trim();
    if (!raw) return null;
    let obj = null;
    try {
      obj = JSON.parse(raw);
    } catch (e) {
      try { obj = JSON.parse(decodeURIComponent(escape(atob(raw)))); } catch (e2) { return null; }
    }
    const games = Array.isArray(obj) ? obj : (obj && Array.isArray(obj.games) ? obj.games : null);
    if (!games) return null;
    return games.filter((g) => g && g.id && Array.isArray(g.results));
  }

  function importFromText(text) {
    const games = parsePayload(text);
    if (!games) { flashMsg("Couldn't read that — not valid history data"); return; }
    const before = history.length;
    const merged = mergeHistories(history, games);
    setHistory(merged);
    const added = merged.length - before;
    flashMsg(added > 0 ? `Added ${added} game${added === 1 ? "" : "s"}` : "Already up to date — no new games");
    setImportText("");
  }

  function importFromFile(file) {
    const reader = new FileReader();
    reader.onload = () => importFromText(String(reader.result || ""));
    reader.readAsText(file);
  }

  function deleteGame(id) {
    const g = history.find((x) => x.id === id);
    const when = g && g.finishedAt ? new Date(g.finishedAt).toLocaleDateString() : "this game";
    if (confirm(`Delete ${when} from history? This can't be undone.`)) {
      setHistory((prev) => prev.filter((x) => x.id !== id));
      if (savedId === id) setSavedId(null); // re-allow saving if it was the live game's record
      flashMsg("Game deleted");
    }
  }

  function clearHistory() {
    if (confirm("Delete all saved game history on this device? This can't be undone.")) {
      setHistory([]);
      flashMsg("History cleared");
    }
  }

  const colTemplate = `48px repeat(${count}, minmax(0, 1fr))`;

  return (
    <div className="t13">
      <style>{STYLES}</style>
      <div className="t13-wrap">
        <header className="t13-mast">
          <h1 className="t13-title">Thirteen<small>13 rounds · low score wins</small></h1>
          <div className="t13-mastright">
            <div className="t13-suits">
              <span className="b">♠</span><span className="r">♥</span><span className="r">♦</span><span className="b">♣</span>
            </div>
            <button
              className="t13-navbtn"
              onClick={() => setView(view === "history" ? "game" : "history")}
            >
              {view === "history" ? <><ChevronLeft size={14} />Back</> : <><Trophy size={14} />History</>}
            </button>
          </div>
        </header>

        {flash && <div className="t13-flash">{flash}</div>}

        {view === "history" ? (
          <>
            <h2 className="t13-vh">Leaderboard</h2>
            {leaderboard.length === 0 ? (
              <p className="t13-empty">No games saved yet. Finish a game, then tap “Save to history”.</p>
            ) : (
              <div className="t13-card t13-lb">
                <div className="t13-lbgrid">
                  <div className="t13-lbhd t13-lbname">Player</div>
                  <div className="t13-lbhd">Wins</div>
                  <div className="t13-lbhd">Games</div>
                  <div className="t13-lbhd">Avg</div>
                  <div className="t13-lbhd">Best</div>
                  {leaderboard.map((e, idx) => (
                    <React.Fragment key={e.key}>
                      <div className="t13-lbcell t13-lbname" title={e.name}>
                        {idx === 0 && e.wins > 0 && <Crown size={13} className="t13-crown" />}
                        {e.name}
                      </div>
                      <div className="t13-lbcell">{e.wins}</div>
                      <div className="t13-lbcell">{e.games}</div>
                      <div className="t13-lbcell">{e.avg.toFixed(1)}</div>
                      <div className="t13-lbcell">{e.best === Infinity ? "—" : e.best}</div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            <h2 className="t13-vh">Games <span className="t13-count2">{history.length}</span></h2>
            {gamesDesc.length === 0 ? (
              <p className="t13-empty">Finished games will be listed here.</p>
            ) : (
              gamesDesc.map((g) => {
                const min = Math.min(...g.results.map((r) => r.total));
                return (
                  <div className="t13-gcard" key={g.id}>
                    <div className="t13-gmeta">
                      <span>{new Date(g.finishedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                      <span className="t13-gmeta-r">
                        {g.count} players
                        <button className="t13-gdel" onClick={() => deleteGame(g.id)} aria-label="Delete this game" title="Delete this game">
                          <Trash2 size={13} />
                        </button>
                      </span>
                    </div>
                    <div className="t13-gresults">
                      {[...g.results].sort((a, b) => a.total - b.total).map((r, i) => (
                        <div className={`t13-gp ${r.total === min ? "win" : ""}`} key={i}>
                          <span className="nm">{r.total === min && <Crown size={11} className="t13-crown" />}{r.name}</span>
                          <span className="pts">{r.total}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}

            <h2 className="t13-vh">Backup &amp; share</h2>
            <div className="t13-io">
              <div className="t13-iorow">
                <button className="t13-ghost" onClick={downloadHistory} disabled={!history.length}><Download size={14} />Download file</button>
                <button className="t13-ghost" onClick={copyCode} disabled={!history.length}><ClipboardCopy size={14} />Copy code</button>
              </div>
              <textarea
                className="t13-iotext"
                placeholder="Paste a history code here to import…"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
              <div className="t13-iorow">
                <button className="t13-ghost" onClick={() => importFromText(importText)} disabled={!importText.trim()}><Upload size={14} />Import code</button>
                <label className="t13-ghost t13-filelbl">
                  <Upload size={14} />Import file
                  <input
                    type="file"
                    accept="application/json,.json"
                    style={{ display: "none" }}
                    onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) importFromFile(f); e.target.value = ""; }}
                  />
                </label>
              </div>
              <button className="t13-ghost t13-danger" onClick={clearHistory} disabled={!history.length}><Trash2 size={14} />Clear history</button>
            </div>
          </>
        ) : !started ? (
          <div className="t13-panel">
            <h2 className="t13-h">New game</h2>
            <p className="t13-sub">How many players? (2–7)</p>
            <div className="t13-countrow">
              {[2, 3, 4, 5, 6, 7].map((n) => (
                <button key={n} className={`t13-count ${count === n ? "on" : ""}`} onClick={() => setCount(n)}>{n}</button>
              ))}
            </div>
            <div className="t13-names">
              {Array.from({ length: count }).map((_, i) => (
                <div className="t13-nrow" key={i}>
                  <span className="t13-seat">{i + 1}</span>
                  <input
                    className="t13-input"
                    placeholder={`Player ${i + 1}`}
                    value={names[i]}
                    maxLength={14}
                    onChange={(e) => setNames((p) => { const n = p.slice(); n[i] = e.target.value; return n; })}
                  />
                </div>
              ))}
            </div>
            <button className="t13-btn" onClick={start}>Start scoring</button>
          </div>
        ) : (
          <>
            {gameOver && (
              <div className="t13-win">
                <div className="ttl">
                  {players.filter((_, i) => totals[i] === bestTotal).join(" & ")} {players.filter((_, i) => totals[i] === bestTotal).length > 1 ? "tie" : "wins"}
                </div>
                <div className="sub">{bestTotal} points after 13 rounds · lowest score takes it</div>
                <button
                  className="t13-savebtn"
                  onClick={saveToHistory}
                  disabled={!!savedId}
                >
                  {savedId ? "Saved ✓" : "Save to history"}
                </button>
              </div>
            )}

            {/* standings — ordered by rank, lowest total first */}
            <div className="t13-rail">
              {ranked.map(({ i, nm, total, place }) => {
                const lead = total === bestTotal && totals.some((t) => t > bestTotal);
                const last = total === worstTotal && totals.some((t) => t < worstTotal);
                return (
                  <div className={`t13-chip ${lead ? "lead" : ""} ${last ? "last" : ""}`} key={i}>
                    <div className="nm">
                      <span className="t13-rank">{ordinal(place)}</span>
                      {lead && <Crown size={12} className="t13-crown" />}
                      {last && <span className="t13-poop" role="img" aria-label="last place">💩</span>}
                      {nm}
                    </div>
                    <div className="tot">{total}</div>
                  </div>
                );
              })}
            </div>

            {/* deals-next banner */}
            {!gameOver && (
              <div className="t13-banner">
                <span className="pip">{SUITS[currentRound % 4]}</span>
                <span>
                  Round <b>{currentRound + 1}</b> — <b>{RANK_NAMES[RANKS[currentRound]]}</b> & jokers wild.{" "}
                  {dealerInfo ? (
                    <>Deals: <b>{dealerInfo.dealers.join(" / ")}</b>{dealerInfo.dealers.length > 1 ? " (tie — pick one)" : ""}.</>
                  ) : (
                    <>First deal: your group's call.</>
                  )}
                </span>
              </div>
            )}

            {/* scorecard grid */}
            <div className="t13-card">
              <div className="t13-grid" style={{ gridTemplateColumns: colTemplate }}>
                {/* header row */}
                <div className="t13-cell t13-col1 t13-hd"><span className="t13-corner">Wild</span></div>
                {players.map((nm, i) => (
                  <div className={`t13-cell t13-hd ${i < count - 1 ? "t13-sep" : ""}`} key={i}><span className="t13-name" title={nm}>{nm}</span></div>
                ))}

                {/* round rows */}
                {RANKS.map((rank, r) => {
                  const suit = SUITS[r % 4];
                  const dset = nextDealerForRow(r);
                  return (
                    <React.Fragment key={r}>
                      <div className="t13-cell t13-col1" style={{ display: "block" }}>
                        <div className={`t13-face ${isRed(suit) ? "red" : "blk"} ${r === currentRound ? "now" : ""} ${r < currentRound ? "done" : ""}`}>
                          <span className="ix">{rank}</span>
                          <span className="pip">{suit}</span>
                        </div>
                        <div className="t13-rnum">R{r + 1}</div>
                      </div>
                      {players.map((_, p) => (
                        <div className={`t13-cell t13-scorecell ${dset.has(p) ? "dealer" : ""} ${p < count - 1 ? "t13-sep" : ""}`} key={p}>
                          <input
                            className="t13-score"
                            inputMode="numeric"
                            value={scores[r][p]}
                            onChange={(e) => setScore(r, p, e.target.value)}
                            aria-label={`${players[p]} round ${r + 1}`}
                          />
                        </div>
                      ))}
                    </React.Fragment>
                  );
                })}

                {/* totals row */}
                <div className="t13-cell t13-col1 t13-totcell" style={{ borderBottom: "none" }}>
                  <span className="t13-totlabel">Total</span>
                </div>
                {players.map((_, p) => (
                  <div className={`t13-cell t13-totcell ${totals[p] === bestTotal && totals.some((t) => t > bestTotal) ? "best" : ""} ${p < count - 1 ? "t13-sep" : ""}`} key={p}>
                    {totals[p]}
                  </div>
                ))}
              </div>
            </div>

            <div className="t13-legend">
              Each round, all four of that rank are wild (plus jokers). The high scorer in each row is shaded brass — they deal the next round.
            </div>

            <div className="t13-foot">
              <button className="t13-ghost" onClick={resetGame}><ChevronLeft size={15} />Edit players</button>
              <button className="t13-ghost" onClick={() => { if (confirm("Clear all scores and start a new game?")) { setScores(emptyScores(count)); setSavedId(null); } }}>
                <RotateCcw size={14} />Reset scores
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
