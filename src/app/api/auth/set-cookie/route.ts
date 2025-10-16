// src/app/api/auth/set-cookie/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;
    
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Valid token required' },
        { status: 400 }
      );
    }

    const response = NextResponse.json({ success: true });
    
    // Set HTTP-only cookie (most secure)
    response.cookies.set('gambino_token', token, {
      httpOnly: true,                                    // XSS protection
      secure: process.env.NODE_ENV === 'production',    // HTTPS only in production
      sameSite: 'strict',                                // CSRF protection
      maxAge: 7 * 24 * 60 * 60,                         // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Cookie setting error:', error);
    return NextResponse.json(
      { error: 'Failed to set authentication cookie' },
      { status: 500 }
    );
  }
}