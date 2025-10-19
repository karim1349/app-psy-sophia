# ADHD Parent Coach - React Native Mobile App

Complete React Native (Expo) app with pre-auth onboarding flow connected to Django API.

## Features

- ✅ **Guest Session**: Anonymous user flow with seamless conversion to full account
- ✅ **6-Step Onboarding**: Age selection → Screener → Priorities → Plan → Notifications → Account Creation
- ✅ **Home Dashboard**: Routine tracking, progress stats, check-ins
- ✅ **Offline Support**: Secure token storage, queued syncs
- ✅ **Local Notifications**: Morning and evening reminders
- ✅ **TypeScript**: Full type safety with API client
- ✅ **TanStack Query**: Data fetching, caching, and mutations
- ✅ **Zustand**: Lightweight state management

> **Note**: Victory Native charts are currently replaced with progress statistics (average & best scores). Full chart implementation pending.

## Tech Stack

- **Framework**: Expo SDK 54 with Expo Router
- **Language**: TypeScript
- **State Management**: TanStack Query + Zustand
- **Storage**: SecureStore (tokens) + AsyncStorage (app data)
- **Notifications**: expo-notifications
- **UI**: React Native with custom components

## Project Structure

```
apps/mobile/
├── app/
│   ├── (public)/onboarding/    # Pre-auth onboarding flow
│   │   ├── age.tsx              # Schooling stage selection
│   │   ├── screener.tsx         # ADHD screener (10 questions)
│   │   ├── priorities.tsx       # Select 3 target behaviors
│   │   ├── plan.tsx             # Special Time module intro
│   │   ├── notifications.tsx    # Enable notifications
│   │   └── account.tsx          # Account creation (guest → full account)
│   ├── (authed)/                # Authenticated routes
│   │   └── home.tsx             # Main dashboard
│   ├── modals/
│   │   ├── checkin.tsx          # Daily check-in modal
│   │   └── command.tsx          # Quick actions palette
│   └── _layout.tsx              # Root layout with auth bootstrap
├── src/
│   ├── api/
│   │   ├── client.ts            # Base API client with auto token refresh
│   │   ├── auth.ts              # Guest session & conversion
│   │   └── onboarding.ts        # Child, screener, behaviors, check-ins
│   ├── lib/
│   │   └── storage.ts           # SecureStore + AsyncStorage wrappers
│   ├── store/
│   │   └── ui.ts                # Zustand UI state
│   ├── types/
│   │   └── api.ts               # TypeScript API types
│   └── components/
│       └── Button.tsx           # Reusable button component
├── .env                         # Environment variables
└── app.json                     # Expo configuration
```

## Prerequisites

- Node.js 18+ and pnpm
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac) or Android Emulator
- Django API running (see `apps/api/`)

## Setup

### 1. Install Dependencies

```bash
cd apps/mobile
pnpm install
```

### 2. Configure Environment

Update `.env` with your Django API URL:

```bash
# For iOS Simulator
EXPO_PUBLIC_API_BASE=http://localhost:8000

# For Android Emulator
EXPO_PUBLIC_API_BASE=http://10.0.2.2:8000

# For Physical Device (replace with your local IP)
EXPO_PUBLIC_API_BASE=http://192.168.1.XXX:8000
```

### 3. Update app.json

Make sure `extra.apiUrl` matches your API URL:

```json
{
  "expo": {
    "extra": {
      "apiUrl": "http://192.168.11.102:8000"
    }
  }
}
```

## How to Run

### Start Django API First

```bash
cd apps/api
.venv/bin/python manage.py runserver 0.0.0.0:8000
```

### Start Expo Dev Server

```bash
cd apps/mobile
pnpm dev
# or: npx expo start
```

### Open in Simulator/Emulator

- **iOS**: Press `i` in terminal (requires macOS)
- **Android**: Press `a` in terminal
- **Physical Device**: Scan QR code with Expo Go app

## App Flow

### 1. First Launch (Onboarding)

On first launch, the app automatically:

1. Creates a guest user session (via `/api/auth/users/guest/`)
2. Stores JWT tokens in SecureStore
3. Routes to `/onboarding/age`

**Onboarding Steps:**

```
Age Selection → Screener (10 questions) → Priorities (3 behaviors)
→ Plan (Special Time) → Notifications → Account Creation → Home
```

**Account Creation (Step 6):**
- User can create a full account (email + username + password)
- Converts guest user to permanent account
- OR skip and continue as guest (can create account later)
- All onboarding data is preserved

All data is preserved in the backend associated with the guest user.

### 2. Home Screen

After completing onboarding:

- **Today's Routines**: Toggle 3 target behaviors
- **7-Day Chart**: Routine success vs mood
- **Quick Actions**: Daily check-in, tools
- **Next Best Action**: Suggested activity

### 3. Converting Guest to Full Account

Guest users can convert to full accounts at any time:

```typescript
// All data (child, screener, behaviors, check-ins) is preserved
POST /api/auth/users/convert/
{
  email: "parent@example.com",
  username: "parent",
  password: "SecurePass123!",
  password_confirm: "SecurePass123!"
}
```

## API Client Usage

### Automatic Guest Session

```typescript
import { ensureGuestSession } from './src/api/auth';

// Called once on app bootstrap
await ensureGuestSession();
// If no token exists, creates guest user and stores tokens
// Otherwise, uses existing token
```

### Authenticated Requests

All API calls automatically attach the access token:

```typescript
import { createChild } from './src/api/onboarding';

// Token is automatically attached in Authorization header
const child = await createChild({
  schooling_stage: '6-13',
  diagnosed_adhd: 'unknown',
});
```

### Automatic Token Refresh

If a request returns `401 Unauthorized`, the client automatically:

