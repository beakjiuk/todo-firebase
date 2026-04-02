import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { ref, get, onValue } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";
import { auth, db } from "./firebase-init.js";
import { firebaseConfig } from "./firebase-config.js";
import { isConfiguredFirebase } from "./validators.js";
import { syncSidebarUserChip, initSidebarToggle } from "./sidebar-sync.js";
import { initSidebarSearch, syncSidebarSearchFromQuery } from "./sidebar-search.js";

const btnLogout = document.getElementById("btnLogout");
const searchResults = document.getElementById("searchResults");
const appError = document.getElementById("appError");

let profileUnsub = null;

function showAppError(msg) {
  if (!appError) return;
  appError.textContent = msg;
  appError.classList.add("visible");
}

function matchesBlob(blob, q) {
  return String(blob || "")
    .toLowerCase()
    .includes(q);
}

function blobTodo(t) {
  return [t.title, t.note, t.dateKey].join(" ");
}

function blobLedger(e) {
  const amt = e.amount != null ? String(e.amount) : "";
  return [e.category, e.memo, e.dateKey, amt, e.type].join(" ");
}

function blobNote(n) {
  return [n.title, n.body].join(" ");
}

function formatMoney(n) {
  return `${Math.round(Number(n) || 0).toLocaleString("ko-KR")}원`;
}

async function runSearch(uid, qRaw) {
  const q = qRaw.trim().toLowerCase();
  if (!searchResults) return;

  if (!q) {
    searchResults.innerHTML =
      '<p class="search-empty">키워드를 입력해 보세요. 할 일 제목·메모, 가계부 카테고리·메모·금액, 노트 제목·본문이 검색됩니다.</p>';
    return;
  }

  searchResults.innerHTML = '<p class="search-loading">검색 중…</p>';

  const [tSnap, lSnap, nSnap] = await Promise.all([
    get(ref(db, `users/${uid}/todos`)),
    get(ref(db, `users/${uid}/ledger`)),
    get(ref(db, `users/${uid}/notes`)),
  ]);

  const todos = [];
  const ledger = [];
  const notes = [];

  const tVal = tSnap.val();
  if (tVal && typeof tVal === "object") {
    Object.entries(tVal).forEach(([id, t]) => {
      if (matchesBlob(blobTodo(t), q)) todos.push({ id, ...t });
    });
  }
  const lVal = lSnap.val();
  if (lVal && typeof lVal === "object") {
    Object.entries(lVal).forEach(([id, e]) => {
      if (matchesBlob(blobLedger(e), q)) ledger.push({ id, ...e });
    });
  }
  const nVal = nSnap.val();
  if (nVal && typeof nVal === "object") {
    Object.entries(nVal).forEach(([id, n]) => {
      if (matchesBlob(blobNote(n), q)) notes.push({ id, ...n });
    });
  }

  const esc = (s) =>
    String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");

  const hl = (s) => {
    const raw = String(s || "");
    const low = raw.toLowerCase();
    const i = low.indexOf(q);
    const cap = 140;
    if (i < 0) return esc(raw.slice(0, cap)) + (raw.length > cap ? "…" : "");
    const start = Math.max(0, i - 40);
    const chunk = raw.slice(start, start + cap + q.length);
    const rel = i - start;
    const before = esc(chunk.slice(0, rel));
    const mid = esc(chunk.slice(rel, rel + q.length));
    const after = esc(chunk.slice(rel + q.length));
    return `${start > 0 ? "…" : ""}${before}<mark class="search-hit">${mid}</mark>${after}${start + chunk.length < raw.length ? "…" : ""}`;
  };

  const section = (title, count, body) => {
    if (count === 0) return "";
    return `<section class="search-section"><h2 class="search-section__title">${title} <span class="search-count">${count}</span></h2>${body}</section>`;
  };

  let html = "";

  if (todos.length) {
    const rows = todos
      .map(
        (t) =>
          `<li class="search-row"><a class="search-row__link" href="app.html">${esc(t.title || "(제목 없음)")}</a><span class="search-row__meta">${esc(t.dateKey)} · 할 일</span><p class="search-row__snip">${hl(t.note || "")}</p></li>`,
      )
      .join("");
    html += section("할 일", todos.length, `<ul class="search-list">${rows}</ul>`);
  }

  if (ledger.length) {
    const rows = ledger
      .map((e) => {
        const typ = e.type === "income" ? "수입" : "지출";
        const line = `${typ} · ${esc(e.category || "")} · ${formatMoney(e.amount)} · ${esc(e.dateKey)}`;
        return `<li class="search-row"><a class="search-row__link" href="account.html">${line}</a><span class="search-row__meta">가계부</span><p class="search-row__snip">${hl(e.memo || "")}</p></li>`;
      })
      .join("");
    html += section("가계부", ledger.length, `<ul class="search-list">${rows}</ul>`);
  }

  if (notes.length) {
    const rows = notes
      .map(
        (n) =>
          `<li class="search-row"><a class="search-row__link" href="notes.html">${esc(n.title || "(제목 없음)")}</a><span class="search-row__meta">노트</span><p class="search-row__snip">${hl(n.body || "")}</p></li>`,
      )
      .join("");
    html += section("노트", notes.length, `<ul class="search-list">${rows}</ul>`);
  }

  if (!html) {
    html = `<p class="search-empty">「<strong>${esc(qRaw.trim())}</strong>」에 맞는 결과가 없습니다.</p>`;
  }

  searchResults.innerHTML = html;
}

function attachProfile(uid) {
  if (profileUnsub) {
    profileUnsub();
    profileUnsub = null;
  }
  const pref = ref(db, `users/${uid}/profile`);
  profileUnsub = onValue(pref, (snap) => {
    const user = auth.currentUser;
    if (!user || user.uid !== uid) return;
    syncSidebarUserChip(user, snap.val());
  });
}

function queryFromUrl() {
  return new URLSearchParams(window.location.search).get("q") || "";
}

btnLogout?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

initSidebarToggle();
initSidebarSearch();

if (!isConfiguredFirebase(firebaseConfig)) {
  showAppError("js/firebase-config.js에 본인 Firebase 설정을 넣은 뒤 다시 열어 주세요.");
} else {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }
    syncSidebarUserChip(user, null);
    attachProfile(user.uid);
    syncSidebarSearchFromQuery();
    runSearch(user.uid, queryFromUrl());
  });
}
