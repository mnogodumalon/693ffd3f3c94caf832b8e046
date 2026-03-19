import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichSchulungstermine, enrichSchulungsanmeldung, enrichTeilnehmerverwaltung } from '@/lib/enrich';
import type { EnrichedSchulungstermine } from '@/types/enriched';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Plus, Pencil, Trash2, Calendar, Clock, MapPin, User, Users, BookOpen, Award, ChevronLeft, ChevronRight, Filter, CheckCircle2, Circle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState, useMemo, useCallback } from 'react';
import { SchulungstermineDialog } from '@/components/dialogs/SchulungstermineDialog';
import { SchulungsanmeldungDialog } from '@/components/dialogs/SchulungsanmeldungDialog';
import { TeilnehmerverwaltungDialog } from '@/components/dialogs/TeilnehmerverwaltungDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { StatCard } from '@/components/StatCard';
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

type ViewMode = 'week' | 'month' | 'list';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  geplant:       { label: 'Geplant',       color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',   dot: 'bg-blue-500' },
  bestaetigt:    { label: 'Bestätigt',     color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  durchgefuehrt: { label: 'Durchgeführt',  color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200',  dot: 'bg-purple-500' },
  abgesagt:      { label: 'Abgesagt',      color: 'text-red-700',    bg: 'bg-red-50 border-red-200',     dot: 'bg-red-400' },
};

function getStatusConfig(key?: string) {
  return STATUS_CONFIG[key ?? ''] ?? { label: key ?? '–', color: 'text-muted-foreground', bg: 'bg-muted border-border', dot: 'bg-muted-foreground' };
}

function getWeekDays(baseDate: Date): Date[] {
  const day = baseDate.getDay();
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function parseDate(s?: string): Date | null {
  if (!s) return null;
  try { return new Date(s); } catch { return null; }
}

function formatTime(s?: string): string {
  if (!s) return '';
  const d = parseDate(s);
  if (!d) return '';
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function getDayLabel(d: Date): string {
  return d.toLocaleDateString('de-DE', { weekday: 'short' });
}

function getMonthDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const days: Date[] = [];
  for (let i = -startOffset; i < 42 - startOffset; i++) {
    const d = new Date(year, month, 1 + i);
    days.push(d);
  }
  return days;
}

export default function DashboardOverview() {
  const {
    schulungstermine, schulungsanmeldung, teilnehmerverwaltung, schulungskatalog, mitarbeiter, trainer, raeume,
    schulungstermineMap, raeumeMap, trainerMap, teilnehmerverwaltungMap, schulungskatalogMap, mitarbeiterMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedSchulungstermine = enrichSchulungstermine(schulungstermine, { schulungskatalogMap, trainerMap, raeumeMap });
  const enrichedAnmeldung = enrichSchulungsanmeldung(schulungsanmeldung, { mitarbeiterMap, schulungstermineMap });
  const enrichedTeilnehmer = enrichTeilnehmerverwaltung(teilnehmerverwaltung, { schulungstermineMap, mitarbeiterMap });

  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTermin, setSelectedTermin] = useState<EnrichedSchulungstermine | null>(null);
  const [terminDialogOpen, setTerminDialogOpen] = useState(false);
  const [editTermin, setEditTermin] = useState<EnrichedSchulungstermine | null>(null);
  const [deleteTermin, setDeleteTermin] = useState<EnrichedSchulungstermine | null>(null);
  const [anmeldungDialogOpen, setAnmeldungDialogOpen] = useState(false);
  const [teilnehmerDialogOpen, setTeilnehmerDialogOpen] = useState(false);

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);
  const monthDays = useMemo(() => getMonthDays(currentDate.getFullYear(), currentDate.getMonth()), [currentDate]);

  const navigate = useCallback((dir: 1 | -1) => {
    const d = new Date(currentDate);
    if (viewMode === 'week') d.setDate(d.getDate() + dir * 7);
    else if (viewMode === 'month') d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + dir * 7);
    setCurrentDate(d);
  }, [currentDate, viewMode]);

  const filteredTermine = useMemo(() => {
    if (statusFilter === 'all') return enrichedSchulungstermine;
    return enrichedSchulungstermine.filter(t => t.fields.status?.key === statusFilter);
  }, [enrichedSchulungstermine, statusFilter]);

  const today = new Date();

  // Stats
  const upcoming = enrichedSchulungstermine.filter(t => {
    const d = parseDate(t.fields.startdatum);
    return d && d >= today && t.fields.status?.key !== 'abgesagt';
  }).length;
  const thisMonth = enrichedSchulungstermine.filter(t => {
    const d = parseDate(t.fields.startdatum);
    return d && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  }).length;
  const totalAnmeldungen = schulungsanmeldung.length;
  const totalTeilnehmer = teilnehmerverwaltung.filter(t => t.fields.anwesenheit === true).length;

  // Chart: sessions per month (last 6 months)
  const chartData = useMemo(() => {
    const months: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const label = d.toLocaleDateString('de-DE', { month: 'short' });
      const count = enrichedSchulungstermine.filter(t => {
        const sd = parseDate(t.fields.startdatum);
        return sd && sd.getMonth() === d.getMonth() && sd.getFullYear() === d.getFullYear();
      }).length;
      months.push({ month: label, count });
    }
    return months;
  }, [enrichedSchulungstermine]);

  // Termine per day for calendar
  const termineByDay = useCallback((day: Date) => {
    return filteredTermine.filter(t => {
      const d = parseDate(t.fields.startdatum);
      return d && isSameDay(d, day);
    }).sort((a, b) => (a.fields.startdatum ?? '').localeCompare(b.fields.startdatum ?? ''));
  }, [filteredTermine]);

  // Selected termin's Anmeldungen & Teilnehmer
  const terminAnmeldungen = useMemo(() => {
    if (!selectedTermin) return [];
    return enrichedAnmeldung.filter(a => {
      const id = a.fields.schulungstermin;
      return id && id.includes(selectedTermin.record_id);
    });
  }, [selectedTermin, enrichedAnmeldung]);

  const terminTeilnehmer = useMemo(() => {
    if (!selectedTermin) return [];
    return enrichedTeilnehmer.filter(t => {
      const id = t.fields.schulungstermin;
      return id && id.includes(selectedTermin.record_id);
    });
  }, [selectedTermin, enrichedTeilnehmer]);

  const handleDeleteTermin = async () => {
    if (!deleteTermin) return;
    await LivingAppsService.deleteSchulungstermineEntry(deleteTermin.record_id);
    if (selectedTermin?.record_id === deleteTermin.record_id) setSelectedTermin(null);
    setDeleteTermin(null);
    fetchAll();
  };

  const periodLabel = useMemo(() => {
    if (viewMode === 'week') {
      const start = weekDays[0];
      const end = weekDays[6];
      if (start.getMonth() === end.getMonth()) {
        return `${start.getDate()}. – ${end.getDate()}. ${start.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}`;
      }
      return `${start.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  }, [viewMode, weekDays, currentDate]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Bevorstehende Termine"
          value={String(upcoming)}
          description="Nicht abgesagt"
          icon={<Calendar size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Diesen Monat"
          value={String(thisMonth)}
          description="Schulungen geplant"
          icon={<Clock size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Anmeldungen"
          value={String(totalAnmeldungen)}
          description="Gesamt registriert"
          icon={<Users size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Teilgenommen"
          value={String(totalTeilnehmer)}
          description="Anwesenheit bestätigt"
          icon={<Award size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Main workspace: Calendar + Detail Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Calendar area */}
        <div className="xl:col-span-2 rounded-2xl border border-border bg-card overflow-hidden">
          {/* Calendar header */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2 min-w-0">
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate(-1)}>
                <ChevronLeft size={16} />
              </Button>
              <span className="font-semibold text-foreground text-sm truncate min-w-0">{periodLabel}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate(1)}>
                <ChevronRight size={16} />
              </Button>
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => setCurrentDate(new Date())}>
                Heute
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* View toggle */}
              <div className="flex rounded-lg border border-border overflow-hidden">
                {(['week', 'month', 'list'] as ViewMode[]).map(v => (
                  <button
                    key={v}
                    onClick={() => setViewMode(v)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      viewMode === v
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-transparent text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {v === 'week' ? 'Woche' : v === 'month' ? 'Monat' : 'Liste'}
                  </button>
                ))}
              </div>
              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="h-8 px-2 text-xs rounded-lg border border-border bg-background text-foreground"
              >
                <option value="all">Alle Status</option>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => { setEditTermin(null); setTerminDialogOpen(true); }}>
                <Plus size={14} className="shrink-0" />
                <span className="hidden sm:inline">Termin</span>
              </Button>
            </div>
          </div>

          {/* Week View */}
          {viewMode === 'week' && (
            <div className="overflow-x-auto">
              <div className="min-w-[520px]">
                {/* Day headers */}
                <div className="grid grid-cols-7 border-b border-border">
                  {weekDays.map((day, i) => {
                    const isToday = isSameDay(day, today);
                    return (
                      <div key={i} className="py-3 text-center border-r border-border last:border-r-0">
                        <div className={`text-xs font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                          {getDayLabel(day)}
                        </div>
                        <div className={`mt-1 mx-auto w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold ${
                          isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
                        }`}>
                          {day.getDate()}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Events grid */}
                <div className="grid grid-cols-7 min-h-[320px]">
                  {weekDays.map((day, i) => {
                    const dayTermine = termineByDay(day);
                    const isToday = isSameDay(day, today);
                    return (
                      <div
                        key={i}
                        className={`border-r border-border last:border-r-0 p-1.5 space-y-1 min-h-[320px] ${
                          isToday ? 'bg-primary/3' : ''
                        }`}
                      >
                        {dayTermine.map(t => {
                          const sc = getStatusConfig(t.fields.status?.key);
                          const isSelected = selectedTermin?.record_id === t.record_id;
                          return (
                            <button
                              key={t.record_id}
                              onClick={() => setSelectedTermin(isSelected ? null : t)}
                              className={`w-full text-left rounded-lg border px-2 py-1.5 transition-all text-xs ${sc.bg} ${
                                isSelected ? 'ring-2 ring-primary ring-offset-1' : 'hover:opacity-90'
                              }`}
                            >
                              <div className={`font-semibold truncate ${sc.color}`}>
                                {t.schulungName || '(ohne Titel)'}
                              </div>
                              {t.fields.startdatum && (
                                <div className="text-muted-foreground mt-0.5">{formatTime(t.fields.startdatum)}</div>
                              )}
                              {t.trainerName && (
                                <div className={`truncate mt-0.5 ${sc.color} opacity-80`}>{t.trainerName}</div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Month View */}
          {viewMode === 'month' && (
            <div className="overflow-x-auto">
              <div className="min-w-[400px]">
                {/* Weekday headers */}
                <div className="grid grid-cols-7 border-b border-border">
                  {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => (
                    <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground border-r border-border last:border-r-0">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {monthDays.map((day, i) => {
                    const dayTermine = termineByDay(day);
                    const isToday = isSameDay(day, today);
                    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                    return (
                      <div
                        key={i}
                        className={`border-r border-b border-border last:border-r-0 min-h-[80px] p-1 ${
                          !isCurrentMonth ? 'opacity-40' : ''
                        } ${isToday ? 'bg-primary/3' : ''}`}
                      >
                        <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                          isToday ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                        }`}>
                          {day.getDate()}
                        </div>
                        {dayTermine.slice(0, 2).map(t => {
                          const sc = getStatusConfig(t.fields.status?.key);
                          return (
                            <button
                              key={t.record_id}
                              onClick={() => setSelectedTermin(t)}
                              className={`w-full text-left rounded px-1 py-0.5 mb-0.5 text-xs truncate ${sc.bg} ${sc.color} border hover:opacity-90`}
                            >
                              {t.schulungName || '(Termin)'}
                            </button>
                          );
                        })}
                        {dayTermine.length > 2 && (
                          <div className="text-xs text-muted-foreground px-1">+{dayTermine.length - 2}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <div className="divide-y divide-border">
              {filteredTermine.length === 0 && (
                <div className="py-16 text-center">
                  <Calendar size={40} className="mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">Keine Schulungstermine vorhanden</p>
                </div>
              )}
              {filteredTermine
                .sort((a, b) => (a.fields.startdatum ?? '').localeCompare(b.fields.startdatum ?? ''))
                .map(t => {
                  const sc = getStatusConfig(t.fields.status?.key);
                  const isSelected = selectedTermin?.record_id === t.record_id;
                  const d = parseDate(t.fields.startdatum);
                  return (
                    <button
                      key={t.record_id}
                      onClick={() => setSelectedTermin(isSelected ? null : t)}
                      className={`w-full text-left flex items-start gap-3 px-5 py-3 transition-colors hover:bg-accent/40 ${
                        isSelected ? 'bg-accent' : ''
                      }`}
                    >
                      {/* Date bubble */}
                      <div className="shrink-0 w-10 text-center mt-0.5">
                        {d ? (
                          <>
                            <div className="text-xs font-medium text-muted-foreground">{d.toLocaleDateString('de-DE', { month: 'short' })}</div>
                            <div className="text-lg font-bold text-foreground leading-tight">{d.getDate()}</div>
                          </>
                        ) : (
                          <div className="text-xs text-muted-foreground">–</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <span className="font-semibold text-sm text-foreground truncate">{t.schulungName || '(ohne Titel)'}</span>
                          <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${sc.bg} ${sc.color}`}>{sc.label}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {t.fields.startdatum && <span><Clock size={11} className="inline mr-1" />{formatTime(t.fields.startdatum)}{t.fields.enddatum ? ` – ${formatTime(t.fields.enddatum)}` : ''}</span>}
                          {t.trainerName && <span><User size={11} className="inline mr-1" />{t.trainerName}</span>}
                          {t.raumName && <span><MapPin size={11} className="inline mr-1" />{t.raumName}</span>}
                          {t.fields.verfuegbare_plaetze != null && <span><Users size={11} className="inline mr-1" />{t.fields.verfuegbare_plaetze} Pl.</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          )}
        </div>

        {/* Detail / Side Panel */}
        <div className="flex flex-col gap-4">
          {selectedTermin ? (
            <TerminDetailPanel
              termin={selectedTermin}
              anmeldungen={terminAnmeldungen}
              teilnehmer={terminTeilnehmer}
              onEdit={() => { setEditTermin(selectedTermin); setTerminDialogOpen(true); }}
              onDelete={() => setDeleteTermin(selectedTermin)}
              onAddAnmeldung={() => setAnmeldungDialogOpen(true)}
              onAddTeilnehmer={() => setTeilnehmerDialogOpen(true)}
            />
          ) : (
            <div className="rounded-2xl border border-border bg-card flex flex-col items-center justify-center py-14 px-6 text-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                <Calendar size={22} className="text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Termin auswählen</p>
                <p className="text-xs text-muted-foreground mt-1">Klicken Sie auf einen Schulungstermin, um Details zu sehen</p>
              </div>
              <Button size="sm" variant="outline" className="mt-1 gap-1.5" onClick={() => { setEditTermin(null); setTerminDialogOpen(true); }}>
                <Plus size={14} />Neuer Termin
              </Button>
            </div>
          )}

          {/* Activity chart */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Schulungen pro Monat</h3>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  cursor={{ fill: 'var(--accent)' }}
                />
                <Bar dataKey="count" name="Schulungen" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, idx) => (
                    <Cell key={idx} fill="var(--primary)" opacity={idx === chartData.length - 1 ? 1 : 0.6} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Status summary */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Status-Übersicht</h3>
            <div className="space-y-2">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                const count = enrichedSchulungstermine.filter(t => t.fields.status?.key === key).length;
                const total = enrichedSchulungstermine.length;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={key} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                    <span className="text-xs text-muted-foreground flex-1 min-w-0 truncate">{cfg.label}</span>
                    <span className="text-xs font-semibold text-foreground shrink-0">{count}</span>
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden shrink-0">
                      <div className={`h-full rounded-full ${cfg.dot}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <SchulungstermineDialog
        open={terminDialogOpen}
        onClose={() => { setTerminDialogOpen(false); setEditTermin(null); }}
        onSubmit={async (fields) => {
          if (editTermin) {
            await LivingAppsService.updateSchulungstermineEntry(editTermin.record_id, fields);
          } else {
            await LivingAppsService.createSchulungstermineEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editTermin?.fields}
        schulungskatalogList={schulungskatalog}
        trainerList={trainer}
        raeumeList={raeume}
        enablePhotoScan={AI_PHOTO_SCAN['Schulungstermine']}
      />

      <SchulungsanmeldungDialog
        open={anmeldungDialogOpen}
        onClose={() => setAnmeldungDialogOpen(false)}
        onSubmit={async (fields) => {
          const terminUrl = selectedTermin ? createRecordUrl(APP_IDS.SCHULUNGSTERMINE, selectedTermin.record_id) : undefined;
          await LivingAppsService.createSchulungsanmeldungEntry({ ...fields, schulungstermin: terminUrl });
          fetchAll();
        }}
        defaultValues={selectedTermin ? { schulungstermin: createRecordUrl(APP_IDS.SCHULUNGSTERMINE, selectedTermin.record_id) } : undefined}
        mitarbeiterList={mitarbeiter}
        schulungstermineList={schulungstermine}
        enablePhotoScan={AI_PHOTO_SCAN['Schulungsanmeldung']}
      />

      <TeilnehmerverwaltungDialog
        open={teilnehmerDialogOpen}
        onClose={() => setTeilnehmerDialogOpen(false)}
        onSubmit={async (fields) => {
          const terminUrl = selectedTermin ? createRecordUrl(APP_IDS.SCHULUNGSTERMINE, selectedTermin.record_id) : undefined;
          await LivingAppsService.createTeilnehmerverwaltungEntry({ ...fields, schulungstermin: terminUrl });
          fetchAll();
        }}
        defaultValues={selectedTermin ? { schulungstermin: createRecordUrl(APP_IDS.SCHULUNGSTERMINE, selectedTermin.record_id) } : undefined}
        schulungstermineList={schulungstermine}
        mitarbeiterList={mitarbeiter}
        enablePhotoScan={AI_PHOTO_SCAN['Teilnehmerverwaltung']}
      />

      <ConfirmDialog
        open={!!deleteTermin}
        title="Schulungstermin löschen"
        description={`Termin "${deleteTermin?.schulungName ?? ''}" wirklich löschen? Alle Anmeldungen und Teilnehmereinträge bleiben erhalten.`}
        onConfirm={handleDeleteTermin}
        onClose={() => setDeleteTermin(null)}
      />
    </div>
  );
}

interface TerminDetailPanelProps {
  termin: EnrichedSchulungstermine;
  anmeldungen: ReturnType<typeof enrichSchulungsanmeldung>;
  teilnehmer: ReturnType<typeof enrichTeilnehmerverwaltung>;
  onEdit: () => void;
  onDelete: () => void;
  onAddAnmeldung: () => void;
  onAddTeilnehmer: () => void;
}

function TerminDetailPanel({ termin, anmeldungen, teilnehmer, onEdit, onDelete, onAddAnmeldung, onAddTeilnehmer }: TerminDetailPanelProps) {
  const sc = getStatusConfig(termin.fields.status?.key);
  const [tab, setTab] = useState<'info' | 'anmeldungen' | 'teilnehmer'>('info');

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className={`px-5 py-4 border-b border-border ${sc.bg}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-foreground text-base leading-tight truncate">{termin.schulungName || '(ohne Titel)'}</h3>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className={`text-xs px-2 py-0.5 rounded-full border ${sc.bg} ${sc.color} font-medium`}>{sc.label}</span>
              {termin.fields.verfuegbare_plaetze != null && (
                <span className="text-xs text-muted-foreground">
                  <Users size={11} className="inline mr-1" />{termin.fields.verfuegbare_plaetze} Plätze
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
              <Pencil size={14} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDelete}>
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(['info', 'anmeldungen', 'teilnehmer'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
              tab === t ? 'text-primary border-b-2 border-primary -mb-px' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'info' ? 'Info' : t === 'anmeldungen' ? `Anmeldungen (${anmeldungen.length})` : `Teilnehmer (${teilnehmer.length})`}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4">
        {tab === 'info' && (
          <div className="space-y-3 text-sm">
            {termin.fields.startdatum && (
              <div className="flex items-start gap-2">
                <Calendar size={14} className="mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <div className="font-medium text-foreground">{formatDate(termin.fields.startdatum)}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatTime(termin.fields.startdatum)}{termin.fields.enddatum ? ` – ${formatTime(termin.fields.enddatum)}` : ''}
                  </div>
                </div>
              </div>
            )}
            {termin.trainerName && (
              <div className="flex items-center gap-2">
                <User size={14} className="text-muted-foreground shrink-0" />
                <span className="text-foreground">{termin.trainerName}</span>
              </div>
            )}
            {termin.raumName && (
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-muted-foreground shrink-0" />
                <span className="text-foreground">{termin.raumName}</span>
              </div>
            )}
            {termin.fields.bemerkungen && (
              <div className="mt-2 p-3 bg-muted/40 rounded-lg">
                <p className="text-xs text-muted-foreground leading-relaxed">{termin.fields.bemerkungen}</p>
              </div>
            )}
          </div>
        )}

        {tab === 'anmeldungen' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">{anmeldungen.length} Anmeldung(en)</span>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={onAddAnmeldung}>
                <Plus size={12} />Hinzufügen
              </Button>
            </div>
            {anmeldungen.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                <Users size={24} className="mx-auto mb-2 text-muted-foreground/50" />
                Noch keine Anmeldungen
              </div>
            ) : (
              <div className="space-y-2">
                {anmeldungen.map(a => (
                  <div key={a.record_id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-xs">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User size={12} className="text-primary" />
                    </div>
                    <span className="flex-1 min-w-0 truncate font-medium text-foreground">{a.mitarbeiterName || '–'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'teilnehmer' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">{teilnehmer.length} Teilnehmer</span>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={onAddTeilnehmer}>
                <Plus size={12} />Hinzufügen
              </Button>
            </div>
            {teilnehmer.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                <Users size={24} className="mx-auto mb-2 text-muted-foreground/50" />
                Noch keine Teilnehmer
              </div>
            ) : (
              <div className="space-y-2">
                {teilnehmer.map(t => {
                  const statusColors: Record<string, string> = {
                    teilgenommen: 'text-emerald-600', angemeldet: 'text-blue-600',
                    warteliste: 'text-amber-600', abgesagt: 'text-red-500', nicht_erschienen: 'text-slate-400'
                  };
                  return (
                    <div key={t.record_id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-xs">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {t.fields.anwesenheit ? (
                          <CheckCircle2 size={12} className="text-emerald-600" />
                        ) : (
                          <Circle size={12} className="text-muted-foreground" />
                        )}
                      </div>
                      <span className="flex-1 min-w-0 truncate font-medium text-foreground">{t.mitarbeiterName || '–'}</span>
                      {t.fields.status && (
                        <span className={`shrink-0 ${statusColors[t.fields.status.key] ?? 'text-muted-foreground'}`}>
                          {t.fields.status.label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Skeleton className="xl:col-span-2 h-96 rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <AlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">{error.message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>Erneut versuchen</Button>
    </div>
  );
}
