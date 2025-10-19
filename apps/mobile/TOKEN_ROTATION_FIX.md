# Token Blacklist Fix

## Problem

You were experiencing `"Token is blacklisted"` errors after the app was idle for some time.

## Root Cause

Django's SimpleJWT is configured with:
```python
# apps/api/app-psy-sophia/settings.py
SIMPLE_JWT = {
    "ROTATE_REFRESH_TOKENS": True,        # Returns NEW refresh token on each refresh
    "BLACKLIST_AFTER_ROTATION": True,     # Blacklists OLD refresh token
    # ...
}
```

**The flow was:**

```
1. App gets tokens:
   - access_token_v1 (expires in 15 min)
   - refresh_token_v1 (expires in 365 days)

2. After 15+ minutes, access_token_v1 expires

3. App calls /api/auth/users/refresh/ with refresh_token_v1
   Django returns:
   - access_token_v2 ✅
   - refresh_token_v2 ✅ (NEW!)
   - Blacklists refresh_token_v1 ❌

4. 🐛 BUG: Mobile app only stored access_token_v2
   It kept using the OLD refresh_token_v1

5. Next refresh attempt with refresh_token_v1 fails:
   → "Token is blacklisted" ❌
```

## The Fix

Updated `src/api/client.ts:89-123` to:

1. ✅ Store the **new refresh token** returned by Django
2. ✅ Clear tokens if refresh fails (blacklist error)
3. ✅ Log errors for debugging
4. ✅ Automatically create new guest session on token clear

### Before (BROKEN):
```typescript
async function refreshAccessToken(): Promise<boolean> {
  // ...
  const data = await response.json();
  await tokenStorage.setAccessToken(data.access); // ❌ Only stored access token!
  return true;
}
```

### After (FIXED):
```typescript
async function refreshAccessToken(): Promise<boolean> {
  // ...
  if (!response.ok) {
    await tokenStorage.clearTokens(); // ✅ Clear on failure
    return false;
  }

  const data = await response.json();

  // Store new access token (always returned)
  await tokenStorage.setAccessToken(data.access);

  // Store new refresh token if returned (when ROTATE_REFRESH_TOKENS=True)
  if (data.refresh) {
    await tokenStorage.setRefreshToken(data.refresh); // ✅ Store new refresh token!
  }

  return true;
}
```

## How It Works Now

```
1. App gets tokens:
   - access_token_v1
   - refresh_token_v1 ✅ Stored in SecureStore

2. After 15+ minutes, access_token_v1 expires

3. App calls /api/auth/users/refresh/ with refresh_token_v1
   Django returns:
   - access_token_v2
   - refresh_token_v2 (NEW!)
   - Blacklists refresh_token_v1

4. ✅ FIX: Mobile app stores BOTH:
   - access_token_v2 ✅
   - refresh_token_v2 ✅ (NEW!)

5. Next refresh uses refresh_token_v2 → Success! ✅
```

## Testing the Fix

1. **Start fresh:**
   ```bash
   # Clear app data or reinstall
   # This removes old blacklisted tokens from SecureStore
   ```

2. **Complete onboarding:**
   - Creates guest user with fresh tokens

3. **Wait 16+ minutes:**
   - Access token expires (15 min lifetime)

4. **Trigger an API call:**
   - Navigate to home screen
   - Open check-in modal
   - Any action that calls the API

5. **Expected behavior:**
   - ✅ Token refreshes automatically
   - ✅ No "Token is blacklisted" error
   - ✅ App continues working seamlessly

## Manual Cleanup (Development)

If you have many blacklisted tokens in the database:

```bash
cd apps/api
.venv/bin/python manage.py shell
```

```python
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken

# See how many blacklisted tokens exist
print(f"Outstanding: {OutstandingToken.objects.count()}")
print(f"Blacklisted: {BlacklistedToken.objects.count()}")

# Clear all (development only!)
OutstandingToken.objects.all().delete()
BlacklistedToken.objects.all().delete()

exit()
```

## Alternative: Disable Token Rotation (Not Recommended)

If you want to disable token rotation entirely (less secure):

```python
# apps/api/app-psy-sophia/settings.py
SIMPLE_JWT = {
    # ...
    "ROTATE_REFRESH_TOKENS": False,       # Don't rotate
    "BLACKLIST_AFTER_ROTATION": False,    # Don't blacklist
    # ...
}
```

**⚠️ Security implications:**
- Refresh tokens never expire (until 365 days)
- If a refresh token is compromised, it remains valid
- No audit trail of token usage

**Recommendation:** Keep rotation enabled (current setup is more secure).

## Files Changed

1. ✅ `apps/mobile/src/api/client.ts` - Fixed refresh logic
2. ✅ `apps/mobile/MOBILE_SETUP.md` - Added documentation
3. ✅ `apps/mobile/TOKEN_ROTATION_FIX.md` - This file

## Summary

The token blacklist issue is now **FIXED**. The mobile app correctly handles Django's token rotation by storing the new refresh token on every refresh. If a refresh fails (e.g., due to a blacklisted token from before the fix), the app automatically clears tokens and creates a new guest session, preserving all onboarding progress.
