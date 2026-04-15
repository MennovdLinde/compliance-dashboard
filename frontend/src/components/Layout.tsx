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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>
      {/* Sidebar */}
      <aside style={{ width: 240, background: '#1e293b', borderRight: '1px solid #334155', display: 'flex', flexDirection: 'column', padding: '24px 0' }}>
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid #334155' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>🛡 ComplianceOS</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{user?.company}</div>
        </div>

        <nav style={{ flex: 1, padding: '16px 0' }}>
          {NAV.map(({ to, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display: 'block', padding: '10px 20px', fontSize: 13, textDecoration: 'none', borderLeft: '3px solid transparent',
              color: isActive ? '#f1f5f9' : '#94a3b8',
              background: isActive ? '#0f172a' : 'transparent',
              borderLeftColor: isActive ? '#3b82f6' : 'transparent',
            })}>
              {label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid #334155' }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{user?.fullName}</div>
          <div style={{ fontSize: 11, color: '#475569', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {user?.role}
          </div>
          <button onClick={handleLogout} style={{ fontSize: 12, color: '#64748b', background: 'none', border: '1px solid #334155', borderRadius: 4, padding: '4px 10px', cursor: 'pointer' }}>
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
