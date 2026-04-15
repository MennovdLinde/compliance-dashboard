import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/dashboard',  label: '⬛  Dashboard' },
  { to: '/controls',   label: '✅  Controls'  },
  { to: '/risks',      label: '⚠️  Risk Register' },
  { to: '/audit-log',  label: '📋  Audit Log'  },
  { to: '/reports',    label: '📄  Reports'    },
];

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() { logout(); navigate('/login'); }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', color: 'var(--text)', fontFamily: 'inherit' }}>
      {/* Sidebar */}
      <aside style={{
        width: 240,
        background: 'var(--sidebar-bg)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        borderRight: '1px solid var(--sidebar-border)',
        display: 'flex', flexDirection: 'column',
        padding: '24px 0',
        position: 'sticky', top: 0, height: '100vh',
      }}>
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid var(--sidebar-border)' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>🛡 ComplianceOS</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{user?.company}</div>
        </div>

        <nav style={{ flex: 1, padding: '12px 0' }}>
          {NAV.map(({ to, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display: 'block', padding: '10px 20px', fontSize: 13, textDecoration: 'none',
              borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              color: isActive ? 'var(--text)' : 'var(--muted)',
              background: isActive ? 'var(--glass-bg)' : 'transparent',
              fontWeight: isActive ? 600 : 400,
              transition: 'background 0.15s, color 0.15s',
            })}>
              {label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--sidebar-border)' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{user?.fullName}</div>
          <div style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
            {user?.role}
          </div>
          <button onClick={handleLogout} style={{
            fontSize: 12, color: 'var(--muted)', background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)', borderRadius: 6,
            padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit',
            transition: 'background 0.15s',
          }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
