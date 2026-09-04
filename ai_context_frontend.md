# 🧠 AI Context & Rules: Carteira Estudantil Web

## 1. Project Overview
**System:** Carteira Estudantil Web IFPE
**Role:** Frontend & UX Engineering
**Main Stack:**
- **Frontend & UX:** Next.js, Tailwind CSS
- **Backend:** FastAPI (Python), SQLAlchemy
- **Database:** PostgreSQL
- **Infrastructure:** Docker & Docker Compose

## 2. Core Directives for the AI Agent
*   **Communication Language:** You must converse and explain things to me in **Portuguese**, but all generated code, commit messages, PR titles, and branch names must strictly remain in **English**.
*   **Code Quality:** Keep code modular, accessible (a11y), and strictly typed (TypeScript).

## 3. Git Workflow & Version Control Rules
1.  **Branching:** Always branch off from `master`. Use the format `<type>/<description>`. Examples: `feat/student-dashboard`, `chore/add-dockerfile`.
2.  **Conventional Commits:** Follow the Conventional Commits specification (v1.0.0). 
3.  **Language Policy:** PR titles, PR descriptions, and commit messages MUST be written entirely in English.
4.  **Atomic PRs:** Keep Pull Requests small, atomic, and focused on a single feature or bug fix.
5.  **AI Code Review Checkpoint:** Before committing and opening a PR, the developer will provide the diff to you. You MUST act as a reviewer, checking for bugs, security issues, performance, and style compliance. The code can only be merged after your formal approval.

## 4. Official Project Documentation Summary
The project follows strict guidelines defined in our official Wiki. You must adhere to these constraints:

### A. Execution & Configuration Guide (POP)
*   **Containerization:** The entire ecosystem runs fully containerized via `docker compose up --build -d`.
*   **Ports:** Frontend runs on `3000` (`http://localhost:3000`). Backend API runs on `8000` (`http://localhost:8000`).
*   **Environment Variables:** The frontend requires a `.env` file at the root containing:
    ```env
    NEXT_PUBLIC_API_URL=http://localhost:8000
    PORT=3000
    ```

### B. Secure Development Guidelines (OWASP Aligned)
*   **Authentication & Roles:** JWT via OAuth2. System uses RBAC (Aluno, Portaria/Catraca, Administrador). Store JWT securely (prefer `HttpOnly Cookies` for production over `localStorage` when possible).
*   **Data Validation & Sanitization:** Never trust client-side data. Sanitize all inputs to prevent XSS before rendering or sending to the backend. Use Next.js security headers (Helmet/CSP).
*   **File Uploads (Profile Pictures):** Strictly accept only `.jpeg` or `.png`. Limit sizes to a maximum of 2MB on the client side before sending payloads to the API.
*   **Error Handling:** Implement generic visual feedback for authentication failures (e.g., show "Invalid credentials" instead of "User not found").
*   **No Sensitive Data Exposure:** Never expose internal API IDs, full token strings, or unhashed sensitive data in the frontend UI or console logs.