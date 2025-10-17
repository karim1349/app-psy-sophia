# @app-psy-sophia/i18n

Shared internationalization package for app-psy-sophia mobile and web applications.

## Features

- **Shared translations**: Common translation files used across mobile and web apps
- **React Native compatible**: Works with React Native and Expo
- **Next.js compatible**: Works with Next.js web applications
- **Type-safe**: Full TypeScript support with proper typing
- **Easy to use**: Simple hooks and components for translation

## Supported Languages

- English (en) - Default
- French (fr)
- Arabic/Darija (ar) - Moroccan Arabic

## Usage

### Basic Setup

```tsx
import { initI18n, useI18n } from '@app-psy-sophia/i18n';

// Initialize i18n (usually done in your app's root)
initI18n();

// Use in components
function MyComponent() {
  const { t, changeLanguage, currentLanguage } = useI18n();
  
  return (
    <div>
      <h1>{t('auth.login.title')}</h1>
      <button onClick={() => changeLanguage('fr')}>
        Switch to French
      </button>
      <button onClick={() => changeLanguage('ar')}>
        Switch to Arabic
      </button>
    </div>
  );
}
```

### Available Translation Keys

#### Authentication
- `auth.login.title` - "Welcome back"
- `auth.login.subtitle` - "Login to your account to continue"
- `auth.login.email` - "Email"
- `auth.login.password` - "Password"
- `auth.login.forgotPassword` - "Forgot password?"
- `auth.login.loginButton` - "Login"
- `auth.login.loggingIn` - "Logging in..."
- `auth.login.loginFailed` - "Login failed. Please check your credentials."
- `auth.login.noAccount` - "Don't have an account?"
- `auth.login.signUp` - "Sign up"

#### Forgot Password
- `auth.forgotPassword.title` - "Forgot password?"
- `auth.forgotPassword.subtitle` - "No worries, we'll send you reset instructions"
- `auth.forgotPassword.email` - "Email"
- `auth.forgotPassword.emailHint` - "Enter your email address and we'll send you instructions to reset your password."
- `auth.forgotPassword.sendButton` - "Send reset instructions"
- `auth.forgotPassword.sending` - "Sending..."
- `auth.forgotPassword.checkEmail` - "Check your email"
- `auth.forgotPassword.emailSent` - "We've sent password reset instructions to your email address."
- `auth.forgotPassword.backToLogin` - "Back to login"
- `auth.forgotPassword.sendFailed` - "Failed to send reset email. Please try again."

#### Common
- `common.email` - "Email"
- `common.password` - "Password"
- `common.username` - "Username"
- `common.loading` - "Loading..."
- `common.error` - "Error"
- `common.success` - "Success"
- `common.cancel` - "Cancel"
- `common.confirm` - "Confirm"
- `common.save` - "Save"
- `common.delete` - "Delete"
- `common.edit` - "Edit"
- `common.back` - "Back"
- `common.next` - "Next"
- `common.previous` - "Previous"
- `common.submit` - "Submit"
- `common.required` - "Required"
- `common.optional` - "Optional"

#### Validation
- `validation.required` - "This field is required"
- `validation.email` - "Please enter a valid email address"
- `validation.passwordMinLength` - "Password must be at least 8 characters"
- `validation.passwordMismatch` - "Passwords do not match"
- `validation.usernameMinLength` - "Username must be at least 3 characters"
- `validation.usernameMaxLength` - "Username must be less than 30 characters"

## API Reference

### `initI18n(language?: SupportedLanguage)`

Initialize the i18n instance. Usually called once in your app's root component.

**Parameters:**
- `language` (optional): Initial language to use. Defaults to 'en'.

**Returns:** i18n instance

### `useI18n()`

Hook to access translation functions and language state.

**Returns:**
- `t`: Translation function
- `changeLanguage`: Function to change the current language
- `currentLanguage`: Current language code
- `isReady`: Whether i18n is initialized

### `useI18nNamespace(namespace: string)`

Hook to access translations from a specific namespace.

**Parameters:**
- `namespace`: The namespace to use (e.g., 'common', 'auth')

**Returns:** Same as `useI18n()`

### `supportedLanguages`

Array of supported language codes: `['en', 'fr', 'ar']`

### `defaultLanguage`

Default language code: `'en'`

### `SupportedLanguage`

TypeScript type for supported languages: `'en' | 'fr' | 'ar'`

## Adding New Translations

1. Add new keys to `src/locales/en/common.json`, `src/locales/fr/common.json`, and `src/locales/ar/common.json`
2. Use the new keys in your components with the `t()` function
3. Test all languages to ensure translations work correctly

## Example Implementation

See the forgot-password screens in both mobile and web apps for complete implementation examples.
