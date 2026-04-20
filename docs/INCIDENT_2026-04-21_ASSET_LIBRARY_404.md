# Incident note — live Asset Library API 404

_Date:_ 2026-04-21

## Symptom

Live LMS Asset Library hits:

- `GET https://lumo-api-production-303a.up.railway.app/api/v1/assets`

and receives Express 404:

- `Cannot GET /api/v1/assets`

## What the repo guarantees

Current repo code in `services/api/src/main.js` mounts these routes directly on the Express app:

- `GET /api/v1/assets`
- `GET /api/v1/assets/:id`
- `POST /api/v1/assets`
- `PATCH /api/v1/assets/:id`
- `DELETE /api/v1/assets/:id`
- `POST /api/v1/assets/upload`
- `GET /api/v1/admin/assets/runtime`

Automated tests also assert that:

- `GET /api/v1/assets` returns `200`
- `/health` exposes asset route evidence
- `/api/v1/meta` exposes `assetRoutes` and marks them mounted

## What live Railway is actually serving

Observed live responses:

- `/health` -> `200`, but only minimal body (`{"status":"ok","service":"lumo-api"}`)
- `/api/v1/meta` -> `200`, but missing `configAudit` + `assetRoutes`
- `/api/v1/subjects` -> `200`
- `/api/v1/assets` -> `404 Cannot GET /api/v1/assets`

## Top diagnosis

This is almost certainly **stale or wrong Railway deployment**, not an auth problem and not a normal app-level asset failure.

Why:

1. **404 is framework-level**
   - Live response is Express `Cannot GET /api/v1/assets`.
   - If the route were mounted and auth blocked it, we would expect `401/403/428/503`, not route-level 404.

2. **Repo code definitely mounts the route**
   - `services/api/src/main.js` has a direct `app.get('/api/v1/assets', ...)`.

3. **Live `/health` and `/api/v1/meta` are older than current code**
   - Current code adds asset-route evidence to both endpoints.
   - Live host does not show those newer fields.
   - That means Railway is not running current `services/api/src/main.js`.

4. **Live app is not completely wrong service**
   - `/api/v1/subjects` works and host reports `x-powered-by: Express`.
   - So Railway is serving a Lumo API-ish app, just an **older revision** or a **different service target/root**.

## Most likely real-world causes

In order of likelihood:

1. **Railway service deployed from an older commit before asset routes shipped**
2. **Railway project points at wrong branch / detached older revision**
3. **Railway service root is wrong and is not building `services/api` from current repo state**
4. **Multiple Railway services exist and LMS is pointed at the older one**
5. Less likely: runtime booting a different file than `services/api/src/main.js`

## Less likely causes

These do **not** fit the observed evidence well:

- auth middleware / RBAC issue
- CORS issue
- proxy path stripping of `/api/v1`
- environment variables for uploads/storage
- asset registry data corruption

Reason: those would not remove the route definition itself while leaving other `/api/v1/*` endpoints alive.

## Fastest fix path

1. In Railway, confirm the API service is using repo root `services/api`
2. Confirm start command is `npm run start`
3. Confirm deployed commit includes asset work (at minimum commit `b6cf351` or later; ideally latest main)
4. Redeploy the correct API service from current `main`
5. After deploy, verify:
   - `/health` includes `assets.routes`
   - `/api/v1/meta` includes `assetRoutes`
   - `/api/v1/assets` returns `200` with JSON array
   - `/api/v1/admin/assets/runtime` returns `200` with admin headers

## Suggested verification commands

```bash
# Public checks
curl -i https://lumo-api-production-303a.up.railway.app/health
curl -i https://lumo-api-production-303a.up.railway.app/api/v1/meta
curl -i https://lumo-api-production-303a.up.railway.app/api/v1/assets

# Admin check after redeploy
curl -i https://lumo-api-production-303a.up.railway.app/api/v1/admin/assets/runtime \
  -H 'x-lumo-role: admin' \
  -H 'x-lumo-actor: Deploy Verify' \
  -H 'x-lumo-api-key: <admin-key>'
```

## Expected healthy signals after fix

- `/health` JSON includes:
  - `assets.ready`
  - `assets.routes.ready: true`
- `/api/v1/meta` JSON includes:
  - `configAudit`
  - `assetRoutes.ready: true`
- `/api/v1/assets` returns JSON array, not 404

## Strong recommendation

Do **not** spend time debugging asset storage or LMS frontend first. The route is simply not live on the deployed API revision. Fix the Railway deploy target/revision, then re-check storage/runtime health.