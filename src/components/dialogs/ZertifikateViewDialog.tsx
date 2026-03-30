import type { Zertifikate, Teilnehmerverwaltung, Mitarbeiter, Schulungskatalog } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface ZertifikateViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Zertifikate | null;
  onEdit: (record: Zertifikate) => void;
  teilnehmerverwaltungList: Teilnehmerverwaltung[];
  mitarbeiterList: Mitarbeiter[];
  schulungskatalogList: Schulungskatalog[];
}

export function ZertifikateViewDialog({ open, onClose, record, onEdit, teilnehmerverwaltungList, mitarbeiterList, schulungskatalogList }: ZertifikateViewDialogProps) {
  function getTeilnehmerverwaltungDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return teilnehmerverwaltungList.find(r => r.record_id === id)?.fields.bemerkungen ?? '—';
  }

  function getMitarbeiterDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return mitarbeiterList.find(r => r.record_id === id)?.fields.nachname ?? '—';
  }

  function getSchulungskatalogDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return schulungskatalogList.find(r => r.record_id === id)?.fields.titel ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Zertifikate anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Teilnahme</Label>
            <p className="text-sm">{getTeilnehmerverwaltungDisplayName(record.fields.teilnahme)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Empfänger</Label>
            <p className="text-sm">{getMitarbeiterDisplayName(record.fields.empfaenger)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Schulung</Label>
            <p className="text-sm">{getSchulungskatalogDisplayName(record.fields.schulung)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zertifikatstyp</Label>
            <Badge variant="secondary">{record.fields.zertifikatstyp?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zertifikatsnummer</Label>
            <p className="text-sm">{record.fields.zertifikatsnummer ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Beschreibung der Leistung/Kurs</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.beschreibung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Name des Ausstellers</Label>
            <p className="text-sm">{record.fields.aussteller ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Position des Ausstellers</Label>
            <p className="text-sm">{record.fields.aussteller_position ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Unterschrift (Dateiname/Bild)</Label>
            <p className="text-sm">{record.fields.unterschrift ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Siegel (Dateiname/Bild)</Label>
            <p className="text-sm">{record.fields.siegel ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Logo (Dateiname/Bild)</Label>
            <p className="text-sm">{record.fields.logo ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zertifikatsvorlage</Label>
            <Badge variant="secondary">{record.fields.vorlage?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Hintergrundfarbe</Label>
            <Badge variant="secondary">{record.fields.hintergrundfarbe?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Schriftart & -größe</Label>
            <p className="text-sm">{record.fields.schriftart ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Layoutwünsche</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.layoutwuensche ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">QR-Code für digitale Überprüfung</Label>
            <p className="text-sm">{record.fields.qr_code_url ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Digitale Signatur integriert</Label>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              record.fields.digitale_signatur ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              {record.fields.digitale_signatur ? 'Ja' : 'Nein'}
            </span>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Social-Media-Elemente</Label>
            <p className="text-sm">{record.fields.social_media ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Badge variant="secondary">{record.fields.status?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ausstellungsdatum</Label>
            <p className="text-sm">{formatDate(record.fields.ausstellungsdatum)}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}