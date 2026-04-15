import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const [email, setEmail] = useState('admin@helvetiasaas.ch');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      login(data.token, data.user);
      navigate('/dashboard');
    } catch {
      setError('Invalid email or password');
    } finally { setLoading(false); }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'inherit', padding: '24px',
    }}>
      <div style={{
        width: '100%', maxWidth: 420,
        background: 'var(--glass-bg)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        borderRadius: 20,
        border: '1px solid var(--glass-border)',
        padding: 40,
        boxShadow: 'var(--shadow), inset 0 1px 0 rgba(255,255,255,0.10)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🛡</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em' }}>ComplianceOS</h1>
          <p style={{ color: 'var(--accent)', marginTop: 6, fontSize: 13, fontWeight: 500, letterSpacing: '0.04em' }}>
            GDPR · ISO 27001 · HIPAA
          </p>
        </div>

        {error && (
          <div style={{
            background: 'var(--red-dim)', border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: 10, padding: '10px 14px', color: 'var(--red)',
            fontSize: 13, marginBottom: 20,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
              Email
            </label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" required
              style={{
                width: '100%', background: 'var(--glass-bg2)', border: '1px solid var(--glass-border)',
                borderRadius: 8, padding: '10px 14px', color: 'var(--text)', fontSize: 14,
                outline: 'none', fontFamily: 'inherit',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-dim)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--glass-border)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
              Password
            </label>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" required
              style={{
                width: '100%', background: 'var(--glass-bg2)', border: '1px solid var(--glass-border)',
                borderRadius: 8, padding: '10px 14px', color: 'var(--text)', fontSize: 14,
                outline: 'none', fontFamily: 'inherit',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-dim)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--glass-border)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
          <button type="submit" disabled={loading}
            style={{
              background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
              color: '#fff', border: 'none', borderRadius: 8, padding: '12px',
              fontSize: 14, fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
              marginTop: 8, fontFamily: 'inherit',
              boxShadow: '0 4px 16px var(--accent-dim)',
              opacity: loading ? 0.7 : 1,
              transition: 'opacity 0.2s',
            }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div style={{
          marginTop: 24, padding: 16,
          background: 'var(--glass-bg2)', borderRadius: 10,
          border: '1px solid var(--glass-border)',
          fontSize: 12, color: 'var(--muted)',
        }}>
          <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Demo accounts — password: Demo1234!</div>
          <div style={{ marginBottom: 2 }}>admin@helvetiasaas.ch — Admin</div>
          <div style={{ marginBottom: 2 }}>auditor@helvetiasaas.ch — Auditor</div>
          <div>viewer@helvetiasaas.ch — Viewer</div>
        </div>
      </div>
    </div>
  );
}
