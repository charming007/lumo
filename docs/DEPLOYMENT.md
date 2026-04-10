# Lumo deployment guide

## Target stack
- LMS web: Vercel
- API: Railway

## 1. Deploy API to Railway

### Service root
`services/api`

### Required environment variables
- `PORT=4000`
- `DATABASE_URL=postgresql://...` (when database is enabled)

### Railway notes
- Current API is an Express service.
- For production, switch `start:dev` to a non-watch production start command once the API is hardened.
- If using PostgreSQL on Railway, connect the generated `DATABASE_URL`.

## 2. Deploy LMS to Vercel

### Project root
`apps/lms-web`

### Required environment variables
- `NEXT_PUBLIC_API_BASE_URL=https://your-lumo-api.up.railway.app`

### Build settings
- Framework preset: Next.js
- Root directory: `apps/lms-web`

## 3. Demo flow after deploy
- Open LMS on Vercel URL
- Confirm dashboard loads API-backed stats
- Visit students / attendance / assignments / progress / reports pages
- Verify Railway API health endpoint: `/health`

## 4. Recommended next hardening
- replace watch mode in production API start command
- add CORS config
- add persistent PostgreSQL backing
- add auth and RBAC
- add deployment secrets per environment
