'use client';

import { useState } from 'react';
import { clientAuth, ApiError } from '@/lib/api';
import { BUSINESS } from '@/lib/constants';

interface PasswordGateProps {
  galleryId: string;
  onAuthenticated: (galleryTitle: string) => void;
}

export function PasswordGate({ galleryId, onAuthenticated }: PasswordGateProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await clientAuth.login(galleryId, password);
      onAuthenticated(data.galleryTitle);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-neutral-900 mb-2">
            Private Gallery
          </h1>
          <p className="text-neutral-600">{BUSINESS.name}</p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-sm border border-neutral-200 p-8"
        >
          <label
            htmlFor="gallery-password"
            className="block text-sm font-medium text-neutral-700 mb-2"
          >
            Enter your gallery password
          </label>
          <input
            id="gallery-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
            placeholder="Password"
            required
            autoFocus
          />
          {error && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="mt-4 w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Verifying...' : 'Access Gallery'}
          </button>
        </form>
      </div>
    </div>
  );
}