1. Refreshes the access token using the refresh token
2. **Stores the new refresh token** (Django rotates tokens with `ROTATE_REFRESH_TOKENS=True`)
3. Retries the original request
4. If refresh fails (e.g., token blacklisted), clears tokens and creates new guest session

**Important:** Django's `BLACKLIST_AFTER_ROTATION=True` means old refresh tokens are blacklisted after use. The client **must** store the new refresh token returned in the refresh response, otherwise subsequent refreshes will fail with `"Token is blacklisted"`.

## State Management

### TanStack Query for Server State

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

// Fetch dashboard with auto-refetch
const { data } = useQuery({
  queryKey: ['dashboard', childId],
  queryFn: () => getDashboard(childId, 7),
  refetchInterval: 30000, // 30s
});

// Mutation with cache invalidation
const updateMutation = useMutation({
  mutationFn: upsertCheckin,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  },
});
```

### Zustand for UI State

```typescript
import { useUIStore } from './src/store/ui';

// Open/close modals
const { openCheckinModal, closeCheckinModal } = useUIStore();

// Error handling
const { setError, clearError, error } = useUIStore();
```

## Local Notifications

Scheduled after completing onboarding:

- **Morning (8:00 AM)**: "N'oubliez pas votre Moment Spécial"
- **Evening (7:00 PM)**: "Check-in du soir"

Both repeat daily until disabled by user.

## Storage

### Secure Storage (Tokens)

```typescript
import { tokenStorage } from './src/lib/storage';

await tokenStorage.setTokens(access, refresh);
const accessToken = await tokenStorage.getAccessToken();
await tokenStorage.clearTokens();
```

### App Storage (Settings)

```typescript
import { appStorage } from './src/lib/storage';

await appStorage.setOnboardingDone(true);
const done = await appStorage.getOnboardingDone();

await appStorage.setChildId(123);
const childId = await appStorage.getChildId();
```

## Error Handling

All API errors are caught and can display user-friendly messages:

```typescript
try {
  await createChild(data);
} catch (error) {
  if (error instanceof APIError) {
    console.error('API Error:', error.status, error.data);
    // Show toast/alert to user
  }
}
```

## Development Tips

### Debug Dashboard Issues

The home screen includes built-in debugging. Check console output:

```
=== DASHBOARD DEBUG ===
Child ID from storage: 1
✅ Will call: /api/children/1/dashboard/?range=7
📡 API GET http://192.168.11.102:8000/api/children/1/dashboard/?range=7
🔄 Fetching dashboard for child ID: 1
✅ API 200: http://192.168.11.102:8000/api/children/1/dashboard/?range=7
```

**If you see `Child ID from storage: null`:**
- User hasn't completed onboarding
- App will show alert and redirect to onboarding/age

**If you see `❌ API Error 404`:**
- Child ID exists in storage but not in database
- App will show alert, clear data, and redirect to onboarding

See `DASHBOARD_FIX.md` for detailed troubleshooting.

### Reset Onboarding

To test onboarding flow again:

```bash
# iOS
xcrun simctl get_app_container booted com.yourcompany.apppsysophia data
# Delete app data

# Android
adb shell run-as com.yourcompany.apppsysophia
# Delete files

# Or: Clear app data from Settings
```

### Debug API Calls

All API calls are logged in development:

```bash
# Terminal output shows:
GET /api/children/ → 200
POST /api/children/1/checkins/ → 201
```

### Network Debugging

For iOS Simulator accessing localhost:

```bash
# Make sure Django runs on 0.0.0.0, not 127.0.0.1
python manage.py runserver 0.0.0.0:8000
```

For physical devices:

```bash
# Find your local IP
ifconfig | grep "inet " | grep -v 127.0.0.1

# Update .env with your IP
EXPO_PUBLIC_API_BASE=http://192.168.1.XXX:8000
```

## Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

## Building for Production

### iOS

```bash
# Create development build
eas build --platform ios --profile development

# Create production build
eas build --platform ios --profile production
```

### Android

```bash
# Create development build
eas build --platform android --profile development

# Create production build
eas build --platform android --profile production
```

## Troubleshooting

### "Network request failed"

- Ensure Django API is running
- Check API URL in `.env` matches your network
- For simulators, use `http://localhost:8000` (iOS) or `http://10.0.2.2:8000` (Android)

### "Cannot connect to Metro"

```bash
# Clear Metro cache
npx expo start -c
```

### Tokens not persisting

- SecureStore requires device/simulator with keychain
- Use iOS Simulator or Android Emulator, not web

### TypeScript errors

```bash
# Regenerate types
pnpm type-check
```

### "Token is blacklisted" Error

If you see this error after the app has been idle:

**Cause:** Django rotates refresh tokens (`ROTATE_REFRESH_TOKENS=True`) and blacklists old ones. If the mobile app doesn't store the new refresh token, it will try to use an old (blacklisted) token.

**Fixed in:** `src/api/client.ts` - The refresh function now properly stores both new access AND refresh tokens.

**Recovery:** The app automatically clears tokens and creates a new guest session. Your onboarding progress is preserved in the backend.

**To test the fix:**
1. Complete onboarding
2. Wait 16+ minutes (access token expires after 15 min)
3. Trigger an API call (e.g., navigate to home)
4. Token should refresh successfully without errors

**Manual database cleanup** (if you have many blacklisted tokens during development):
```bash
cd apps/api
.venv/bin/python manage.py shell
>>> from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
>>> OutstandingToken.objects.all().delete()
>>> exit()
```

## Next Steps

- Implement Tools bottom sheet (Breathing, Timer, etc.)
- Add offline queue for failed mutations
- Implement Special Time module tracking
- Add animations with Lottie
- Implement conversion flow from guest to full account
- Add error boundary for crash reporting

## License

Private - All Rights Reserved
