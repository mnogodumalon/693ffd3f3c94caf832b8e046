import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { Button } from '@/components/ui/button';
import { SchulungstermineDialog } from '@/components/dialogs/SchulungstermineDialog';
import { MitarbeiterDialog } from '@/components/dialogs/MitarbeiterDialog';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { APP_IDS } from '@/types/app';
import type { Schulungstermine, Schulungskatalog, Mitarbeiter, Trainer, Raeume } from '@/types/app';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import {
  IconCalendar,
  IconCircleCheck,
  IconLoader2,
  IconSearch,
  IconUserCheck,
  IconUsers,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { Input } from '@/components/ui/input';

const WIZARD_STEPS = [
  { label: 'Termin wählen' },
  { label: 'Mitarbeiter wählen' },
  { label: 'Anmeldungen erstellen' },
  { label: 'Zusammenfassung' },
];

export default function GruppenAnmeldungPage() {
  const [searchParams] = useSearchParams();

  // Step state — initialize from URL
  const initialStep = (() => {
    const s = parseInt(searchParams.get('step') ?? '', 10);
    return s >= 1 && s <= 4 ? s : 1;
  })();
  const [step, setStep] = useState(initialStep);

  // Data state
  const [schulungstermine, setSchulungstermine] = useState<Schulungstermine[]>([]);
  const [schulungskatalog, setSchulungskatalog] = useState<Schulungskatalog[]>([]);
  const [trainer, setTrainer] = useState<Trainer[]>([]);
  const [raeume, setRaeume] = useState<Raeume[]>([]);
  const [mitarbeiter, setMitarbeiter] = useState<Mitarbeiter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Selection state
  const [selectedSession, setSelectedSession] = useState<Schulungstermine | null>(null);
  const [selectedMitarbeiterIds, setSelectedMitarbeiterIds] = useState<Set<string>>(new Set());
  const [alreadyRegisteredIds, setAlreadyRegisteredIds] = useState<Set<string>>(new Set());

  // Dialog state
  const [termineDialogOpen, setTermineDialogOpen] = useState(false);
  const [mitarbeiterDialogOpen, setMitarbeiterDialogOpen] = useState(false);

  // Step 2 search
  const [mitarbeiterSearch, setMitarbeiterSearch] = useState('');

  // Step 3 creation state
  const [creating, setCreating] = useState(false);
  const [createProgress, setCreateProgress] = useState(0);
  const [createTotal, setCreateTotal] = useState(0);
  const [createdCount, setCreatedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [creationDone, setCreationDone] = useState(false);
  const [successfulMitarbeiterIds, setSuccessfulMitarbeiterIds] = useState<string[]>([]);

  // Lookup maps
  const schulungMap = useMemo(() => {
    const m = new Map<string, Schulungskatalog>();
    for (const s of schulungskatalog) m.set(s.record_id, s);
    return m;
  }, [schulungskatalog]);

  const trainerMap = useMemo(() => {
    const m = new Map<string, Trainer>();
    for (const t of trainer) m.set(t.record_id, t);
    return m;
  }, [trainer]);

  const mitarbeiterMap = useMemo(() => {
    const m = new Map<string, Mitarbeiter>();
    for (const ma of mitarbeiter) m.set(ma.record_id, ma);
    return m;
  }, [mitarbeiter]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [termineData, katalogData, trainerData, raeumeData, mitarbeiterData] = await Promise.all([
        LivingAppsService.getSchulungstermine(),
        LivingAppsService.getSchulungskatalog(),
        LivingAppsService.getTrainer(),
        LivingAppsService.getRaeume(),
        LivingAppsService.getMitarbeiter(),
      ]);
      setSchulungstermine(termineData);
      setSchulungskatalog(katalogData);
      setTrainer(trainerData);
      setRaeume(raeumeData);
      setMitarbeiter(mitarbeiterData);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Auto-select session from URL param after data loads
  useEffect(() => {
    const urlSessionId = searchParams.get('schulungsterminId');
    if (!urlSessionId || loading || schulungstermine.length === 0) return;
    const found = schulungstermine.find(s => s.record_id === urlSessionId);
    if (found && !selectedSession) {
      handleSelectSession(found.record_id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, schulungstermine]);

  const fetchRegisteredForSession = async (sessionId: string) => {
    const anmeldungen = await LivingAppsService.getSchulungsanmeldung();
    const registered = new Set<string>();
    for (const a of anmeldungen) {
      const maId = extractRecordId(a.fields.mitarbeiter);
      const stId = extractRecordId(a.fields.schulungstermin);
      if (stId === sessionId && maId) {
        registered.add(maId);
      }
    }
    setAlreadyRegisteredIds(registered);
  };

  const handleSelectSession = async (id: string) => {
    const found = schulungstermine.find(s => s.record_id === id);
    if (!found) return;
    setSelectedSession(found);
    setSelectedMitarbeiterIds(new Set());
    await fetchRegisteredForSession(id);
    setStep(2);
  };

  const getSchulungName = (session: Schulungstermine): string => {
    const katId = extractRecordId(session.fields.schulung);
    if (katId) {
      const kat = schulungMap.get(katId);
      if (kat?.fields.titel) return kat.fields.titel;
    }
    return 'Schulung';
  };

  const getTrainerName = (session: Schulungstermine): string => {
    const trId = extractRecordId(session.fields.trainer);
    if (trId) {
      const tr = trainerMap.get(trId);
      if (tr) return `${tr.fields.vorname ?? ''} ${tr.fields.nachname ?? ''}`.trim();
    }
    return '';
  };

  const formatDatum = (iso?: string): string => {
    if (!iso) return '–';
    try {
      return format(new Date(iso), 'dd.MM.yyyy HH:mm');
    } catch {
      return iso;
    }
  };

  const toggleMitarbeiter = (id: string) => {
    if (alreadyRegisteredIds.has(id)) return;
    setSelectedMitarbeiterIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredMitarbeiter = useMemo(() => {
    if (!mitarbeiterSearch.trim()) return mitarbeiter;
    const q = mitarbeiterSearch.toLowerCase();
    return mitarbeiter.filter(m => {
      const name = `${m.fields.vorname ?? ''} ${m.fields.nachname ?? ''}`.toLowerCase();
      const abt = (m.fields.abteilung ?? '').toLowerCase();
      const pos = (m.fields.position ?? '').toLowerCase();
      return name.includes(q) || abt.includes(q) || pos.includes(q);
    });
  }, [mitarbeiter, mitarbeiterSearch]);

  const verfuegbarePlaetze = selectedSession?.fields.verfuegbare_plaetze ?? 0;
  const totalBelegung = alreadyRegisteredIds.size + selectedMitarbeiterIds.size;
  const plaetzePercent = verfuegbarePlaetze > 0 ? Math.min((totalBelegung / verfuegbarePlaetze) * 100, 100) : 0;
  const barColor = totalBelegung > verfuegbarePlaetze ? 'bg-red-500' : plaetzePercent >= 80 ? 'bg-amber-500' : 'bg-primary';

  const handleCreateAnmeldungen = async () => {
    if (!selectedSession) return;
    const ids = Array.from(selectedMitarbeiterIds);
    setCreating(true);
    setCreateTotal(ids.length);
    setCreateProgress(0);
    setCreatedCount(0);
    setFailedCount(0);
    setSuccessfulMitarbeiterIds([]);

    let successCount = 0;
    let failCount = 0;
    const successIds: string[] = [];

    const results = await Promise.allSettled(
      ids.map(async (mitarbeiterId) => {
        await LivingAppsService.createSchulungsanmeldungEntry({
          mitarbeiter: createRecordUrl(APP_IDS.MITARBEITER, mitarbeiterId),
          schulungstermin: createRecordUrl(APP_IDS.SCHULUNGSTERMINE, selectedSession.record_id),
        });
        await LivingAppsService.createTeilnehmerverwaltungEntry({
          schulungstermin: createRecordUrl(APP_IDS.SCHULUNGSTERMINE, selectedSession.record_id),
          mitarbeiter: createRecordUrl(APP_IDS.MITARBEITER, mitarbeiterId),
          anmeldedatum: format(new Date(), 'yyyy-MM-dd'),
          status: 'angemeldet',
        });
        return mitarbeiterId;
      })
    );

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === 'fulfilled') {
        successCount++;
        successIds.push(ids[i]);
      } else {
        failCount++;
      }
      setCreateProgress(i + 1);
    }

    setCreatedCount(successCount);
    setFailedCount(failCount);
    setSuccessfulMitarbeiterIds(successIds);
    setCreating(false);
    setCreationDone(true);

    setTimeout(() => setStep(4), 800);
  };

  const handleRestart = () => {
    setStep(1);
    setSelectedSession(null);
    setSelectedMitarbeiterIds(new Set());
    setAlreadyRegisteredIds(new Set());
    setCreating(false);
    setCreateProgress(0);
    setCreateTotal(0);
    setCreatedCount(0);
    setFailedCount(0);
    setCreationDone(false);
    setSuccessfulMitarbeiterIds([]);
    setMitarbeiterSearch('');
  };

  return (
    <IntentWizardShell
      title="Gruppen-Anmeldung"
      subtitle="Mehrere Mitarbeiter auf einmal für eine Schulung anmelden"
      steps={WIZARD_STEPS}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* Step 1: Termin wählen */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">Schulungstermin auswählen</h2>
            <p className="text-sm text-muted-foreground">Wähle den Termin, für den du Mitarbeiter anmelden möchtest.</p>
          </div>
          <EntitySelectStep
            items={schulungstermine.map(s => ({
              id: s.record_id,
              title: getSchulungName(s),
              subtitle: `${formatDatum(s.fields.startdatum)}${getTrainerName(s) ? ' · ' + getTrainerName(s) : ''}`,
              status: s.fields.status,
              stats: [{ label: 'Plätze', value: s.fields.verfuegbare_plaetze?.toString() ?? '–' }],
              icon: <IconCalendar size={18} className="text-primary" />,
            }))}
            onSelect={handleSelectSession}
            searchPlaceholder="Schulung suchen..."
            emptyIcon={<IconCalendar size={32} />}
            emptyText="Keine Schulungstermine gefunden."
            createLabel="Neuer Termin"
            onCreateNew={() => setTermineDialogOpen(true)}
            createDialog={
              <SchulungstermineDialog
                open={termineDialogOpen}
                onClose={() => setTermineDialogOpen(false)}
                onSubmit={async (fields) => {
                  await LivingAppsService.createSchulungstermineEntry(fields);
                  await fetchAll();
                  setTermineDialogOpen(false);
                }}
                schulungskatalogList={schulungskatalog}
                trainerList={trainer}
                raeumeList={raeume}
                enablePhotoScan={AI_PHOTO_SCAN['Schulungstermine']}
                enablePhotoLocation={AI_PHOTO_LOCATION['Schulungstermine']}
              />
            }
          />
        </div>
      )}

      {/* Step 2: Mitarbeiter wählen */}
      {step === 2 && selectedSession && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">Mitarbeiter auswählen</h2>
            <p className="text-sm text-muted-foreground">
              Wähle die Mitarbeiter aus, die für <span className="font-medium text-foreground">{getSchulungName(selectedSession)}</span> angemeldet werden sollen.
            </p>
          </div>

          {/* Platz-Tracker */}
          {verfuegbarePlaetze > 0 && (
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-muted-foreground">Verfügbare Plätze</span>
                <span className={`font-semibold ${totalBelegung > verfuegbarePlaetze ? 'text-red-600' : ''}`}>
                  {totalBelegung} / {verfuegbarePlaetze}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${barColor}`}
                  style={{ width: `${plaetzePercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Bereits belegt: <span className="font-semibold text-foreground">{alreadyRegisteredIds.size}</span>
                </span>
                <span>
                  Neu ausgewählt: <span className="font-semibold text-foreground">{selectedMitarbeiterIds.size}</span>
                </span>
              </div>
              {totalBelegung > verfuegbarePlaetze && (
                <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
                  <IconAlertTriangle size={14} />
                  Kapazität überschritten!
                </div>
              )}
            </div>
          )}

          {/* Auswahl-Counter */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{selectedMitarbeiterIds.size}</span> Mitarbeiter ausgewählt
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMitarbeiterDialogOpen(true)}
            >
              Neuer Mitarbeiter
            </Button>
          </div>

          {/* Suche */}
          <div className="relative">
            <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Name, Abteilung oder Position suchen..."
              value={mitarbeiterSearch}
              onChange={e => setMitarbeiterSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Mitarbeiter-Liste */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredMitarbeiter.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <IconUsers size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">Keine Mitarbeiter gefunden.</p>
              </div>
            ) : (
              filteredMitarbeiter.map(m => {
                const isRegistered = alreadyRegisteredIds.has(m.record_id);
                const isSelected = selectedMitarbeiterIds.has(m.record_id);
                const fullName = `${m.fields.vorname ?? ''} ${m.fields.nachname ?? ''}`.trim() || '–';
                return (
                  <button
                    key={m.record_id}
                    onClick={() => toggleMitarbeiter(m.record_id)}
                    disabled={isRegistered}
                    className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-colors overflow-hidden ${
                      isRegistered
                        ? 'bg-muted/50 border-border cursor-not-allowed opacity-70'
                        : isSelected
                        ? 'bg-primary/5 border-primary/40'
                        : 'bg-card hover:bg-accent hover:border-primary/30'
                    }`}
                  >
                    {/* Checkbox visual */}
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isRegistered
                        ? 'bg-green-100 border-green-400'
                        : isSelected
                        ? 'bg-primary border-primary'
                        : 'bg-background border-border'
                    }`}>
                      {(isSelected || isRegistered) && (
                        <IconCircleCheck size={14} className={isRegistered ? 'text-green-600' : 'text-primary-foreground'} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{fullName}</span>
                        {isRegistered && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 shrink-0">
                            Bereits angemeldet
                          </span>
                        )}
                      </div>
                      <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                        {m.fields.abteilung && <span>{m.fields.abteilung}</span>}
                        {m.fields.position && <span>{m.fields.position}</span>}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2 border-t">
            <Button variant="ghost" onClick={() => setStep(1)}>
              Zurück
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={selectedMitarbeiterIds.size === 0}
            >
              Weiter ({selectedMitarbeiterIds.size} ausgewählt) →
            </Button>
          </div>

          <MitarbeiterDialog
            open={mitarbeiterDialogOpen}
            onClose={() => setMitarbeiterDialogOpen(false)}
            onSubmit={async (fields) => {
              await LivingAppsService.createMitarbeiterEntry(fields);
              await fetchAll();
              setMitarbeiterDialogOpen(false);
            }}
            enablePhotoScan={AI_PHOTO_SCAN['Mitarbeiter']}
            enablePhotoLocation={AI_PHOTO_LOCATION['Mitarbeiter']}
          />
        </div>
      )}

      {/* Step 3: Anmeldungen erstellen */}
      {step === 3 && selectedSession && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">Anmeldungen bestätigen</h2>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{selectedMitarbeiterIds.size} Mitarbeiter</span> werden für{' '}
              <span className="font-medium text-foreground">{getSchulungName(selectedSession)}</span> angemeldet.
            </p>
          </div>

          {/* Vorschau-Liste */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30">
              <span className="text-sm font-medium">Ausgewählte Mitarbeiter</span>
            </div>
            <div className="divide-y max-h-72 overflow-y-auto">
              {Array.from(selectedMitarbeiterIds).map(id => {
                const m = mitarbeiterMap.get(id);
                const fullName = m ? `${m.fields.vorname ?? ''} ${m.fields.nachname ?? ''}`.trim() : id;
                return (
                  <div key={id} className="flex items-center gap-3 px-4 py-3">
                    <IconUserCheck size={16} className="text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{fullName || '–'}</p>
                      {m && (
                        <p className="text-xs text-muted-foreground truncate">
                          {[m.fields.abteilung, m.fields.position].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fortschritt */}
          {(creating || creationDone) && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                {creating && <IconLoader2 size={16} className="animate-spin text-primary" />}
                {creationDone && <IconCircleCheck size={16} className="text-green-600" />}
                <span>
                  {creating
                    ? `Erstelle Anmeldungen... (${createProgress} / ${createTotal})`
                    : `${createdCount} Anmeldung${createdCount !== 1 ? 'en' : ''} erfolgreich erstellt${failedCount > 0 ? ` · ${failedCount} fehlgeschlagen` : ''}`}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: createTotal > 0 ? `${(createProgress / createTotal) * 100}%` : '0%' }}
                />
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2 border-t">
            <Button variant="ghost" onClick={() => setStep(2)} disabled={creating}>
              Zurück
            </Button>
            <Button
              onClick={handleCreateAnmeldungen}
              disabled={creating || creationDone || selectedMitarbeiterIds.size === 0}
            >
              {creating ? (
                <>
                  <IconLoader2 size={16} className="mr-2 animate-spin" />
                  Erstelle...
                </>
              ) : (
                'Anmeldungen erstellen'
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Zusammenfassung */}
      {step === 4 && selectedSession && (
        <div className="space-y-5">
          {/* Erfolgs-Karte */}
          <div className="rounded-2xl border bg-card p-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <IconCircleCheck size={28} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {createdCount} Mitarbeiter angemeldet!
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                für <span className="font-medium text-foreground">{getSchulungName(selectedSession)}</span>
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <IconCalendar size={15} />
              <span>{formatDatum(selectedSession.fields.startdatum)}</span>
            </div>
            {failedCount > 0 && (
              <div className="flex items-center justify-center gap-1.5 text-sm text-amber-600">
                <IconAlertTriangle size={15} />
                <span>{failedCount} Anmeldung{failedCount !== 1 ? 'en' : ''} fehlgeschlagen</span>
              </div>
            )}
          </div>

          {/* Erfolgreiche Mitarbeiter */}
          {successfulMitarbeiterIds.length > 0 && (
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/30">
                <span className="text-sm font-medium">Angemeldete Mitarbeiter</span>
              </div>
              <div className="divide-y max-h-64 overflow-y-auto">
                {successfulMitarbeiterIds.map(id => {
                  const m = mitarbeiterMap.get(id);
                  const fullName = m ? `${m.fields.vorname ?? ''} ${m.fields.nachname ?? ''}`.trim() : id;
                  return (
                    <div key={id} className="flex items-center gap-3 px-4 py-3">
                      <IconCircleCheck size={15} className="text-green-600 shrink-0" />
                      <span className="text-sm truncate">{fullName || '–'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Aktionen */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <Button variant="outline" onClick={handleRestart} className="flex-1">
              Weitere Anmeldungen
            </Button>
            <a
              href={`#/intents/schulungsabschluss?schulungsterminId=${selectedSession.record_id}`}
              className="flex-1"
            >
              <Button variant="outline" className="w-full">
                Schulungsabschluss
              </Button>
            </a>
            <a href="#/schulungsanmeldung" className="flex-1">
              <Button className="w-full">
                Alle Anmeldungen
              </Button>
            </a>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
