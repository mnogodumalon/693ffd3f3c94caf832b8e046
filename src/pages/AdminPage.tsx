import { useState, useMemo, useCallback } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { Schulungstermine, Zertifikate, Schulungsanmeldung, Raeume, Trainer, Bewertungen, Teilnehmerverwaltung, Schulungskatalog, Mitarbeiter } from '@/types/app';
import { LivingAppsService, extractRecordId, cleanFieldsForApi } from '@/services/livingAppsService';
import { SchulungstermineDialog } from '@/components/dialogs/SchulungstermineDialog';
import { SchulungstermineViewDialog } from '@/components/dialogs/SchulungstermineViewDialog';
import { ZertifikateDialog } from '@/components/dialogs/ZertifikateDialog';
import { ZertifikateViewDialog } from '@/components/dialogs/ZertifikateViewDialog';
import { SchulungsanmeldungDialog } from '@/components/dialogs/SchulungsanmeldungDialog';
import { SchulungsanmeldungViewDialog } from '@/components/dialogs/SchulungsanmeldungViewDialog';
import { RaeumeDialog } from '@/components/dialogs/RaeumeDialog';
import { RaeumeViewDialog } from '@/components/dialogs/RaeumeViewDialog';
import { TrainerDialog } from '@/components/dialogs/TrainerDialog';
import { TrainerViewDialog } from '@/components/dialogs/TrainerViewDialog';
import { BewertungenDialog } from '@/components/dialogs/BewertungenDialog';
import { BewertungenViewDialog } from '@/components/dialogs/BewertungenViewDialog';
import { TeilnehmerverwaltungDialog } from '@/components/dialogs/TeilnehmerverwaltungDialog';
import { TeilnehmerverwaltungViewDialog } from '@/components/dialogs/TeilnehmerverwaltungViewDialog';
import { SchulungskatalogDialog } from '@/components/dialogs/SchulungskatalogDialog';
import { SchulungskatalogViewDialog } from '@/components/dialogs/SchulungskatalogViewDialog';
import { MitarbeiterDialog } from '@/components/dialogs/MitarbeiterDialog';
import { MitarbeiterViewDialog } from '@/components/dialogs/MitarbeiterViewDialog';
import { BulkEditDialog } from '@/components/dialogs/BulkEditDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageShell } from '@/components/PageShell';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, Trash2, Plus, Filter, X, ArrowUpDown, ArrowUp, ArrowDown, Search, Copy, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function fmtDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

