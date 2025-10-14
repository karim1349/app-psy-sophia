# Qiima - Quick Start Guide

## Prerequisites

- Python 3.11+
- Node.js 18+
- pnpm (install: `npm install -g pnpm`)
- PostgreSQL (running locally or via Docker)

## Initial Setup

### 1. Install Dependencies

```bash
# Root (install all workspaces)
pnpm install

# API (Python/Django)
cd apps/api
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment Variables

#### API (.env)
```bash
cd apps/api
cp .env.example .env
# Edit .env with your database credentials
```

#### Web (.env.local)
```bash
cd apps/web
# File already created with:
# API_BASE=http://localhost:8000
```

#### Mobile (.env)
```bash
cd apps/mobile
# File already created with:
# EXPO_PUBLIC_API_BASE=http://localhost:8000
# For Android emulator, change to: http://10.0.2.2:8000
```

### 3. Setup Database

```bash
cd apps/api
source venv/bin/activate
python manage.py migrate
python manage.py createsuperuser  # Optional: create admin user
```

## Running the Applications

### Terminal 1: Django API

```bash
cd apps/api
source venv/bin/activate
python manage.py runserver
```

API will be available at: `http://localhost:8000`
Admin panel: `http://localhost:8000/admin`

### Terminal 2: Web (Next.js)

```bash
cd apps/web
pnpm dev
```

Web app will be available at: `http://localhost:3000`

### Terminal 3: Mobile (Expo)

```bash
cd apps/mobile
pnpm dev
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code for physical device

## Testing

### Backend Tests

```bash
cd apps/api
source venv/bin/activate
pytest
pytest --cov  # With coverage
```

Current: 85 tests passing (27 user model + 58 API endpoints)

### Frontend Package Tests

```bash
# From root
pnpm --filter @qiima/schemas test
pnpm --filter @qiima/api-client test
pnpm --filter @qiima/state test
pnpm --filter @qiima/queries test
```

Current: 114 tests passing

### Web Tests

```bash
cd apps/web
pnpm test
```

### Mobile Tests

```bash
cd apps/mobile
pnpm test
```

## Available Routes

### Web
- `/` - Home page
- `/login` - Login page
- `/register` - Sign up page
- `/forgot-password` - Password reset request
- `/reset-password?token=...&uid=...` - Password reset

### Mobile
- `(tabs)/` - Home tabs (default)
- `(auth)/login` - Login screen
- `(auth)/register` - Sign up screen
- `(auth)/forgot-password` - Password reset request
- `(auth)/reset-password?token=...&uid=...` - Password reset

### API Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/password/forgot` - Request password reset
- `POST /api/auth/password/reset` - Reset password
- `GET /api/me` - Get current user

## Project Structure

```
qiima/
├── apps/
│   ├── api/          # Django REST API
│   ├── web/          # Next.js web app
│   └── mobile/       # Expo mobile app
├── packages/
│   ├── schemas/      # Zod validation schemas
│   ├── api-client/   # HTTP client
│   ├── state/        # Zustand stores
│   ├── queries/      # TanStack Query hooks
│   ├── ui/           # React Native components (future)
│   └── utils/        # Shared utilities (future)
└── docs/             # Documentation
```

## Common Issues

### API won't start
- Check PostgreSQL is running
- Verify database credentials in `.env`
- Run migrations: `python manage.py migrate`

### Web can't connect to API
- Verify API is running on port 8000
- Check `API_BASE` in `apps/web/.env.local`

### Mobile can't connect to API
- iOS simulator: use `http://localhost:8000`
- Android emulator: use `http://10.0.2.2:8000`
- Physical device: use `http://<your-local-ip>:8000`
- Verify `EXPO_PUBLIC_API_BASE` in `apps/mobile/.env`

### Cookies not working (web)
- Ensure you're using `http://localhost` not `127.0.0.1`
- Check browser DevTools → Application → Cookies

### Tokens not persisting (mobile)
- Access tokens are in-memory only (by design)
- Refresh tokens are in SecureStore (persist across restarts)

## Development Workflow

1. **Start all services** in separate terminals:
   - Django API
   - Next.js web
   - Expo mobile (if needed)

2. **Make changes**:
   - Backend: Django auto-reloads on file changes
   - Web: Next.js auto-reloads on file changes
   - Mobile: Expo auto-reloads on file changes

3. **Run tests** after changes:
   ```bash
   # Backend
   cd apps/api && pytest

   # Packages
   pnpm test

   # Specific package
   pnpm --filter @qiima/schemas test
   ```

4. **Type checking**:
   ```bash
   # Web
   cd apps/web && pnpm type-check

   # Mobile
   cd apps/mobile && pnpm type-check
   ```

5. **Linting**:
   ```bash
   # Web
   cd apps/web && pnpm lint

   # Mobile
   cd apps/mobile && pnpm lint
   ```

## What's Implemented

- ✅ Django User model with authentication
- ✅ Django REST API endpoints (auth, user profile)
- ✅ Zod validation schemas (shared)
- ✅ HTTP client (native & web)
- ✅ Session stores (native & web)
- ✅ TanStack Query hooks
- ✅ Next.js BFF API routes
- ✅ Web authentication UI (login, register, forgot/reset password)
- ✅ Mobile authentication UI (login, register, forgot/reset password)
- ✅ QueryClient providers with network listeners

## What's Next

- Protected routes and auth guards
- User profile management
- Deal posting and browsing
- Voting and commenting
- Notifications
- Search and filters

## Documentation

- [CLAUDE.md](CLAUDE.md) - Full architecture guide
- [Phase 4 Implementation](docs/PHASE4-AUTH-UI-IMPLEMENTATION.md) - Auth UI details
- [API Documentation] - Django REST API reference (if available)

## Support

For issues or questions:
1. Check this quickstart guide
2. Review [CLAUDE.md](CLAUDE.md) for architecture details
3. Check implementation docs in `/docs`

---

Last Updated: October 13, 2025
