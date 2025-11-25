'use client';
import { useState } from 'react';
import api from '@/lib/api';
import { getToken } from '@/lib/auth'; // whatever you already use to read JWT

export default function ConnectPage() {
  const [pubkey, setPubkey] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [saving, setSaving] = useState(false);

  const isMobile = () =>
    typeof navigator !== 'undefined' &&
    /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const getPhantom = () => {
    if (typeof window === 'undefined') return null;
    return (window.phantom && window.phantom.solana?.isPhantom && window.phantom.solana)
        || (window.solana?.isPhantom && window.solana)
        || null;
  };

  const connectPhantom = async () => {
    setErr('');
    setMsg('');
    setConnecting(true);
    try {
      const phantom = getPhantom();
      if (!phantom) {
        // No Phantom in this browser
        if (isMobile()) {
          // Open your site inside Phantom’s in-app browser (replace with your actual domain)
          window.location.href = 'https://phantom.app/ul/browse/https://YOUR-DOMAIN-HERE';
        } else {
          window.open('https://phantom.app/', '_blank');
        }
        return;
      }

      const resp = await phantom.connect({ onlyIfTrusted: false });
      const key = resp?.publicKey?.toBase58?.() || resp?.publicKey?.toString?.();
      if (!key) throw new Error('No public key returned');
      setPubkey(key);
      setMsg('Wallet connected. Click “Save to Account” to attach it.');
    } catch (e) {
      setErr(e?.message || 'Wallet connect failed');
    } finally {
      setConnecting(false);
    }
  };

  const saveToAccount = async () => {
    setErr('');
    setMsg('');
    setSaving(true);
    try {
      const token = getToken();
      if (!token) throw new Error('Not logged in');

      // Basic attach (no signature). You can add signed-message verification later.
      await api.post('/api/wallet/attach', { publicKey: pubkey }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMsg('Wallet attached to your account.');
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || 'Failed to save wallet');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-10 space-y-4">
      <h1 className="text-3xl font-bold">Connect Wallet (Solana)</h1>
      <p className="text-zinc-400">Phantom is supported on mobile & desktop.</p>

      <button className="btn btn-gold w-full" onClick={connectPhantom} disabled={connecting}>
        {connecting ? 'Connecting…' : 'Connect with Phantom'}
      </button>

      {pubkey && (
        <div className="card p-4 space-y-2">
          <div className="text-sm break-all">Connected: {pubkey}</div>
          <button className="btn w-full" onClick={saveToAccount} disabled={saving}>
            {saving ? 'Saving…' : 'Save to Account'}
          </button>
        </div>
      )}

      {msg && <p className="text-emerald-400 text-sm">{msg}</p>}
      {err && <p className="text-red-400 text-sm">{err}</p>}

      <p className="text-xs text-zinc-400">
        Tip: On mobile, open this site inside the Phantom app for the smoothest experience.
      </p>
    </div>
  );
}
