# ScanWise Backend API

Run:

```bash
npm install
npm start
```

Base URL: `http://localhost:3001`

## Authentication
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/password/forgot`
- `POST /api/auth/password/reset`
- `GET /api/auth/me`
- `PUT /api/auth/me`

## Profiles
- `GET /api/profiles`
- `POST /api/profiles` (max 5)
- `PUT /api/profiles/:id`

## Payments / Subscriptions
- `POST /api/subscriptions/start` (premium monthly/annual + 14-day trial)
- `GET /api/subscriptions/status`
- `POST /api/subscriptions/cancel`
- `POST /api/subscriptions/upgrade`
- `GET /api/subscriptions/invoices`
- `POST /api/payments/webhooks/stripe`

## Gamification
- `POST /api/gamification/events` (`incident_report`, `community_vote`, `verification`)
- `GET /api/gamification/me`
- `GET /api/gamification/leaderboard`

## Core Product Endpoints
- `GET /api/products/:barcode`
- `POST /api/scans`
- `GET /api/scans/history`
- `GET /api/alternatives/:barcode?goals=lower_sugar,higher_protein`
- `GET /api/saved-items`
- `POST /api/saved-items`
- `DELETE /api/saved-items/:barcode`

## Community Corrections
- `POST /api/corrections`
- `POST /api/corrections/:id/vote`
- `POST /api/corrections/:id/verify` (medical role)
- `GET /api/corrections`

## Security & Error Handling
- JWT verification middleware for protected endpoints
- Input validation with Zod on all write routes
- Per-IP rate limiting
- Configurable CORS allow-list
- Structured JSON error responses

## Webhook Notes
Stripe webhook supports:
- `invoice.payment_succeeded`
- `customer.subscription.deleted`

In local/dev mode without Stripe signature headers, JSON payloads are accepted for easier testing.
