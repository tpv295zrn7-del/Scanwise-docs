# Deployment Guide

## 1) Environment
Copy `.env.example` to `.env` and set production values.

## 2) Install & start
```bash
npm ci
npm start
```

## 3) Data / migrations
The server initializes SQLite tables on startup. For PostgreSQL migration, replicate schema from `src/app.js` table definitions.

## 4) Stripe setup
- Set `STRIPE_SECRET_KEY`
- Set `STRIPE_WEBHOOK_SECRET`
- Configure webhook endpoint: `POST /api/payments/webhooks/stripe`

## 5) Verification checklist
- `GET /api/health` returns `status: ok`
- Register/login works
- Free-tier scan limit enforced at 10/month
- Premium trial unlocks full feature access
