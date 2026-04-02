/** 사이드바 프로필 칩(닉네임·이메일·아바타) 동기화 — app / profile 공통 */

const CACHE_PREFIX = "todoApp.sidebarProfile.v1:";
/** sidebar-paint-cache.js 와 로그아웃 시 함께 제거 */
const LAST_PROFILE_UID_KEY = "todoApp.lastProfileUid";

function cacheKey(uid) {
  return `${CACHE_PREFIX}${uid}`;
}

function readProfileCache(uid) {
  if (!uid) return null;
  try {
    const raw = localStorage.getItem(cacheKey(uid));
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (!c || typeof c !== "object") return null;
    return {
      nickname: typeof c.nickname === "string" ? c.nickname : "",
      photoURL: typeof c.photoURL === "string" ? c.photoURL : "",
    };
  } catch {
    return null;
  }
}

function writeProfileCache(uid, nickname, photoURL) {
  if (!uid) return;
  try {
    localStorage.setItem(
      cacheKey(uid),
      JSON.stringify({
        nickname: nickname ?? "",
        photoURL: photoURL ?? "",
      }),
    );
  } catch {
    /* quota / private mode */
  }
}

/** 로그아웃 등에서 호출 가능 */
export function clearSidebarProfileCache(uid) {
  if (!uid) return;
  try {
    localStorage.removeItem(cacheKey(uid));
    localStorage.removeItem(LAST_PROFILE_UID_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * @param {import("firebase/auth").User | null} user
 * @param {null | Record<string, unknown>} profile RTDB users/{uid}/profile 값. null 이면 아직 없거나 스냅 없음 → 로컬 캐시로 채움
 */
export function syncSidebarUserChip(user, profile) {
  const userNickname = document.getElementById("userNickname");
  const profileAvatar = document.getElementById("profileAvatar");

  const uid = user?.uid ?? null;
  const fromServer = profile != null && typeof profile === "object";
  const cached = !fromServer && uid ? readProfileCache(uid) : null;

  const nickname =
    (fromServer &&
      typeof profile.nickname === "string" &&
      profile.nickname.trim()) ||
    (!fromServer && cached?.nickname?.trim()) ||
    user?.displayName ||
    (user?.email ? user.email.split("@")[0] : "") ||
    "사용자";

  const photoRaw =
    (fromServer && typeof profile.photoURL === "string" && profile.photoURL.trim()) ||
    (!fromServer && cached?.photoURL?.trim()) ||
    (user?.photoURL && String(user.photoURL).trim()) ||
    "";

  if (userNickname) userNickname.textContent = nickname;

  if (profileAvatar) {
    const initial = (Array.from(nickname.trim())[0] || "?").toUpperCase();
    if (photoRaw) {
      profileAvatar.textContent = "";
      profileAvatar.classList.add("app-avatar--photo");
      profileAvatar.style.backgroundImage = `url(${JSON.stringify(photoRaw)})`;
    } else {
      profileAvatar.textContent = initial;
      profileAvatar.classList.remove("app-avatar--photo");
      profileAvatar.style.backgroundImage = "";
    }
  }

  if (uid && fromServer) {
    writeProfileCache(uid, nickname, photoRaw);
  }

  if (uid) {
    try {
      localStorage.setItem(LAST_PROFILE_UID_KEY, uid);
    } catch {
      /* ignore */
    }
  }
}

export function initSidebarToggle() {
  const shell = document.getElementById("appShell");
  const btn = document.getElementById("sidebarToggle");
  btn?.addEventListener("click", () => {
    shell?.classList.toggle("app-shell--collapsed");
    const collapsed = shell?.classList.contains("app-shell--collapsed");
    btn?.setAttribute("aria-expanded", collapsed ? "false" : "true");
    btn?.setAttribute("aria-label", collapsed ? "사이드바 펼치기" : "사이드바 접기");
  });
}
