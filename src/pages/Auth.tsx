import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: mode, email, password }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Auth failed');
      // session cookie set by server; do not store userId locally
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 bg-white dark:bg-gray-900 p-6 rounded border border-gray-200 dark:border-gray-800">
        <h1 className="text-xl font-semibold">{mode === 'signup' ? 'Create account' : 'Sign in'}</h1>
        <div>
          <label htmlFor="email" className="block text-sm mb-1">Email</label>
          <input id="email" placeholder="you@example.com" type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded border px-3 py-2 bg-transparent" />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm mb-1">Password</label>
          <input id="password" placeholder="your password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded border px-3 py-2 bg-transparent" />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button type="submit" disabled={loading} className="w-full py-2 rounded bg-black text-white disabled:opacity-50">
          {loading ? 'Please wait...' : (mode === 'signup' ? 'Sign up' : 'Sign in')}
        </button>
        <button type="button" onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')} className="w-full py-2 rounded border">
          {mode === 'signup' ? 'Have an account? Sign in' : 'Need an account? Sign up'}
        </button>
      </form>
    </div>
  );
}


