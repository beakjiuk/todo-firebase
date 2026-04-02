/**
 * 로컬: 이 파일을 복사해 js/firebase-config.js 로 저장한 뒤 값을 채우세요 (git 에 올리지 않음).
 *
 * Vercel: 환경 변수만 설정하면 빌드 시 firebase-config.js 가 생성됩니다.
 * 이름: FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID,
 *       FIREBASE_STORAGE_BUCKET, FIREBASE_MESSAGING_SENDER_ID, FIREBASE_APP_ID,
 *       FIREBASE_DATABASE_URL
 * 배포·환경 변수: README.md 참고
 */
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
};
