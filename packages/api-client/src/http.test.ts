import { createHttp } from './http';
import { HttpError } from './types';

// Mock fetch globally
const originalFetch = globalThis.fetch;

describe('createHttp', () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.fn() as jest.Mock;
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('native environment', () => {
    test('adds Authorization header when token is available', async () => {
      const accessToken = 'test-access-token';
      const http = createHttp({
        env: 'native',
        baseURL: 'https://api.app-psy-sophia.ma',
        getAccessToken: () => accessToken,
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      });

      await http.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.app-psy-sophia.ma/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${accessToken}`,
          }),
        })
      );
    });

    test('does not add Authorization header when no token', async () => {
      const http = createHttp({
        env: 'native',
        baseURL: 'https://api.app-psy-sophia.ma',
        getAccessToken: () => null,
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      });

      await http.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.app-psy-sophia.ma/test',
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.anything(),
          }),
        })
      );
    });

    test('sets Content-Type for POST requests', async () => {
      const http = createHttp({
        env: 'native',
        baseURL: 'https://api.app-psy-sophia.ma',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: 1 }),
      });

      await http.post('/test', { name: 'test' });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.app-psy-sophia.ma/test',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ name: 'test' }),
        })
      );
    });
  });

  describe('web environment', () => {
    test('includes credentials for cookie-based auth', async () => {
      const http = createHttp({
        env: 'web',
        baseURL: 'https://api.app-psy-sophia.ma',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      });

      await http.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.app-psy-sophia.ma/test',
        expect.objectContaining({
          credentials: 'include',
        })
      );
    });

    test('does not add Authorization header', async () => {
      const http = createHttp({
        env: 'web',
        baseURL: 'https://api.app-psy-sophia.ma',
        getAccessToken: () => 'should-not-be-used',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      });

      await http.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.app-psy-sophia.ma/test',
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.anything(),
          }),
        })
      );
    });
  });

  describe('HTTP methods', () => {
    test('GET request', async () => {
      const http = createHttp({
        env: 'native',
        baseURL: 'https://api.app-psy-sophia.ma',
      });

      const responseData = { id: 1, name: 'test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => responseData,
      });

      const result = await http.get('/users/1');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.app-psy-sophia.ma/users/1',
        expect.objectContaining({
          method: 'GET',
        })
      );
      expect(result).toEqual(responseData);
    });

    test('POST request with data', async () => {
      const http = createHttp({
        env: 'native',
        baseURL: 'https://api.app-psy-sophia.ma',
      });

      const postData = { email: 'test@example.com', password: 'pass' };
      const responseData = { user: { id: 1 }, access: 'token' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => responseData,
      });

      const result = await http.post('/users/login/', postData);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.app-psy-sophia.ma/users/login/',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(postData),
        })
      );
      expect(result).toEqual(responseData);
    });

    test('PATCH request with data', async () => {
      const http = createHttp({
        env: 'native',
        baseURL: 'https://api.app-psy-sophia.ma',
      });

      const patchData = { username: 'newname' };
      const responseData = { id: 1, username: 'newname' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => responseData,
      });

      const result = await http.patch('/users/1', patchData);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.app-psy-sophia.ma/users/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(patchData),
        })
      );
      expect(result).toEqual(responseData);
    });

    test('DELETE request', async () => {
      const http = createHttp({
        env: 'native',
        baseURL: 'https://api.app-psy-sophia.ma',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: async () => '',
      });

      const result = await http.delete('/users/1');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.app-psy-sophia.ma/users/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('error handling', () => {
    test('throws HttpError for 4xx errors', async () => {
      const http = createHttp({
        env: 'native',
        baseURL: 'https://api.app-psy-sophia.ma',
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          message: 'Bad request',
          errors: {
            email: ['This field is required'],
          },
        }),
      });

      try {
        await http.get('/test');
        fail('Should have thrown HttpError');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpError);
        expect((error as HttpError).status).toBe(400);
        expect((error as HttpError).message).toBe('Bad request');
        expect((error as HttpError).errors).toEqual({
          email: ['This field is required'],
        });
      }
    });

    test('throws HttpError for 5xx errors', async () => {
      const http = createHttp({
        env: 'native',
        baseURL: 'https://api.app-psy-sophia.ma',
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          message: 'Internal server error',
        }),
      });

      try {
        await http.get('/test');
        fail('Should have thrown HttpError');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpError);
        expect((error as HttpError).status).toBe(500);
        expect((error as HttpError).message).toBe('Internal server error');
      }
    });

    test('throws HttpError for 401 unauthorized', async () => {
      const http = createHttp({
        env: 'native',
        baseURL: 'https://api.app-psy-sophia.ma',
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          message: 'Authentication credentials were not provided.',
        }),
      });

      try {
        await http.get('/users/me/');
        fail('Should have thrown HttpError');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpError);
        expect((error as HttpError).status).toBe(401);
      }
    });

    test('throws HttpError for network errors', async () => {
      const http = createHttp({
        env: 'native',
        baseURL: 'https://api.app-psy-sophia.ma',
      });

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(http.get('/test')).rejects.toThrow('Network error');
    });

    test('handles non-JSON error responses', async () => {
      const http = createHttp({
        env: 'native',
        baseURL: 'https://api.app-psy-sophia.ma',
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new Error('Not JSON');
        },
      });

      try {
        await http.get('/test');
        fail('Should have thrown HttpError');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpError);
        expect((error as HttpError).status).toBe(500);
        expect((error as HttpError).message).toBe('Internal Server Error');
      }
    });
  });

  describe('custom headers', () => {
    test('merges custom headers with default headers', async () => {
      const http = createHttp({
        env: 'native',
        baseURL: 'https://api.app-psy-sophia.ma',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      });

      await http.get('/test', {
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.app-psy-sophia.ma/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'custom-value',
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });

  describe('response parsing', () => {
    test('parses JSON responses', async () => {
      const http = createHttp({
        env: 'native',
        baseURL: 'https://api.app-psy-sophia.ma',
      });

      const responseData = { id: 1, name: 'test', active: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => responseData,
      });

      const result = await http.get<typeof responseData>('/test');

      expect(result).toEqual(responseData);
      expect(result.id).toBe(1);
      expect(result.name).toBe('test');
      expect(result.active).toBe(true);
    });

    test('handles empty responses (204 No Content)', async () => {
      const http = createHttp({
        env: 'native',
        baseURL: 'https://api.app-psy-sophia.ma',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: async () => '',
      });

      const result = await http.delete('/test');

      expect(result).toBeUndefined();
    });
  });

  describe('URL building', () => {
    test('combines baseURL and path correctly', async () => {
      const http = createHttp({
        env: 'native',
        baseURL: 'https://api.app-psy-sophia.ma',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await http.get('/users/123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.app-psy-sophia.ma/users/123',
        expect.any(Object)
      );
    });

    test('handles baseURL without trailing slash', async () => {
      const http = createHttp({
        env: 'native',
        baseURL: 'https://api.app-psy-sophia.ma',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await http.get('/users');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.app-psy-sophia.ma/users',
        expect.any(Object)
      );
    });

    test('handles baseURL with trailing slash', async () => {
      const http = createHttp({
        env: 'native',
        baseURL: 'https://api.app-psy-sophia.ma/',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await http.get('/users');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.app-psy-sophia.ma/users',
        expect.any(Object)
      );
    });
  });

  describe('email verification endpoints', () => {
    test('POST /auth/verify-email with email and code', async () => {
      const http = createHttp({
        env: 'native',
        baseURL: 'https://api.app-psy-sophia.ma',
      });

      const verifyData = {
        email: 'karim@example.com',
        code: '123456',
      };
      const responseData = {
        user: { id: 1, email: 'karim@example.com', username: 'karim' },
        access: 'access-token',
        refresh: 'refresh-token',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => responseData,
      });

      const result = await http.post('/users/verify_email/', verifyData);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.app-psy-sophia.ma/users/verify_email/',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(verifyData),
        })
      );
      expect(result).toEqual(responseData);
    });

    test('POST /auth/resend-verification with email', async () => {
      const http = createHttp({
        env: 'native',
        baseURL: 'https://api.app-psy-sophia.ma',
      });

      const resendData = {
        email: 'karim@example.com',
      };
      const responseData = {
        message: 'Verification code sent successfully',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => responseData,
      });

      const result = await http.post('/users/resend_verification/', resendData);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.app-psy-sophia.ma/users/resend_verification/',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(resendData),
        })
      );
      expect(result).toEqual(responseData);
    });

    test('handles 400 error for invalid verification code', async () => {
      const http = createHttp({
        env: 'native',
        baseURL: 'https://api.app-psy-sophia.ma',
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          message: 'Invalid or expired verification code',
          errors: {
            code: ['Invalid code'],
          },
        }),
      });

      try {
        await http.post('/users/verify_email/', {
          email: 'karim@example.com',
          code: '000000',
        });
        fail('Should have thrown HttpError');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpError);
        expect((error as HttpError).status).toBe(400);
        expect((error as HttpError).message).toBe('Invalid or expired verification code');
      }
    });

    test('handles 429 error for rate limiting on resend', async () => {
      const http = createHttp({
        env: 'native',
        baseURL: 'https://api.app-psy-sophia.ma',
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          message: 'Rate limit exceeded. Please try again later.',
        }),
      });

      try {
        await http.post('/users/resend_verification/', {
          email: 'karim@example.com',
        });
        fail('Should have thrown HttpError');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpError);
        expect((error as HttpError).status).toBe(429);
        expect((error as HttpError).message).toContain('Rate limit');
      }
    });
  });
});
