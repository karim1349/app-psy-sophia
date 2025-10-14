import { describe, expect, test } from '@jest/globals';
import {
  RegisterSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
  ResendVerificationSchema,
  type RegisterInput,
  type LoginInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type VerifyEmailInput,
  type ResendVerificationInput,
} from './auth';

describe('RegisterSchema', () => {
  test('validates correct registration data', () => {
    const validData = {
      email: 'karim@example.com',
      username: 'karim123',
      password: 'SecurePass123!',
      passwordConfirm: 'SecurePass123!',
    };

    const result = RegisterSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('karim@example.com');
      expect(result.data.username).toBe('karim123');
    }
  });

  test('rejects invalid email format', () => {
    const invalidData = {
      email: 'not-an-email',
      username: 'karim123',
      password: 'SecurePass123!',
      passwordConfirm: 'SecurePass123!',
    };

    const result = RegisterSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('email');
    }
  });

  test('rejects username shorter than 3 characters', () => {
    const invalidData = {
      email: 'karim@example.com',
      username: 'ka',
      password: 'SecurePass123!',
      passwordConfirm: 'SecurePass123!',
    };

    const result = RegisterSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('username');
    }
  });

  test('rejects username longer than 30 characters', () => {
    const invalidData = {
      email: 'karim@example.com',
      username: 'a'.repeat(31),
      password: 'SecurePass123!',
      passwordConfirm: 'SecurePass123!',
    };

    const result = RegisterSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('username');
    }
  });

  test('rejects password shorter than 8 characters', () => {
    const invalidData = {
      email: 'karim@example.com',
      username: 'karim123',
      password: 'Pass1!',
      passwordConfirm: 'Pass1!',
    };

    const result = RegisterSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('password');
    }
  });

  test('rejects password without uppercase letter', () => {
    const invalidData = {
      email: 'karim@example.com',
      username: 'karim123',
      password: 'securepass123!',
      passwordConfirm: 'securepass123!',
    };

    const result = RegisterSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('password');
      expect(result.error.issues[0].message).toMatch(/uppercase/i);
    }
  });

  test('rejects password without lowercase letter', () => {
    const invalidData = {
      email: 'karim@example.com',
      username: 'karim123',
      password: 'SECUREPASS123!',
      passwordConfirm: 'SECUREPASS123!',
    };

    const result = RegisterSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('password');
      expect(result.error.issues[0].message).toMatch(/lowercase/i);
    }
  });

  test('rejects password without digit', () => {
    const invalidData = {
      email: 'karim@example.com',
      username: 'karim123',
      password: 'SecurePass!',
      passwordConfirm: 'SecurePass!',
    };

    const result = RegisterSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('password');
      expect(result.error.issues[0].message).toMatch(/digit/i);
    }
  });

  test('rejects password without special character', () => {
    const invalidData = {
      email: 'karim@example.com',
      username: 'karim123',
      password: 'SecurePass123',
      passwordConfirm: 'SecurePass123',
    };

    const result = RegisterSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('password');
      expect(result.error.issues[0].message).toMatch(/special character/i);
    }
  });

  test('rejects mismatched passwords', () => {
    const invalidData = {
      email: 'karim@example.com',
      username: 'karim123',
      password: 'SecurePass123!',
      passwordConfirm: 'DifferentPass123!',
    };

    const result = RegisterSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/passwords.*match/i);
    }
  });

  test('trims whitespace from email and username', () => {
    const dataWithSpaces = {
      email: '  karim@example.com  ',
      username: '  karim123  ',
      password: 'SecurePass123!',
      passwordConfirm: 'SecurePass123!',
    };

    const result = RegisterSchema.safeParse(dataWithSpaces);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('karim@example.com');
      expect(result.data.username).toBe('karim123');
    }
  });

  test('converts email to lowercase', () => {
    const dataWithUppercase = {
      email: 'Karim@EXAMPLE.COM',
      username: 'karim123',
      password: 'SecurePass123!',
      passwordConfirm: 'SecurePass123!',
    };

    const result = RegisterSchema.safeParse(dataWithUppercase);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('karim@example.com');
    }
  });
});

