/**
 * HTML 파싱 직후 동기 실행 — module 보다 먼저 돌아서 ? 깜빡임을 줄임.
 * 키 이름은 sidebar-sync.js 와 동일해야 함.
 */
(function () {
  var LAST_UID = "todoApp.lastProfileUid";
  var CACHE_PREFIX = "todoApp.sidebarProfile.v1:";
  try {
    var uid = localStorage.getItem(LAST_UID);
    if (!uid) return;
    var raw = localStorage.getItem(CACHE_PREFIX + uid);
    if (!raw) return;
    var c = JSON.parse(raw);
    if (!c || typeof c !== "object") return;

    var nickEl = document.getElementById("userNickname");
    var av = document.getElementById("profileAvatar");
    if (typeof c.nickname === "string" && c.nickname.trim() && nickEl) {
      nickEl.textContent = c.nickname.trim();
    }
    if (typeof c.photoURL === "string" && c.photoURL.trim() && av) {
      av.textContent = "";
      av.classList.add("app-avatar--photo");
      av.style.backgroundImage = "url(" + JSON.stringify(c.photoURL.trim()) + ")";
    }
  } catch (e) {
    /* ignore */
  }
})();
