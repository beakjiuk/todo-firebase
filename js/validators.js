const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmailFormat(value) {
  return EMAIL_RE.test(String(value || "").trim());
}

export function isConfiguredFirebase(config) {
  if (!config || typeof config !== "object") return false;
  const apiKey = config.apiKey;
  return typeof apiKey === "string" && apiKey.length > 0 && !apiKey.includes("YOUR_API_KEY");
}

/** 2~20자, 글자·숫자·공백·_- 만 허용 */
export function isValidNickname(value) {
  const s = String(value || "").trim();
  if (s.length < 2 || s.length > 20) return false;
  return /^[\p{L}\p{N}\s._-]+$/u.test(s);
}
