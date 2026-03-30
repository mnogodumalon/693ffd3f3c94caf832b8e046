import type { Schulungstermine, Schulungskatalog, Trainer, Raeume } from '@/types/app';
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

interface SchulungstermineViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Schulungstermine | null;
  onEdit: (record: Schulungstermine) => void;
  schulungskatalogList: Schulungskatalog[];
  trainerList: Trainer[];
  raeumeList: Raeume[];
}

export function SchulungstermineViewDialog({ open, onClose, record, onEdit, schulungskatalogList, trainerList, raeumeList }: SchulungstermineViewDialogProps) {
  function getSchulungskatalogDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return schulungskatalogList.find(r => r.record_id === id)?.fields.titel ?? '—';
  }

  function getTrainerDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return trainerList.find(r => r.record_id === id)?.fields.vorname ?? '—';
  }

  function getRaeumeDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return raeumeList.find(r => r.record_id === id)?.fields.raumname ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schulungstermine anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Schulung</Label>
            <p className="text-sm">{getSchulungskatalogDisplayName(record.fields.schulung)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Startdatum und -uhrzeit</Label>
            <p className="text-sm">{formatDate(record.fields.startdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Enddatum und -uhrzeit</Label>
            <p className="text-sm">{formatDate(record.fields.enddatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Trainer</Label>
            <p className="text-sm">{getTrainerDisplayName(record.fields.trainer)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Raum</Label>
            <p className="text-sm">{getRaeumeDisplayName(record.fields.raum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Badge variant="secondary">{record.fields.status?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Verfügbare Plätze</Label>
            <p className="text-sm">{record.fields.verfuegbare_plaetze ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bemerkungen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.bemerkungen ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}