import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { Button } from '@/components/ui/button';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { Schulungskatalog, Schulungstermine } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import { SchulungskatalogDialog } from '@/components/dialogs/SchulungskatalogDialog';
import { SchulungstermineDialog } from '@/components/dialogs/SchulungstermineDialog';
import {
  IconBook,
  IconUsers,
  IconTarget,
  IconClock,
  IconCircleCheck,
  IconPlus,
  IconArrowRight,
  IconCalendar,
  IconCheck,
  IconX,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Schulung wählen' },
  { label: 'Kursdetails' },
  { label: 'Ressourcen' },
  { label: 'Zusammenfassung' },
];

export default function SchulungsplanungPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { schulungskatalog, schulungstermine, trainer, raeume, loading, error, fetchAll } = useDashboardData();

  // Wizard state
  const initialStep = Math.min(Math.max(parseInt(searchParams.get('step') ?? '1', 10), 1), 4);
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [selectedKatalog, setSelectedKatalog] = useState<Schulungskatalog | null>(null);
  const [createdTermin, setCreatedTermin] = useState<Schulungstermine | null>(null);

  // Dialog state
  const [katalogDialogOpen, setKatalogDialogOpen] = useState(false);
  const [terminDialogOpen, setTerminDialogOpen] = useState(false);

  // Deep-link init: pre-select entities from URL params
  useEffect(() => {
    const katalogId = searchParams.get('schulungskatalogId');
    const terminId = searchParams.get('schulungsterminId');

    if (katalogId && schulungskatalog.length > 0 && !selectedKatalog) {
      const found = schulungskatalog.find(k => k.record_id === katalogId);
      if (found) setSelectedKatalog(found);
    }

    if (terminId && schulungstermine.length > 0 && !createdTermin) {
      const found = schulungstermine.find(t => t.record_id === terminId);
      if (found) setCreatedTermin(found);
    }
  }, [schulungskatalog, schulungstermine, searchParams, selectedKatalog, createdTermin]);

  // Sync URL params when step/selection changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (currentStep > 1) {
      params.set('step', String(currentStep));
    } else {
      params.delete('step');
    }
    if (selectedKatalog) {
      params.set('schulungskatalogId', selectedKatalog.record_id);
    }
    if (createdTermin) {
      params.set('schulungsterminId', createdTermin.record_id);
    }
    setSearchParams(params, { replace: true });
  }, [currentStep, selectedKatalog, createdTermin, setSearchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Count existing Schulungstermine for selected Schulungskatalog
  const existingTermineCount = useMemo(() => {
    if (!selectedKatalog) return 0;
    return schulungstermine.filter(t => {
      const id = extractRecordId(t.fields.schulung);
      return id === selectedKatalog.record_id;
    }).length;
  }, [schulungstermine, selectedKatalog]);

  // Trainer name lookup for step 3
  const trainerName = useMemo(() => {
    if (!createdTermin?.fields.trainer) return null;
    const trainerId = extractRecordId(createdTermin.fields.trainer);
    if (!trainerId) return null;
    const t = trainer.find(tr => tr.record_id === trainerId);
    if (!t) return null;
    return [t.fields.vorname, t.fields.nachname].filter(Boolean).join(' ');
  }, [createdTermin, trainer]);

  // Raum name lookup for step 3
  const raumName = useMemo(() => {
    if (!createdTermin?.fields.raum) return null;
    const raumId = extractRecordId(createdTermin.fields.raum);
    if (!raumId) return null;
    const r = raeume.find(ra => ra.record_id === raumId);
    return r?.fields.raumname ?? null;
  }, [createdTermin, raeume]);

  function handleSelectKatalog(id: string) {
    const found = schulungskatalog.find(k => k.record_id === id);
    if (found) {
      setSelectedKatalog(found);
      setCurrentStep(2);
    }
  }

  async function handleCreateKatalog(fields: Record<string, unknown>) {
    const res = await LivingAppsService.createSchulungskatalogEntry(fields as Parameters<typeof LivingAppsService.createSchulungskatalogEntry>[0]);
    await fetchAll();
    // Auto-select newly created record
    const newId = Object.keys(res as Record<string, unknown>)[0];
    if (newId) {
      const found = (await LivingAppsService.getSchulungskatalog()).find(k => k.record_id === newId);
      if (found) {
        setSelectedKatalog(found);
        setCurrentStep(2);
      }
    }
    setKatalogDialogOpen(false);
  }

  async function handleCreateTermin(fields: Record<string, unknown>) {
    const res = await LivingAppsService.createSchulungstermineEntry(fields as Parameters<typeof LivingAppsService.createSchulungstermineEntry>[0]);
    await fetchAll();
    // Find newly created record
    const resObj = res as Record<string, unknown>;
    const newId = Object.keys(resObj)[0];
    if (newId) {
      const allTermine = await LivingAppsService.getSchulungstermine();
      const found = allTermine.find(t => t.record_id === newId);
      if (found) {
        setCreatedTermin(found);
        setCurrentStep(3);
      }
    }
    setTerminDialogOpen(false);
  }

  function handleRestart() {
    setSelectedKatalog(null);
    setCreatedTermin(null);
    setCurrentStep(1);
    const params = new URLSearchParams();
    setSearchParams(params, { replace: true });
  }

  function formatDate(val: string | undefined) {
    if (!val) return '–';
    // Handle YYYY-MM-DDTHH:MM format
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <IntentWizardShell
      title="Schulungsplanung"
      subtitle="Plane und erstelle einen neuen Schulungstermin in wenigen Schritten."
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* ───── STEP 1: Schulung wählen ───── */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Welche Schulung möchtest du planen?</h2>
            <p className="text-sm text-muted-foreground mt-1">Wähle eine Schulung aus dem Katalog oder lege eine neue an.</p>
          </div>
          <EntitySelectStep
            items={schulungskatalog.map(s => ({
              id: s.record_id,
              title: s.fields.titel ?? '(kein Titel)',
              subtitle: [s.fields.kategorie?.label, s.fields.dauer_tage ? `${s.fields.dauer_tage} Tage` : undefined]
                .filter(Boolean).join(' · '),
              status: s.fields.kategorie
                ? { key: s.fields.kategorie.key, label: s.fields.kategorie.label }
                : undefined,
              stats: [
                { label: 'Max. Teilnehmer', value: s.fields.max_teilnehmer?.toString() ?? '–' },
              ],
              icon: <IconBook size={18} className="text-primary" />,
            }))}
            onSelect={handleSelectKatalog}
            searchPlaceholder="Schulung suchen..."
            emptyIcon={<IconBook size={32} />}
            emptyText="Noch keine Schulungen im Katalog vorhanden."
            createLabel="Neue Schulung anlegen"
            onCreateNew={() => setKatalogDialogOpen(true)}
            createDialog={
              <SchulungskatalogDialog
                open={katalogDialogOpen}
                onClose={() => setKatalogDialogOpen(false)}
                onSubmit={handleCreateKatalog}
                enablePhotoScan={AI_PHOTO_SCAN['Schulungskatalog']}
              />
            }
          />
        </div>
      )}

      {/* ───── STEP 2: Kursdetails ───── */}
      {currentStep === 2 && selectedKatalog && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold">Kursdetails</h2>
            <p className="text-sm text-muted-foreground mt-1">Überblick über die gewählte Schulung. Erstelle danach den Termin.</p>
          </div>

          {/* Summary card */}
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="bg-primary/5 px-5 py-4 border-b">
              <div className="flex items-center gap-2 min-w-0">
                <IconBook size={18} className="text-primary shrink-0" />
                <span className="font-semibold text-base truncate">{selectedKatalog.fields.titel ?? '(kein Titel)'}</span>
                {selectedKatalog.fields.kategorie && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                    {selectedKatalog.fields.kategorie.label}
                  </span>
                )}
              </div>
            </div>
            <div className="p-5 space-y-4">
              {selectedKatalog.fields.beschreibung && (
                <p className="text-sm text-muted-foreground">{selectedKatalog.fields.beschreibung}</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedKatalog.fields.zielgruppe && (
                  <div className="flex items-start gap-2">
                    <IconUsers size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Zielgruppe</p>
                      <p className="text-sm font-medium truncate">{selectedKatalog.fields.zielgruppe}</p>
                    </div>
                  </div>
                )}
                {selectedKatalog.fields.lernziele && (
                  <div className="flex items-start gap-2">
                    <IconTarget size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Lernziele</p>
                      <p className="text-sm font-medium line-clamp-2">{selectedKatalog.fields.lernziele}</p>
                    </div>
                  </div>
                )}
                {selectedKatalog.fields.voraussetzungen && (
                  <div className="flex items-start gap-2">
                    <IconBook size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Voraussetzungen</p>
                      <p className="text-sm font-medium line-clamp-2">{selectedKatalog.fields.voraussetzungen}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <IconClock size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Dauer</p>
                    <p className="text-sm font-medium">
                      {selectedKatalog.fields.dauer_tage != null ? `${selectedKatalog.fields.dauer_tage} Tage` : '–'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <IconUsers size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Max. Teilnehmer</p>
                    <p className="text-sm font-medium">
                      {selectedKatalog.fields.max_teilnehmer != null ? selectedKatalog.fields.max_teilnehmer : '–'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Existing termine count */}
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-muted/50 border">
            <IconCalendar size={16} className="text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground">
              Bereits <span className="font-semibold text-foreground">{existingTermineCount}</span> {existingTermineCount === 1 ? 'Termin' : 'Termine'} für diese Schulung vorhanden
            </span>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setCurrentStep(1)}>
              Zurück
            </Button>
            <Button className="w-full sm:flex-1 gap-2" onClick={() => setTerminDialogOpen(true)}>
              Termin jetzt anlegen
              <IconArrowRight size={16} />
            </Button>
          </div>

          <SchulungstermineDialog
            open={terminDialogOpen}
            onClose={() => setTerminDialogOpen(false)}
            onSubmit={handleCreateTermin}
            defaultValues={{
              schulung: createRecordUrl(APP_IDS.SCHULUNGSKATALOG, selectedKatalog.record_id),
            }}
            schulungskatalogList={schulungskatalog}
            trainerList={trainer}
            raeumeList={raeume}
            enablePhotoScan={AI_PHOTO_SCAN['Schulungstermine']}
          />
        </div>
      )}

      {/* ───── STEP 3: Ressourcen ───── */}
      {currentStep === 3 && createdTermin && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold">Ressourcen & Checkliste</h2>
            <p className="text-sm text-muted-foreground mt-1">Prüfe, ob alle wichtigen Angaben für den neuen Termin vollständig sind.</p>
          </div>

          {/* Termin summary card */}
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="bg-primary/5 px-5 py-4 border-b flex items-center gap-2">
              <IconCalendar size={18} className="text-primary shrink-0" />
              <span className="font-semibold truncate">Neuer Schulungstermin</span>
              {createdTermin.fields.status && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                  {createdTermin.fields.status.label}
                </span>
              )}
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Startdatum</p>
                  <p className="text-sm font-medium">{formatDate(createdTermin.fields.startdatum)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Enddatum</p>
                  <p className="text-sm font-medium">{formatDate(createdTermin.fields.enddatum)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Trainer</p>
                  <p className="text-sm font-medium">{trainerName ?? '–'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Raum</p>
                  <p className="text-sm font-medium">{raumName ?? '–'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Verfügbare Plätze</p>
                  <p className="text-sm font-medium">
                    {createdTermin.fields.verfuegbare_plaetze != null ? createdTermin.fields.verfuegbare_plaetze : '–'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Termine für diese Schulung</p>
                  <p className="text-sm font-medium">{existingTermineCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h3 className="font-semibold text-sm">Vollständigkeitsprüfung</h3>
            </div>
            <div className="p-5 space-y-3">
              {[
                {
                  label: 'Startdatum gesetzt',
                  missing: 'Startdatum fehlt',
                  ok: !!createdTermin.fields.startdatum,
                },
                {
                  label: 'Trainer zugewiesen',
                  missing: 'Kein Trainer',
                  ok: !!createdTermin.fields.trainer,
                },
                {
                  label: 'Raum gebucht',
                  missing: 'Kein Raum',
                  ok: !!createdTermin.fields.raum,
                },
                {
                  label: 'Verfügbare Plätze gesetzt',
                  missing: 'Plätze fehlen',
                  ok: createdTermin.fields.verfuegbare_plaetze != null,
                },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    item.ok ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {item.ok
                      ? <IconCheck size={13} className="text-green-600" stroke={2.5} />
                      : <IconX size={13} className="text-red-500" stroke={2.5} />
                    }
                  </div>
                  <span className={`text-sm ${item.ok ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {item.ok ? item.label : item.missing}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setCurrentStep(2)}>
              Zurück
            </Button>
            <Button className="w-full sm:flex-1 gap-2" onClick={() => setCurrentStep(4)}>
              Fertig
              <IconArrowRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* ───── STEP 4: Zusammenfassung ───── */}
      {currentStep === 4 && createdTermin && selectedKatalog && (
        <div className="space-y-6">
          {/* Success header */}
          <div className="flex flex-col items-center text-center py-6 gap-3">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <IconCircleCheck size={36} className="text-green-600" stroke={1.5} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Schulungstermin erstellt!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Der Termin für <span className="font-medium text-foreground">{selectedKatalog.fields.titel}</span> wurde erfolgreich angelegt.
              </p>
            </div>
          </div>

          {/* Details card */}
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="bg-primary/5 px-5 py-4 border-b flex items-center gap-2">
              <IconCalendar size={18} className="text-primary shrink-0" />
              <span className="font-semibold truncate">{selectedKatalog.fields.titel}</span>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Startdatum</p>
                  <p className="text-sm font-medium">{formatDate(createdTermin.fields.startdatum)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Enddatum</p>
                  <p className="text-sm font-medium">{formatDate(createdTermin.fields.enddatum)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Trainer</p>
                  <p className="text-sm font-medium">{trainerName ?? '–'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Raum</p>
                  <p className="text-sm font-medium">{raumName ?? '–'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Verfügbare Plätze</p>
                  <p className="text-sm font-medium">
                    {createdTermin.fields.verfuegbare_plaetze != null ? createdTermin.fields.verfuegbare_plaetze : '–'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="text-sm font-medium">{createdTermin.fields.status?.label ?? '–'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                window.location.href = `#/intents/gruppen-anmeldung?schulungsterminId=${createdTermin.record_id}`;
              }}
            >
              <IconUsers size={16} />
              Anmeldungen verwalten
            </Button>
            <a href="#/schulungstermine" className="w-full">
              <Button variant="outline" className="w-full gap-2">
                <IconCalendar size={16} />
                Alle Schulungstermine anzeigen
              </Button>
            </a>
            <Button className="w-full gap-2" onClick={handleRestart}>
              <IconPlus size={16} />
              Weitere Schulung planen
            </Button>
          </div>
        </div>
      )}

      {/* Fallback: step 2/3/4 without selection */}
      {currentStep === 2 && !selectedKatalog && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">Bitte wähle zuerst eine Schulung aus.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setCurrentStep(1)}>
            Zurück zu Schritt 1
          </Button>
        </div>
      )}
      {currentStep === 3 && !createdTermin && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">Kein Termin gefunden. Bitte lege zuerst einen Termin an.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setCurrentStep(2)}>
            Zurück zu Schritt 2
          </Button>
        </div>
      )}
      {currentStep === 4 && (!createdTermin || !selectedKatalog) && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">Keine vollständigen Daten vorhanden.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setCurrentStep(1)}>
            Von vorne beginnen
          </Button>
        </div>
      )}
    </IntentWizardShell>
  );
}
