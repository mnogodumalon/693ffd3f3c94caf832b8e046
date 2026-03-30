import type { Bewertungen, Teilnehmerverwaltung } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';

interface BewertungenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Bewertungen | null;
  onEdit: (record: Bewertungen) => void;
  teilnehmerverwaltungList: Teilnehmerverwaltung[];
}

export function BewertungenViewDialog({ open, onClose, record, onEdit, teilnehmerverwaltungList }: BewertungenViewDialogProps) {
  function getTeilnehmerverwaltungDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return teilnehmerverwaltungList.find(r => r.record_id === id)?.fields.bemerkungen ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bewertungen anzeigen</DialogTitle>
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
            <Label className="text-xs text-muted-foreground">Gesamtbewertung</Label>
            <Badge variant="secondary">{record.fields.gesamtbewertung?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bewertung Inhalt</Label>
            <Badge variant="secondary">{record.fields.inhaltsbewertung?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bewertung Organisation</Label>
            <Badge variant="secondary">{record.fields.organisationsbewertung?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kommentar</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.kommentar ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Verbesserungsvorschläge</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.verbesserungsvorschlaege ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bewertung Trainer</Label>
            <Badge variant="secondary">{record.fields.trainerbewertung?.label ?? '—'}</Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}