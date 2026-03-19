import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import SchulungsterminePage from '@/pages/SchulungsterminePage';
import ZertifikatePage from '@/pages/ZertifikatePage';
import SchulungsanmeldungPage from '@/pages/SchulungsanmeldungPage';
import RaeumePage from '@/pages/RaeumePage';
import TrainerPage from '@/pages/TrainerPage';
import BewertungenPage from '@/pages/BewertungenPage';
import TeilnehmerverwaltungPage from '@/pages/TeilnehmerverwaltungPage';
import SchulungskatalogPage from '@/pages/SchulungskatalogPage';
import MitarbeiterPage from '@/pages/MitarbeiterPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardOverview />} />
          <Route path="schulungstermine" element={<SchulungsterminePage />} />
          <Route path="zertifikate" element={<ZertifikatePage />} />
          <Route path="schulungsanmeldung" element={<SchulungsanmeldungPage />} />
          <Route path="raeume" element={<RaeumePage />} />
          <Route path="trainer" element={<TrainerPage />} />
          <Route path="bewertungen" element={<BewertungenPage />} />
          <Route path="teilnehmerverwaltung" element={<TeilnehmerverwaltungPage />} />
          <Route path="schulungskatalog" element={<SchulungskatalogPage />} />
          <Route path="mitarbeiter" element={<MitarbeiterPage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}