# 일정관리앱 (todo-firebase)

**라이브 배포:** [https://todo-firebase-jmp8fdjew-beakjiuks-projects.vercel.app/](https://todo-firebase-jmp8fdjew-beakjiuks-projects.vercel.app/)

Firebase 인증·Realtime Database를 쓰는 정적 웹앱입니다. 할 일(달력), 가계부, 노트, 통합 검색, 마이페이지를 제공합니다.

## 기술 스택

- HTML / CSS / JavaScript (모듈)
- Firebase Authentication, Realtime Database
- 배포: Vercel (빌드 시 환경 변수로 `firebase-config.js` 생성)

## 로컬에서 실행

1. 저장소를 클론합니다.
2. `js/firebase-config.template.js`를 복사해 `js/firebase-config.js`로 두고, Firebase 콘솔의 웹 앱 설정 값을 채웁니다.  
   → `firebase-config.js`는 `.gitignore`에 있어 커밋되지 않습니다.
3. 정적 서버로 루트를 엽니다 (예: VS Code Live Server, `npx serve .`).

## Vercel 배포 시

- **Build command:** `npm run build`
- **Output directory:** `.` (저장소의 `vercel.json` 참고)
- **Environment variables:** Firebase 웹 구성과 동일한 이름으로 설정합니다.

| 변수명 | Firebase 콘솔 필드 |
|--------|-------------------|
| `FIREBASE_API_KEY` | apiKey |
| `FIREBASE_AUTH_DOMAIN` | authDomain |
| `FIREBASE_PROJECT_ID` | projectId |
| `FIREBASE_STORAGE_BUCKET` | storageBucket |
| `FIREBASE_MESSAGING_SENDER_ID` | messagingSenderId |
| `FIREBASE_APP_ID` | appId |
| `FIREBASE_DATABASE_URL` | databaseURL |

Firebase **Authentication → 설정 → 승인된 도메인**에 Vercel 도메인(예: `…vercel.app`)을 추가합니다.

## 라이선스

개인 프로젝트용. 필요 시 저장소 소유자 기준으로 정합니다.
