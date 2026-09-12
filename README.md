🌍 DD WORLD MARKETING

Welcome to DD WORLD MARKETING — a modern digital marketing application built with React, Vite and Capacitor.

🚀 About

DD WORLD MARKETING is the official digital marketing platform for DD WORLD field operations, including Dialog Sayura and Govi Mithuru workflows.

✨ Core Features

- 📱 Android application
- 🌐 Modern web/PWA interface
- ⚡ React + Vite + TypeScript
- 🔌 Capacitor Android integration
- 📍 Verified GPS attendance and location tracking
- 🔐 Firebase email/password authentication
- 🛡️ Owner-controlled employee approval and access status
- 👥 Owner / Team Leader / Agent role-based dashboards
- 💰 Sales capture and Pending → Confirmed verification workflow
- 📊 Sales, attendance and performance summaries
- 🎨 Responsive professional user interface
- 📴 Offline/PWA support
- 🔒 Firestore authorization and anti-tampering validation
- ✅ Customer App Activation uses Pending → Confirmed sale verification and does not persist customer phone numbers in the activation sale record.

🛡️ Security Model

Employee access requires Firebase credential authentication plus an ACTIVE employee record and OWNER-APPROVED employee ID status. Blocked, suspended, exited, rejected or otherwise inactive accounts are denied application access.

The Owner is the ultimate application authority and can manage employee activation/deactivation, access status, role administration, security/activity visibility and other administrative controls provided by the platform. The Owner account itself is protected from normal employee-document modification/deletion rules.

🛠️ Technology

- React
- TypeScript
- Vite
- Capacitor
- Android
- Gradle
- Kotlin / Java
- Firebase Authentication / Firestore

📦 Android App

The Android project is located in:

"android/"

Application ID:

"com.ddworld.marketing.app"

🔧 Development

Install dependencies:

npm install

Build the web application:

npm run build

Sync the Android project:

npx cap sync android

Build the Android APK:

cd android
./gradlew assembleDebug

📱 Project Status

✅ Android build pipeline is passing.

✅ Security hardening and GPS attendance verification have been applied.

🔎 Final QA / real-device validation remains the final release gate. The production APK should be tested on a physical Android device for login, permissions, GPS, attendance, sales, role access, offline recovery and end-to-end data synchronization before public distribution.

👨‍💻 Developer

DD WORLD

---

© 2026 DD WORLD. All rights reserved.