// Field metadata per entity for bulk edit and column filters
const SCHULUNGSTERMINE_FIELDS = [
  { key: 'schulung', label: 'Schulung', type: 'applookup/select', targetEntity: 'schulungskatalog', targetAppId: 'SCHULUNGSKATALOG', displayField: 'titel' },
  { key: 'startdatum', label: 'Startdatum und -uhrzeit', type: 'date/datetimeminute' },
  { key: 'enddatum', label: 'Enddatum und -uhrzeit', type: 'date/datetimeminute' },
  { key: 'trainer', label: 'Trainer', type: 'applookup/select', targetEntity: 'trainer', targetAppId: 'TRAINER', displayField: 'vorname' },
  { key: 'raum', label: 'Raum', type: 'applookup/select', targetEntity: 'raeume', targetAppId: 'RAEUME', displayField: 'raumname' },
  { key: 'status', label: 'Status', type: 'lookup/select', options: [{ key: 'geplant', label: 'Geplant' }, { key: 'bestaetigt', label: 'Bestätigt' }, { key: 'durchgefuehrt', label: 'Durchgeführt' }, { key: 'abgesagt', label: 'Abgesagt' }] },
  { key: 'verfuegbare_plaetze', label: 'Verfügbare Plätze', type: 'number' },
  { key: 'bemerkungen', label: 'Bemerkungen', type: 'string/textarea' },
];
const ZERTIFIKATE_FIELDS = [
  { key: 'teilnahme', label: 'Teilnahme', type: 'applookup/select', targetEntity: 'teilnehmerverwaltung', targetAppId: 'TEILNEHMERVERWALTUNG', displayField: 'bemerkungen' },
  { key: 'empfaenger', label: 'Empfänger', type: 'applookup/select', targetEntity: 'mitarbeiter', targetAppId: 'MITARBEITER', displayField: 'nachname' },
  { key: 'schulung', label: 'Schulung', type: 'applookup/select', targetEntity: 'schulungskatalog', targetAppId: 'SCHULUNGSKATALOG', displayField: 'titel' },
  { key: 'zertifikatstyp', label: 'Zertifikatstyp', type: 'lookup/select', options: [{ key: 'teilnahmebestaetigung', label: 'Teilnahmebestätigung' }, { key: 'abschlusszertifikat', label: 'Abschlusszertifikat' }] },
  { key: 'zertifikatsnummer', label: 'Zertifikatsnummer', type: 'string/text' },
  { key: 'beschreibung', label: 'Beschreibung der Leistung/Kurs', type: 'string/textarea' },
  { key: 'aussteller', label: 'Name des Ausstellers', type: 'string/text' },
  { key: 'aussteller_position', label: 'Position des Ausstellers', type: 'string/text' },
  { key: 'unterschrift', label: 'Unterschrift (Dateiname/Bild)', type: 'string/text' },
  { key: 'siegel', label: 'Siegel (Dateiname/Bild)', type: 'string/text' },
  { key: 'logo', label: 'Logo (Dateiname/Bild)', type: 'string/text' },
  { key: 'vorlage', label: 'Zertifikatsvorlage', type: 'lookup/select', options: [{ key: 'klassisch', label: 'Klassisch' }, { key: 'modern', label: 'Modern' }, { key: 'individuell', label: 'Individuell' }] },
  { key: 'hintergrundfarbe', label: 'Hintergrundfarbe', type: 'lookup/select', options: [{ key: 'weiss', label: 'Weiß' }, { key: 'blau', label: 'Blau' }, { key: 'gruen', label: 'Grün' }, { key: 'gelb', label: 'Gelb' }, { key: 'individuell', label: 'Individuell' }] },
  { key: 'schriftart', label: 'Schriftart & -größe', type: 'string/text' },
  { key: 'layoutwuensche', label: 'Layoutwünsche', type: 'string/textarea' },
  { key: 'qr_code_url', label: 'QR-Code für digitale Überprüfung', type: 'string/text' },
  { key: 'digitale_signatur', label: 'Digitale Signatur integriert', type: 'bool' },
  { key: 'social_media', label: 'Social-Media-Elemente', type: 'string/text' },
  { key: 'status', label: 'Status', type: 'lookup/select', options: [{ key: 'aktiv', label: 'Aktiv' }, { key: 'inaktiv', label: 'Inaktiv' }, { key: 'widerrufen', label: 'Widerrufen' }] },
  { key: 'ausstellungsdatum', label: 'Ausstellungsdatum', type: 'date/date' },
];
const SCHULUNGSANMELDUNG_FIELDS = [
  { key: 'mitarbeiter', label: 'Ihr Name', type: 'applookup/select', targetEntity: 'mitarbeiter', targetAppId: 'MITARBEITER', displayField: 'nachname' },
  { key: 'schulungstermin', label: 'Gewünschter Schulungstermin', type: 'applookup/select', targetEntity: 'schulungstermine', targetAppId: 'SCHULUNGSTERMINE', displayField: 'bemerkungen' },
  { key: 'bemerkungen', label: 'Bemerkungen', type: 'string/textarea' },
];
const RAEUME_FIELDS = [
  { key: 'raumname', label: 'Raumname', type: 'string/text' },
  { key: 'standort', label: 'Standort', type: 'string/text' },
  { key: 'kapazitaet', label: 'Kapazität (Anzahl Personen)', type: 'number' },
  { key: 'ausstattung', label: 'Verfügbare Ausstattung', type: 'multiplelookup/checkbox', options: [{ key: 'beamer', label: 'Beamer' }, { key: 'whiteboard', label: 'Whiteboard' }, { key: 'flipchart', label: 'Flipchart' }, { key: 'computer', label: 'Computer' }, { key: 'wlan', label: 'WLAN' }, { key: 'videokonferenz', label: 'Videokonferenz' }, { key: 'klimaanlage', label: 'Klimaanlage' }, { key: 'barrierefrei', label: 'Barrierefreier Zugang' }] },
  { key: 'bemerkungen', label: 'Bemerkungen', type: 'string/textarea' },
];
const TRAINER_FIELDS = [
  { key: 'vorname', label: 'Vorname', type: 'string/text' },
  { key: 'nachname', label: 'Nachname', type: 'string/text' },
  { key: 'typ', label: 'Trainer-Typ', type: 'lookup/select', options: [{ key: 'extern', label: 'Extern' }, { key: 'intern', label: 'Intern' }] },
  { key: 'email', label: 'E-Mail', type: 'string/email' },
  { key: 'telefon', label: 'Telefon', type: 'string/tel' },
  { key: 'expertise', label: 'Expertise-Bereiche', type: 'multiplelookup/checkbox', options: [{ key: 'it_software', label: 'IT & Software' }, { key: 'fuehrung_management', label: 'Führung & Management' }, { key: 'kommunikation', label: 'Kommunikation' }, { key: 'projektmanagement', label: 'Projektmanagement' }, { key: 'vertrieb_marketing', label: 'Vertrieb & Marketing' }, { key: 'compliance_recht', label: 'Compliance & Recht' }, { key: 'gesundheit_sicherheit', label: 'Gesundheit & Sicherheit' }, { key: 'persoenliche_entwicklung', label: 'Persönliche Entwicklung' }] },
  { key: 'qualifikationen', label: 'Qualifikationen & Zertifikate', type: 'string/textarea' },
];
const BEWERTUNGEN_FIELDS = [
  { key: 'teilnahme', label: 'Teilnahme', type: 'applookup/select', targetEntity: 'teilnehmerverwaltung', targetAppId: 'TEILNEHMERVERWALTUNG', displayField: 'bemerkungen' },
  { key: 'gesamtbewertung', label: 'Gesamtbewertung', type: 'lookup/radio', options: [{ key: 'rating_1', label: '1 - Sehr schlecht' }, { key: 'rating_2', label: '2 - Schlecht' }, { key: 'rating_3', label: '3 - Befriedigend' }, { key: 'rating_4', label: '4 - Gut' }, { key: 'rating_5', label: '5 - Sehr gut' }] },
  { key: 'inhaltsbewertung', label: 'Bewertung Inhalt', type: 'lookup/radio', options: [{ key: 'rating_1', label: '1 - Sehr schlecht' }, { key: 'rating_2', label: '2 - Schlecht' }, { key: 'rating_3', label: '3 - Befriedigend' }, { key: 'rating_4', label: '4 - Gut' }, { key: 'rating_5', label: '5 - Sehr gut' }] },
  { key: 'organisationsbewertung', label: 'Bewertung Organisation', type: 'lookup/radio', options: [{ key: 'rating_1', label: '1 - Sehr schlecht' }, { key: 'rating_2', label: '2 - Schlecht' }, { key: 'rating_3', label: '3 - Befriedigend' }, { key: 'rating_4', label: '4 - Gut' }, { key: 'rating_5', label: '5 - Sehr gut' }] },
  { key: 'kommentar', label: 'Kommentar', type: 'string/textarea' },
  { key: 'verbesserungsvorschlaege', label: 'Verbesserungsvorschläge', type: 'string/textarea' },
  { key: 'trainerbewertung', label: 'Bewertung Trainer', type: 'lookup/radio', options: [{ key: 'rating_1', label: '1 - Sehr schlecht' }, { key: 'rating_2', label: '2 - Schlecht' }, { key: 'rating_3', label: '3 - Befriedigend' }, { key: 'rating_4', label: '4 - Gut' }, { key: 'rating_5', label: '5 - Sehr gut' }] },
];
const TEILNEHMERVERWALTUNG_FIELDS = [
  { key: 'schulungstermin', label: 'Schulungstermin', type: 'applookup/select', targetEntity: 'schulungstermine', targetAppId: 'SCHULUNGSTERMINE', displayField: 'bemerkungen' },
  { key: 'anmeldedatum', label: 'Anmeldedatum', type: 'date/date' },
  { key: 'status', label: 'Status', type: 'lookup/select', options: [{ key: 'angemeldet', label: 'Angemeldet' }, { key: 'warteliste', label: 'Warteliste' }, { key: 'teilgenommen', label: 'Teilgenommen' }, { key: 'abgesagt', label: 'Abgesagt' }, { key: 'nicht_erschienen', label: 'Nicht erschienen' }] },
  { key: 'anwesenheit', label: 'Anwesenheit bestätigt', type: 'bool' },
  { key: 'bemerkungen', label: 'Bemerkungen', type: 'string/textarea' },
  { key: 'mitarbeiter', label: 'Mitarbeiter', type: 'applookup/select', targetEntity: 'mitarbeiter', targetAppId: 'MITARBEITER', displayField: 'nachname' },
  { key: 'zertifikat_ausgestellt', label: 'Zertifikat ausgestellt', type: 'bool' },
];
const SCHULUNGSKATALOG_FIELDS = [
  { key: 'kategorie', label: 'Kategorie', type: 'lookup/select', options: [{ key: 'it_software', label: 'IT & Software' }, { key: 'fuehrung_management', label: 'Führung & Management' }, { key: 'kommunikation', label: 'Kommunikation' }, { key: 'projektmanagement', label: 'Projektmanagement' }, { key: 'vertrieb_marketing', label: 'Vertrieb & Marketing' }, { key: 'compliance_recht', label: 'Compliance & Recht' }, { key: 'gesundheit_sicherheit', label: 'Gesundheit & Sicherheit' }, { key: 'persoenliche_entwicklung', label: 'Persönliche Entwicklung' }] },
  { key: 'dauer_tage', label: 'Dauer (in Tagen)', type: 'number' },
  { key: 'max_teilnehmer', label: 'Maximale Teilnehmerzahl', type: 'number' },
  { key: 'zielgruppe', label: 'Zielgruppe', type: 'string/text' },
  { key: 'lernziele', label: 'Lernziele', type: 'string/textarea' },
  { key: 'voraussetzungen', label: 'Voraussetzungen', type: 'string/textarea' },
  { key: 'titel', label: 'Schulungstitel', type: 'string/text' },
  { key: 'beschreibung', label: 'Beschreibung', type: 'string/textarea' },
  { key: 'elearning_dateien', label: 'E-Learning-Dateien (z.B. PDF, Video, SCORM)', type: 'file' },
];
const MITARBEITER_FIELDS = [
  { key: 'nachname', label: 'Nachname', type: 'string/text' },
  { key: 'personalnummer', label: 'Personalnummer', type: 'string/text' },
  { key: 'telefon', label: 'Telefon', type: 'string/tel' },
  { key: 'abteilung', label: 'Abteilung', type: 'string/text' },
  { key: 'vorname', label: 'Vorname', type: 'string/text' },
  { key: 'email', label: 'E-Mail', type: 'string/email' },
  { key: 'position', label: 'Position', type: 'string/text' },
];

