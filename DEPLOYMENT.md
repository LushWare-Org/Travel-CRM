# Travel CRM Deployment Guide

This guide outlines the steps to deploy your Travel CRM application (Management Frontend + Node.js Server).

## 1. Prerequisites
- **GitHub Account**: Your code must be pushed to a GitHub repository (with separate folders for `Management` and `Server` or the root).
- **MongoDB Atlas Account**: You already have this set up.
- **Render.com Account**: For hosting the Backend (Server).
- **Vercel Account**: For hosting the Frontend (Management).

---

## 2. Backend Deployment (Render.com)
We recommend **Render** for the backend because it supports Docker/Node environments required for Puppeteer (PDF generation) and scheduled tasks (CRON).

### Steps:
1.  Log in to [Render.com](https://render.com).
2.  Click **New +** -> **Web Service**.
3.  Connect your GitHub repository.
4.  **Configuration**:
    *   **Root Directory**: `Server` (Important! This tells Render the app is in the Server subfolder).
    *   **Runtime**: Node
    *   **Build Command**: `npm install`
    *   **Start Command**: `npm start`
    *   **Instance Type**: For production, select "Starter" ($7/mo) to keep the server awake for CRON jobs. "Free" works for testing but spins down on inactivity.

### Environment Variables:
Go to the **Environment** tab in Render and add the following keys from your local `.env`:
*   `NODE_ENV`: `production`
*   `PORT`: `10000` (Render acts on this port usually, or standard 5000)
*   `MONGODB_URI`: (Your Atlas production connection string)
*   `EMAIL_HOST`: `smtp.gmail.com`
*   `EMAIL_USER`: (Your email)
*   `EMAIL_PASSWORD`: (Your App Password)
*   `EMAIL_FROM`: ` "Company Name" <email@example.com>`
*   `JWT_SECRET`: (Generate a strong random string)
*   `CLIENT_URL`: `https://your-frontend.vercel.app` (You'll update this after deploying frontend)
*   `CLOUDINARY_...`: (Your Cloudinary keys)
*   **Puppeteer Config**: Add `PUPPETEER_CACHE_DIR` = `/opt/render/project/.chrome` to ensure Chrome installs correctly.

### Puppeteer on Render (Important for PDFs):
For Puppeteer to work on Render, you may need to add a "Secret File" or use a Dockerfile, but for standard Node environments, ensure you add the Environment Variable:
`PUPPETEER_SKIP_CHROMIUM_DOWNLOAD`: `false`
Or use a custom build command: `npm install && npx puppeteer browsers install chrome`

---

## 3. Frontend Deployment (Vercel)
Vercel is optimal for React/Vite apps.

### Steps:
1.  Log in to [Vercel](https://vercel.com).
2.  Click **Add New...** -> **Project**.
3.  Import your GitHub repository.
4.  **Configuration**:
    *   **Root Directory**: Click "Edit" and select `Management`.
    *   **Framework Preset**: Vite (should detect automatically).
    *   **Build Command**: `vite build` (default).
    *   **Output Directory**: `dist` (default).

### Environment Variables:
Under **Environment Variables**, add:
*   `VITE_API_URL`: The URL of your deployed Backend (e.g., `https://travel-crm-server.onrender.com/api/v1`).
*   `VITE_COMPANY_...`: Any branding variables you want to override for production.

---

## 4. Final Connection
1.  Once Vercel deploys, copy the provided domain (e.g., `https://travel-crm-management.vercel.app`).
2.  Go back to your **Render Backend Dashboard**.
3.  Update the `CLIENT_URL` and `MANAGEMENT_URL` environment variables to match your new Vercel domain.
4.  **Restart** the Render service.

## 5. Troubleshooting
*   **CORS Errors**: If you see CORS errors in the browser console, double-check that `CLIENT_URL` in the backend matches the Vercel URL exactly (no trailing slash).
*   **PDF Generation Fails**: Check Render logs. If Puppeteer crashes, you may need to switch Render to use a **Dockerfile** based deployment instead of a Node environment.

### Dockerfile for Backend (Optional/Advanced)
If standard deployment fails for PDF generation, create a file named `Dockerfile` in the `Server` folder with this content:

```dockerfile
FROM ghcr.io/puppeteer/puppeteer:latest
USER root
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npm", "start"]
```
Then in Render settings, choose "Docker" as the Runtime.
