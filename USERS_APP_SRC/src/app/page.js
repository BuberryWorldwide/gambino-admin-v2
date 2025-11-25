'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-yellow-400 border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 relative z-10">
      {/* Simple Hero */}
      <div className="text-center py-16">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
          <span className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent">
            GAMBINO
          </span>
        </h1>
        <p className="text-lg md:text-xl text-neutral-300 mb-8">
          Farm Luck. Mine Destiny.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/onboard" className="inline-flex items-center justify-center rounded-lg font-semibold px-6 py-3 bg-yellow-500 text-black hover:bg-yellow-400 transition-colors">
            Get Started
          </Link>
          <Link href="/leaderboard" className="inline-flex items-center justify-center rounded-lg font-semibold px-6 py-3 border border-neutral-700 text-neutral-100 hover:border-neutral-500 hover:bg-neutral-800/50 transition-colors">
            View Leaderboard
          </Link>
        </div>
      </div>

      {/* Simple Navigation Cards */}
      <div className="grid gap-6 md:grid-cols-3 mt-12">
        <Link href="/dashboard" className="block p-6 rounded-xl border border-neutral-800 bg-neutral-950/90 hover:border-neutral-700 hover:scale-105 transition-all duration-300 group">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-yellow-500/20 flex items-center justify-center group-hover:bg-yellow-500/30 transition-colors">
              {/* Dashboard Icon */}
              <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Dashboard</h3>
            <p className="text-neutral-400 text-sm">
              Track your balance and wallet activity
            </p>
          </div>
        </Link>
        
        <Link href="/leaderboard" className="block p-6 rounded-xl border border-neutral-800 bg-neutral-950/90 hover:border-neutral-700 hover:scale-105 transition-all duration-300 group">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-yellow-500/20 flex items-center justify-center group-hover:bg-yellow-500/30 transition-colors">
              {/* Trophy Icon */}
              <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Leaderboard</h3>
            <p className="text-neutral-400 text-sm">
              See community rankings and stats
            </p>
          </div>
        </Link>
        
        <Link href="/account" className="block p-6 rounded-xl border border-neutral-800 bg-neutral-950/90 hover:border-neutral-700 hover:scale-105 transition-all duration-300 group">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-yellow-500/20 flex items-center justify-center group-hover:bg-yellow-500/30 transition-colors">
              {/* User Icon */}
              <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Account</h3>
            <p className="text-neutral-400 text-sm">
              Manage your profile and settings
            </p>
          </div>
        </Link>
      </div>

      {/* Simple Status Bar */}
      <div className="mt-12 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/50 px-4 py-2 text-sm text-neutral-300 backdrop-blur-sm">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
          Network Online • Ready to Use
        </div>
      </div>
    </div>
  );
}