import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { auth } from "./firebase-init.js";
import { firebaseConfig } from "./firebase-config.js";
import { isConfiguredFirebase, isValidEmailFormat } from "./validators.js";

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
    case "auth/invalid-email":
      return "이메일 형식을 확인해 주세요.";
    case "auth/user-disabled":
      return "비활성화된 계정입니다.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "이메일 또는 비밀번호가 올바르지 않습니다.";
    case "auth/invalid-api-key":
      return "Firebase 설정(apiKey 등)을 확인해 주세요.";
    default:
      return "로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  }
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideErr();

  const email = document.getElementById("email")?.value?.trim() ?? "";
  const password = document.getElementById("password")?.value ?? "";

  if (!isConfiguredFirebase(firebaseConfig)) {
    showErr("먼저 js/firebase-config.js 파일을 본인 프로젝트 정보로 수정해 주세요.");
    return;
  }

  if (!isValidEmailFormat(email)) {
    showErr("이메일 형식으로 입력해 주세요. (예: name@example.com)");
    return;
  }

  submitBtn.disabled = true;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "app.html";
  } catch (err) {
    showErr(mapAuthError(err?.code));
  } finally {
    submitBtn.disabled = false;
  }
});
