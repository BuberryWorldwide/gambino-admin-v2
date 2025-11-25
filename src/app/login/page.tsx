// src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import axios from 'axios';
import api from '@/lib/api';
import { setToken, getUserRedirectUrl } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Basic validation
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    if (!password || password.length < 4) {
      setError('Please enter your password');
      setLoading(false);
      return;
    }

    try {
      // Step 1: Login to backend
      const { data } = await api.post('/api/auth/login', { email, password });

      // Validate response has required fields
      if (!data?.token || !data?.user) {
        throw new Error('Invalid response from server');
      }

      // Step 2: Store token and user data in localStorage
      setToken(data.token, data.user);
      
      // Step 3: Also set HTTP-only cookie for server-side middleware
      try {
        await fetch('/api/auth/set-cookie', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: data.token }),
        });
      } catch (cookieError) {
        console.error('Failed to set cookie:', cookieError);
        // Continue anyway - localStorage auth will still work
      }
      
// Step 4: Redirect based on user role
      const redirectUrl = getUserRedirectUrl(data.user);
      router.push(redirectUrl);
      
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || 'Login failed');
      } else {
        setError('Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <Card className="w-full max-w-md p-8 bg-gray-900 border-gray-800">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Gambino Admin</h1>
          <p className="text-gray-400 text-sm">Sign in to access the admin panel</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Email</label>
            <Input
              type="email"
              placeholder="admin@gambino.gold"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              required
            />
          </div>
          
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Password</label>
            <Input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              required
            />
          </div>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          
          <Button 
            type="submit" 
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold" 
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
        
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Authorized personnel only</p>
        </div>
      </Card>
    </div>
  );
}