import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Schulungstermine, Schulungsanmeldung, Trainer, Teilnehmerverwaltung, Zertifikate, Bewertungen, Raeume, Mitarbeiter, Schulungskatalog } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [schulungstermine, setSchulungstermine] = useState<Schulungstermine[]>([]);
  const [schulungsanmeldung, setSchulungsanmeldung] = useState<Schulungsanmeldung[]>([]);
  const [trainer, setTrainer] = useState<Trainer[]>([]);
  const [teilnehmerverwaltung, setTeilnehmerverwaltung] = useState<Teilnehmerverwaltung[]>([]);
  const [zertifikate, setZertifikate] = useState<Zertifikate[]>([]);
  const [bewertungen, setBewertungen] = useState<Bewertungen[]>([]);
  const [raeume, setRaeume] = useState<Raeume[]>([]);
  const [mitarbeiter, setMitarbeiter] = useState<Mitarbeiter[]>([]);
  const [schulungskatalog, setSchulungskatalog] = useState<Schulungskatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [schulungstermineData, schulungsanmeldungData, trainerData, teilnehmerverwaltungData, zertifikateData, bewertungenData, raeumeData, mitarbeiterData, schulungskatalogData] = await Promise.all([
        LivingAppsService.getSchulungstermine(),
        LivingAppsService.getSchulungsanmeldung(),
        LivingAppsService.getTrainer(),
        LivingAppsService.getTeilnehmerverwaltung(),
        LivingAppsService.getZertifikate(),
        LivingAppsService.getBewertungen(),
        LivingAppsService.getRaeume(),
        LivingAppsService.getMitarbeiter(),
        LivingAppsService.getSchulungskatalog(),
      ]);
      setSchulungstermine(schulungstermineData);
      setSchulungsanmeldung(schulungsanmeldungData);
      setTrainer(trainerData);
      setTeilnehmerverwaltung(teilnehmerverwaltungData);
      setZertifikate(zertifikateData);
      setBewertungen(bewertungenData);
      setRaeume(raeumeData);
      setMitarbeiter(mitarbeiterData);
      setSchulungskatalog(schulungskatalogData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [schulungstermineData, schulungsanmeldungData, trainerData, teilnehmerverwaltungData, zertifikateData, bewertungenData, raeumeData, mitarbeiterData, schulungskatalogData] = await Promise.all([
          LivingAppsService.getSchulungstermine(),
          LivingAppsService.getSchulungsanmeldung(),
          LivingAppsService.getTrainer(),
          LivingAppsService.getTeilnehmerverwaltung(),
          LivingAppsService.getZertifikate(),
          LivingAppsService.getBewertungen(),
          LivingAppsService.getRaeume(),
          LivingAppsService.getMitarbeiter(),
          LivingAppsService.getSchulungskatalog(),
        ]);
        setSchulungstermine(schulungstermineData);
        setSchulungsanmeldung(schulungsanmeldungData);
        setTrainer(trainerData);
        setTeilnehmerverwaltung(teilnehmerverwaltungData);
        setZertifikate(zertifikateData);
        setBewertungen(bewertungenData);
        setRaeume(raeumeData);
        setMitarbeiter(mitarbeiterData);
        setSchulungskatalog(schulungskatalogData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const schulungstermineMap = useMemo(() => {
    const m = new Map<string, Schulungstermine>();
    schulungstermine.forEach(r => m.set(r.record_id, r));
    return m;
  }, [schulungstermine]);

  const trainerMap = useMemo(() => {
    const m = new Map<string, Trainer>();
    trainer.forEach(r => m.set(r.record_id, r));
    return m;
  }, [trainer]);

  const teilnehmerverwaltungMap = useMemo(() => {
    const m = new Map<string, Teilnehmerverwaltung>();
    teilnehmerverwaltung.forEach(r => m.set(r.record_id, r));
    return m;
  }, [teilnehmerverwaltung]);

  const raeumeMap = useMemo(() => {
    const m = new Map<string, Raeume>();
    raeume.forEach(r => m.set(r.record_id, r));
    return m;
  }, [raeume]);

  const mitarbeiterMap = useMemo(() => {
    const m = new Map<string, Mitarbeiter>();
    mitarbeiter.forEach(r => m.set(r.record_id, r));
    return m;
  }, [mitarbeiter]);

  const schulungskatalogMap = useMemo(() => {
    const m = new Map<string, Schulungskatalog>();
    schulungskatalog.forEach(r => m.set(r.record_id, r));
    return m;
  }, [schulungskatalog]);

  return { schulungstermine, setSchulungstermine, schulungsanmeldung, setSchulungsanmeldung, trainer, setTrainer, teilnehmerverwaltung, setTeilnehmerverwaltung, zertifikate, setZertifikate, bewertungen, setBewertungen, raeume, setRaeume, mitarbeiter, setMitarbeiter, schulungskatalog, setSchulungskatalog, loading, error, fetchAll, schulungstermineMap, trainerMap, teilnehmerverwaltungMap, raeumeMap, mitarbeiterMap, schulungskatalogMap };
}