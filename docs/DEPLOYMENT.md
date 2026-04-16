# Lumo deployment guide

## Target stack
- LMS web: Vercel
- API: Railway

## 1. Deploy API to Railway

### Service root
`services/api`

### Required environment variables
- `PORT=4000`
- `NODE_ENV=production`
- `LUMO_DB_MODE=postgres`
- `DATABASE_URL=postgresql://...`
- `LUMO_CORS_ORIGINS=https://your-lms-domain.example`

### Recommended environment variables
- `API_BASE_URL=https://your-lumo-api.up.railway.app`
- `LUMO_DATA_FILE=/data/lumo/store.json` (warm cache path override when needed)
- `LUMO_CORS_ALLOW_ANY_ORIGIN=false`

### Railway notes
- Current API is an Express service.
- Production start command is already the non-watch command: `npm run start`.
- If using PostgreSQL on Railway, connect the generated `DATABASE_URL`.
- Treat `file` mode as demo/local only. For production durability, recovery, and trust signals, use Postgres.
- After deploy, check both `/health` and `/readyz`. `/readyz` should return `200`, not `503`.
- Admins can review production posture via `/api/v1/admin/config/audit`.

## 2. Deploy LMS to Vercel

### Project root
`apps/lms-web`

### Required environment variables
- `NEXT_PUBLIC_API_BASE_URL=https://your-lumo-api.up.railway.app`

If `NEXT_PUBLIC_API_BASE_URL` is missing, the LMS production build/start now fails fast on purpose. That is intentional: shipping a degraded admin shell with no real API wiring is a deployment mistake, not a recoverable success state.

### Build settings
- Framework preset: Next.js
- Root directory: `apps/lms-web`

## 3. Demo flow after deploy
- Open LMS on Vercel URL
- Confirm dashboard loads API-backed stats
- Visit students / attendance / assignments / progress / reports pages
- Verify Railway API health endpoint: `/health`

## 4. Operator runbook + recovery discipline
- Read `docs/OPERATOR_RUNBOOK.md` before production cutover.
- Preview imports with `/api/v1/admin/storage/import/preview` before applying them.
- Use `/api/v1/admin/storage/recovery-plan` before choosing a restore path.
- Dry-run integrity repair before `apply: true`.
- Prefer session rebuild-from-events over freestyle manual patching when event logs are intact.

## 5. Remaining hardening
- add auth and RBAC beyond header-based operator simulation
- add deployment secrets per environment
- add external monitoring/alerts around `/health` and `/readyz`
- move from single-snapshot demo durability toward fuller transactional persistence when the MVP graduates from pilot tooling
