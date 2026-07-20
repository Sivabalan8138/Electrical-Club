# Electrical Club VSB

**🌍 Live Website URLs (Once Deployed):**
- **Student Portal:** [https://electrical-club.vercel.app](https://electrical-club.vercel.app) *(Replace with your actual Vercel link!)*
- **Admin Portal:** [https://electrical-club-admin.vercel.app](https://electrical-club-admin.vercel.app) *(Replace with your actual Vercel link!)*
- **Backend API:** [https://electrical-club-backend.onrender.com](https://electrical-club-backend.onrender.com) *(Replace with your actual Render link!)*

Welcome to the Electrical Club VSB Project! This is a comprehensive full-stack application built for the Electrical Club at VSB Engineering College. It includes a student-facing portal, an admin dashboard, and a robust backend API.

## Project Structure

This repository is organized into three main directories:

1. **`frontend`** (Student Portal)
   - Built with Next.js (React) and Tailwind CSS.
   - Allows students to register for events like ElectroQuest and ThinkBig.
   - Features an AI Chatbot for quick answers about club events.
   - Runs on port `3000` by default.

2. **`admin-portal`** (Admin Dashboard)
   - Built with Next.js (React) and Tailwind CSS.
   - Allows admins to view registrations, manage events, and generate certificates.
   - Runs on port `3001` by default.

3. **`backend`** (Node.js API)
   - Built with Express.js and Prisma ORM.
   - Handles database connections, authentication, and PDF certificate generation.
   - Currently configured to connect to a Neon PostgreSQL database.
   - Runs on port `5000` by default.

## Deployment Guide (How to get your Public Link)

To make this website live on the internet so everyone can access it, you need to deploy the code to a hosting provider.

### 1. Deploy the Backend (Render.com)
The backend must be deployed first so the frontends have an API to talk to.
1. Go to [Render.com](https://render.com) and create an account.
2. Create a new **Web Service**.
3. Connect your GitHub and select this repository.
4. Set the **Root Directory** to `backend`.
5. Set the Build Command to `npm install && npx prisma generate && npm run build`
6. Set the Start Command to `npm run start`
7. Add your `DATABASE_URL` to the Environment Variables.
8. Once deployed, copy your new live Render URL (e.g., `https://electrical-club-api.onrender.com`).

### 2. Deploy the Frontends (Vercel)
1. Go to **[Vercel Deploy](https://vercel.com/new/import?s=https://github.com/Sivabalan8138/Electrical-Club)**.
2. Select the `frontend` folder as the Root Directory.
3. In Environment Variables, add `NEXT_PUBLIC_API_URL` and set it to your new Render backend URL.
4. Click Deploy! Vercel will instantly generate your live, public link.
5. Repeat the exact same process for the `admin-portal` folder.
