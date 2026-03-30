import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import type { Schulungstermine, Schulungskatalog, Teilnehmerverwaltung, Mitarbeiter } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { SchulungstermineDialog } from '@/components/dialogs/SchulungstermineDialog';
import { BewertungenDialog } from '@/components/dialogs/BewertungenDialog';
import { Button } from '@/components/ui/button';
import {
  IconCalendarEvent,
  IconCircleCheck,
  IconUsers,
  IconCertificate,
  IconStar,
  IconAlertCircle,
  IconLoader2,
  IconAward,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Termin wählen' },
  { label: 'Anwesenheit' },
  { label: 'Zertifikate' },
  { label: 'Abschluss' },
];

export default function SchulungsabschlussPage() {
  const [searchParams] = useSearchParams();

  // Step state — init from URL param
  const initialStep = (() => {
    const p = parseInt(searchParams.get('step') ?? '', 10);
    return p >= 1 && p <= 4 ? p : 1;
  })();
  const [currentStep, setCurrentStep] = useState(initialStep);

  // Data from hook
  const [schulungstermine, setSchulungstermine] = useState<Schulungstermine[]>([]);
  const [schulungskatalog, setSchulungskatalog] = useState<Schulungskatalog[]>([]);
  const [allTeilnehmer, setAllTeilnehmer] = useState<Teilnehmerverwaltung[]>([]);
  const [mitarbeiter, setMitarbeiter] = useState<Mitarbeiter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Selection state
  const [selectedTerminId, setSelectedTerminId] = useState<string | null>(
    searchParams.get('schulungsterminId') ?? null
  );

  // Step 2: attendance
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  // Step 3: certificates
  const [certSelection, setCertSelection] = useState<Record<string, boolean>>({});
  const [creatingCerts, setCreatingCerts] = useState(false);
  const [certsDone, setCertsDone] = useState(false);
  const [certsCreatedCount, setCertsCreatedCount] = useState(0);
  const [existingZertifikate, setExistingZertifikate] = useState<{ teilnahmeId: string; schulungId: string }[]>([]);

  // Step 4: finish
  const [bewertungenCount, setBewertungenCount] = useState(0);
  const [finishLoading, setFinishLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [bewertungDialogOpen, setBewertungDialogOpen] = useState(false);

  // Dialogs
  const [terminDialogOpen, setTerminDialogOpen] = useState(false);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [termineData, katalogData, teilnehmerData, maData] = await Promise.all([
        LivingAppsService.getSchulungstermine(),
        LivingAppsService.getSchulungskatalog(),
        LivingAppsService.getTeilnehmerverwaltung(),
        LivingAppsService.getMitarbeiter(),
      ]);
      setSchulungstermine(termineData);
      setSchulungskatalog(katalogData);
      setAllTeilnehmer(teilnehmerData);
      setMitarbeiter(maData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Build maps
  const schulungskatalogMap = useMemo(() => {
    const m = new Map<string, Schulungskatalog>();
    schulungskatalog.forEach(k => m.set(k.record_id, k));
    return m;
  }, [schulungskatalog]);

  const mitarbeiterMap = useMemo(() => {
    const m = new Map<string, Mitarbeiter>();
    mitarbeiter.forEach(ma => m.set(ma.record_id, ma));
    return m;
  }, [mitarbeiter]);

  // Teilnehmer for selected session
  const sessionTeilnehmer = useMemo(() => {
    if (!selectedTerminId) return [];
    return allTeilnehmer.filter(t => {
      const url = t.fields.schulungstermin ?? '';
      return url.includes(selectedTerminId);
    });
  }, [allTeilnehmer, selectedTerminId]);

  const selectedTermin = useMemo(
    () => schulungstermine.find(s => s.record_id === selectedTerminId) ?? null,
    [schulungstermine, selectedTerminId]
  );

  const schulungName = useMemo(() => {
    if (!selectedTermin?.fields.schulung) return 'Unbekannte Schulung';
    const id = extractRecordId(selectedTermin.fields.schulung);
    const kat = id ? schulungskatalogMap.get(id) : undefined;
    return kat?.fields.titel ?? 'Unbekannte Schulung';
  }, [selectedTermin, schulungskatalogMap]);

  // Init attendance map when session changes
  useEffect(() => {
    if (sessionTeilnehmer.length === 0) return;
    const map: Record<string, boolean> = {};
    sessionTeilnehmer.forEach(t => {
      map[t.record_id] = t.fields.anwesenheit ?? false;
    });
    setAttendanceMap(map);
  }, [sessionTeilnehmer]);

  // Present participants (those marked present in attendanceMap)
  const presentTeilnehmer = useMemo(
    () => sessionTeilnehmer.filter(t => attendanceMap[t.record_id] === true),
    [sessionTeilnehmer, attendanceMap]
  );

  // Cert selection init when present participants change
  useEffect(() => {
    const sel: Record<string, boolean> = {};
    presentTeilnehmer.forEach(t => { sel[t.record_id] = true; });
    setCertSelection(sel);
  }, [presentTeilnehmer]);

  // Load existing certs and bewertungen when on step 3+
  useEffect(() => {
    if (currentStep < 3 || !selectedTerminId) return;
    async function loadCertsAndBewertungen() {
      try {
        const [certsData, bewData] = await Promise.all([
          LivingAppsService.getZertifikate(),
          LivingAppsService.getBewertungen(),
        ]);
        setExistingZertifikate(
          certsData.map(z => ({
            teilnahmeId: extractRecordId(z.fields.teilnahme ?? '') ?? '',
            schulungId: extractRecordId(z.fields.schulung ?? '') ?? '',
          }))
        );
        // Count bewertungen for this session's teilnehmer
        const sessionTeilnehmerIds = new Set(sessionTeilnehmer.map(t => t.record_id));
        const count = bewData.filter(b => {
          const tid = extractRecordId(b.fields.teilnahme ?? '') ?? '';
          return sessionTeilnehmerIds.has(tid);
        }).length;
        setBewertungenCount(count);
      } catch {
        // ignore silently
      }
    }
    void loadCertsAndBewertungen();
  }, [currentStep, selectedTerminId, sessionTeilnehmer]);

  // Helpers
  function getMitarbeiterName(t: Teilnehmerverwaltung): string {
    const maId = extractRecordId(t.fields.mitarbeiter ?? '');
    const ma = maId ? mitarbeiterMap.get(maId) : undefined;
    if (!ma) return 'Unbekannt';
    return [ma.fields.vorname, ma.fields.nachname].filter(Boolean).join(' ') || 'Unbekannt';
  }

  function getMaId(t: Teilnehmerverwaltung): string {
    return extractRecordId(t.fields.mitarbeiter ?? '') ?? '';
  }

  function getSchulungId(): string {
    if (!selectedTermin?.fields.schulung) return '';
    return extractRecordId(selectedTermin.fields.schulung) ?? '';
  }

  // Step 1: select session
  function handleSelectTermin(id: string) {
    setSelectedTerminId(id);
    setCurrentStep(2);
  }

  // Step 2: save attendance
  async function handleSaveAttendance() {
    setSavingAttendance(true);
    setAttendanceError(null);
    try {
      await Promise.allSettled(
        sessionTeilnehmer.map(t => {
          const isPresent = attendanceMap[t.record_id] ?? false;
          return LivingAppsService.updateTeilnehmerverwaltungEntry(t.record_id, {
            anwesenheit: isPresent,
            status: isPresent ? 'teilgenommen' : 'nicht_erschienen',
          });
        })
      );
      // Refresh teilnehmer data
      const fresh = await LivingAppsService.getTeilnehmerverwaltung();
      setAllTeilnehmer(fresh);
      setCurrentStep(3);
    } catch (err) {
      setAttendanceError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally {
      setSavingAttendance(false);
    }
  }

  // Step 3: create certificates
  async function handleCreateCerts() {
    setCreatingCerts(true);
    const schulungId = getSchulungId();
    const toCreate = presentTeilnehmer.filter(t => {
      if (!certSelection[t.record_id]) return false;
      // Skip if already has cert for this schulung
      const alreadyHas = existingZertifikate.some(
        z => z.teilnahmeId === t.record_id && z.schulungId === schulungId
      );
      return !alreadyHas;
    });

    const results = await Promise.allSettled(
      toCreate.map(async t => {
        const maId = getMaId(t);
        await LivingAppsService.createZertifikateEntry({
          teilnahme: createRecordUrl(APP_IDS.TEILNEHMERVERWALTUNG, t.record_id),
          empfaenger: maId ? createRecordUrl(APP_IDS.MITARBEITER, maId) : undefined,
          schulung: schulungId ? createRecordUrl(APP_IDS.SCHULUNGSKATALOG, schulungId) : undefined,
          zertifikatstyp: 'teilnahmebestaetigung',
          ausstellungsdatum: format(new Date(), 'yyyy-MM-dd'),
          status: 'aktiv',
        });
        await LivingAppsService.updateTeilnehmerverwaltungEntry(t.record_id, {
          zertifikat_ausgestellt: true,
        });
      })
    );

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    setCertsCreatedCount(successCount);
    setCertsDone(true);
    setCreatingCerts(false);

    // Refresh data
    const fresh = await LivingAppsService.getTeilnehmerverwaltung();
    setAllTeilnehmer(fresh);
    setCurrentStep(4);
  }

  // Step 4: finish session
  async function handleFinish() {
    if (!selectedTerminId) return;
    setFinishLoading(true);
    try {
      await LivingAppsService.updateSchulungstermineEntry(selectedTerminId, {
        status: 'durchgefuehrt',
      });
      setFinished(true);
    } catch {
      // show error inline
    } finally {
      setFinishLoading(false);
    }
  }

  const presentCount = presentTeilnehmer.length;

  // Step 1 items
  const terminItems = useMemo(() => {
    const sorted = [...schulungstermine].sort((a, b) => {
      const statusOrder: Record<string, number> = { geplant: 0, bestaetigt: 1, durchgefuehrt: 2, abgesagt: 3 };
      const ao = statusOrder[a.fields.status?.key ?? ''] ?? 9;
      const bo = statusOrder[b.fields.status?.key ?? ''] ?? 9;
      return ao - bo;
    });
    return sorted.map(s => {
      const katId = extractRecordId(s.fields.schulung ?? '');
      const kat = katId ? schulungskatalogMap.get(katId) : undefined;
      const titel = kat?.fields.titel ?? 'Unbekannte Schulung';
      const datum = s.fields.startdatum
        ? format(new Date(s.fields.startdatum), 'dd.MM.yyyy HH:mm')
        : '–';
      return {
        id: s.record_id,
        title: titel,
        subtitle: `Start: ${datum}`,
        status: s.fields.status ?? undefined,
        stats: [{ label: 'Status', value: s.fields.status?.label ?? '–' }],
        icon: <IconCalendarEvent size={18} className="text-primary" />,
      };
    });
  }, [schulungstermine, schulungskatalogMap]);

  // Trainer list needed by SchulungstermineDialog — fetch from dashboard data via LivingAppsService
  const [trainerList, setTrainerList] = useState<import('@/types/app').Trainer[]>([]);
  const [raeumeList, setRaeumeList] = useState<import('@/types/app').Raeume[]>([]);

  useEffect(() => {
    async function loadExtra() {
      try {
        const [t, r] = await Promise.all([
          LivingAppsService.getTrainer(),
          LivingAppsService.getRaeume(),
        ]);
        setTrainerList(t);
        setRaeumeList(r);
      } catch {
        // ignore
      }
    }
    void loadExtra();
  }, []);

  // Attendees for BewertungenDialog
  const presentTeilnehmerForDialog = useMemo(
    () => sessionTeilnehmer.filter(t => t.fields.anwesenheit || t.fields.status?.key === 'teilgenommen'),
    [sessionTeilnehmer]
  );

  return (
    <IntentWizardShell
      title="Schulungsabschluss"
      subtitle="Schliesse eine abgehaltene Schulung ab: Anwesenheit, Zertifikate, Bewertungen."
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* STEP 1: Termin wählen */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">Schulungstermin wählen</h2>
            <p className="text-sm text-muted-foreground">
              Wähle den Schulungstermin, den du abschliessen möchtest.
            </p>
          </div>
          <EntitySelectStep
            items={terminItems}
            onSelect={handleSelectTermin}
            searchPlaceholder="Schulung suchen..."
            emptyText="Keine Schulungstermine gefunden."
            emptyIcon={<IconCalendarEvent size={32} />}
            createLabel="Neuen Termin erstellen"
            onCreateNew={() => setTerminDialogOpen(true)}
            createDialog={
              <SchulungstermineDialog
                open={terminDialogOpen}
                onClose={() => setTerminDialogOpen(false)}
                onSubmit={async (fields) => {
                  await LivingAppsService.createSchulungstermineEntry(fields);
                  await fetchAll();
                  setTerminDialogOpen(false);
                }}
                schulungskatalogList={schulungskatalog}
                trainerList={trainerList}
                raeumeList={raeumeList}
                enablePhotoScan={AI_PHOTO_SCAN['Schulungstermine']}
              />
            }
          />
        </div>
      )}

      {/* STEP 2: Anwesenheit erfassen */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold mb-1">Anwesenheit erfassen</h2>
              <p className="text-sm text-muted-foreground">
                {schulungName} — markiere, wer anwesend war.
              </p>
            </div>
            <div className="rounded-xl bg-primary/10 px-3 py-2 text-sm font-medium text-primary shrink-0">
              {Object.values(attendanceMap).filter(Boolean).length} / {sessionTeilnehmer.length} anwesend
            </div>
          </div>

          {sessionTeilnehmer.length === 0 ? (
            <div className="text-center py-12 rounded-xl border bg-card">
              <IconUsers size={32} className="mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground mb-4">Keine Teilnehmer eingetragen.</p>
              <Button variant="outline" onClick={() => setCurrentStep(3)}>
                Trotzdem weiter
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {sessionTeilnehmer.map(t => {
                const name = getMitarbeiterName(t);
                const isPresent = attendanceMap[t.record_id] ?? false;
                return (
                  <div
                    key={t.record_id}
                    className="flex items-center gap-3 p-4 rounded-xl border bg-card overflow-hidden"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm truncate block">{name}</span>
                      {t.fields.status && (
                        <span className="text-xs text-muted-foreground">
                          {t.fields.status.label}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() =>
                        setAttendanceMap(prev => ({
                          ...prev,
                          [t.record_id]: !prev[t.record_id],
                        }))
                      }
                      className={`w-12 h-6 rounded-full transition-colors shrink-0 relative ${
                        isPresent ? 'bg-primary' : 'bg-muted'
                      }`}
                      aria-label={isPresent ? 'Anwesend' : 'Nicht anwesend'}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                          isPresent ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                    <span className={`text-xs font-medium shrink-0 w-20 text-right ${isPresent ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {isPresent ? 'Anwesend' : 'Nicht da'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {attendanceError && (
            <div className="flex items-center gap-2 text-sm text-destructive p-3 rounded-xl bg-destructive/10">
              <IconAlertCircle size={16} />
              {attendanceError}
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setCurrentStep(1)}>
              Zurück
            </Button>
            {sessionTeilnehmer.length > 0 ? (
              <Button onClick={handleSaveAttendance} disabled={savingAttendance} className="flex-1 sm:flex-none">
                {savingAttendance ? (
                  <IconLoader2 size={16} className="mr-2 animate-spin" />
                ) : (
                  <IconUsers size={16} className="mr-2" />
                )}
                Anwesenheit speichern
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {/* STEP 3: Zertifikate ausstellen */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">Zertifikate ausstellen</h2>
            <p className="text-sm text-muted-foreground">
              Für anwesende Teilnehmer werden Teilnahmebestätigungen erstellt.
            </p>
          </div>

          {presentTeilnehmer.length === 0 ? (
            <div className="text-center py-12 rounded-xl border bg-card">
              <IconCertificate size={32} className="mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground mb-4">
                Keine anwesenden Teilnehmer — keine Zertifikate zu erstellen.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {presentTeilnehmer.map(t => {
                const name = getMitarbeiterName(t);
                const schulungId = getSchulungId();
                const alreadyHas = existingZertifikate.some(
                  z => z.teilnahmeId === t.record_id && z.schulungId === schulungId
                );
                const isSelected = certSelection[t.record_id] ?? true;

                return (
                  <div
                    key={t.record_id}
                    className="flex items-center gap-3 p-4 rounded-xl border bg-card overflow-hidden"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected && !alreadyHas}
                      disabled={alreadyHas}
                      onChange={e =>
                        setCertSelection(prev => ({
                          ...prev,
                          [t.record_id]: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 shrink-0 accent-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm truncate block">{name}</span>
                    </div>
                    {alreadyHas && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 shrink-0">
                        Zertifikat vorhanden
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setCurrentStep(2)}>
              Zurück
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setCertsDone(true);
                setCurrentStep(4);
              }}
            >
              Überspringen
            </Button>
            {presentTeilnehmer.length > 0 && (
              <Button onClick={handleCreateCerts} disabled={creatingCerts} className="flex-1 sm:flex-none">
                {creatingCerts ? (
                  <IconLoader2 size={16} className="mr-2 animate-spin" />
                ) : (
                  <IconCertificate size={16} className="mr-2" />
                )}
                Zertifikate erstellen
              </Button>
            )}
          </div>

          {certsDone && (
            <div className="flex items-center gap-2 text-sm text-green-700 p-3 rounded-xl bg-green-50">
              <IconCircleCheck size={16} />
              {certsCreatedCount} Zertifikat(e) erfolgreich erstellt.
            </div>
          )}
        </div>
      )}

      {/* STEP 4: Bewertungen & Abschluss */}
      {currentStep === 4 && !finished && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">Bewertungen & Abschluss</h2>
            <p className="text-sm text-muted-foreground">
              Sammle optionales Feedback und schliesse die Schulung ab.
            </p>
          </div>

          {/* Summary card */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <h3 className="font-medium text-sm">{schulungName}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <div className="text-2xl font-bold text-primary">{presentCount}</div>
                <div className="text-xs text-muted-foreground mt-1">Anwesend</div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <div className="text-2xl font-bold text-primary">{certsCreatedCount}</div>
                <div className="text-xs text-muted-foreground mt-1">Zertifikate</div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center col-span-2 sm:col-span-1">
                <div className="text-2xl font-bold text-primary">{bewertungenCount}</div>
                <div className="text-xs text-muted-foreground mt-1">Bewertungen</div>
              </div>
            </div>
          </div>

          {/* Bewertung hinzufügen */}
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="font-medium text-sm">Feedback erfassen</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {bewertungenCount > 0
                    ? `${bewertungenCount} Bewertung(en) bereits erfasst`
                    : 'Noch keine Bewertungen für diese Schulung'}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setBewertungDialogOpen(true)}
                className="shrink-0"
              >
                <IconStar size={16} className="mr-2" />
                Bewertung hinzufügen
              </Button>
            </div>
          </div>

          <BewertungenDialog
            open={bewertungDialogOpen}
            onClose={() => setBewertungDialogOpen(false)}
            onSubmit={async (fields) => {
              await LivingAppsService.createBewertungenEntry(fields);
              setBewertungDialogOpen(false);
              // Refresh count
              try {
                const bewData = await LivingAppsService.getBewertungen();
                const sessionTeilnehmerIds = new Set(sessionTeilnehmer.map(t => t.record_id));
                const count = bewData.filter(b => {
                  const tid = extractRecordId(b.fields.teilnahme ?? '') ?? '';
                  return sessionTeilnehmerIds.has(tid);
                }).length;
                setBewertungenCount(count);
              } catch {
                // ignore
              }
            }}
            teilnehmerverwaltungList={presentTeilnehmerForDialog}
            enablePhotoScan={AI_PHOTO_SCAN['Bewertungen']}
          />

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setCurrentStep(3)}>
              Zurück
            </Button>
            <Button
              onClick={handleFinish}
              disabled={finishLoading}
              className="flex-1 sm:flex-none"
            >
              {finishLoading ? (
                <IconLoader2 size={16} className="mr-2 animate-spin" />
              ) : (
                <IconCircleCheck size={16} className="mr-2" />
              )}
              Schulung abschliessen
            </Button>
          </div>
        </div>
      )}

      {/* SUCCESS STATE */}
      {currentStep === 4 && finished && (
        <div className="flex flex-col items-center text-center py-12 space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <IconCircleCheck size={32} className="text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Schulung erfolgreich abgeschlossen!</h2>
            <p className="text-sm text-muted-foreground mt-1">{schulungName}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 w-full max-w-sm mt-4">
            <div className="rounded-xl border bg-card p-3 text-center">
              <IconUsers size={20} className="mx-auto mb-1 text-primary" />
              <div className="text-xl font-bold">{presentCount}</div>
              <div className="text-xs text-muted-foreground">Anwesend</div>
            </div>
            <div className="rounded-xl border bg-card p-3 text-center">
              <IconAward size={20} className="mx-auto mb-1 text-primary" />
              <div className="text-xl font-bold">{certsCreatedCount}</div>
              <div className="text-xs text-muted-foreground">Zertifikate</div>
            </div>
            <div className="rounded-xl border bg-card p-3 text-center">
              <IconStar size={20} className="mx-auto mb-1 text-primary" />
              <div className="text-xl font-bold">{bewertungenCount}</div>
              <div className="text-xs text-muted-foreground">Bewertungen</div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap justify-center mt-4">
            <Button variant="outline" asChild>
              <a href="#/">Zurück zur Übersicht</a>
            </Button>
            <Button asChild>
              <a href="#/schulungstermine">Alle Schulungen</a>
            </Button>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