const ENTITY_TABS = [
  { key: 'schulungstermine', label: 'Schulungstermine', pascal: 'Schulungstermine' },
  { key: 'zertifikate', label: 'Zertifikate', pascal: 'Zertifikate' },
  { key: 'schulungsanmeldung', label: 'Schulungsanmeldung', pascal: 'Schulungsanmeldung' },
  { key: 'raeume', label: 'Räume', pascal: 'Raeume' },
  { key: 'trainer', label: 'Trainer', pascal: 'Trainer' },
  { key: 'bewertungen', label: 'Bewertungen', pascal: 'Bewertungen' },
  { key: 'teilnehmerverwaltung', label: 'Teilnehmerverwaltung', pascal: 'Teilnehmerverwaltung' },
  { key: 'schulungskatalog', label: 'Schulungskatalog', pascal: 'Schulungskatalog' },
  { key: 'mitarbeiter', label: 'Mitarbeiter', pascal: 'Mitarbeiter' },
] as const;

type EntityKey = typeof ENTITY_TABS[number]['key'];

export default function AdminPage() {
  const data = useDashboardData();
  const { loading, error, fetchAll } = data;

  const [activeTab, setActiveTab] = useState<EntityKey>('schulungstermine');
  const [selectedIds, setSelectedIds] = useState<Record<EntityKey, Set<string>>>(() => ({
    schulungstermine: new Set(),
    zertifikate: new Set(),
    schulungsanmeldung: new Set(),
    raeume: new Set(),
    trainer: new Set(),
    bewertungen: new Set(),
    teilnehmerverwaltung: new Set(),
    schulungskatalog: new Set(),
    mitarbeiter: new Set(),
  }));
  const [filters, setFilters] = useState<Record<EntityKey, Record<string, string>>>(() => ({
    schulungstermine: {},
    zertifikate: {},
    schulungsanmeldung: {},
    raeume: {},
    trainer: {},
    bewertungen: {},
    teilnehmerverwaltung: {},
    schulungskatalog: {},
    mitarbeiter: {},
  }));
  const [showFilters, setShowFilters] = useState(false);
  const [dialogState, setDialogState] = useState<{ entity: EntityKey; record: any } | null>(null);
  const [createEntity, setCreateEntity] = useState<EntityKey | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<{ entity: EntityKey; ids: string[] } | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState<EntityKey | null>(null);
  const [viewState, setViewState] = useState<{ entity: EntityKey; record: any } | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = useState('');

  const getRecords = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'schulungstermine': return (data as any).schulungstermine as Schulungstermine[] ?? [];
      case 'zertifikate': return (data as any).zertifikate as Zertifikate[] ?? [];
      case 'schulungsanmeldung': return (data as any).schulungsanmeldung as Schulungsanmeldung[] ?? [];
      case 'raeume': return (data as any).raeume as Raeume[] ?? [];
      case 'trainer': return (data as any).trainer as Trainer[] ?? [];
      case 'bewertungen': return (data as any).bewertungen as Bewertungen[] ?? [];
      case 'teilnehmerverwaltung': return (data as any).teilnehmerverwaltung as Teilnehmerverwaltung[] ?? [];
      case 'schulungskatalog': return (data as any).schulungskatalog as Schulungskatalog[] ?? [];
      case 'mitarbeiter': return (data as any).mitarbeiter as Mitarbeiter[] ?? [];
      default: return [];
    }
  }, [data]);

  const getLookupLists = useCallback((entity: EntityKey) => {
    const lists: Record<string, any[]> = {};
    switch (entity) {
      case 'schulungstermine':
        lists.schulungskatalogList = (data as any).schulungskatalog ?? [];
        lists.trainerList = (data as any).trainer ?? [];
        lists.raeumeList = (data as any).raeume ?? [];
        break;
      case 'zertifikate':
        lists.teilnehmerverwaltungList = (data as any).teilnehmerverwaltung ?? [];
        lists.mitarbeiterList = (data as any).mitarbeiter ?? [];
        lists.schulungskatalogList = (data as any).schulungskatalog ?? [];
        break;
      case 'schulungsanmeldung':
        lists.mitarbeiterList = (data as any).mitarbeiter ?? [];
        lists.schulungstermineList = (data as any).schulungstermine ?? [];
        break;
      case 'bewertungen':
        lists.teilnehmerverwaltungList = (data as any).teilnehmerverwaltung ?? [];
        break;
      case 'teilnehmerverwaltung':
        lists.schulungstermineList = (data as any).schulungstermine ?? [];
        lists.mitarbeiterList = (data as any).mitarbeiter ?? [];
        break;
    }
    return lists;
  }, [data]);

  const getApplookupDisplay = useCallback((entity: EntityKey, fieldKey: string, url?: unknown) => {
    if (!url) return '—';
    const id = extractRecordId(url);
    if (!id) return '—';
    const lists = getLookupLists(entity);
    void fieldKey; // ensure used for noUnusedParameters
    if (entity === 'schulungstermine' && fieldKey === 'schulung') {
      const match = (lists.schulungskatalogList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.titel ?? '—';
    }
    if (entity === 'schulungstermine' && fieldKey === 'trainer') {
      const match = (lists.trainerList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.vorname ?? '—';
    }
    if (entity === 'schulungstermine' && fieldKey === 'raum') {
      const match = (lists.raeumeList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.raumname ?? '—';
    }
    if (entity === 'zertifikate' && fieldKey === 'teilnahme') {
      const match = (lists.teilnehmerverwaltungList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.bemerkungen ?? '—';
    }
    if (entity === 'zertifikate' && fieldKey === 'empfaenger') {
      const match = (lists.mitarbeiterList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.nachname ?? '—';
    }
    if (entity === 'zertifikate' && fieldKey === 'schulung') {
      const match = (lists.schulungskatalogList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.titel ?? '—';
    }
    if (entity === 'schulungsanmeldung' && fieldKey === 'mitarbeiter') {
      const match = (lists.mitarbeiterList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.nachname ?? '—';
    }
    if (entity === 'schulungsanmeldung' && fieldKey === 'schulungstermin') {
      const match = (lists.schulungstermineList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.bemerkungen ?? '—';
    }
    if (entity === 'bewertungen' && fieldKey === 'teilnahme') {
      const match = (lists.teilnehmerverwaltungList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.bemerkungen ?? '—';
    }
    if (entity === 'teilnehmerverwaltung' && fieldKey === 'schulungstermin') {
      const match = (lists.schulungstermineList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.bemerkungen ?? '—';
    }
    if (entity === 'teilnehmerverwaltung' && fieldKey === 'mitarbeiter') {
      const match = (lists.mitarbeiterList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.nachname ?? '—';
    }
    return String(url);
  }, [getLookupLists]);

  const getFieldMeta = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'schulungstermine': return SCHULUNGSTERMINE_FIELDS;
      case 'zertifikate': return ZERTIFIKATE_FIELDS;
      case 'schulungsanmeldung': return SCHULUNGSANMELDUNG_FIELDS;
      case 'raeume': return RAEUME_FIELDS;
      case 'trainer': return TRAINER_FIELDS;
      case 'bewertungen': return BEWERTUNGEN_FIELDS;
      case 'teilnehmerverwaltung': return TEILNEHMERVERWALTUNG_FIELDS;
      case 'schulungskatalog': return SCHULUNGSKATALOG_FIELDS;
      case 'mitarbeiter': return MITARBEITER_FIELDS;
      default: return [];
    }
  }, []);

  const getFilteredRecords = useCallback((entity: EntityKey) => {
    const records = getRecords(entity);
    const s = search.toLowerCase();
    const searched = !s ? records : records.filter((r: any) => {
      return Object.values(r.fields).some((v: any) => {
        if (v == null) return false;
        if (Array.isArray(v)) return v.some((item: any) => typeof item === 'object' && item !== null && 'label' in item ? String((item as any).label).toLowerCase().includes(s) : String(item).toLowerCase().includes(s));
        if (typeof v === 'object' && 'label' in (v as any)) return String((v as any).label).toLowerCase().includes(s);
        return String(v).toLowerCase().includes(s);
      });
    });
    const entityFilters = filters[entity] ?? {};
    const fieldMeta = getFieldMeta(entity);
    return searched.filter((r: any) => {
      return fieldMeta.every((fm: any) => {
        const fv = entityFilters[fm.key];
        if (!fv || fv === '') return true;
        const val = r.fields?.[fm.key];
        if (fm.type === 'bool') {
          if (fv === 'true') return val === true;
          if (fv === 'false') return val !== true;
          return true;
        }
        if (fm.type === 'lookup/select' || fm.type === 'lookup/radio') {
          const label = val && typeof val === 'object' && 'label' in val ? val.label : '';
          return String(label).toLowerCase().includes(fv.toLowerCase());
        }
        if (fm.type.includes('multiplelookup')) {
          if (!Array.isArray(val)) return false;
          return val.some((item: any) => String(item?.label ?? '').toLowerCase().includes(fv.toLowerCase()));
        }
        if (fm.type.includes('applookup')) {
          const display = getApplookupDisplay(entity, fm.key, val);
          return String(display).toLowerCase().includes(fv.toLowerCase());
        }
        return String(val ?? '').toLowerCase().includes(fv.toLowerCase());
      });
    });
  }, [getRecords, filters, getFieldMeta, getApplookupDisplay, search]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(''); setSortDir('asc'); }
    } else { setSortKey(key); setSortDir('asc'); }
  }

  function sortRecords<T extends { fields: Record<string, any> }>(recs: T[]): T[] {
    if (!sortKey) return recs;
    return [...recs].sort((a, b) => {
      let va: any = a.fields[sortKey], vb: any = b.fields[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'object' && 'label' in va) va = va.label;
      if (typeof vb === 'object' && 'label' in vb) vb = vb.label;
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }

  const toggleSelect = useCallback((entity: EntityKey, id: string) => {
    setSelectedIds(prev => {
      const next = { ...prev, [entity]: new Set(prev[entity]) };
      if (next[entity].has(id)) next[entity].delete(id);
      else next[entity].add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((entity: EntityKey) => {
    const filtered = getFilteredRecords(entity);
    setSelectedIds(prev => {
      const allSelected = filtered.every((r: any) => prev[entity].has(r.record_id));
      const next = { ...prev, [entity]: new Set(prev[entity]) };
      if (allSelected) {
        filtered.forEach((r: any) => next[entity].delete(r.record_id));
      } else {
        filtered.forEach((r: any) => next[entity].add(r.record_id));
      }
      return next;
    });
  }, [getFilteredRecords]);

  const clearSelection = useCallback((entity: EntityKey) => {
    setSelectedIds(prev => ({ ...prev, [entity]: new Set() }));
  }, []);

  const getServiceMethods = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'schulungstermine': return {
        create: (fields: any) => LivingAppsService.createSchulungstermineEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateSchulungstermineEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteSchulungstermineEntry(id),
      };
      case 'zertifikate': return {
        create: (fields: any) => LivingAppsService.createZertifikateEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateZertifikateEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteZertifikateEntry(id),
      };
      case 'schulungsanmeldung': return {
        create: (fields: any) => LivingAppsService.createSchulungsanmeldungEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateSchulungsanmeldungEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteSchulungsanmeldungEntry(id),
      };
      case 'raeume': return {
        create: (fields: any) => LivingAppsService.createRaeumeEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateRaeumeEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteRaeumeEntry(id),
      };
      case 'trainer': return {
        create: (fields: any) => LivingAppsService.createTrainerEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateTrainerEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteTrainerEntry(id),
      };
      case 'bewertungen': return {
        create: (fields: any) => LivingAppsService.createBewertungenEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateBewertungenEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteBewertungenEntry(id),
      };
      case 'teilnehmerverwaltung': return {
        create: (fields: any) => LivingAppsService.createTeilnehmerverwaltungEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateTeilnehmerverwaltungEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteTeilnehmerverwaltungEntry(id),
      };
      case 'schulungskatalog': return {
        create: (fields: any) => LivingAppsService.createSchulungskatalogEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateSchulungskatalogEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteSchulungskatalogEntry(id),
      };
      case 'mitarbeiter': return {
        create: (fields: any) => LivingAppsService.createMitarbeiterEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateMitarbeiterEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteMitarbeiterEntry(id),
      };
      default: return null;
    }
  }, []);

  async function handleCreate(entity: EntityKey, fields: any) {
    const svc = getServiceMethods(entity);
    if (!svc) return;
    await svc.create(fields);
    fetchAll();
    setCreateEntity(null);
  }

  async function handleUpdate(fields: any) {
    if (!dialogState) return;
    const svc = getServiceMethods(dialogState.entity);
    if (!svc) return;
    await svc.update(dialogState.record.record_id, fields);
    fetchAll();
    setDialogState(null);
  }

  async function handleBulkDelete() {
    if (!deleteTargets) return;
    const svc = getServiceMethods(deleteTargets.entity);
    if (!svc) return;
    setBulkLoading(true);
    try {
      for (const id of deleteTargets.ids) {
        await svc.remove(id);
      }
      clearSelection(deleteTargets.entity);
      fetchAll();
    } finally {
      setBulkLoading(false);
      setDeleteTargets(null);
    }
  }

  async function handleBulkClone() {
    const svc = getServiceMethods(activeTab);
    if (!svc) return;
    setBulkLoading(true);
    try {
      const records = getRecords(activeTab);
      const ids = Array.from(selectedIds[activeTab]);
      for (const id of ids) {
        const rec = records.find((r: any) => r.record_id === id);
        if (!rec) continue;
        const clean = cleanFieldsForApi(rec.fields, activeTab);
        await svc.create(clean as any);
      }
      clearSelection(activeTab);
      fetchAll();
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleBulkEdit(fieldKey: string, value: any) {
    if (!bulkEditOpen) return;
    const svc = getServiceMethods(bulkEditOpen);
    if (!svc) return;
    setBulkLoading(true);
    try {
      const ids = Array.from(selectedIds[bulkEditOpen]);
      for (const id of ids) {
        await svc.update(id, { [fieldKey]: value });
      }
      clearSelection(bulkEditOpen);
      fetchAll();
    } finally {
      setBulkLoading(false);
      setBulkEditOpen(null);
    }
  }

  function updateFilter(entity: EntityKey, fieldKey: string, value: string) {
    setFilters(prev => ({
      ...prev,
      [entity]: { ...prev[entity], [fieldKey]: value },
    }));
  }

  function clearEntityFilters(entity: EntityKey) {
    setFilters(prev => ({ ...prev, [entity]: {} }));
  }

  const activeFilterCount = useMemo(() => {
    const f = filters[activeTab] ?? {};
    return Object.values(f).filter(v => v && v !== '').length;
  }, [filters, activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-destructive">{error.message}</p>
        <Button onClick={fetchAll}>Erneut versuchen</Button>
      </div>
    );
  }

  const filtered = getFilteredRecords(activeTab);
  const sel = selectedIds[activeTab];
  const allFiltered = filtered.every((r: any) => sel.has(r.record_id)) && filtered.length > 0;
  const fieldMeta = getFieldMeta(activeTab);

  return (
    <PageShell
      title="Verwaltung"
      subtitle="Alle Daten verwalten"
      action={
        <Button onClick={() => setCreateEntity(activeTab)} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" /> Hinzufügen
        </Button>
      }
    >
      <div className="flex gap-2 flex-wrap">
        {ENTITY_TABS.map(tab => {
          const count = getRecords(tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearch(''); setSortKey(''); setSortDir('asc'); fetchAll(); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tab.label}
              <Badge variant="secondary" className="ml-1 text-xs">{count}</Badge>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suchen..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(f => !f)} className="gap-2">
            <Filter className="h-4 w-4" />
            Filtern
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>
            )}
          </Button>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => clearEntityFilters(activeTab)}>
              Filter zurücksetzen
            </Button>
          )}
        </div>
        {sel.size > 0 && (
          <div className="flex items-center gap-2 flex-wrap bg-muted/60 rounded-lg px-3 py-1.5">
            <span className="text-sm font-medium">{sel.size} ausgewählt</span>
            <Button variant="outline" size="sm" onClick={() => setBulkEditOpen(activeTab)}>
              <Pencil className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Feld bearbeiten</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleBulkClone()}>
              <Copy className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Kopieren</span>
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteTargets({ entity: activeTab, ids: Array.from(sel) })}>
              <Trash2 className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Ausgewählte löschen</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => clearSelection(activeTab)}>
              <X className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Auswahl aufheben</span>
            </Button>
          </div>
        )}
      </div>

      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4 rounded-lg border bg-muted/30">
          {fieldMeta.map((fm: any) => (
            <div key={fm.key} className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{fm.label}</label>
              {fm.type === 'bool' ? (
                <Select value={filters[activeTab]?.[fm.key] ?? ''} onValueChange={v => updateFilter(activeTab, fm.key, v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Alle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="true">Ja</SelectItem>
                    <SelectItem value="false">Nein</SelectItem>
                  </SelectContent>
                </Select>
              ) : fm.type === 'lookup/select' || fm.type === 'lookup/radio' ? (
                <Select value={filters[activeTab]?.[fm.key] ?? ''} onValueChange={v => updateFilter(activeTab, fm.key, v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Alle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    {fm.options?.map((o: any) => (
                      <SelectItem key={o.key} value={o.label}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="h-8 text-xs"
                  placeholder="Filtern..."
                  value={filters[activeTab]?.[fm.key] ?? ''}
                  onChange={e => updateFilter(activeTab, fm.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-[27px] bg-card shadow-lg overflow-x-auto">
        <Table className="[&_tbody_td]:px-6 [&_tbody_td]:py-2 [&_tbody_td]:text-base [&_tbody_td]:font-medium [&_tbody_tr:first-child_td]:pt-6 [&_tbody_tr:last-child_td]:pb-10">
          <TableHeader className="bg-secondary">
            <TableRow className="border-b border-input">
              <TableHead className="w-10 px-6">
                <Checkbox
                  checked={allFiltered}
                  onCheckedChange={() => toggleSelectAll(activeTab)}
                />
              </TableHead>
              {fieldMeta.map((fm: any) => (
                <TableHead key={fm.key} className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort(fm.key)}>
                  <span className="inline-flex items-center gap-1">
                    {fm.label}
                    {sortKey === fm.key ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-30" />}
                  </span>
                </TableHead>
              ))}
              <TableHead className="w-24 uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortRecords(filtered).map((record: any) => (
              <TableRow key={record.record_id} className={`transition-colors cursor-pointer ${sel.has(record.record_id) ? "bg-primary/5" : "hover:bg-muted/50"}`} onClick={(e) => { if ((e.target as HTMLElement).closest('button, [role="checkbox"]')) return; setViewState({ entity: activeTab, record }); }}>
                <TableCell>
                  <Checkbox
                    checked={sel.has(record.record_id)}
                    onCheckedChange={() => toggleSelect(activeTab, record.record_id)}
                  />
                </TableCell>
                {fieldMeta.map((fm: any) => {
                  const val = record.fields?.[fm.key];
                  if (fm.type === 'bool') {
                    return (
                      <TableCell key={fm.key}>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          val ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          {val ? 'Ja' : 'Nein'}
                        </span>
                      </TableCell>
                    );
                  }
                  if (fm.type === 'lookup/select' || fm.type === 'lookup/radio') {
                    return <TableCell key={fm.key}><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{val?.label ?? '—'}</span></TableCell>;
                  }
                  if (fm.type.includes('multiplelookup')) {
                    return <TableCell key={fm.key}>{Array.isArray(val) ? val.map((v: any) => v?.label ?? v).join(', ') : '—'}</TableCell>;
                  }
                  if (fm.type.includes('applookup')) {
                    return <TableCell key={fm.key}><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getApplookupDisplay(activeTab, fm.key, val)}</span></TableCell>;
                  }
                  if (fm.type.includes('date')) {
                    return <TableCell key={fm.key} className="text-muted-foreground">{fmtDate(val)}</TableCell>;
                  }
                  if (fm.type.startsWith('file')) {
                    return (
                      <TableCell key={fm.key}>
                        {val ? (
                          <div className="relative h-8 w-8 rounded bg-muted overflow-hidden">
                            <img src={val} alt="" className="h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          </div>
                        ) : '—'}
                      </TableCell>
                    );
                  }
                  if (fm.type === 'string/textarea') {
                    return <TableCell key={fm.key} className="max-w-xs"><span className="truncate block">{val ?? '—'}</span></TableCell>;
                  }
                  if (fm.type === 'geo') {
                    return (
                      <TableCell key={fm.key} className="max-w-[200px]">
                        <span className="truncate block" title={val ? `${val.lat}, ${val.long}` : undefined}>
                          {val?.info ?? (val ? `${val.lat?.toFixed(4)}, ${val.long?.toFixed(4)}` : '—')}
                        </span>
                      </TableCell>
                    );
                  }
                  return <TableCell key={fm.key}>{val ?? '—'}</TableCell>;
                })}
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setDialogState({ entity: activeTab, record })}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTargets({ entity: activeTab, ids: [record.record_id] })}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={fieldMeta.length + 2} className="text-center py-16 text-muted-foreground">
                  Keine Ergebnisse gefunden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {(createEntity === 'schulungstermine' || dialogState?.entity === 'schulungstermine') && (
        <SchulungstermineDialog
          open={createEntity === 'schulungstermine' || dialogState?.entity === 'schulungstermine'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'schulungstermine' ? handleUpdate : (fields: any) => handleCreate('schulungstermine', fields)}
          defaultValues={dialogState?.entity === 'schulungstermine' ? dialogState.record?.fields : undefined}
          schulungskatalogList={(data as any).schulungskatalog ?? []}
          trainerList={(data as any).trainer ?? []}
          raeumeList={(data as any).raeume ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Schulungstermine']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Schulungstermine']}
        />
      )}
      {(createEntity === 'zertifikate' || dialogState?.entity === 'zertifikate') && (
        <ZertifikateDialog
          open={createEntity === 'zertifikate' || dialogState?.entity === 'zertifikate'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'zertifikate' ? handleUpdate : (fields: any) => handleCreate('zertifikate', fields)}
          defaultValues={dialogState?.entity === 'zertifikate' ? dialogState.record?.fields : undefined}
          teilnehmerverwaltungList={(data as any).teilnehmerverwaltung ?? []}
          mitarbeiterList={(data as any).mitarbeiter ?? []}
          schulungskatalogList={(data as any).schulungskatalog ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Zertifikate']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Zertifikate']}
        />
      )}
      {(createEntity === 'schulungsanmeldung' || dialogState?.entity === 'schulungsanmeldung') && (
        <SchulungsanmeldungDialog
          open={createEntity === 'schulungsanmeldung' || dialogState?.entity === 'schulungsanmeldung'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'schulungsanmeldung' ? handleUpdate : (fields: any) => handleCreate('schulungsanmeldung', fields)}
          defaultValues={dialogState?.entity === 'schulungsanmeldung' ? dialogState.record?.fields : undefined}
          mitarbeiterList={(data as any).mitarbeiter ?? []}
          schulungstermineList={(data as any).schulungstermine ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Schulungsanmeldung']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Schulungsanmeldung']}
        />
      )}
      {(createEntity === 'raeume' || dialogState?.entity === 'raeume') && (
        <RaeumeDialog
          open={createEntity === 'raeume' || dialogState?.entity === 'raeume'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'raeume' ? handleUpdate : (fields: any) => handleCreate('raeume', fields)}
          defaultValues={dialogState?.entity === 'raeume' ? dialogState.record?.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['Raeume']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Raeume']}
        />
      )}
      {(createEntity === 'trainer' || dialogState?.entity === 'trainer') && (
        <TrainerDialog
          open={createEntity === 'trainer' || dialogState?.entity === 'trainer'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'trainer' ? handleUpdate : (fields: any) => handleCreate('trainer', fields)}
          defaultValues={dialogState?.entity === 'trainer' ? dialogState.record?.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['Trainer']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Trainer']}
        />
      )}
      {(createEntity === 'bewertungen' || dialogState?.entity === 'bewertungen') && (
        <BewertungenDialog
          open={createEntity === 'bewertungen' || dialogState?.entity === 'bewertungen'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'bewertungen' ? handleUpdate : (fields: any) => handleCreate('bewertungen', fields)}
          defaultValues={dialogState?.entity === 'bewertungen' ? dialogState.record?.fields : undefined}
          teilnehmerverwaltungList={(data as any).teilnehmerverwaltung ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Bewertungen']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Bewertungen']}
        />
      )}
      {(createEntity === 'teilnehmerverwaltung' || dialogState?.entity === 'teilnehmerverwaltung') && (
        <TeilnehmerverwaltungDialog
          open={createEntity === 'teilnehmerverwaltung' || dialogState?.entity === 'teilnehmerverwaltung'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'teilnehmerverwaltung' ? handleUpdate : (fields: any) => handleCreate('teilnehmerverwaltung', fields)}
          defaultValues={dialogState?.entity === 'teilnehmerverwaltung' ? dialogState.record?.fields : undefined}
          schulungstermineList={(data as any).schulungstermine ?? []}
          mitarbeiterList={(data as any).mitarbeiter ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Teilnehmerverwaltung']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Teilnehmerverwaltung']}
        />
      )}
      {(createEntity === 'schulungskatalog' || dialogState?.entity === 'schulungskatalog') && (
        <SchulungskatalogDialog
          open={createEntity === 'schulungskatalog' || dialogState?.entity === 'schulungskatalog'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'schulungskatalog' ? handleUpdate : (fields: any) => handleCreate('schulungskatalog', fields)}
          defaultValues={dialogState?.entity === 'schulungskatalog' ? dialogState.record?.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['Schulungskatalog']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Schulungskatalog']}
        />
      )}
      {(createEntity === 'mitarbeiter' || dialogState?.entity === 'mitarbeiter') && (
        <MitarbeiterDialog
          open={createEntity === 'mitarbeiter' || dialogState?.entity === 'mitarbeiter'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'mitarbeiter' ? handleUpdate : (fields: any) => handleCreate('mitarbeiter', fields)}
          defaultValues={dialogState?.entity === 'mitarbeiter' ? dialogState.record?.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['Mitarbeiter']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Mitarbeiter']}
        />
      )}
      {viewState?.entity === 'schulungstermine' && (
        <SchulungstermineViewDialog
          open={viewState?.entity === 'schulungstermine'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'schulungstermine', record: r }); }}
          schulungskatalogList={(data as any).schulungskatalog ?? []}
          trainerList={(data as any).trainer ?? []}
          raeumeList={(data as any).raeume ?? []}
        />
      )}
      {viewState?.entity === 'zertifikate' && (
        <ZertifikateViewDialog
          open={viewState?.entity === 'zertifikate'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'zertifikate', record: r }); }}
          teilnehmerverwaltungList={(data as any).teilnehmerverwaltung ?? []}
          mitarbeiterList={(data as any).mitarbeiter ?? []}
          schulungskatalogList={(data as any).schulungskatalog ?? []}
        />
      )}
      {viewState?.entity === 'schulungsanmeldung' && (
        <SchulungsanmeldungViewDialog
          open={viewState?.entity === 'schulungsanmeldung'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'schulungsanmeldung', record: r }); }}
          mitarbeiterList={(data as any).mitarbeiter ?? []}
          schulungstermineList={(data as any).schulungstermine ?? []}
        />
      )}
      {viewState?.entity === 'raeume' && (
        <RaeumeViewDialog
          open={viewState?.entity === 'raeume'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'raeume', record: r }); }}
        />
      )}
      {viewState?.entity === 'trainer' && (
        <TrainerViewDialog
          open={viewState?.entity === 'trainer'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'trainer', record: r }); }}
        />
      )}
      {viewState?.entity === 'bewertungen' && (
        <BewertungenViewDialog
          open={viewState?.entity === 'bewertungen'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'bewertungen', record: r }); }}
          teilnehmerverwaltungList={(data as any).teilnehmerverwaltung ?? []}
        />
      )}
      {viewState?.entity === 'teilnehmerverwaltung' && (
        <TeilnehmerverwaltungViewDialog
          open={viewState?.entity === 'teilnehmerverwaltung'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'teilnehmerverwaltung', record: r }); }}
          schulungstermineList={(data as any).schulungstermine ?? []}
          mitarbeiterList={(data as any).mitarbeiter ?? []}
        />
      )}
      {viewState?.entity === 'schulungskatalog' && (
        <SchulungskatalogViewDialog
          open={viewState?.entity === 'schulungskatalog'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'schulungskatalog', record: r }); }}
        />
      )}
      {viewState?.entity === 'mitarbeiter' && (
        <MitarbeiterViewDialog
          open={viewState?.entity === 'mitarbeiter'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'mitarbeiter', record: r }); }}
        />
      )}

      <BulkEditDialog
        open={!!bulkEditOpen}
        onClose={() => setBulkEditOpen(null)}
        onApply={handleBulkEdit}
        fields={bulkEditOpen ? getFieldMeta(bulkEditOpen) : []}
        selectedCount={bulkEditOpen ? selectedIds[bulkEditOpen].size : 0}
        loading={bulkLoading}
        lookupLists={bulkEditOpen ? getLookupLists(bulkEditOpen) : {}}
      />

      <ConfirmDialog
        open={!!deleteTargets}
        onClose={() => setDeleteTargets(null)}
        onConfirm={handleBulkDelete}
        title="Ausgewählte löschen"
        description={`Sollen ${deleteTargets?.ids.length ?? 0} Einträge wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.`}
      />
    </PageShell>
  );
}