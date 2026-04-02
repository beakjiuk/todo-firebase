import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

function normalizeConfig(config) {
  const c = { ...config };
  if (typeof c.databaseURL === "string") {
    c.databaseURL = c.databaseURL.trim();
  }
  return c;
}

const app = initializeApp(normalizeConfig(firebaseConfig));
export const auth = getAuth(app);
export const db = getDatabase(app);
