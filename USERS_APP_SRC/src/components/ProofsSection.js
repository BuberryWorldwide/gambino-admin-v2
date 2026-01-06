'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

/**
 * ProofsSection - Display user's entropy proofs from Arca
 * Shows pending GG rewards and verifiable proofs on Hedera
 */
export default function ProofsSection({ userId }) {
  const [proofs, setProofs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const fetchProofs = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/api/proofs/user/${userId}?limit=10`);
        setProofs(data.proofs || []);
        setStats(data.stats || null);
        setError('');
      } catch (e) {
        setError(e?.response?.data?.error || 'Failed to load proofs');
      } finally {
        setLoading(false);
      }
    };

    fetchProofs();
    // Poll every 60 seconds for new proofs
    const interval = setInterval(fetchProofs, 60000);
    return () => clearInterval(interval);
  }, [userId]);

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateHash = (hash) => {
    if (!hash) return '-';
    return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
  };

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-8">
          <div className="loading-spinner text-yellow-400"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 md:mb-6 gap-4">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Entropy Proofs
          </h2>
          <p className="text-xs text-neutral-400 mt-1">Verified contributions to the Arca network</p>
        </div>
        {stats && (
          <div className="flex items-center gap-2 text-xs md:text-sm">
            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
              {stats.totalProofs} proofs
            </span>
            <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full border border-yellow-500/30">
              {stats.totalPendingGG?.toFixed(3) || 0} GG pending
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500 text-red-300 p-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-neutral-800/50 rounded-lg p-4 text-center border border-neutral-700">
            <p className="text-xs text-neutral-400 uppercase tracking-wider">Total Entropy</p>
            <p className="text-xl md:text-2xl font-bold text-white mt-1">
              {stats.totalEntropy?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-neutral-500">bits</p>
          </div>
          <div className="bg-neutral-800/50 rounded-lg p-4 text-center border border-neutral-700">
            <p className="text-xs text-neutral-400 uppercase tracking-wider">Pending</p>
            <p className="text-xl md:text-2xl font-bold text-yellow-400 mt-1">
              {stats.totalPendingGG?.toFixed(3) || 0}
            </p>
            <p className="text-xs text-neutral-500">GG tokens</p>
          </div>
          <div className="bg-neutral-800/50 rounded-lg p-4 text-center border border-neutral-700">
            <p className="text-xs text-neutral-400 uppercase tracking-wider">Verified</p>
            <p className="text-xl md:text-2xl font-bold text-green-400 mt-1">
              {proofs.filter(p => p.isAnchored).length}
            </p>
            <p className="text-xs text-neutral-500">on Hedera</p>
          </div>
        </div>
      )}

      {/* Proofs List */}
      {proofs.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-purple-500/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <p className="text-neutral-400 text-sm">No entropy proofs yet</p>
          <p className="text-neutral-500 text-xs mt-1">Play games to earn verifiable entropy rewards</p>
        </div>
      ) : (
        <div className="space-y-3">
          {proofs.map((proof, idx) => (
            <div
              key={proof._id || idx}
              className="bg-neutral-800/50 rounded-lg border border-neutral-700 overflow-hidden"
            >
              {/* Proof Header */}
              <button
                onClick={() => setExpanded(expanded === idx ? null : idx)}
                className="w-full p-4 flex items-center justify-between hover:bg-neutral-700/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Status indicator */}
                  <div className={`w-2 h-2 rounded-full ${
                    proof.isAnchored ? 'bg-green-400' :
                    proof.status === 'pending' ? 'bg-yellow-400 animate-pulse' :
                    'bg-neutral-500'
                  }`}></div>

                  <div className="text-left">
                    <p className="text-sm font-medium text-white">
                      {proof.sourceType === 'venue' ? '🎰 Venue' : '📱 Mobile'} Entropy
                    </p>
                    <p className="text-xs text-neutral-400">
                      {formatDate(proof.submittedAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-bold text-yellow-400">+{proof.pendingGG?.toFixed(4) || 0} GG</p>
                    <p className="text-xs text-neutral-500">{proof.entropyBits} bits</p>
                  </div>

                  <svg
                    className={`w-5 h-5 text-neutral-400 transition-transform ${expanded === idx ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Expanded Details */}
              {expanded === idx && (
                <div className="px-4 pb-4 border-t border-neutral-700 pt-4 space-y-3">
                  {/* Trace Hash */}
                  <div>
                    <p className="text-xs text-neutral-400 mb-1">Trace Hash</p>
                    <p className="font-mono text-xs text-neutral-300 bg-neutral-900/50 p-2 rounded break-all">
                      {proof.traceHash}
                    </p>
                  </div>

                  {/* Merkle Root */}
                  {proof.merkleRoot && (
                    <div>
                      <p className="text-xs text-neutral-400 mb-1">Merkle Root</p>
                      <p className="font-mono text-xs text-neutral-300 bg-neutral-900/50 p-2 rounded">
                        {truncateHash(proof.merkleRoot)}
                      </p>
                    </div>
                  )}

                  {/* HCS Info */}
                  {proof.hcs?.topicId && (
                    <div>
                      <p className="text-xs text-neutral-400 mb-1">Hedera Consensus</p>
                      <div className="bg-green-900/20 border border-green-500/30 rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-green-300">Topic ID</span>
                          <span className="font-mono text-xs text-green-400">{proof.hcs.topicId}</span>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-green-300">Sequence</span>
                          <span className="font-mono text-xs text-green-400">#{proof.hcs.sequenceNumber}</span>
                        </div>
                        {proof.hederaExplorerUrl && (
                          <a
                            href={proof.hederaExplorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 mt-3 text-xs text-green-400 hover:text-green-300 bg-green-500/10 py-2 rounded transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Verify on Hedera Explorer
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="flex items-center justify-between pt-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      proof.isAnchored
                        ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                        : proof.status === 'pending'
                        ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                        : 'bg-neutral-500/20 text-neutral-300 border border-neutral-500/30'
                    }`}>
                      {proof.isAnchored ? '✓ Verified on Hedera' :
                       proof.status === 'pending' ? '⏳ Pending Verification' :
                       proof.status}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info Footer */}
      <div className="mt-6 pt-4 border-t border-neutral-700">
        <div className="flex items-start gap-3 text-xs text-neutral-500">
          <svg className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>
            Entropy proofs are cryptographically verified and anchored to Hedera Consensus Service.
            Click any proof to see verification details and verify on the public Hedera explorer.
          </p>
        </div>
      </div>
    </div>
  );
}
