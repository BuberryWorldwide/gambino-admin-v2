'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import LeaderboardTable from '@/components/LeaderboardTable';

export default function LeaderboardPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/leaderboard')
      .then(({data}) => setRows(data.leaderboard || []))
      .catch((err) => setError(err?.response?.data?.error || 'Failed to load leaderboard'));
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Leaderboard</h1>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <LeaderboardTable rows={rows} />
    </div>
  );
}
