import { useState } from 'react';
import { useAuth } from '../authContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await register(username, password, displayName || username);
      }
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-gray-900">Building Estimator</h1>
          <p className="text-sm text-gray-500 mt-1">PEMB Estimation Tool</p>
        </div>

        <div className="flex mb-6 border-b border-gray-200">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${
              mode === 'login' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${
              mode === 'register' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Username</label>
            <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm" autoFocus />
          </div>
          {mode === 'register' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Display Name</label>
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="Optional" />
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm" minLength={4} />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button type="submit" disabled={busy}
            className="w-full bg-blue-600 text-white font-medium py-2 rounded hover:bg-blue-700 transition-colors disabled:opacity-50">
            {busy ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