describe('LoginSchema', () => {
  test('validates correct login data', () => {
    const validData = {
      email: 'karim@example.com',
      password: 'SecurePass123!',
    };

    const result = LoginSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('karim@example.com');
      expect(result.data.password).toBe('SecurePass123!');
    }
  });

  test('rejects invalid email format', () => {
    const invalidData = {
      email: 'not-an-email',
      password: 'SecurePass123!',
    };

    const result = LoginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('email');
    }
  });

  test('rejects empty password', () => {
    const invalidData = {
      email: 'karim@example.com',
      password: '',
    };

    const result = LoginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('password');
    }
  });

  test('trims and lowercases email', () => {
    const dataWithSpaces = {
      email: '  Karim@EXAMPLE.COM  ',
      password: 'SecurePass123!',
    };

    const result = LoginSchema.safeParse(dataWithSpaces);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('karim@example.com');
    }
  });

  test('accepts any password (no validation on login)', () => {
    const validData = {
      email: 'karim@example.com',
      password: 'abc', // Short password is OK for login
    };

    const result = LoginSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});

describe('ForgotPasswordSchema', () => {
  test('validates correct email', () => {
    const validData = {
      email: 'karim@example.com',
    };

    const result = ForgotPasswordSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('karim@example.com');
    }
  });

  test('rejects invalid email format', () => {
    const invalidData = {
      email: 'not-an-email',
    };

    const result = ForgotPasswordSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('email');
    }
  });

  test('trims and lowercases email', () => {
    const dataWithSpaces = {
      email: '  Karim@EXAMPLE.COM  ',
    };

    const result = ForgotPasswordSchema.safeParse(dataWithSpaces);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('karim@example.com');
    }
  });
});

describe('ResetPasswordSchema', () => {
  test('validates correct reset data', () => {
    const validData = {
      token: 'valid-reset-token-123',
      password: 'NewSecurePass123!',
      passwordConfirm: 'NewSecurePass123!',
    };

    const result = ResetPasswordSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.token).toBe('valid-reset-token-123');
    }
  });

  test('rejects empty token', () => {
    const invalidData = {
      token: '',
      password: 'NewSecurePass123!',
      passwordConfirm: 'NewSecurePass123!',
    };

    const result = ResetPasswordSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('token');
    }
  });

  test('rejects weak password', () => {
    const invalidData = {
      token: 'valid-reset-token-123',
      password: 'weak',
      passwordConfirm: 'weak',
    };

    const result = ResetPasswordSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('password');
    }
  });

  test('rejects mismatched passwords', () => {
    const invalidData = {
      token: 'valid-reset-token-123',
      password: 'NewSecurePass123!',
      passwordConfirm: 'DifferentPass123!',
    };

    const result = ResetPasswordSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/passwords.*match/i);
    }
  });

  test('applies same password complexity rules as registration', () => {
    const testCases = [
      {
        password: 'nouppercase123!',
        shouldFail: true,
        reason: 'no uppercase',
      },
      {
        password: 'NOLOWERCASE123!',
        shouldFail: true,
        reason: 'no lowercase',
      },
      {
        password: 'NoDigits!',
        shouldFail: true,
        reason: 'no digits',
      },
      {
        password: 'NoSpecialChar123',
        shouldFail: true,
        reason: 'no special character',
      },
      {
        password: 'ValidPass123!',
        shouldFail: false,
        reason: 'valid password',
      },
    ];

    testCases.forEach(({ password, shouldFail, reason }) => {
      const data = {
        token: 'valid-token',
        password,
        passwordConfirm: password,
      };

      const result = ResetPasswordSchema.safeParse(data);
      if (shouldFail) {
        expect(result.success).toBe(false);
      } else {
        expect(result.success).toBe(true);
      }
    });
  });
});

