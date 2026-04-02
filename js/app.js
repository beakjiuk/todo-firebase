import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
  ref,
  push,
  onValue,
  update,
  remove,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";
import { auth, db } from "./firebase-init.js";
import { firebaseConfig } from "./firebase-config.js";
import { isConfiguredFirebase } from "./validators.js";
import { syncSidebarUserChip, initSidebarToggle, clearSidebarProfileCache } from "./sidebar-sync.js";
import { initSidebarSearch } from "./sidebar-search.js";

const calGrid = document.getElementById("calGrid");
const calTitle = document.getElementById("calTitle");
const prevMonth = document.getElementById("prevMonth");
const nextMonth = document.getElementById("nextMonth");
const btnLogout = document.getElementById("btnLogout");
const taskList = document.getElementById("taskList");
const dayTitle = document.getElementById("dayTitle");
const emptyHint = document.getElementById("emptyHint");
const btnAddTodo = document.getElementById("btnAddTodo");
const modal = document.getElementById("modal");
const todoForm = document.getElementById("todoForm");
const modalCancel = document.getElementById("modalCancel");
const toast = document.getElementById("toast");
const appError = document.getElementById("appError");

let todosRef = null;
let todosUnsub = null;
let profileUnsub = null;
let allTodos = {};
let view = new Date();
let selectedKey = todayKey();

