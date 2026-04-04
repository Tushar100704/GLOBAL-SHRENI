# ARISE Guardian

AI-powered Web3 security vault.

## Features

- Dashboard with wallet overview, risk score, alerts
- Wallet risk analysis
- AI security assistant chat
- Smart contract vulnerability scanner
- JWT-based authentication

## Tech Stack

- Frontend: Next.js, TypeScript, Tailwind CSS, shadcn/ui
- Backend: FastAPI, Python
- Database: MongoDB
- AI: OpenAI API

## Setup

### Backend

1. cd backend
2. pip install -r requirements.txt
3. Set environment variables in .env:
   ```
   OPENAI_API_KEY=your_openai_api_key
   MONGODB_URL=mongodb://localhost:27017
   SECRET_KEY=your_secret_key
   ```
   - If MongoDB is not available locally, the backend falls back to in-memory demo storage.
   - If OPENAI_API_KEY is not set, the chat endpoint returns mock AI guidance.
4. python main.py

### Frontend

1. cd frontend
2. npm install
3. Configure API URL in .env.local:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
4. npm run dev
   - If port 3000 is busy, Next.js will automatically use the next available port like 3001.

## Running the Application

1. Start the backend (as above)
2. Start the frontend (as above)
3. Open http://localhost:3000
4. Register/Login to access the dashboard

## Deployment

- Frontend: Deploy to Vercel
- Backend: Deploy to Render or Railway
