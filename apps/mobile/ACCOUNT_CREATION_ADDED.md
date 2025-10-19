# Account Creation Feature Added

## Summary

Added a **6th onboarding step** for account creation, allowing users to convert their guest account to a full account with email/password.

---

## What Changed

### 1. New Onboarding Flow

**Before (5 steps):**
```
Age → Screener → Priorities → Plan → Notifications → Home ✅
```

**After (6 steps):**
```
Age → Screener → Priorities → Plan → Notifications → Account Creation → Home ✅
                                                              ↓
                                                     Can skip (stay guest)
```

---

### 2. New File: `app/(public)/onboarding/account.tsx`

Complete account creation screen with:
- ✅ Email input (validated)
- ✅ Username input (min 3 chars)
- ✅ Password input (min 8 chars)
- ✅ Password confirmation (must match)
- ✅ Form validation
- ✅ Error handling (email exists, username taken, etc.)
- ✅ "Skip" option to continue as guest
- ✅ Info box explaining account benefits

**Features:**
```typescript
// Convert guest → full account
convertGuest({
  email, username, password, password_confirm
})

// OR skip and stay as guest
handleSkip() → Continue to home without account
```

**User Experience:**
- If user creates account: Guest data is preserved, user logs in with email/password
- If user skips: Stays as guest, can create account later from settings

---

### 3. Modified File: `app/(public)/onboarding/notifications.tsx`

**Before:**
```typescript
// After notifications setup
await appStorage.setOnboardingDone(true);
router.replace('/(authed)/home');  // ❌ Went directly to home
```

**After:**
```typescript
// After notifications setup
router.push('/(public)/onboarding/account');  // ✅ Go to account creation
```

---

## API Integration

Uses existing `/api/auth/users/convert/` endpoint:

**Request:**
```typescript
POST /api/auth/users/convert/
{
  "email": "user@example.com",
  "username": "myusername",
  "password": "SecurePass123!",
  "password_confirm": "SecurePass123!"
}
```

**Response:**
```json
{
  "user": {
    "id": 3,
    "email": "user@example.com",
    "username": "myusername",
    "is_guest": false,
    "is_active": true
  },
  "access": "eyJhbGc...",
  "refresh": "eyJhbGc...",
  "message": "Guest user converted successfully"
}
```

**Backend Behavior:**
- ✅ Converts `is_guest=True` → `is_guest=False`
- ✅ Sets email, username, password
- ✅ Preserves all associated data (children, screeners, behaviors, check-ins)
- ✅ Returns new JWT tokens
- ✅ User can now log in with email/password

---

## User Flow Examples

### Scenario 1: Create Account
```
1. Complete onboarding (age → screener → priorities → plan → notifications)
2. Land on account creation screen
3. Enter email, username, password
4. Click "Créer mon compte"
5. ✅ Guest converted, tokens updated
6. Navigate to home
7. Can now log in with email/password on any device
```

### Scenario 2: Skip Account Creation
```
1. Complete onboarding
2. Land on account creation screen
3. Click "Plus tard" (skip)
4. Alert: "Continuer sans compte? Vous pouvez créer un compte plus tard..."
5. Click "Continuer"
6. Navigate to home as guest
7. Can create account later from settings (TODO: implement)
```

---

## Validation & Error Handling

### Client-Side Validation:
```typescript
✅ Email required
✅ Username required
✅ Password min 8 characters
✅ Password confirmation must match
```

### Server-Side Errors Handled:
```typescript
❌ Email already exists → "Cet email est déjà utilisé"
❌ Username taken → "Ce nom d'utilisateur est déjà pris"
❌ Weak password → "Le mot de passe est trop faible"
❌ Password mismatch → "Les mots de passe ne correspondent pas"
```

---

## Benefits

### For Users:
1. ✅ **Multi-device access** - Log in from any device
2. ✅ **Data persistence** - Won't lose data if app is deleted
3. ✅ **Password recovery** - Can reset password via email (TODO)
4. ✅ **Optional** - Can skip and stay as guest

### For the App:
1. ✅ **Better retention** - Users with accounts are more engaged
2. ✅ **Data security** - Full accounts can enable password protection
3. ✅ **User identification** - Easier support and troubleshooting
4. ✅ **Seamless upgrade** - Guest → Account without losing data

---

## Testing

### Test 1: Create Account
```bash
1. Run app: pnpm dev
2. Complete onboarding (5 steps)
3. On account screen:
   - Email: test@example.com
   - Username: testuser
   - Password: Test1234!
   - Confirm: Test1234!
4. Click "Créer mon compte"
5. ✅ Should navigate to home
6. Console: ✅ Guest converted to full account
7. Check database:
   User ID X: is_guest=False, email=test@example.com
```

### Test 2: Skip Account Creation
```bash
1. Complete onboarding
2. On account screen, click "Plus tard"
3. Alert appears: "Continuer sans compte?"
4. Click "Continuer"
5. ✅ Should navigate to home
6. Console: Still guest user
7. Check database:
   User ID X: is_guest=True, email=null
```

### Test 3: Validation Errors
```bash
1. Try empty email → Alert: "Veuillez entrer votre email"
2. Try short password (< 8 chars) → Alert: "Minimum 8 caractères"
3. Try mismatched passwords → Alert: "Les mots de passe ne correspondent pas"
```

### Test 4: API Errors
```bash
1. Try existing email → Alert: "Cet email est déjà utilisé"
2. Try existing username → Alert: "Ce nom d'utilisateur est déjà pris"
```

---

## Files Modified

1. ✅ `app/(public)/onboarding/account.tsx` - **NEW** account creation screen
2. ✅ `app/(public)/onboarding/notifications.tsx` - Navigate to account instead of home
3. ✅ `MOBILE_SETUP.md` - Updated documentation (5 → 6 steps)

---

## Console Output

### Success:
```
✅ Guest converted to full account
📡 API POST http://192.168.11.102:8000/api/auth/users/convert/
✅ API 200: ...
[Navigates to home]
```

### Validation Error:
```
❌ Validation: Les mots de passe ne correspondent pas
[Alert shown]
```

### API Error:
```
❌ Account creation error: {...}
📡 API POST http://192.168.11.102:8000/api/auth/users/convert/
❌ API Error 400: ...
Response: {"email": ["A user with that email already exists."]}
[Alert shown: "Cet email est déjà utilisé"]
```

---

## Next Steps (Optional Enhancements)

### 1. Settings Screen for Account Creation
For users who skipped during onboarding:
```typescript
// settings/account.tsx
<Button onPress={() => router.push('/onboarding/account')}>
  Créer un compte
</Button>
```

### 2. Password Reset Flow
```
Forgot Password → Enter Email → Receive Code → Reset Password
```

### 3. Social Login
```
Continue with Google / Apple / Facebook
```

### 4. Email Verification
```
Send verification email → User clicks link → Email verified
```

---

## Summary

The app now has a **complete guest-to-account conversion flow**:

1. ✅ Users start as **anonymous guests**
2. ✅ Complete onboarding and create child profile
3. ✅ **Convert to full account** with email/password
4. ✅ OR **skip and stay guest** (can upgrade later)
5. ✅ All data is preserved during conversion
6. ✅ Users can log in from any device

**The onboarding is now complete with 6 steps!** 🎉