function todayKey() {
  const d = new Date();
  return toKey(d);
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

function openModal() {
  modal?.classList.add("open");
  const dateInput = document.getElementById("todoDate");
  if (dateInput) dateInput.value = selectedKey;
}

function closeModal() {
  modal?.classList.remove("open");
  todoForm?.reset();
}

function prioClass(p) {
  const n = Number(p);
  if (n === 1) return "p1";
  if (n === 3) return "p3";
  return "p2";
}

function todosForDate(dateKey) {
  return Object.entries(allTodos)
    .map(([id, t]) => ({ id, ...t }))
    .filter((t) => t.dateKey === dateKey)
    .sort((a, b) => {
      const pa = Number(a.priority) || 2;
      const pb = Number(b.priority) || 2;
      if (pa !== pb) return pa - pb;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
}

function monthDotsByDay() {
  const y = view.getFullYear();
  const m = view.getMonth();
  const map = {};
  Object.values(allTodos).forEach((t) => {
    if (!t?.dateKey) return;
    const [ty, tm] = t.dateKey.split("-").map(Number);
    if (ty === y && tm - 1 === m) {
      const day = Number(t.dateKey.split("-")[2]);
      if (!map[day]) map[day] = new Set();
      map[day].add(prioClass(t.priority));
    }
  });
  return map;
}

function renderCalendar() {
  if (!calGrid || !calTitle) return;
  calTitle.textContent = view.toLocaleDateString("ko-KR", { year: "numeric", month: "long" });

  const y = view.getFullYear();
  const m = view.getMonth();
  const first = new Date(y, m, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const prevDays = new Date(y, m, 0).getDate();

  const dots = monthDotsByDay();
  calGrid.innerHTML = "";

  for (let i = 0; i < startWeekday; i++) {
    const dayNum = prevDays - startWeekday + i + 1;
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "cal-cell other-month";
    cell.innerHTML = `<span class="cal-day-num">${dayNum}</span>`;
    calGrid.appendChild(cell);
  }

  const today = new Date();
  for (let d = 1; d <= daysInMonth; d++) {
    const cell = document.createElement("button");
    cell.type = "button";
    const dateKey = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cell.className = "cal-cell";
    if (y === today.getFullYear() && m === today.getMonth() && d === today.getDate()) {
      cell.classList.add("today");
    }
    if (dateKey === selectedKey) cell.classList.add("selected");

    const dotWrap = document.createElement("div");
    dotWrap.className = "cal-dots";
    const ds = dots[d];
    if (ds) {
      Array.from(ds).slice(0, 3).forEach((cls) => {
        const dot = document.createElement("span");
        dot.className = `cal-dot ${cls}`;
        dotWrap.appendChild(dot);
      });
    }

    cell.innerHTML = `<span class="cal-day-num">${d}</span>`;
    cell.appendChild(dotWrap);

    cell.addEventListener("click", () => {
      selectedKey = dateKey;
      renderCalendar();
      renderTasks();
    });

    calGrid.appendChild(cell);
  }

  const totalCells = calGrid.children.length;
  const remainder = totalCells % 7;
  if (remainder !== 0) {
    const need = 7 - remainder;
    for (let d = 1; d <= need; d++) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cal-cell other-month";
      cell.innerHTML = `<span class="cal-day-num">${d}</span>`;
      calGrid.appendChild(cell);
    }
  }
}

function renderTasks() {
  if (!taskList || !dayTitle) return;
  const label = parseKey(selectedKey).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  dayTitle.textContent = `할 일 · ${label}`;

  const items = todosForDate(selectedKey);
  taskList.innerHTML = "";

  if (items.length === 0) {
    emptyHint?.removeAttribute("hidden");
  } else {
    emptyHint?.setAttribute("hidden", "true");
  }

  items.forEach((t) => {
    const li = document.createElement("li");
    li.className = `task-item ${t.done ? "done" : ""}`;

    const bar = document.createElement("div");
    bar.className = `task-prio ${prioClass(t.priority)}`;

    const body = document.createElement("div");
    body.className = "task-body";
    const title = document.createElement("div");
    title.className = "task-title";
    title.textContent = t.title || "(제목 없음)";
    const meta = document.createElement("div");
    meta.className = "task-meta";
    const pr = Number(t.priority) === 1 ? "높음" : Number(t.priority) === 3 ? "낮음" : "보통";
    meta.textContent = [pr, t.note ? String(t.note).slice(0, 80) : ""].filter(Boolean).join(" · ");
    body.appendChild(title);
    body.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "task-actions";
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.textContent = t.done ? "완료 취소" : "완료";
    toggle.addEventListener("click", async () => {
      if (!todosRef) return;
      await update(ref(db, `users/${auth.currentUser.uid}/todos/${t.id}`), { done: !t.done });
    });
    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "삭제";
    del.addEventListener("click", async () => {
      if (!todosRef) return;
      if (window.confirm("이 할 일을 삭제할까요?")) {
        await remove(ref(db, `users/${auth.currentUser.uid}/todos/${t.id}`));
        showToast("삭제했습니다.");
      }
    });
    actions.appendChild(toggle);
    actions.appendChild(del);

    li.appendChild(bar);
    li.appendChild(body);
    li.appendChild(actions);
    taskList.appendChild(li);
  });
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

function attachTodos(uid) {
  if (todosUnsub) {
    todosUnsub();
    todosUnsub = null;
  }
  todosRef = ref(db, `users/${uid}/todos`);
  todosUnsub = onValue(todosRef, (snap) => {
    allTodos = snap.val() && typeof snap.val() === "object" ? snap.val() : {};
    renderCalendar();
    renderTasks();
  });
}

prevMonth?.addEventListener("click", () => {
  view = new Date(view.getFullYear(), view.getMonth() - 1, 1);
  renderCalendar();
});

nextMonth?.addEventListener("click", () => {
  view = new Date(view.getFullYear(), view.getMonth() + 1, 1);
  renderCalendar();
});

btnLogout?.addEventListener("click", async () => {
  clearSidebarProfileCache(auth.currentUser?.uid);
  await signOut(auth);
  window.location.href = "login.html";
});

btnAddTodo?.addEventListener("click", openModal);
modalCancel?.addEventListener("click", closeModal);
modal?.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

todoForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const title = document.getElementById("todoTitle")?.value?.trim() ?? "";
  const dateKey = document.getElementById("todoDate")?.value ?? selectedKey;
  const priority = Number(document.getElementById("todoPriority")?.value ?? 2);
  const note = document.getElementById("todoNote")?.value?.trim() ?? "";

  if (!title) return;

  const item = {
    title,
    dateKey,
    priority: priority === 1 ? 1 : priority === 3 ? 3 : 2,
    note,
    done: false,
    createdAt: Date.now(),
  };

  await push(ref(db, `users/${uid}/todos`), item);
  selectedKey = dateKey;
  closeModal();
  showToast("저장했습니다.");
  view = new Date(parseKey(dateKey));
  renderCalendar();
  renderTasks();
});

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
    attachTodos(user.uid);
  });
}

initSidebarToggle();
initSidebarSearch();
