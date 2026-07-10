# WhatsApp SaaS Platform

A production-ready Multi-User WhatsApp Messaging SaaS Panel built with React, Node.js, and Baileys.

## Tech Stack
- **Frontend**: Vite + React, Tailwind CSS, Zustand, React Router
- **Backend**: Node.js, Express, Socket.IO, BullMQ, Baileys
- **Database**: MongoDB (Data), Redis (Queues & OTP Cache)

## Prerequisites
- Node.js (v18+)
- MongoDB
- Redis
- Docker (optional)

## Setup Instructions

### 1. Backend Setup
1. `cd backend`
2. `npm install`
3. Rename `.env.example` to `.env` and fill in your MongoDB, Redis, and SMTP credentials.
   > **Note**: If you don't provide SMTP credentials, the app will use a mock Ethereal mail account and log the OTP preview URL in the console.
4. `node index.js`

### 2. Frontend Setup
1. `cd frontend`
2. `npm install`
3. `npm run dev`
4. Access the app at `http://localhost:5173`

### 3. Optional Local Databases with Docker
If you want to run MongoDB and Redis locally with Docker, add a Docker Compose configuration for them in the project root.

## Deployment
1. Build the frontend: `cd frontend && npm run build`
2. Configure Nginx using the provided `nginx.conf`
3. Start the backend using PM2: `pm2 start ecosystem.config.js`
