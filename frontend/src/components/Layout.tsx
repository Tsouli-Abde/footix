import { Link, NavLink, Outlet } from 'react-router-dom';
import { NotificationBell } from '../notifications/NotificationBell';
import { ToastHost } from '../notifications/ToastHost';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive ? 'bg-green-50 text-green-700' : 'text-slate-600 hover:bg-slate-100'
  }`;

export function Layout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
          <Link to="/" className="mr-auto flex items-center gap-2 text-lg font-bold text-slate-900">
            <img src="/favicon.svg" alt="" className="h-7 w-7" />
            Footix
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={navClass}>
              En cours
            </NavLink>
            <NavLink to="/historique" className={navClass}>
              Historique
            </NavLink>
            <NavLink to="/nouveau" className={navClass}>
              Nouveau
            </NavLink>
          </nav>
          <NotificationBell />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>

      <footer className="mx-auto max-w-5xl px-4 pb-10 text-center text-xs text-slate-400">
        Pas de compte, juste un lien à partager.
      </footer>

      <ToastHost />
    </div>
  );
}
