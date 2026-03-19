import type { Schulungsanmeldung, Mitarbeiter, Schulungstermine } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Pencil } from 'lucide-react';

interface SchulungsanmeldungViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Schulungsanmeldung | null;
  onEdit: (record: Schulungsanmeldung) => void;
  mitarbeiterList: Mitarbeiter[];
  schulungstermineList: Schulungstermine[];
}

export function SchulungsanmeldungViewDialog({ open, onClose, record, onEdit, mitarbeiterList, schulungstermineList }: SchulungsanmeldungViewDialogProps) {
  function getMitarbeiterDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return mitarbeiterList.find(r => r.record_id === id)?.fields.nachname ?? '—';
  }

  function getSchulungstermineDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return schulungstermineList.find(r => r.record_id === id)?.fields.bemerkungen ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schulungsanmeldung anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ihr Name</Label>
            <p className="text-sm">{getMitarbeiterDisplayName(record.fields.mitarbeiter)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gewünschter Schulungstermin</Label>
            <p className="text-sm">{getSchulungstermineDisplayName(record.fields.schulungstermin)}</p>
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