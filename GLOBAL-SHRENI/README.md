# 🚀 Global Shreni – AI-Powered Service Marketplace

**Tagline:** Book Any Service Instantly with AI

---

## 🧠 Overview

Global Shreni is a full-stack AI-powered service marketplace that enables users to discover, compare, and book local services through a conversational interface.

Instead of manually searching across multiple platforms, users simply type their requirement—such as *“find a vet near me”* or *“book an electrician tomorrow”*—and the system intelligently understands the request, recommends verified Service Partners, and enables instant booking.

The platform combines a ChatGPT-style assistant with structured service discovery, real-time availability, transparent pricing, and seamless booking.

---

## ⚙️ Tech Stack

* **Frontend:** React + Vite
* **Backend:** Node.js + Express (`/server`)
* **Mobile App:** Capacitor (Android APK)
* **APIs:** Online-first with offline fallback
* **Authentication:** OTP + Google Sign-In
* **AI Layer:** Intent-based matching + ranking system

---

## 📱 Core Product Modules

### 👤 Customer Experience

* AI chat-based service search
* Location-based discovery
* Service Partner profiles (ratings, pricing, availability)
* Instant booking flow
* Secure payments
* Live job tracking
* Notifications system

### 🧑‍🔧 Service Partner (Pro Dashboard)

* Profile onboarding & KYC
* Task manager (incoming jobs, accept/reject)
* Availability scheduling
* Earnings dashboard
* Ratings & reviews system
* Performance-based ranking

---

## 🔄 Core App Flows

### 🔹 Service Flow

Search → AI Recommendation → View Partner → Book → Pay → Track → Complete

### 🔹 Job Marketplace Flow

Post Work → Applications → Accept → Chat → Complete

### 🔹 Rank System

Dynamic profile ranking based on:

* Ratings
* Completed jobs
* Acceptance rate
* Response time

---

## 🧩 Features

* 🤖 AI-powered conversational interface
* 📍 Location-based service discovery (map integration ready)
* ⭐ Verified Service Partners with ratings & reviews
* ⚡ Instant booking with real-time availability
* 💳 Transparent pricing & payment system
* 📡 Live tracking & notifications
* 📊 Rank-based visibility system
* 💬 In-app messaging

---

## 🔐 Authentication

* OTP-based login (`/api/auth/send-otp`, `/api/auth/verify-otp`)
* Google Sign-In (`/api/auth/google`)
* Demo OTP supported in development mode

---

## 🛠️ Setup & Development

### 1. Install dependencies

```bash
npm install
```

### 2. Run frontend + backend

```bash
npm run dev
```

* Frontend: http://localhost:5173
* Backend: http://localhost:4000/api

### Health check:

```bash
curl http://localhost:4000/api/health
```

---

## 📦 Android Build (APK)

```bash
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleRelease
```

📍 Output:

```
android/app/build/outputs/apk/release/app-release.apk
```

---

## 🌐 Backend Access (Mobile)

* Emulator:
  `http://10.0.2.2:4000/api`

* Real device (LAN):
  `http://<your-local-ip>:4000/api`

---

## 🚀 Production Checklist

* Enable HTTPS backend
* Integrate real OTP provider
* Configure Google OAuth (Client ID + SHA keys)
* Disable dev fallbacks:

  * `ENABLE_DEMO_OTP=false`
  * `ALLOW_INSECURE_GOOGLE_MOCK=false`

---

## 💰 Business Model

* Commission per booking
* Subscription plans for Service Partners
* Featured listings & promotions

---

## 🎯 Target Market

Urban and semi-urban users seeking fast, reliable access to local services such as:

* Home services
* Repairs & maintenance
* Pet care
* Healthcare

---

## 🌍 Vision

To become the default AI assistant for discovering and booking any service—making local services as easy as sending a message.

---

## 🎯 Mission

To simplify service access using AI while empowering local Service Partners with consistent demand, digital tools, and growth opportunities.

---

## 🔥 Key Differentiation

Unlike traditional platforms, Global Shreni is:

* AI-first (not search-first)
* Conversation-driven
* Fast decision-making (less friction)
* Trust-focused with ranking & verification

---

## 📈 Future Scope

* AI auto-booking & smart matching
* Voice assistant integration
* Multi-city expansion
* Advanced analytics for Service Partners

---

## 👨‍💻 Founder

**Tushar Ingle**
Engineer | Builder | Founder – Global Shreni

---

## ⭐ Status

🚧 MVP in development – actively building core features and onboarding early users.
