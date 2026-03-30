import { HashRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ActionsProvider } from '@/context/ActionsContext';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';

const SchulungsplanungPage = lazy(() => import('@/pages/intents/SchulungsplanungPage'));
const GruppenAnmeldungPage = lazy(() => import('@/pages/intents/GruppenAnmeldungPage'));
const SchulungsabschlussPage = lazy(() => import('@/pages/intents/SchulungsabschlussPage'));
import SchulungsterminePage from '@/pages/SchulungsterminePage';
import SchulungsanmeldungPage from '@/pages/SchulungsanmeldungPage';
import TrainerPage from '@/pages/TrainerPage';
import TeilnehmerverwaltungPage from '@/pages/TeilnehmerverwaltungPage';
import ZertifikatePage from '@/pages/ZertifikatePage';
import BewertungenPage from '@/pages/BewertungenPage';
import RaeumePage from '@/pages/RaeumePage';
import MitarbeiterPage from '@/pages/MitarbeiterPage';
import SchulungskatalogPage from '@/pages/SchulungskatalogPage';

export default function App() {
  return (
    <HashRouter>
      <ActionsProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DashboardOverview />} />
            <Route path="intents/schulungsplanung" element={<Suspense fallback={null}><SchulungsplanungPage /></Suspense>} />
            <Route path="intents/gruppen-anmeldung" element={<Suspense fallback={null}><GruppenAnmeldungPage /></Suspense>} />
            <Route path="intents/schulungsabschluss" element={<Suspense fallback={null}><SchulungsabschlussPage /></Suspense>} />
            <Route path="schulungstermine" element={<SchulungsterminePage />} />
            <Route path="schulungsanmeldung" element={<SchulungsanmeldungPage />} />
            <Route path="trainer" element={<TrainerPage />} />
            <Route path="teilnehmerverwaltung" element={<TeilnehmerverwaltungPage />} />
            <Route path="zertifikate" element={<ZertifikatePage />} />
            <Route path="bewertungen" element={<BewertungenPage />} />
            <Route path="raeume" element={<RaeumePage />} />
            <Route path="mitarbeiter" element={<MitarbeiterPage />} />
            <Route path="schulungskatalog" element={<SchulungskatalogPage />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>
        </Routes>
      </ActionsProvider>
    </HashRouter>
  );
}
