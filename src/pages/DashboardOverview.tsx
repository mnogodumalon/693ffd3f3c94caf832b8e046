import { useState, useMemo } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichSchulungstermine, enrichTeilnehmerverwaltung } from '@/lib/enrich';
import type { EnrichedSchulungstermine, EnrichedTeilnehmerverwaltung } from '@/types/enriched';
import type { Schulungstermine, Teilnehmerverwaltung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SchulungstermineDialog } from '@/components/dialogs/SchulungstermineDialog';
import { TeilnehmerverwaltungDialog } from '@/components/dialogs/TeilnehmerverwaltungDialog';
import {
  IconAlertCircle, IconCalendar, IconChevronLeft, IconChevronRight, IconPlus,
  IconPencil, IconTrash, IconUsers, IconAward, IconClock,
  IconMapPin, IconUser, IconUserPlus, IconRocket, IconBook, IconCheckbox,
} from '@tabler/icons-react';
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameDay, isSameMonth, format, addMonths, subMonths, isToday, parseISO,
} from 'date-fns';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { chip: string; dot: string; badge: string }> = {
  geplant:       { chip: 'bg-amber-100 text-amber-800 border-amber-200',  dot: 'bg-amber-500',  badge: 'bg-amber-100 text-amber-800' },
  bestaetigt:    { chip: 'bg-blue-100 text-blue-800 border-blue-200',     dot: 'bg-blue-500',   badge: 'bg-blue-100 text-blue-800' },
  durchgefuehrt: { chip: 'bg-green-100 text-green-800 border-green-200',  dot: 'bg-green-500',  badge: 'bg-green-100 text-green-800' },
  abgesagt:      { chip: 'bg-red-100 text-red-800 border-red-200',        dot: 'bg-red-500',    badge: 'bg-red-100 text-red-800' },
};
const DEFAULT_SC = { chip: 'bg-gray-100 text-gray-700 border-gray-200', dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-700' };

const TEILN_STATUS: Record<string, string> = {
  angemeldet:       'bg-blue-100 text-blue-700',
  warteliste:       'bg-amber-100 text-amber-700',
  teilgenommen:     'bg-green-100 text-green-700',
  abgesagt:         'bg-red-100 text-red-700',
  nicht_erschienen: 'bg-gray-100 text-gray-600',
};

const MONTH_NAMES = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const DAY_NAMES = ['Mo','Di','Mi','Do','Fr','Sa','So'];

// ── Main Component ────────────────────────────────────────────────────────────

export default function DashboardOverview() {
  const {
    schulungstermine, trainer, teilnehmerverwaltung, zertifikate, raeume, mitarbeiter, schulungskatalog,
    schulungstermineMap, trainerMap, raeumeMap, mitarbeiterMap, schulungskatalogMap,
    loading, error, fetchAll,
  } = useDashboardData();

  // ── State (ALL before early returns) ─────────────────────────────────────
  const [currentMonth, setCurrentMonth]         = useState(new Date());
  const [selectedDay, setSelectedDay]           = useState<Date | null>(null);
  const [selectedSession, setSelectedSession]   = useState<EnrichedSchulungstermine | null>(null);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [sessionToEdit, setSessionToEdit]       = useState<EnrichedSchulungstermine | null>(null);
  const [deleteTarget, setDeleteTarget]         = useState<string | null>(null);
  const [teilnehmerOpen, setTeilnehmerOpen]     = useState(false);

  // ── Enriched data ─────────────────────────────────────────────────────────
  const enrichedSchulungstermine = useMemo(
    () => enrichSchulungstermine(schulungstermine, { schulungskatalogMap, trainerMap, raeumeMap }),
    [schulungstermine, schulungskatalogMap, trainerMap, raeumeMap],
  );
  const enrichedTeilnehmerverwaltung = useMemo(
    () => enrichTeilnehmerverwaltung(teilnehmerverwaltung, { schulungstermineMap, mitarbeiterMap }),
    [teilnehmerverwaltung, schulungstermineMap, mitarbeiterMap],
  );

  // ── Calendar ──────────────────────────────────────────────────────────────
  const calendarDays = useMemo(() => {
    const calStart = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const calEnd   = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, EnrichedSchulungstermine[]>();
    for (const s of enrichedSchulungstermine) {
      if (!s.fields.startdatum) continue;
      try {
        const key = format(parseISO(s.fields.startdatum), 'yyyy-MM-dd');
        map.set(key, [...(map.get(key) ?? []), s]);
      } catch { /* skip */ }
    }
    return map;
  }, [enrichedSchulungstermine]);

  const selectedDaySessions = useMemo(() => {
    if (!selectedDay) return [];
    return sessionsByDay.get(format(selectedDay, 'yyyy-MM-dd')) ?? [];
  }, [selectedDay, sessionsByDay]);

  const sessionParticipants = useMemo(() =>
    selectedSession
      ? enrichedTeilnehmerverwaltung.filter(t => extractRecordId(t.fields.schulungstermin) === selectedSession.record_id)
      : [],
    [selectedSession, enrichedTeilnehmerverwaltung],
  );

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const now = new Date();
  const upcomingCount = useMemo(() =>
    enrichedSchulungstermine.filter(s => { try { return parseISO(s.fields.startdatum!) >= now; } catch { return false; } }).length,
    [enrichedSchulungstermine],
  );
  const thisMonthCount = useMemo(() =>
    enrichedSchulungstermine.filter(s => { try { return isSameMonth(parseISO(s.fields.startdatum!), now); } catch { return false; } }).length,
    [enrichedSchulungstermine],
  );
  const activeTeilnehmer = useMemo(() =>
    teilnehmerverwaltung.filter(t => !['abgesagt','nicht_erschienen'].includes(t.fields.status?.key ?? '')).length,
    [teilnehmerverwaltung],
  );

  // ── Early returns (AFTER all hooks) ───────────────────────────────────────
  if (loading) return <DashboardSkeleton />;
  if (error)   return <DashboardError error={error} onRetry={fetchAll} />;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openCreate = () => { setSessionToEdit(null); setSessionDialogOpen(true); };
  const openEdit   = (s: EnrichedSchulungstermine) => { setSessionToEdit(s); setSessionDialogOpen(true); };

  const handleSessionSubmit = async (fields: Schulungstermine['fields']) => {
    if (sessionToEdit) {
      await LivingAppsService.updateSchulungstermineEntry(sessionToEdit.record_id, fields);
    } else {
      await LivingAppsService.createSchulungstermineEntry(fields);
    }
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deleteSchulungstermineEntry(deleteTarget);
    if (selectedSession?.record_id === deleteTarget) setSelectedSession(null);
    setDeleteTarget(null);
    fetchAll();
  };

  const handleTeilnehmerSubmit = async (fields: Teilnehmerverwaltung['fields']) => {
    await LivingAppsService.createTeilnehmerverwaltungEntry(fields);
    fetchAll();
  };

  return (
    <div className="space-y-6">

      {/* Workflows */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <IconRocket size={18} className="text-primary" />
          <h2 className="text-base font-semibold text-foreground">Workflows</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {([
            {
              href: '#/intents/schulungsplanung',
              icon: <IconBook size={20} className="text-primary" />,
              title: 'Schulung planen',
              description: 'Aus dem Katalog einen neuen Schulungstermin mit Trainer & Raum anlegen',
            },
            {
              href: '#/intents/gruppen-anmeldung',
              icon: <IconUsers size={20} className="text-primary" />,
              title: 'Gruppen-Anmeldung',
              description: 'Mehrere Mitarbeiter auf einmal für einen Schulungstermin anmelden',
            },
            {
              href: '#/intents/schulungsabschluss',
              icon: <IconCheckbox size={20} className="text-primary" />,
              title: 'Schulungsabschluss',
              description: 'Anwesenheit erfassen, Zertifikate ausstellen, Bewertungen einsammeln',
            },
          ] as const).map(w => (
            <a
              key={w.href}
              href={w.href}
              className="bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-start gap-3 no-underline"
            >
              <div className="mt-0.5 shrink-0">{w.icon}</div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground text-sm truncate">{w.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{w.description}</p>
              </div>
              <IconChevronRight size={16} className="text-muted-foreground shrink-0 mt-1" />
            </a>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Bevorstehend" value={upcomingCount.toString()} description="Schulungstermine" icon={<IconCalendar size={18} className="text-muted-foreground" />} />
        <StatCard title="Diesen Monat" value={thisMonthCount.toString()} description="Schulungen" icon={<IconClock size={18} className="text-muted-foreground" />} />
        <StatCard title="Aktive Teilnehmer" value={activeTeilnehmer.toString()} description="Angemeldet" icon={<IconUsers size={18} className="text-muted-foreground" />} />
        <StatCard title="Zertifikate" value={zertifikate.length.toString()} description="Ausgestellt" icon={<IconAward size={18} className="text-muted-foreground" />} />
      </div>

      {/* Calendar + Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Calendar */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <IconChevronLeft size={16} />
              </Button>
              <span className="text-sm font-semibold text-foreground min-w-[150px] text-center">
                {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <IconChevronRight size={16} />
              </Button>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7 px-2" onClick={() => setCurrentMonth(new Date())}>
                Heute
              </Button>
            </div>
            <Button size="sm" onClick={openCreate}>
              <IconPlus size={14} className="shrink-0 mr-1" />
              <span className="hidden sm:inline">Neue Schulung</span>
              <span className="sm:hidden">Neu</span>
            </Button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border bg-muted/30">
            {DAY_NAMES.map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const key = format(day, 'yyyy-MM-dd');
              const daySessions = sessionsByDay.get(key) ?? [];
              const inMonth  = isSameMonth(day, currentMonth);
              const isSelDay = selectedDay ? isSameDay(day, selectedDay) : false;
              const isToday_ = isToday(day);
              return (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedDay(day);
                    setSelectedSession(daySessions.length === 1 ? daySessions[0] : null);
                  }}
                  className={[
                    'min-h-[80px] p-1.5 border-b border-r border-border cursor-pointer transition-colors select-none',
                    isSelDay ? 'bg-primary/5' : 'hover:bg-muted/40',
                    !inMonth ? 'opacity-40' : '',
                  ].join(' ')}
                >
                  <div className={[
                    'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1',
                    isToday_ ? 'bg-primary text-primary-foreground' : 'text-foreground',
                  ].join(' ')}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {daySessions.slice(0, 2).map(s => {
                      const sc = STATUS_COLORS[s.fields.status?.key ?? ''] ?? DEFAULT_SC;
                      return (
                        <div
                          key={s.record_id}
                          onClick={e => { e.stopPropagation(); setSelectedDay(day); setSelectedSession(s); }}
                          className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate border cursor-pointer ${sc.chip}`}
                          title={s.schulungName || 'Schulung'}
                        >
                          {s.schulungName || 'Schulung'}
                        </div>
                      );
                    })}
                    {daySessions.length > 2 && (
                      <div className="text-[10px] text-muted-foreground px-1">+{daySessions.length - 2} weitere</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          {selectedSession ? (
            <SessionDetailPanel
              session={selectedSession}
              participants={sessionParticipants}
              onEdit={() => openEdit(selectedSession)}
              onDelete={() => setDeleteTarget(selectedSession.record_id)}
              onAddParticipant={() => setTeilnehmerOpen(true)}
              onClose={() => setSelectedSession(null)}
            />
          ) : selectedDay && selectedDaySessions.length > 1 ? (
            <DaySessionsPanel day={selectedDay} sessions={selectedDaySessions} onSelect={setSelectedSession} />
          ) : (
            <UpcomingPanel sessions={enrichedSchulungstermine} onSelect={setSelectedSession} />
          )}

          {/* Legend */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Status</p>
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-2">
              {([
                { key: 'geplant', label: 'Geplant' },
                { key: 'bestaetigt', label: 'Bestätigt' },
                { key: 'durchgefuehrt', label: 'Durchgeführt' },
                { key: 'abgesagt', label: 'Abgesagt' },
              ] as const).map(({ key, label }) => {
                const sc = STATUS_COLORS[key];
                return (
                  <div key={key} className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${sc.dot}`} />
                    <span className="text-xs text-foreground">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <SchulungstermineDialog
        open={sessionDialogOpen}
        onClose={() => { setSessionDialogOpen(false); setSessionToEdit(null); }}
        onSubmit={handleSessionSubmit}
        defaultValues={sessionToEdit?.fields}
        schulungskatalogList={schulungskatalog}
        trainerList={trainer}
        raeumeList={raeume}
        enablePhotoScan={AI_PHOTO_SCAN['Schulungstermine']}
      />

      <TeilnehmerverwaltungDialog
        open={teilnehmerOpen}
        onClose={() => setTeilnehmerOpen(false)}
        onSubmit={handleTeilnehmerSubmit}
        defaultValues={selectedSession ? {
          schulungstermin: createRecordUrl(APP_IDS.SCHULUNGSTERMINE, selectedSession.record_id),
        } : undefined}
        schulungstermineList={schulungstermine}
        mitarbeiterList={mitarbeiter}
        enablePhotoScan={AI_PHOTO_SCAN['Teilnehmerverwaltung']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Schulungstermin löschen"
        description="Möchtest du diesen Schulungstermin wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SessionDetailPanel({
  session, participants, onEdit, onDelete, onAddParticipant, onClose,
}: {
  session: EnrichedSchulungstermine;
  participants: EnrichedTeilnehmerverwaltung[];
  onEdit: () => void;
  onDelete: () => void;
  onAddParticipant: () => void;
  onClose: () => void;
}) {
  const sc = STATUS_COLORS[session.fields.status?.key ?? ''] ?? DEFAULT_SC;
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${sc.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sc.dot}`} />
            {session.fields.status?.label ?? 'Geplant'}
          </span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors text-sm leading-none">✕</button>
        </div>
        <h3 className="font-semibold text-foreground truncate text-sm">{session.schulungName || 'Schulung'}</h3>
      </div>

      {/* Details */}
      <div className="p-4 space-y-2.5">
        <div className="flex items-start gap-2 text-muted-foreground">
          <IconClock size={14} className="shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs text-foreground">{session.fields.startdatum ? formatDate(session.fields.startdatum) : '–'}</p>
            {session.fields.enddatum && <p className="text-xs">bis {formatDate(session.fields.enddatum)}</p>}
          </div>
        </div>
        {session.trainerName && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <IconUser size={14} className="shrink-0" />
            <span className="text-xs text-foreground truncate">{session.trainerName}</span>
          </div>
        )}
        {session.raumName && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <IconMapPin size={14} className="shrink-0" />
            <span className="text-xs text-foreground truncate">{session.raumName}</span>
          </div>
        )}
        {session.fields.verfuegbare_plaetze !== undefined && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <IconUsers size={14} className="shrink-0" />
            <span className="text-xs text-foreground">{session.fields.verfuegbare_plaetze} verfügbare Plätze</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={onEdit} className="flex-1 min-w-0">
          <IconPencil size={13} className="shrink-0 mr-1" />Bearbeiten
        </Button>
        <Button size="sm" variant="outline" onClick={onDelete} className="text-destructive hover:text-destructive flex-1 min-w-0">
          <IconTrash size={13} className="shrink-0 mr-1" />Löschen
        </Button>
      </div>

      {/* Participants */}
      <div className="border-t border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-xs font-semibold text-foreground">Teilnehmer ({participants.length})</span>
          <Button size="sm" variant="ghost" onClick={onAddParticipant} className="h-7 text-xs px-2">
            <IconUserPlus size={13} className="shrink-0 mr-1" />Hinzufügen
          </Button>
        </div>
        {participants.length === 0 ? (
          <p className="text-xs text-muted-foreground px-4 pb-4">Keine Teilnehmer eingetragen.</p>
        ) : (
          <div className="max-h-48 overflow-y-auto divide-y divide-border">
            {participants.map(p => (
              <div key={p.record_id} className="px-4 py-2 flex items-center justify-between gap-2">
                <span className="text-xs text-foreground truncate min-w-0">{p.mitarbeiterName || '–'}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${TEILN_STATUS[p.fields.status?.key ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
                  {p.fields.status?.label ?? '–'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DaySessionsPanel({ day, sessions, onSelect }: {
  day: Date;
  sessions: EnrichedSchulungstermine[];
  onSelect: (s: EnrichedSchulungstermine) => void;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">
          {format(day, 'd.')} {MONTH_NAMES[day.getMonth()]} {day.getFullYear()}
        </h3>
        <p className="text-xs text-muted-foreground">{sessions.length} Schulungen</p>
      </div>
      <div className="divide-y divide-border">
        {sessions.map(s => {
          const sc = STATUS_COLORS[s.fields.status?.key ?? ''] ?? DEFAULT_SC;
          return (
            <button key={s.record_id} onClick={() => onSelect(s)} className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sc.dot}`} />
                <span className="text-xs text-muted-foreground">{s.fields.status?.label ?? 'Geplant'}</span>
              </div>
              <p className="text-sm font-medium text-foreground truncate">{s.schulungName || '–'}</p>
              {s.trainerName && <p className="text-xs text-muted-foreground truncate">{s.trainerName}</p>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function UpcomingPanel({ sessions, onSelect }: {
  sessions: EnrichedSchulungstermine[];
  onSelect: (s: EnrichedSchulungstermine) => void;
}) {
  const upcoming = useMemo(() => {
    const now = new Date();
    return sessions
      .filter(s => { try { return parseISO(s.fields.startdatum!) >= now; } catch { return false; } })
      .sort((a, b) => {
        try { return parseISO(a.fields.startdatum!).getTime() - parseISO(b.fields.startdatum!).getTime(); }
        catch { return 0; }
      })
      .slice(0, 6);
  }, [sessions]);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Nächste Schulungen</h3>
      </div>
      {upcoming.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <IconCalendar size={36} className="text-muted-foreground" stroke={1.5} />
          <p className="text-xs text-muted-foreground">Keine bevorstehenden Schulungen</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {upcoming.map(s => {
            const sc = STATUS_COLORS[s.fields.status?.key ?? ''] ?? DEFAULT_SC;
            return (
              <button key={s.record_id} onClick={() => onSelect(s)} className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors">
                <div className="flex items-start gap-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${sc.dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{s.schulungName || '–'}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {s.fields.startdatum ? formatDate(s.fields.startdatum) : '–'}
                      {s.trainerName ? ` · ${s.trainerName}` : ''}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Skeleton / Error ──────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="lg:col-span-2 h-96 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">{error.message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>Erneut versuchen</Button>
    </div>
  );
}
