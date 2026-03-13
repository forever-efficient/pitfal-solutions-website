'use client';

import { useState, useEffect, useRef } from 'react';
import { adminDocuments } from '@/lib/api';
import type { DocuSealStatus } from '@/lib/api';

interface DocuSealToggleProps {
  onStatusChange?: (status: DocuSealStatus) => void;
}

export function DocuSealToggle({ onStatusChange }: DocuSealToggleProps) {
  const [status, setStatus] = useState<DocuSealStatus>('off');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function updateStatus(newStatus: DocuSealStatus) {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }

  async function fetchStatus() {
    try {
      const data = await adminDocuments.getStatus();
      updateStatus(data.status);
      if (data.error) setError(data.error);
      else setError(null);
      return data.status;
    } catch {
      return status;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Start or stop polling based on transitional states
    if (status === 'starting' || status === 'stopping') {
      if (!pollRef.current) {
        pollRef.current = setInterval(async () => {
          const newStatus = await fetchStatus();
          if (newStatus !== 'starting' && newStatus !== 'stopping') {
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
          }
        }, 5000);
      }
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleToggle() {
    if (status === 'running') {
      setShowConfirm(true);
      return;
    }

    try {
      setError(null);
      const data = await adminDocuments.toggle('enable');
      updateStatus(data.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toggle failed');
    }
  }

  async function confirmDisable() {
    setShowConfirm(false);
    try {
      setError(null);
      const data = await adminDocuments.toggle('disable');
      updateStatus(data.status);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Toggle failed';
      setError(message);
    }
  }

  const statusConfig: Record<DocuSealStatus, { color: string; label: string; animate?: boolean }> = {
    running: { color: 'bg-green-500', label: 'Running' },
    starting: { color: 'bg-yellow-500', label: 'Starting...', animate: true },
    stopping: { color: 'bg-yellow-500', label: 'Shutting down...', animate: true },
    off: { color: 'bg-neutral-400', label: 'Offline' },
    error: { color: 'bg-red-500', label: 'Error' },
  };

  const config = statusConfig[status];

  if (loading) {
    return <div className="h-8 w-32 bg-neutral-200 rounded animate-pulse" />;
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <span className={`inline-block w-2.5 h-2.5 rounded-full ${config.color} ${config.animate ? 'animate-pulse' : ''}`} />
        <span className="text-sm font-medium text-neutral-700">DocuSeal: {config.label}</span>
      </div>

      {(status === 'off' || status === 'error') && (
        <button
          onClick={handleToggle}
          className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Enable
        </button>
      )}

      {status === 'running' && (
        <button
          onClick={handleToggle}
          className="px-3 py-1.5 text-xs font-medium bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 transition-colors"
        >
          Shut Down
        </button>
      )}

      {error && (
        <span className="text-xs text-red-600">{error}</span>
      )}

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-neutral-900 mb-2">Shut down DocuSeal?</h3>
            <p className="text-sm text-neutral-600 mb-4">
              Data is preserved via snapshot (~$1/mo). You can re-enable anytime from this page.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmDisable}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Shut Down
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
