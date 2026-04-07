# Migration from Vite/React to Next.js

## Backup of Original Routes
- / → Landing (SaaS public)
- /signup → Signup (SaaS public)
- /login → Login (SaaS public)
- /worker/:databaseId/login → WorkerLogin (public)
- /worker/dashboard → WorkerDashboard (protected)
- /app/* → CompanyDashboard (protected)

## New Next.js Routes
- app/page.js → Landing
- app/signup/page.js → Signup
- app/login/page.js → Login
- app/worker/[databaseId]/login/page.js → WorkerLogin
- app/worker/dashboard/page.js → WorkerDashboard
- app/(protected)/app/page.js → CompanyDashboard
- app/layout.js → Root layout with providers

## Status
- Structure created ✅
- Components migrated ✅
- Pages created ✅
- Imports updated ✅
- Middleware configured ✅
