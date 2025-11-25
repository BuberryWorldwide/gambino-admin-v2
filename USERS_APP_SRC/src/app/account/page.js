'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { getToken } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    api.get('/api/users/profile').then(({data}) => setUser(data.user))
    .catch((err)=> setError(err?.response?.data?.error || 'Failed to load profile'));
  }, [router]);

  if (!getToken()) return null;

  return (
    <div className="max-w-lg">
      <h1 className="text-3xl font-bold mb-4">Account</h1>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {!user ? <p className="text-zinc-400">Loading…</p> : (
        <div className="card space-y-3">
          <div>
            <div className="label">Email</div>
            <div>{user.email}</div>
          </div>
          <div>
            <div className="label">Wallet Address</div>
            <div className="break-all">{user.walletAddress}</div>
          </div>
          <div className="text-zinc-400 text-sm">Joined: {new Date(user.createdAt).toLocaleString()}</div>
        </div>
      )}
    </div>
  );
}
