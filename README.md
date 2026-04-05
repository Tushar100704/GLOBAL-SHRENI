# Global Shreni Service Marketplace

Full-stack app with:
- React + Vite frontend
- Express backend (`/server`)
- Capacitor Android app build (APK)
- Online-first APIs with offline fallback
- Marketplace module: Home, Jobs, Post Work, Messages, Profile, Notifications
- AI matching + rank-based profile scoring

## 1. Install

```bash
npm install
```

## 2. Run Web + Backend (Development)

```bash
npm run dev
```

This starts:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:4000/api`

Health check:

```bash
curl http://localhost:4000/api/health
```

## 3. Core App Flows

- Bottom navigation:
  - `Home`
  - `Jobs`
  - `Post Work`
  - `Messages`
  - `Profile`
- Job lifecycle:
  - Post job -> Apply -> Accept -> Message -> Mark completed
- Service lifecycle:
  - Search partner -> Book -> Pay -> Track
- Notifications:
  - Application updates, chat updates, system updates
- Rank system:
  - Profile rank computed from ratings, completed work, acceptance rate

## 4. Login Notes

- OTP flow works through backend `/api/auth/send-otp` and `/api/auth/verify-otp`.
- In local/dev mode, demo OTP is returned in API response.
- Google sign-in endpoint is `/api/auth/google`
  - Real token verification works when `GOOGLE_CLIENT_ID` and valid Google `idToken` are provided.
  - Without production OAuth config, fallback email-based Google sign-in is enabled in non-production mode.

## 5. Android Build (APK)

Build web + sync + Android release:

```bash
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleRelease
```

APK output:

`android/app/build/outputs/apk/release/app-release.apk`

## 6. Access Backend From Android Device

- Emulator default backend URL works with `http://10.0.2.2:4000/api`.
- Real phone must use your machine LAN IP, for example:
  `http://192.168.1.100:4000/api`
- In app Auth screen open **Backend settings** and set/test URL.

## 7. Production Checklist

- Use HTTPS backend URL.
- Configure real OTP provider.
- Configure Google OAuth credentials and app SHA keys.
- Disable demo OTP and insecure Google fallback in production:
  - `ENABLE_DEMO_OTP=false`
  - `ALLOW_INSECURE_GOOGLE_MOCK=false`
