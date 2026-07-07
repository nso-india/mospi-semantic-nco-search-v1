import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Call the backend's login endpoint to verify credentials
    const res = await fetch(`${API_BASE}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: body.username,
        password: body.password
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { detail: data.detail || 'Invalid credentials' },
        { status: res.status }
      );
    }

    const data = await res.json();
    
    // Create the response object
    const response = NextResponse.json({ success: true });
    
    // Set the auth_token cookie that middleware.ts expects
    response.cookies.set({
      name: 'auth_token',
      value: data.access_token, // Pre-auth token works as a simple session for 1FA
      httpOnly: false,
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
      sameSite: 'lax',
    });

    return response;
  } catch (error) {
    console.error("Login API route error:", error);
    return NextResponse.json(
      { detail: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
