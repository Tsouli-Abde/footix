import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { CalendarIcon, MenuIcon, PlusIcon, ShieldIcon } from './icons';

type Entry = {
  to: string;
  label: string;
  Glyph: typeof CalendarIcon;
  /** Vrai pour la racine, qui ne doit pas rester active sur les sous-pages. */
  end?: boolean;
};

const ENTRIES: Entry[] = [
  { to: '/', label: 'En cours', Glyph: CalendarIcon, end: true },
  { to: '/nouveau', label: 'Nouveau sondage', Glyph: PlusIcon },
  { to: '/admin', label: 'Administration', Glyph: ShieldIcon },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive ? 'bg-green-50 text-green-700' : 'text-slate-600 hover:bg-slate-100'
  }`;

/**
 * La navigation de l'en-tête.
 *
 * Les liens sont affichés en clair dès qu'il y a la place (à partir de `sm`), et
 * repliés derrière un bouton en dessous : sur téléphone, trois libellés à côté du
 * logo et de la cloche ne tiennent pas. La cloche, elle, reste toujours dehors :
 * une notification qu'il faut déplier pour voir ne sert à rien.
 */
export function NavMenu() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const ref = useRef<HTMLDivElement>(null);

  // Changer de page referme le menu, sinon il reste ouvert par-dessus la vue.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <>
      {/* Écrans larges : tout à plat, rien à déplier. */}
      <nav className="hidden items-center gap-1 sm:flex">
        {ENTRIES.map(({ to, label, end }) => (
          <NavLink key={to} to={to} end={end} className={linkClass}>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Téléphone : le même contenu, replié. */}
      <div ref={ref} className="relative sm:hidden">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label="Menu"
          aria-expanded={open}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
        >
          <MenuIcon className="h-5 w-5" />
        </button>

        {open && (
          <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
            {ENTRIES.map(({ to, label, Glyph, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 text-sm font-medium ${
                    isActive ? 'bg-green-50 text-green-700' : 'text-slate-700 hover:bg-slate-50'
                  }`
                }
              >
                <Glyph className="h-4 w-4 shrink-0 opacity-70" />
                {label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
