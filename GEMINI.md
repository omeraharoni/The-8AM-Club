# The 8AM Club - Project Context

## Project Overview
**The 8AM Club** is a full-stack social productivity and habit-tracking application. It allows users to log daily activities, earn points, join groups, and compete on weekly leaderboards.

### Core Technologies
- **Backend:** Node.js, Express.js, MongoDB (Mongoose), JWT Authentication, Bcrypt.js.
- **Frontend:** React (Vite, TypeScript), Framer Motion (for animations), Axios, React Router, Lucide-React (icons).
- **Deployment:** The root Express server is designed to serve the built frontend from `client/dist`.

### Architecture
- **Monorepo Structure:** The root directory contains the backend server (`index.js`), while the `client/` directory holds the React frontend.
- **Data Models:**
  - `User`: Handles authentication and profile.
  - `Activity`: Logs user actions (workout, steps, sleep, wakeup) and associated points.
  - `Group`: Represents user-created communities.
  - `Membership`: Tracks users within groups.
  - `Invitation`: Manages group joining requests.

---

## Building and Running

### Prerequisites
- Node.js (>= 20.0.0)
- MongoDB instance (local or Atlas)

### Environment Variables
Create a `.env` file in the root directory with:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
SECRET_KEY=your_jwt_secret
```

### Commands
- **Install All Dependencies:**
  ```bash
  npm install
  ```
  *(This triggers `postinstall` to also install dependencies in the `client` folder.)*

- **Build Frontend:**
  ```bash
  npm run build
  ```
  *(Builds the React app into `client/dist`.)*

- **Start Server:**
  ```bash
  npm start
  ```

- **Frontend Development:**
  ```bash
  cd client
  npm run dev
  ```

---

## Development Conventions

### Architectural Strategy: From Studio to House
To ensure scalability, the project is moving toward a modular structure:
1. **Backend (MVC):** Logic is being separated into `models`, `controllers`, `routes`, and `middleware` folders.
2. **Frontend (Componentization):** Breaking down `App.tsx` into reusable components in `src/components/` and `src/features/`.
3. **Infrastructure:** Replacing polling with React Query and using React Router for navigation.

### API Design
- All backend API endpoints are prefixed with `/api/`.
- Authentication is handled via a Bearer token in the `Authorization` header.
- Business logic (like point calculation) is being extracted into services.

### Frontend Patterns
- Uses **TypeScript** for type safety.
- **Framer Motion** is used for UI transitions and interactive elements.
- Routing is managed by **React Router**.

### Testing
- Currently, no automated tests are defined (placeholder in `package.json`).
- Manual verification is done via the `/health` and `/debug-dist` endpoints.

### Code Style
- Backend follows CommonJS modules (`require`).
- Frontend follows ES Modules (`import/export`) and React functional components.
