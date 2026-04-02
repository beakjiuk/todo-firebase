import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";
import { auth, db } from "./firebase-init.js";
import { firebaseConfig } from "./firebase-config.js";
import { isConfiguredFirebase } from "./validators.js";
import { syncSidebarUserChip, initSidebarToggle, clearSidebarProfileCache } from "./sidebar-sync.js";
import { initSidebarSearch } from "./sidebar-search.js";

const CAT_INCOME = ["급여", "용돈", "부수입", "이자·배당", "기타"];
const CAT_EXPENSE = ["식비", "교통", "쇼핑", "문화·여가", "의료", "통신", "구독", "기타"];

const ledgerCalGrid = document.getElementById("ledgerCalGrid");
const ledgerCalTitle = document.getElementById("ledgerCalTitle");
const ledgerPrevMonth = document.getElementById("ledgerPrevMonth");
const ledgerNextMonth = document.getElementById("ledgerNextMonth");
const ledgerDayTitle = document.getElementById("ledgerDayTitle");
const ledgerList = document.getElementById("ledgerList");
const ledgerEmptyHint = document.getElementById("ledgerEmptyHint");
const btnAddLedger = document.getElementById("btnAddLedger");
const btnLogout = document.getElementById("btnLogout");
const ledgerModal = document.getElementById("ledgerModal");
const ledgerForm = document.getElementById("ledgerForm");
const ledgerModalCancel = document.getElementById("ledgerModalCancel");
const ledgerType = document.getElementById("ledgerType");
const ledgerCategory = document.getElementById("ledgerCategory");
const toast = document.getElementById("toast");
const appError = document.getElementById("appError");
const monthIncomeEl = document.getElementById("monthIncome");
const monthExpenseEl = document.getElementById("monthExpense");
const monthNetEl = document.getElementById("monthNet");

let ledgerRef = null;
let ledgerUnsub = null;
let profileUnsub = null;
let allLedger = {};
let view = new Date();
let selectedKey = todayKey();

function todayKey() {
  return toKey(new Date());
}

function toKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatMoney(n) {
  const v = Math.round(Number(n) || 0);
  return `${v.toLocaleString("ko-KR")}원`;
}

function fillCategories(type) {
  if (!ledgerCategory) return;
  const list = type === "income" ? CAT_INCOME : CAT_EXPENSE;
  ledgerCategory.innerHTML = list.map((c) => `<option value="${c}">${c}</option>`).join("");
}

function showAppError(msg) {
  if (!appError) return;
  appError.textContent = msg;
  appError.classList.add("visible");
}

