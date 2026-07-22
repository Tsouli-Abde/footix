import { Link, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { CreateEventPage } from './pages/CreateEventPage';
import { EventPage } from './pages/EventPage';
import { HebdoPage } from './pages/HebdoPage';
import { HistoryPage } from './pages/HistoryPage';
import { HomePage } from './pages/HomePage';
import { ManagePage } from './pages/ManagePage';
import { RecurrencePage } from './pages/RecurrencePage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="nouveau" element={<CreateEventPage />} />
        <Route path="historique" element={<HistoryPage />} />
        {/* Liens porteurs de token : /e/… et /hebdo/… se partagent, /manage/… et /recurrence/… non. */}
        <Route path="e/:publicToken" element={<EventPage />} />
        <Route path="hebdo/:templateId" element={<HebdoPage />} />
        <Route path="manage/:organizerToken" element={<ManagePage />} />
        <Route path="recurrence/:organizerToken" element={<RecurrencePage />} />
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
        Retour aux votes en cours
      </Link>
    </div>
  );
}
