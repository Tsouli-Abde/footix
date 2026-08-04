import { Link, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AdminPage } from './pages/AdminPage';
import { CreateEventPage } from './pages/CreateEventPage';
import { EventPage } from './pages/EventPage';
import { HomePage } from './pages/HomePage';
import { ManagePage } from './pages/ManagePage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="nouveau" element={<CreateEventPage />} />
        <Route path="admin" element={<AdminPage />} />
        {/* Liens porteurs de token : /e/… se partage, /manage/… reste privé. */}
        <Route path="e/:publicToken" element={<EventPage />} />
        <Route path="manage/:organizerToken" element={<ManagePage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

function NotFound() {
  return (
    <div className="py-16 text-center">
      <p className="text-lg font-semibold">Page introuvable</p>
      <Link to="/" className="mt-2 inline-block text-sm text-green-700 hover:underline">
        Retour aux sondages en cours
      </Link>
    </div>
  );
}