function showToast(msg) {
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function dayTotals(dateKey) {
  let inc = 0;
  let exp = 0;
  Object.values(allLedger).forEach((e) => {
    if (!e || e.dateKey !== dateKey) return;
    const n = Math.round(Number(e.amount) || 0);
    if (e.type === "income") inc += n;
    else exp += n;
  });
  return { inc, exp, net: inc - exp };
}

function monthTotals() {
  const y = view.getFullYear();
  const m = view.getMonth();
  let inc = 0;
  let exp = 0;
  Object.values(allLedger).forEach((e) => {
    if (!e?.dateKey) return;
    const [ty, tm] = e.dateKey.split("-").map(Number);
    if (ty !== y || tm - 1 !== m) return;
    const n = Math.round(Number(e.amount) || 0);
    if (e.type === "income") inc += n;
    else exp += n;
  });
  return { inc, exp, net: inc - exp };
}

function updateMonthBar() {
  const { inc, exp, net } = monthTotals();
  if (monthIncomeEl) monthIncomeEl.textContent = formatMoney(inc);
  if (monthExpenseEl) monthExpenseEl.textContent = formatMoney(exp);
  if (monthNetEl) {
    const prefix = net >= 0 ? "+" : "−";
    monthNetEl.textContent = prefix + formatMoney(Math.abs(net));
    monthNetEl.classList.toggle("ledger-stat__val--net-neg", net < 0);
  }
}

function entriesForDate(dateKey) {
  return Object.entries(allLedger)
    .map(([id, e]) => ({ id, ...e }))
    .filter((e) => e.dateKey === dateKey)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

function renderCalendar() {
  if (!ledgerCalGrid || !ledgerCalTitle) return;
  ledgerCalTitle.textContent = view.toLocaleDateString("ko-KR", { year: "numeric", month: "long" });
  updateMonthBar();

  const y = view.getFullYear();
  const m = view.getMonth();
  const first = new Date(y, m, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const prevDays = new Date(y, m, 0).getDate();

  ledgerCalGrid.innerHTML = "";

  for (let i = 0; i < startWeekday; i++) {
    const dayNum = prevDays - startWeekday + i + 1;
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "cal-cell other-month";
    cell.innerHTML = `<span class="cal-day-num">${dayNum}</span>`;
    ledgerCalGrid.appendChild(cell);
  }

  const today = new Date();
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "cal-cell ledger-cal-cell";
    if (y === today.getFullYear() && m === today.getMonth() && d === today.getDate()) {
      cell.classList.add("today");
    }
    if (dateKey === selectedKey) cell.classList.add("selected");

    const { net } = dayTotals(dateKey);
    let sub = "";
    if (net !== 0) {
      const abs = Math.abs(net);
      const short =
        abs >= 10000 ? `${(abs / 10000).toFixed(abs % 10000 === 0 ? 0 : 1)}만` : abs.toLocaleString("ko-KR");
      const sign = net >= 0 ? "+" : "−";
      sub = `<span class="ledger-cell-net ${net >= 0 ? "ledger-cell-net--in" : "ledger-cell-net--out"}">${sign}${short}</span>`;
    }

    cell.innerHTML = `<span class="cal-day-num">${d}</span>${sub ? `<span class="ledger-cell-wrap">${sub}</span>` : ""}`;

    cell.addEventListener("click", () => {
      selectedKey = dateKey;
      renderCalendar();
      renderDayList();
    });

    ledgerCalGrid.appendChild(cell);
  }

  const totalCells = ledgerCalGrid.children.length;
  const remainder = totalCells % 7;
  if (remainder !== 0) {
    for (let d = 1; d <= 7 - remainder; d++) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cal-cell other-month";
      cell.innerHTML = `<span class="cal-day-num">${d}</span>`;
      ledgerCalGrid.appendChild(cell);
    }
  }
}

function renderDayList() {
  if (!ledgerList || !ledgerDayTitle) return;
  const label = parseKey(selectedKey).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  ledgerDayTitle.textContent = `내역 · ${label}`;

  const items = entriesForDate(selectedKey);
  ledgerList.innerHTML = "";

  if (items.length === 0) {
    ledgerEmptyHint?.removeAttribute("hidden");
  } else {
    ledgerEmptyHint?.setAttribute("hidden", "true");
  }

  items.forEach((e) => {
    const li = document.createElement("li");
    li.className = "ledger-item";

    const tag = document.createElement("span");
    tag.className = `ledger-item__tag ${e.type === "income" ? "ledger-item__tag--in" : "ledger-item__tag--out"}`;
    tag.textContent = e.type === "income" ? "수입" : "지출";

    const body = document.createElement("div");
    body.className = "ledger-item__body";
    const row1 = document.createElement("div");
    row1.className = "ledger-item__cat";
    row1.textContent = e.category || "기타";
    const row2 = document.createElement("div");
    row2.className = "ledger-item__memo";
    row2.textContent = e.memo ? String(e.memo).slice(0, 80) : " ";

    const amt = document.createElement("div");
    const n = Math.round(Number(e.amount) || 0);
    amt.className = `ledger-item__amt ${e.type === "income" ? "ledger-item__amt--in" : "ledger-item__amt--out"}`;
    amt.textContent = (e.type === "income" ? "+" : "−") + formatMoney(n);

    const actions = document.createElement("div");
    actions.className = "ledger-item__actions";
    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "삭제";
    del.addEventListener("click", async () => {
      const uid = auth.currentUser?.uid;
      if (!uid || !window.confirm("이 내역을 삭제할까요?")) return;
      await remove(ref(db, `users/${uid}/ledger/${e.id}`));
      showToast("삭제했습니다.");
    });
    actions.appendChild(del);

    body.appendChild(row1);
    body.appendChild(row2);

    li.appendChild(tag);
    li.appendChild(body);
    li.appendChild(amt);
    li.appendChild(actions);
    ledgerList.appendChild(li);
  });
}

function openLedgerModal() {
  fillCategories(ledgerType?.value || "expense");
  ledgerModal?.classList.add("open");
  const di = document.getElementById("ledgerDate");
  if (di) di.value = selectedKey;
}

function closeLedgerModal() {
  ledgerModal?.classList.remove("open");
  ledgerForm?.reset();
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

function attachLedger(uid) {
  if (ledgerUnsub) {
    ledgerUnsub();
    ledgerUnsub = null;
  }
  ledgerRef = ref(db, `users/${uid}/ledger`);
  ledgerUnsub = onValue(ledgerRef, (snap) => {
    allLedger = snap.val() && typeof snap.val() === "object" ? snap.val() : {};
    renderCalendar();
    renderDayList();
  });
}

ledgerPrevMonth?.addEventListener("click", () => {
  view = new Date(view.getFullYear(), view.getMonth() - 1, 1);
  renderCalendar();
  renderDayList();
});

ledgerNextMonth?.addEventListener("click", () => {
  view = new Date(view.getFullYear(), view.getMonth() + 1, 1);
  renderCalendar();
  renderDayList();
});

btnLogout?.addEventListener("click", async () => {
  clearSidebarProfileCache(auth.currentUser?.uid);
  await signOut(auth);
  window.location.href = "login.html";
});

btnAddLedger?.addEventListener("click", openLedgerModal);
ledgerModalCancel?.addEventListener("click", closeLedgerModal);
ledgerModal?.addEventListener("click", (e) => {
  if (e.target === ledgerModal) closeLedgerModal();
});

ledgerType?.addEventListener("change", () => {
  fillCategories(ledgerType.value);
});

ledgerForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const type = ledgerType?.value === "income" ? "income" : "expense";
  const amount = Math.round(Number(document.getElementById("ledgerAmount")?.value ?? 0));
  const category = document.getElementById("ledgerCategory")?.value ?? "기타";
  const dateKey = document.getElementById("ledgerDate")?.value ?? selectedKey;
  const memo = document.getElementById("ledgerMemo")?.value?.trim() ?? "";

  if (!amount || amount < 1) return;

  await push(ref(db, `users/${uid}/ledger`), {
    type,
    amount,
    category,
    dateKey,
    memo,
    createdAt: Date.now(),
  });

  selectedKey = dateKey;
  view = new Date(parseKey(dateKey));
  closeLedgerModal();
  showToast("저장했습니다.");
  renderCalendar();
  renderDayList();
});

fillCategories("expense");

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
    attachLedger(user.uid);
  });
}

initSidebarToggle();
initSidebarSearch();
