import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { ref, set } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";
import { auth, db } from "./firebase-init.js";
import { firebaseConfig } from "./firebase-config.js";
import { isConfiguredFirebase, isValidEmailFormat, isValidNickname } from "./validators.js";

const form = document.getElementById("form");
const authErr = document.getElementById("authErr");
const submitBtn = document.getElementById("submitBtn");
const configBanner = document.getElementById("configBanner");

if (!isConfiguredFirebase(firebaseConfig)) {
  configBanner?.classList.add("visible");
}

function showErr(msg) {
  if (!authErr) return;
  authErr.textContent = msg;
  authErr.classList.add("visible");
}

function hideErr() {
  authErr?.classList.remove("visible");
}

function mapAuthError(code) {
  switch (code) {
    case "auth/email-already-in-use":
      return "이미 사용 중인 이메일입니다. 로그인해 보세요.";
    case "auth/invalid-email":
      return "이메일 형식을 확인해 주세요.";
    case "auth/weak-password":
      return "비밀번호는 6자 이상으로 설정해 주세요.";
    case "auth/invalid-api-key":
      return "Firebase 설정(apiKey 등)을 확인해 주세요.";
    default:
      return "회원가입에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  }
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideErr();

  const email = document.getElementById("email")?.value?.trim() ?? "";
  const nicknameRaw = document.getElementById("nickname")?.value ?? "";
  const nickname = nicknameRaw.trim();
  const password = document.getElementById("password")?.value ?? "";
  const password2 = document.getElementById("password2")?.value ?? "";

  if (!isConfiguredFirebase(firebaseConfig)) {
    showErr("먼저 js/firebase-config.js 파일을 본인 프로젝트 정보로 수정해 주세요.");
    return;
  }

  if (!isValidEmailFormat(email)) {
    showErr("이메일 형식으로 입력해 주세요. (실제 메일이 아니어도 됩니다)");
    return;
  }

  if (!isValidNickname(nickname)) {
    showErr("닉네임은 2~20자이며, 글자·숫자·공백·._- 만 사용할 수 있어요.");
    return;
  }

  if (password.length < 6) {
    showErr("비밀번호는 6자 이상이어야 합니다.");
    return;
  }

  if (password !== password2) {
    showErr("비밀번호와 확인이 일치하지 않습니다.");
    return;
  }

  submitBtn.disabled = true;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const u = cred.user;
    await updateProfile(u, { displayName: nickname });
    await set(ref(db, `users/${u.uid}/profile`), {
      nickname,
      photoURL: "",
      updatedAt: Date.now(),
    });
    window.location.href = "app.html";
  } catch (err) {
    showErr(mapAuthError(err?.code));
  } finally {
    submitBtn.disabled = false;
  }
});
