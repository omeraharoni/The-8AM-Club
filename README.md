# The 8AM Club ☀️

**Where the early birds compete.**

The 8AM Club is a premium full-stack social productivity application designed to gamify healthy habits. Compete with friends, join exclusive clubs, and climb the leaderboard by logging your morning wake-ups, daily steps, and workouts.

---

## 🚀 Key Features

* **📱 iOS-Style Gesture UI:** A high-end, fluid carousel for logging habits featuring high-inertia scrolling and spotlight focus transitions.
* **🌙 Smart Sleep Tracking:** Intelligent logging that auto-detects "Wake Up" mode in the morning and switches to "Manual Cycle" tracking at night.
* **🏆 Club Leaderboards:** Create or join private clubs to compete with your social circle based on weekly consistency and points.
* **📸 Story Feed:** Social accountability through progress sharing with proof photos and real-time updates from club members.
* **📈 Personal Mastery:** Comprehensive dashboard to track your streaks, habit consistency, and 30-day health statistics.

---

## 🛠️ Technology Stack

### Frontend
* **Core:** React 18, TypeScript, Vite
* **Animations:** Framer Motion (for that native mobile feel)
* **Icons:** Lucide-React
* **Data Fetching:** TanStack Query (React Query)
* **Styling:** Custom Vanilla CSS (Optimized for a lightweight, premium look)

### Backend
* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** MongoDB with Mongoose ODM
* **Auth:** JWT (JSON Web Tokens) with secure password hashing

---

## 📦 Deployment & Configuration

The project is optimized for deployment on **Render**.

* **Backend:** Serves the production frontend build from `client/dist`.
* **Routing:** Handles SPA (Single Page Application) routing with a catch-all fallback to `index.html`.
* **Connectivity:** Environment-aware DNS configuration for seamless cloud database connectivity.

---

## ⚙️ How to Run Locally

### 1. Clone the repository
```bash
git clone https://github.com/omeraharoni/The-8AM-Club.git
cd the-8am-club
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the root:
```env
PORT=5000
MONGODB_URI=your_mongodb_uri
SECRET_KEY=your_jwt_secret
```

### 4. Start the development server
```bash
# Root directory (Backend)
npm start

# client directory (Frontend)
cd client
npm run dev
```

## 📸 Core Design Philosophy

The 8AM Club focuses on a **"Mobile-First"** approach. Every interaction—from the scroll-snapping carousel to the 10-minute precision time rollers—is designed to feel native and responsive, providing a high-end experience on any device.

---
*Built for the ambitious.*
