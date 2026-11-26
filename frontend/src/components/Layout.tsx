import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand">
          Humanli Helpdesk
        </Link>
        <nav className="nav">
          <NavLink to="/" end>
            My Tickets
          </NavLink>
          <NavLink to="/tickets/new">New Ticket</NavLink>
          {user?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
        </nav>
        <div className="user-chip">
          <span>
            {user?.name} · {user?.role}
          </span>
          <button type="button" className="btn ghost" onClick={logout}>
            Logout
          </button>
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
