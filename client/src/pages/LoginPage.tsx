import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import api from '../lib/api';

export default function LoginPage() {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { name, pin });
      localStorage.setItem('rubric_token', data.token);
      localStorage.setItem('rubric_user', JSON.stringify(data.user));
      navigate('/');
    } catch {
      setError('Invalid name or PIN. Ask the boss for access.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-navy flex flex-col items-center justify-center px-6">
      <div className="mb-8 text-center">
        <img src="/logo.png" alt="Ru-Bric Plumbing" className="h-28 w-28 mx-auto mb-4 rounded-2xl object-cover" />
        <h1 className="text-2xl font-bold text-brand-gold">Ru-Bric Video</h1>
        <p className="text-white/50 mt-1">Create videos & ads for social media</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-field"
          required
        />
        <div className="relative">
          <input
            type="password"
            placeholder="Team PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="input-field pr-12"
            inputMode="numeric"
            maxLength={8}
            required
          />
          <Lock size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30" />
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !name || !pin}
          className="btn-primary w-full disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
