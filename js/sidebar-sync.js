/** 사이드바 프로필 칩(닉네임·이메일·아바타) 동기화 — app / profile 공통 */
export function syncSidebarUserChip(user, profile) {
  const userNickname = document.getElementById("userNickname");
  const userEmail = document.getElementById("userEmail");
  const profileAvatar = document.getElementById("profileAvatar");

  const nickname =
    (profile && typeof profile.nickname === "string" && profile.nickname.trim()) ||
    user.displayName ||
    (user.email ? user.email.split("@")[0] : "사용자");

  if (userNickname) userNickname.textContent = nickname;
  if (userEmail) userEmail.textContent = user.email ?? "";

  const photoRaw =
    (profile && typeof profile.photoURL === "string" && profile.photoURL.trim()) ||
    (user.photoURL && String(user.photoURL).trim()) ||
    "";

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