describe('VerifyEmailSchema', () => {
  test('validates correct verification data', () => {
    const validData = {
      email: 'karim@example.com',
      code: '123456',
    };

    const result = VerifyEmailSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('karim@example.com');
      expect(result.data.code).toBe('123456');
    }
  });

  test('rejects non-numeric code', () => {
    const invalidData = {
      email: 'karim@example.com',
      code: 'ABC123',
    };

    const result = VerifyEmailSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('code');
      expect(result.error.issues[0].message).toMatch(/numeric/i);
    }
  });

  test('rejects code shorter than 6 digits', () => {
    const invalidData = {
      email: 'karim@example.com',
      code: '12345',
    };

    const result = VerifyEmailSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('code');
      expect(result.error.issues[0].message).toMatch(/6 digits/i);
    }
  });

  test('rejects code longer than 6 digits', () => {
    const invalidData = {
      email: 'karim@example.com',
      code: '1234567',
    };

    const result = VerifyEmailSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('code');
      expect(result.error.issues[0].message).toMatch(/6 digits/i);
    }
  });

  test('rejects invalid email format', () => {
    const invalidData = {
      email: 'not-an-email',
      code: '123456',
    };

    const result = VerifyEmailSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('email');
    }
  });

  test('trims and lowercases email', () => {
    const dataWithSpaces = {
      email: '  Karim@EXAMPLE.COM  ',
      code: '123456',
    };

    const result = VerifyEmailSchema.safeParse(dataWithSpaces);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('karim@example.com');
    }
  });

  test('accepts exactly 6 digits', () => {
    const validData = {
      email: 'karim@example.com',
      code: '000000',
    };

    const result = VerifyEmailSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});

describe('ResendVerificationSchema', () => {
  test('validates correct email', () => {
    const validData = {
      email: 'karim@example.com',
    };

    const result = ResendVerificationSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('karim@example.com');
    }
  });

  test('rejects invalid email format', () => {
    const invalidData = {
      email: 'not-an-email',
    };

    const result = ResendVerificationSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('email');
    }
  });

  test('trims and lowercases email', () => {
    const dataWithSpaces = {
      email: '  Karim@EXAMPLE.COM  ',
    };

    const result = ResendVerificationSchema.safeParse(dataWithSpaces);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('karim@example.com');
    }
  });

  test('rejects empty email', () => {
    const invalidData = {
      email: '',
    };

    const result = ResendVerificationSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('email');
    }
  });
});

describe('Type exports', () => {
  test('RegisterInput type is inferred correctly', () => {
    const input: RegisterInput = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'SecurePass123!',
      passwordConfirm: 'SecurePass123!',
    };

    expect(input.email).toBeDefined();
    expect(input.username).toBeDefined();
    expect(input.password).toBeDefined();
    expect(input.passwordConfirm).toBeDefined();
  });

  test('LoginInput type is inferred correctly', () => {
    const input: LoginInput = {
      email: 'test@example.com',
      password: 'SecurePass123!',
    };

    expect(input.email).toBeDefined();
    expect(input.password).toBeDefined();
  });

  test('ForgotPasswordInput type is inferred correctly', () => {
    const input: ForgotPasswordInput = {
      email: 'test@example.com',
    };

    expect(input.email).toBeDefined();
  });

  test('ResetPasswordInput type is inferred correctly', () => {
    const input: ResetPasswordInput = {
      token: 'token-123',
      password: 'NewSecurePass123!',
      passwordConfirm: 'NewSecurePass123!',
    };

    expect(input.token).toBeDefined();
    expect(input.password).toBeDefined();
    expect(input.passwordConfirm).toBeDefined();
  });

  test('VerifyEmailInput type is inferred correctly', () => {
    const input: VerifyEmailInput = {
      email: 'test@example.com',
      code: '123456',
    };

    expect(input.email).toBeDefined();
    expect(input.code).toBeDefined();
  });

  test('ResendVerificationInput type is inferred correctly', () => {
    const input: ResendVerificationInput = {
      email: 'test@example.com',
    };

    expect(input.email).toBeDefined();
  });
});
