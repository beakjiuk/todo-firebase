import {
  onAuthStateChanged,
  updateProfile,
  signOut,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { ref, onValue, set, remove } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";
import { auth, db } from "./firebase-init.js";
import { firebaseConfig } from "./firebase-config.js";
import { isConfiguredFirebase, isValidNickname } from "./validators.js";
import { syncSidebarUserChip, initSidebarToggle } from "./sidebar-sync.js";
import { initSidebarSearch } from "./sidebar-search.js";
import { resolveProfilePhotoUrl } from "./photo-url.js";

const form = document.getElementById("profileForm");
const profEmail = document.getElementById("profEmail");
const profNickname = document.getElementById("profNickname");
const profPhoto = document.getElementById("profPhoto");
const profileErr = document.getElementById("profileErr");
const profileSave = document.getElementById("profileSave");
const appError = document.getElementById("appError");
const toast = document.getElementById("toast");
const btnLogout = document.getElementById("btnLogout");
const btnOpenDelete = document.getElementById("btnOpenDelete");
const deleteModal = document.getElementById("deleteModal");
const deletePassword = document.getElementById("deletePassword");
const deleteCancel = document.getElementById("deleteCancel");
const deleteConfirm = document.getElementById("deleteConfirm");
const deleteErr = document.getElementById("deleteErr");

let profileUnsub = null;

function showToast(msg) {
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function showErr(msg) {
  if (!profileErr) return;
  profileErr.textContent = msg;
  profileErr.classList.add("visible");
}

function hideErr() {
  profileErr?.classList.remove("visible");
  if (profileErr) profileErr.textContent = "";
}

function showDeleteErr(msg) {
  if (!deleteErr) return;
  deleteErr.textContent = msg;
  deleteErr.classList.add("visible");
}

function hideDeleteErr() {
  deleteErr?.classList.remove("visible");
  if (deleteErr) deleteErr.textContent = "";
}

function openDeleteModal() {
  hideDeleteErr();
  if (deletePassword) deletePassword.value = "";
  deleteModal?.classList.add("open");
  deleteModal?.setAttribute("aria-hidden", "false");
  deletePassword?.focus();
}

function closeDeleteModal() {
  deleteModal?.classList.remove("open");
  deleteModal?.setAttribute("aria-hidden", "true");
  hideDeleteErr();
  if (deletePassword) deletePassword.value = "";
}

function mapDeleteAuthError(code) {
  switch (code) {
    case "auth/wrong-password":
      return "비밀번호가 올바르지 않습니다.";
    case "auth/too-many-requests":
      return "시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.";
    case "auth/requires-recent-login":
      return "보안을 위해 다시 로그인한 뒤 탈퇴를 시도해 주세요.";
    case "auth/network-request-failed":
      return "네트워크 오류입니다. 연결을 확인해 주세요.";
    default:
      return "탈퇴 처리 중 오류가 났습니다. 잠시 후 다시 시도해 주세요.";
  }
}

function fillFromSnapshot(user, data) {
  if (profEmail) profEmail.value = user.email ?? "";
  const nick =
    (data && typeof data.nickname === "string" && data.nickname.trim()) || user.displayName || "";
  if (profNickname) profNickname.value = nick;
  const photo =
    (data && typeof data.photoURL === "string" && data.photoURL.trim()) ||
    (user.photoURL && String(user.photoURL)) ||
    "";
  if (profPhoto) profPhoto.value = photo;
  syncSidebarUserChip(user, data);
}

function attachProfileForm(uid) {
  if (profileUnsub) {
    profileUnsub();
    profileUnsub = null;
  }
  const pref = ref(db, `users/${uid}/profile`);
  profileUnsub = onValue(pref, (snap) => {
    const user = auth.currentUser;
    if (!user || user.uid !== uid) return;
    fillFromSnapshot(user, snap.val());
  });
}

if (!isConfiguredFirebase(firebaseConfig)) {
  if (appError) {
    appError.textContent = "js/firebase-config.js에 본인 Firebase 설정을 넣은 뒤 다시 열어 주세요.";
    appError.classList.add("visible");
  }
} else {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }
    attachProfileForm(user.uid);
    fillFromSnapshot(user, null);
  });
}

btnLogout?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

initSidebarToggle();
initSidebarSearch();

btnOpenDelete?.addEventListener("click", openDeleteModal);
deleteCancel?.addEventListener("click", closeDeleteModal);
deleteModal?.addEventListener("click", (e) => {
  if (e.target === deleteModal) closeDeleteModal();
});

deleteConfirm?.addEventListener("click", async () => {
  hideDeleteErr();
  const user = auth.currentUser;
  if (!user) return;

  if (!user.email) {
    showDeleteErr("이메일·비밀번호로 가입한 계정만 이 화면에서 탈퇴할 수 있어요.");
    return;
  }

  const password = deletePassword?.value ?? "";
  if (!password) {
    showDeleteErr("비밀번호를 입력해 주세요.");
    return;
  }

  deleteConfirm.disabled = true;
  try {
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);

    if (profileUnsub) {
      profileUnsub();
      profileUnsub = null;
    }

    const uid = user.uid;
    await remove(ref(db, `users/${uid}`));

    try {
      await deleteUser(user);
    } catch (delErr) {
      showDeleteErr(
        "저장 데이터는 삭제했지만 계정 삭제에 실패했습니다. Firebase 콘솔 → Authentication에서 해당 사용자를 삭제해 주세요.",
      );
      return;
    }

    closeDeleteModal();
    window.location.href = "index.html";
  } catch (err) {
    if (err?.code === "PERMISSION_DENIED") {
      showDeleteErr("저장 데이터 삭제에 실패했습니다. 네트워크와 Database 규칙을 확인해 주세요.");
    } else {
      showDeleteErr(mapDeleteAuthError(err?.code));
    }
  } finally {
    deleteConfirm.disabled = false;
  }
});

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideErr();
  const user = auth.currentUser;
  if (!user) return;

  const nickname = profNickname?.value?.trim() ?? "";
  const photoRaw = profPhoto?.value?.trim() ?? "";

  if (!isValidNickname(nickname)) {
    showErr("닉네임은 2~20자이며, 글자·숫자·공백·._- 만 사용할 수 있어요.");
    return;
  }

  profileSave.disabled = true;
  try {
    const photoResult = await resolveProfilePhotoUrl(photoRaw);
    if (!photoResult.ok) {
      showErr(photoResult.error);
      return;
    }
    const photoFinal = photoResult.url;
    if (profPhoto) profPhoto.value = photoFinal;

    await updateProfile(user, {
      displayName: nickname,
      photoURL: photoFinal || null,
    });
    await set(ref(db, `users/${user.uid}/profile`), {
      nickname,
      photoURL: photoFinal,
      updatedAt: Date.now(),
    });
    syncSidebarUserChip(user, { nickname, photoURL: photoFinal });

    const resolvedFromPage = photoRaw && photoFinal && photoRaw.trim() !== photoFinal;
    showToast(resolvedFromPage ? "페이지에서 이미지를 찾아 저장했습니다." : "저장했습니다.");
  } catch {
    showErr("저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
  } finally {
    profileSave.disabled = false;
  }
});
