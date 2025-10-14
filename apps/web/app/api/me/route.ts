import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const response = await fetch(`${process.env.API_BASE}/api/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Client-Type': 'web',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      // If token expired, try to refresh
      if (response.status === 401) {
        const refreshToken = cookieStore.get('refresh_token')?.value;
        if (refreshToken) {
          // Attempt refresh
          const refreshResponse = await fetch(`${process.env.API_BASE}/api/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Client-Type': 'web',
            },
            body: JSON.stringify({ refresh: refreshToken }),
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();

            // Update access token
            cookieStore.set('access_token', refreshData.access, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 60 * 15,
              path: '/',
            });

            // Retry original request with new token
            const retryResponse = await fetch(`${process.env.API_BASE}/api/me`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${refreshData.access}`,
                'X-Client-Type': 'web',
              },
            });

            const retryData = await retryResponse.json();
            return NextResponse.json(retryData, { status: retryResponse.status });
          }
        }

        // Clear cookies if refresh failed
        cookieStore.delete('access_token');
        cookieStore.delete('refresh_token');
      }

      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
