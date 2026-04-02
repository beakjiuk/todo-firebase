/**
 * 프로필 사진: 직접 이미지 URL이면 그대로 쓰고,
 * 일반 웹페이지 URL이면 Microlink API로 og:image 등 후보를 받아 절대 경로로 만든 뒤 사용합니다.
 * (브라우저에서 arbitrary 사이트 HTML을 직접 파싱할 수는 없어 CORS 대신 공개 메타 API를 씁니다.)
 */

function probeLoadsAsImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    let done = false;
    const finish = (v) => {
      if (done) return;
      done = true;
      clearTimeout(tid);
      img.onload = null;
      img.onerror = null;
      try {
        img.removeAttribute("src");
      } catch {
        /* ignore */
      }
      resolve(v);
    };
    const tid = window.setTimeout(() => finish(false), 6500);
    img.referrerPolicy = "no-referrer";
    img.onload = () => finish(true);
    img.onerror = () => finish(false);
    img.src = url;
  });
}

function absolutizeImageHref(candidate, basePageUrl) {
  if (!candidate || typeof candidate !== "string") return null;
  const t = candidate.trim();
  if (!t) return null;
  try {
    return new URL(t, basePageUrl).href;
  } catch {
    return null;
  }
}

async function fetchOpenGraphImageUrl(pageUrl) {
  const ctrl = new AbortController();
  const tid = window.setTimeout(() => ctrl.abort(), 12000);
  try {
    const endpoint = `https://api.microlink.io/?url=${encodeURIComponent(pageUrl)}`;
    const res = await fetch(endpoint, { signal: ctrl.signal });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== "success" || !json.data) return null;
    const d = json.data;
    const candidates = [d.image?.url, d.logo?.url, d.screenshot?.url].filter(Boolean);
    for (const c of candidates) {
      const abs = absolutizeImageHref(String(c), pageUrl);
      if (abs && (abs.startsWith("http:") || abs.startsWith("https:"))) return abs;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(tid);
  }
}

/**
 * @param {string} raw 사용자 입력(빈 문자열 허용)
 * @returns {Promise<{ ok: true, url: string } | { ok: false, error: string }>}
 */
export async function resolveProfilePhotoUrl(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) {
    return { ok: true, url: "" };
  }

  let pageUrl;
  try {
    pageUrl = new URL(trimmed);
  } catch {
    return { ok: false, error: "주소 형식을 확인해 주세요." };
  }

  if (pageUrl.protocol !== "http:" && pageUrl.protocol !== "https:") {
    return { ok: false, error: "http(s) 주소만 사용할 수 있어요." };
  }

  const href = pageUrl.href;

  if (await probeLoadsAsImage(href)) {
    return { ok: true, url: href };
  }

  const og = await fetchOpenGraphImageUrl(href);
  if (og) {
    return { ok: true, url: og };
  }

  return {
    ok: false,
    error:
      "이 주소로는 바로 사진을 불러올 수 없어요. 웹페이지에서 대표 이미지를 찾지 못했거나, 링크 차단일 수 있습니다. 이미지 파일 주소(.jpg, .png, .webp 등)를 넣거나 다른 페이지를 시도해 보세요.",
  };
}
