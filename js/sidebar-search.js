export function initSidebarSearch() {
  const form = document.getElementById("sidebarSearchForm");
  const input = document.getElementById("sidebarSearchInput");
  if (!form || !input) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (q) {
      window.location.href = `search.html?q=${encodeURIComponent(q)}`;
    } else {
      window.location.href = "search.html";
    }
  });
}

/** 검색 결과 페이지에서 주소창 q와 입력창 동기화 */
export function syncSidebarSearchFromQuery() {
  const input = document.getElementById("sidebarSearchInput");
  if (!input) return;
  const q = new URLSearchParams(window.location.search).get("q") || "";
  input.value = q;
}
