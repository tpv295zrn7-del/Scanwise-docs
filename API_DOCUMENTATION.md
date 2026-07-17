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
- `POST /api/subscriptions/start`
- `GET /api/subscriptions/status`
- `POST /api/subscriptions/cancel`
- `POST /api/subscriptions/upgrade`
- `GET /api/subscriptions/invoices`
- `POST /api/payments/webhooks/stripe`

## Core Product Endpoints
- `GET /api/products/:barcode`
- `GET /api/products/:barcode/incidents`
- `POST /api/scans`
- `GET /api/scans/history`
- `GET /api/alternatives/:barcode?goals=lower_sugar,higher_protein`
- `GET /api/search/products`
- `GET /api/saved-items`
- `POST /api/saved-items`
- `DELETE /api/saved-items/:barcode`

## Community Corrections
- `POST /api/corrections`
- `POST /api/corrections/:id/vote`
- `POST /api/corrections/:id/verify` (medical role)
- `GET /api/corrections`

## Incidents
- `POST /api/incidents`
- `POST /api/incidents/:id/vote`
- `GET /api/incidents/search`
- `GET /api/incidents/analytics`

## Medical Dashboard
- `POST /api/medical/register`
- `GET /api/medical/pending-verifications`
- `POST /api/medical/verify/:incidentId`
- `POST /api/medical/reject/:incidentId`
- `GET /api/medical/profile`
- `GET /api/medical/leaderboard`

## Insights
- `GET /api/insights/engagement`
- `GET /api/insights/goal-progress`
- `GET /api/insights/allergen-alerts`
- `GET /api/insights/personalized-alternatives`
- `GET /api/insights/export`

## B2B API
- `POST /api/b2b/keys` (admin)
- `GET /api/b2b/allergen-trends`
- `GET /api/b2b/product-insights/:barcode`
- `GET /api/b2b/category-analysis`
- `GET /api/b2b/regional-insights`

## Bulk Import
- `POST /api/import/products` (admin)
- `GET /api/import/logs` (admin)

## Admin Dashboard
- `GET /api/admin/users`
- `PATCH /api/admin/users/:id/role`
- `DELETE /api/admin/users/:id`
- `GET /api/admin/products/pending-review`
- `PATCH /api/admin/products/:id/approve`
- `DELETE /api/admin/products/:id`
- `GET /api/admin/corrections/pending`
- `PATCH /api/admin/corrections/:id/status`
- `GET /api/admin/analytics/dashboard`
- `GET /api/admin/analytics/incidents-by-allergen`
- `GET /api/admin/analytics/user-growth`
- `GET /api/admin/analytics/engagement`
- `GET /api/admin/health`

## Gamification
- `POST /api/gamification/events`
- `GET /api/gamification/me`
- `GET /api/gamification/leaderboard`

## Health
- `GET /api/health`
- `GET /api/docs`

## Security & Error Handling
- JWT verification middleware for protected endpoints
- Admin-only, medical-only, and B2B API-key middleware
- Input validation with Zod on write routes
- Per-IP rate limiting
- Configurable CORS allow-list
- Structured JSON error responses
