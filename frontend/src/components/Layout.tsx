import { Link, Outlet } from 'react-router-dom';
import { NotificationBell } from '../notifications/NotificationBell';
import { ToastHost } from '../notifications/ToastHost';
import { NavMenu } from './NavMenu';

export function Layout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3 sm:gap-3">
          <Link to="/" className="mr-auto flex items-center gap-2 text-lg font-bold text-slate-900">
            <img src="/favicon.svg" alt="" className="h-7 w-7" />
            Footix
          </Link>

          {/* La cloche reste hors du menu, à droite : une notification qu'il faut
              déplier pour voir n'attire pas l'œil. */}
          <NotificationBell />
          <NavMenu />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        <Outlet />
      </main>

      <ToastHost />
    </div>
  );
}
