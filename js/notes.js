import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { ref, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";
import { auth, db } from "./firebase-init.js";
import { firebaseConfig } from "./firebase-config.js";
import { isConfiguredFirebase } from "./validators.js";
import { syncSidebarUserChip, initSidebarToggle } from "./sidebar-sync.js";
import { initSidebarSearch } from "./sidebar-search.js";

const notesList = document.getElementById("notesList");
const btnNewNote = document.getElementById("btnNewNote");
const btnLogout = document.getElementById("btnLogout");
const toast = document.getElementById("toast");
const appError = document.getElementById("appError");
const noteModal = document.getElementById("noteModal");
const noteForm = document.getElementById("noteForm");
const noteModalCancel = document.getElementById("noteModalCancel");
const noteModalTitle = document.getElementById("noteModalTitleField");
const noteModalBody = document.getElementById("noteModalBody");
const noteModalDelete = document.getElementById("noteModalDelete");

let notesUnsub = null;
let profileUnsub = null;
let allNotes = {};
let editingId = null;

function showToast(msg) {
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function showAppError(msg) {
  if (!appError) return;
  appError.textContent = msg;
  appError.classList.add("visible");
}

function openNoteModal(isNew, id) {
  editingId = isNew ? null : id;
  if (noteModalDelete) noteModalDelete.hidden = isNew;

  if (isNew) {
    document.getElementById("noteModalHeading").textContent = "새 노트";
    noteModalTitle.value = "";
    noteModalBody.value = "";
  } else {
    const n = allNotes[id];
    document.getElementById("noteModalHeading").textContent = "노트 수정";
    noteModalTitle.value = n?.title ?? "";
    noteModalBody.value = n?.body ?? "";
  }
  noteModal?.classList.add("open");
  noteModalTitle?.focus();
}

function closeNoteModal() {
  noteModal?.classList.remove("open");
  noteForm?.reset();
  editingId = null;
}

function formatNoteDate(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString("ko-KR", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "";
  }
}

function renderNotes() {
  if (!notesList) return;
  const items = Object.entries(allNotes)
    .map(([id, n]) => ({ id, ...n }))
    .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));

  notesList.innerHTML = "";

  if (items.length === 0) {
    notesList.innerHTML =
      '<p class="notes-empty">노트가 없습니다. <strong>새 노트</strong>로 메모를 추가해 보세요.</p>';
    return;
  }

  items.forEach((n) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "note-card";
    const title = document.createElement("div");
    title.className = "note-card__title";
    title.textContent = n.title?.trim() || "(제목 없음)";
    const preview = document.createElement("div");
    preview.className = "note-card__preview";
    const body = (n.body || "").replace(/\s+/g, " ").trim();
    preview.textContent = body.slice(0, 160) + (body.length > 160 ? "…" : "") || "내용 없음";
    const meta = document.createElement("div");
    meta.className = "note-card__meta";
    meta.textContent = formatNoteDate(n.updatedAt || n.createdAt);

    card.appendChild(title);
    card.appendChild(preview);
    card.appendChild(meta);
    card.addEventListener("click", () => openNoteModal(false, n.id));
    notesList.appendChild(card);
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

function attachNotes(uid) {
  if (notesUnsub) {
    notesUnsub();
    notesUnsub = null;
  }
  const r = ref(db, `users/${uid}/notes`);
  notesUnsub = onValue(r, (snap) => {
    const v = snap.val();
    allNotes = v && typeof v === "object" ? v : {};
    renderNotes();
  });
}

btnNewNote?.addEventListener("click", () => openNoteModal(true, null));
btnLogout?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

noteModalCancel?.addEventListener("click", closeNoteModal);
noteModal?.addEventListener("click", (e) => {
  if (e.target === noteModal) closeNoteModal();
});

noteModalDelete?.addEventListener("click", async () => {
  const uid = auth.currentUser?.uid;
  if (!uid || !editingId || !window.confirm("이 노트를 삭제할까요?")) return;
  await remove(ref(db, `users/${uid}/notes/${editingId}`));
  closeNoteModal();
  showToast("삭제했습니다.");
});

noteForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const title = noteModalTitle?.value?.trim() ?? "";
  const body = noteModalBody?.value ?? "";
  const now = Date.now();

  if (!title && !body.trim()) {
    showToast("제목 또는 내용을 입력해 주세요.");
    return;
  }

  if (editingId) {
    await update(ref(db, `users/${uid}/notes/${editingId}`), {
      title: title || "(제목 없음)",
      body,
      updatedAt: now,
    });
    showToast("저장했습니다.");
  } else {
    await push(ref(db, `users/${uid}/notes`), {
      title: title || "(제목 없음)",
      body,
      createdAt: now,
      updatedAt: now,
    });
    showToast("노트를 추가했습니다.");
  }
  closeNoteModal();
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
    attachNotes(user.uid);
  });
}

initSidebarToggle();
initSidebarSearch();
