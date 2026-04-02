# Vercel 배포

## 내 사이트 주소(링크) 어디서 보는지

- **Deployments** 탭에서 최근 배포 한 줄을 누르면 **Deployment Details**가 열립니다.  
  그 안 **Domains**에 `…vercel.app` 주소가 여러 개 보일 수 있어요(프로덕션·프리뷰 등).
- 또는 왼쪽 메뉴 **Domains**에서 프로젝트에 연결된 대표 도메인을 볼 수 있습니다.
- Firebase **승인된 도메인**에는 실제로 배포가 성공한 뒤 접속할 주소를 넣으면 됩니다(예: `todo-firebase-xxx.vercel.app`).

## 프로젝트 설정

1. [Vercel](https://vercel.com)에서 GitHub 저장소를 import 합니다.
2. **Framework Preset**: `Other`
3. **Root Directory**: `./` (저장소 루트)
4. **Build Command**: `npm run build`
5. **Output Directory**: `.` (점 하나, 루트 전체를 정적 파일로 배포)
6. **Install Command**: `npm install` (기본값)

## 환경 변수

Vercel 프로젝트 → **Settings** → **Environment Variables**에서 아래 이름으로 넣습니다. 값은 Firebase 콘솔 → 프로젝트 설정 → 일반 → **내 앱** → 웹 앱 구성과 동일하게 맞춥니다.

| Vercel 변수명 | Firebase 콘솔 필드 |
|----------------|---------------------|
| `FIREBASE_API_KEY` | apiKey |
| `FIREBASE_AUTH_DOMAIN` | authDomain |
| `FIREBASE_PROJECT_ID` | projectId |
| `FIREBASE_STORAGE_BUCKET` | storageBucket |
| `FIREBASE_MESSAGING_SENDER_ID` | messagingSenderId |
| `FIREBASE_APP_ID` | appId |
| `FIREBASE_DATABASE_URL` | databaseURL |

- **Production**, **Preview**, **Development** 중 배포에 쓰는 환경에 모두 추가하는 것을 권장합니다.
- 저장 후 **Redeploy** 하면 빌드 단계에서 `js/firebase-config.js`가 생성됩니다.

## Firebase 콘솔

- **Authentication** → **설정** → **승인된 도메인**에 `your-project.vercel.app` 및 사용 중인 도메인을 추가합니다.

## 로컬 개발

- `js/firebase-config.js`는 계속 gitignore 됩니다. `firebase-config.template.js`를 복사해 로컬 파일을 만듭니다.
- `npm run build`는 환경 변수가 없고 이미 `firebase-config.js`가 있으면 그 파일을 덮어쓰지 않습니다.
