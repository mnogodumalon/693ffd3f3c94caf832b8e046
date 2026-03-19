import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Schulungstermine, Zertifikate, Schulungsanmeldung, Raeume, Trainer, Bewertungen, Teilnehmerverwaltung, Schulungskatalog, Mitarbeiter } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [schulungstermine, setSchulungstermine] = useState<Schulungstermine[]>([]);
  const [zertifikate, setZertifikate] = useState<Zertifikate[]>([]);
  const [schulungsanmeldung, setSchulungsanmeldung] = useState<Schulungsanmeldung[]>([]);
  const [raeume, setRaeume] = useState<Raeume[]>([]);
  const [trainer, setTrainer] = useState<Trainer[]>([]);
  const [bewertungen, setBewertungen] = useState<Bewertungen[]>([]);
  const [teilnehmerverwaltung, setTeilnehmerverwaltung] = useState<Teilnehmerverwaltung[]>([]);
  const [schulungskatalog, setSchulungskatalog] = useState<Schulungskatalog[]>([]);
  const [mitarbeiter, setMitarbeiter] = useState<Mitarbeiter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [schulungstermineData, zertifikateData, schulungsanmeldungData, raeumeData, trainerData, bewertungenData, teilnehmerverwaltungData, schulungskatalogData, mitarbeiterData] = await Promise.all([
        LivingAppsService.getSchulungstermine(),
        LivingAppsService.getZertifikate(),
        LivingAppsService.getSchulungsanmeldung(),
        LivingAppsService.getRaeume(),
        LivingAppsService.getTrainer(),
        LivingAppsService.getBewertungen(),
        LivingAppsService.getTeilnehmerverwaltung(),
        LivingAppsService.getSchulungskatalog(),
        LivingAppsService.getMitarbeiter(),
      ]);
      setSchulungstermine(schulungstermineData);
      setZertifikate(zertifikateData);
      setSchulungsanmeldung(schulungsanmeldungData);
      setRaeume(raeumeData);
      setTrainer(trainerData);
      setBewertungen(bewertungenData);
      setTeilnehmerverwaltung(teilnehmerverwaltungData);
      setSchulungskatalog(schulungskatalogData);
      setMitarbeiter(mitarbeiterData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const schulungstermineMap = useMemo(() => {
    const m = new Map<string, Schulungstermine>();
    schulungstermine.forEach(r => m.set(r.record_id, r));
    return m;
  }, [schulungstermine]);

  const raeumeMap = useMemo(() => {
    const m = new Map<string, Raeume>();
    raeume.forEach(r => m.set(r.record_id, r));
    return m;
  }, [raeume]);

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

  const schulungskatalogMap = useMemo(() => {
    const m = new Map<string, Schulungskatalog>();
    schulungskatalog.forEach(r => m.set(r.record_id, r));
    return m;
  }, [schulungskatalog]);

  const mitarbeiterMap = useMemo(() => {
    const m = new Map<string, Mitarbeiter>();
    mitarbeiter.forEach(r => m.set(r.record_id, r));
    return m;
  }, [mitarbeiter]);

  return { schulungstermine, setSchulungstermine, zertifikate, setZertifikate, schulungsanmeldung, setSchulungsanmeldung, raeume, setRaeume, trainer, setTrainer, bewertungen, setBewertungen, teilnehmerverwaltung, setTeilnehmerverwaltung, schulungskatalog, setSchulungskatalog, mitarbeiter, setMitarbeiter, loading, error, fetchAll, schulungstermineMap, raeumeMap, trainerMap, teilnehmerverwaltungMap, schulungskatalogMap, mitarbeiterMap };
}