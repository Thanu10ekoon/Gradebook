import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, NavLink, Route, Routes, useParams } from 'react-router-dom';
import { BookOpen, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { Admin } from './Admin.jsx';
import { api } from './api.js';
import { AuthForm, Brand, Message, PasswordForm, Profile } from './Forms.jsx';
import { Results } from './Results.jsx';
import './styles.css';

function Layout({ user, error, onLogout, children }) {
  return <div className="app-layout">
    <aside className="sidebar">
      <Brand />
      {!user.mustChangePassword && <nav aria-label="Main navigation" className="side-nav">
        <NavLink to="/results"><BookOpen size={19} /> <span>My results</span></NavLink>
        <NavLink to="/profile"><UserRound size={19} /> <span>Profile</span></NavLink>
        {user.role === 'admin' && <NavLink to="/admin"><ShieldCheck size={19} /> <span>Admin dashboard</span></NavLink>}
      </nav>}
      <div className="sidebar-bottom">
        <div className="sidebar-user"><span className="avatar"><UserRound size={18} /></span>
          <div><strong>{user.name}</strong><small>{user.username}</small></div></div>
        <button className="signout" onClick={onLogout}><LogOut size={18} /> <span>Sign out</span></button>
      </div>
    </aside>
    <main className="content"><Message error={error} />{children}</main>
  </div>;
}

function StudentView({ user }) {
  const { id } = useParams();
  return <Results key={id} user={user} accountId={id} />;
}

function App() {
  const [user, setUser] = useState(undefined);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    api('session', { signal: controller.signal }).then(({ user }) => setUser(user))
      .catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [attempt]);

  const changeUser = user => { setError(''); setUser(user); };
  async function logout() {
    try {
      await api('logout', { method: 'POST' });
      changeUser(null);
    } catch (error) {
      setError(error.message);
    }
  }

  if (user === undefined) return <main className="initial"><Brand />
    {error ? <><Message error={error} /><button className="button primary" onClick={() => { setError(''); setAttempt(attempt + 1); }}>Try again</button></>
      : <p role="status">Loading Gradebook…</p>}
  </main>;

  if (!user) return <Routes>
    <Route path="/login" element={<AuthForm key="login" onUser={changeUser} />} />
    <Route path="/register" element={<AuthForm key="register" register onUser={changeUser} />} />
    <Route path="*" element={<Navigate replace to="/login" />} />
  </Routes>;

  if (user.mustChangePassword) return <Layout user={user} error={error} onLogout={logout}>
    <div className="forced-password"><PasswordForm forced onUser={changeUser} /></div>
  </Layout>;

  const home = user.role === 'admin' ? '/admin' : '/results';
  return <Layout user={user} error={error} onLogout={logout}>
    <Routes>
      <Route path="/results" element={<Results user={user} />} />
      <Route path="/profile" element={<Profile user={user} onUser={changeUser} />} />
      {user.role === 'admin' && <>
        <Route path="/admin" element={<Admin viewer={user} onUser={changeUser} />} />
        <Route path="/admin/results/:id" element={<StudentView user={user} />} />
      </>}
      <Route path="*" element={<Navigate replace to={home} />} />
    </Routes>
  </Layout>;
}

createRoot(document.getElementById('root')).render(<BrowserRouter><App /></BrowserRouter>);
