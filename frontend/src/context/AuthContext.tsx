import { createContext, useContext, useState, ReactNode } from 'react';

interface User { id: number; email: string; role: string; fullName: string; company: string; }

interface AuthCtx {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('cd_token'));
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('cd_user');
    return raw ? (JSON.parse(raw) as User) : null;
  });

  function login(t: string, u: User) {
    localStorage.setItem('cd_token', t);
    localStorage.setItem('cd_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
  }

  function logout() {
    localStorage.removeItem('cd_token');
    localStorage.removeItem('cd_user');
    setToken(null);
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, token, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
