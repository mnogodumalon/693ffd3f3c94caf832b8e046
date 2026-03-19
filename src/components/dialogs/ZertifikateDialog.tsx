import { useState, useEffect, useRef, useCallback } from 'react';
import type { Zertifikate, Teilnehmerverwaltung, Mitarbeiter, Schulungskatalog } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId, createRecordUrl, cleanFieldsForApi, getUserProfile } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Camera, CheckCircle2, FileText, ImagePlus, Loader2, Sparkles, Upload, X } from 'lucide-react';
import { fileToDataUri, extractFromPhoto, extractPhotoMeta, reverseGeocode } from '@/lib/ai';
import { lookupKey } from '@/lib/formatters';

interface ZertifikateDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Zertifikate['fields']) => Promise<void>;
  defaultValues?: Zertifikate['fields'];
  teilnehmerverwaltungList: Teilnehmerverwaltung[];
  mitarbeiterList: Mitarbeiter[];
  schulungskatalogList: Schulungskatalog[];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

export function ZertifikateDialog({ open, onClose, onSubmit, defaultValues, teilnehmerverwaltungList, mitarbeiterList, schulungskatalogList, enablePhotoScan = false, enablePhotoLocation = true }: ZertifikateDialogProps) {
  const [fields, setFields] = useState<Partial<Zertifikate['fields']>>({});
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [usePersonalInfo, setUsePersonalInfo] = useState(() => {
    try { return localStorage.getItem('ai-use-personal-info') === 'true'; } catch { return false; }
  });
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setFields(defaultValues ?? {});
      setPreview(null);
      setScanSuccess(false);
    }
  }, [open, defaultValues]);
  useEffect(() => {
    try { localStorage.setItem('ai-use-personal-info', String(usePersonalInfo)); } catch {}
  }, [usePersonalInfo]);
  async function handleShowProfileInfo() {
    if (showProfileInfo) { setShowProfileInfo(false); return; }
    setProfileLoading(true);
    try {
      const p = await getUserProfile();
      setProfileData(p);
    } catch {
      setProfileData(null);
    } finally {
      setProfileLoading(false);
      setShowProfileInfo(true);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const clean = cleanFieldsForApi({ ...fields }, 'zertifikate');
      await onSubmit(clean as Zertifikate['fields']);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoScan(file: File) {
    setScanning(true);
    setScanSuccess(false);
    try {
      const [uri, meta] = await Promise.all([fileToDataUri(file), extractPhotoMeta(file)]);
      if (file.type.startsWith('image/')) setPreview(uri);
      const gps = enablePhotoLocation ? meta?.gps ?? null : null;
      const parts: string[] = [];
      let geoAddr = '';
      if (gps) {
        geoAddr = await reverseGeocode(gps.latitude, gps.longitude);
        parts.push(`Location coordinates: ${gps.latitude}, ${gps.longitude}`);
        if (geoAddr) parts.push(`Reverse-geocoded address: ${geoAddr}`);
      }
      if (meta?.dateTime) {
        parts.push(`Date taken: ${meta.dateTime.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')}`);
      }
      const contextParts: string[] = [];
      if (parts.length) {
        contextParts.push(`<photo-metadata>\nThe following metadata was extracted from the photo\'s EXIF data:\n${parts.join('\n')}\n</photo-metadata>`);
      }
      contextParts.push(`<available-records field="teilnahme" entity="Teilnehmerverwaltung">\n${JSON.stringify(teilnehmerverwaltungList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      contextParts.push(`<available-records field="empfaenger" entity="Mitarbeiter">\n${JSON.stringify(mitarbeiterList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      contextParts.push(`<available-records field="schulung" entity="Schulungskatalog">\n${JSON.stringify(schulungskatalogList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      if (usePersonalInfo) {
        try {
          const profile = await getUserProfile();
          contextParts.push(`<user-profile>\nThe following is the logged-in user\'s personal information. Use this to pre-fill relevant fields like name, email, address, company etc. when appropriate:\n${JSON.stringify(profile, null, 2)}\n</user-profile>`);
        } catch (err) {
          console.warn('Failed to fetch user profile:', err);
        }
      }
      const photoContext = contextParts.length ? contextParts.join('\n') : undefined;
      const schema = `{\n  "teilnahme": string | null, // Display name from Teilnehmerverwaltung (see <available-records>)\n  "empfaenger": string | null, // Display name from Mitarbeiter (see <available-records>)\n  "schulung": string | null, // Display name from Schulungskatalog (see <available-records>)\n  "zertifikatstyp": LookupValue | null, // Zertifikatstyp (select one key: "teilnahmebestaetigung" | "abschlusszertifikat") mapping: teilnahmebestaetigung=Teilnahmebestätigung, abschlusszertifikat=Abschlusszertifikat\n  "zertifikatsnummer": string | null, // Zertifikatsnummer\n  "beschreibung": string | null, // Beschreibung der Leistung/Kurs\n  "aussteller": string | null, // Name des Ausstellers\n  "aussteller_position": string | null, // Position des Ausstellers\n  "unterschrift": string | null, // Unterschrift (Dateiname/Bild)\n  "siegel": string | null, // Siegel (Dateiname/Bild)\n  "logo": string | null, // Logo (Dateiname/Bild)\n  "vorlage": LookupValue | null, // Zertifikatsvorlage (select one key: "klassisch" | "modern" | "individuell") mapping: klassisch=Klassisch, modern=Modern, individuell=Individuell\n  "hintergrundfarbe": LookupValue | null, // Hintergrundfarbe (select one key: "weiss" | "blau" | "gruen" | "gelb" | "individuell") mapping: weiss=Weiß, blau=Blau, gruen=Grün, gelb=Gelb, individuell=Individuell\n  "schriftart": string | null, // Schriftart & -größe\n  "layoutwuensche": string | null, // Layoutwünsche\n  "qr_code_url": string | null, // QR-Code für digitale Überprüfung\n  "digitale_signatur": boolean | null, // Digitale Signatur integriert\n  "social_media": string | null, // Social-Media-Elemente\n  "status": LookupValue | null, // Status (select one key: "aktiv" | "inaktiv" | "widerrufen") mapping: aktiv=Aktiv, inaktiv=Inaktiv, widerrufen=Widerrufen\n  "ausstellungsdatum": string | null, // YYYY-MM-DD\n}`;
      const raw = await extractFromPhoto<Record<string, unknown>>(uri, schema, photoContext, DIALOG_INTENT);
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        const applookupKeys = new Set<string>(["teilnahme", "empfaenger", "schulung"]);
        for (const [k, v] of Object.entries(raw)) {
          if (applookupKeys.has(k)) continue;
          if (v != null) merged[k] = v;
        }
        const teilnahmeName = raw['teilnahme'] as string | null;
        if (teilnahmeName) {
          const teilnahmeMatch = teilnehmerverwaltungList.find(r => matchName(teilnahmeName!, [String(r.fields.bemerkungen ?? '')]));
          if (teilnahmeMatch) merged['teilnahme'] = createRecordUrl(APP_IDS.TEILNEHMERVERWALTUNG, teilnahmeMatch.record_id);
        }
        const empfaengerName = raw['empfaenger'] as string | null;
        if (empfaengerName) {
          const empfaengerMatch = mitarbeiterList.find(r => matchName(empfaengerName!, [[r.fields.vorname ?? '', r.fields.nachname ?? ''].filter(Boolean).join(' ')]));
          if (empfaengerMatch) merged['empfaenger'] = createRecordUrl(APP_IDS.MITARBEITER, empfaengerMatch.record_id);
        }
        const schulungName = raw['schulung'] as string | null;
        if (schulungName) {
          const schulungMatch = schulungskatalogList.find(r => matchName(schulungName!, [String(r.fields.titel ?? '')]));
          if (schulungMatch) merged['schulung'] = createRecordUrl(APP_IDS.SCHULUNGSKATALOG, schulungMatch.record_id);
        }
        return merged as Partial<Zertifikate['fields']>;
      });
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 3000);
    } catch (err) {
      console.error('Scan fehlgeschlagen:', err);
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handlePhotoScan(f);
    e.target.value = '';
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      handlePhotoScan(file);
    }
  }, []);

  const DIALOG_INTENT = defaultValues ? 'Zertifikate bearbeiten' : 'Zertifikate hinzufügen';

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{DIALOG_INTENT}</DialogTitle>
        </DialogHeader>

        {enablePhotoScan && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div>
              <div className="flex items-center gap-1.5 font-medium">
                <Sparkles className="h-4 w-4 text-primary" />
                KI-Assistent
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Versteht deine Fotos / Dokumente und füllt alles für dich aus</p>
            </div>
            <div className="flex items-start gap-2 pl-0.5">
              <Checkbox
                id="ai-use-personal-info"
                checked={usePersonalInfo}
                onCheckedChange={(v) => setUsePersonalInfo(!!v)}
                className="mt-0.5"
              />
              <span className="text-xs text-muted-foreground leading-snug">
                <Label htmlFor="ai-use-personal-info" className="text-xs font-normal text-muted-foreground cursor-pointer inline">
                  KI-Assistent darf zusätzlich Informationen zu meiner Person verwenden
                </Label>
                {' '}
                <button type="button" onClick={handleShowProfileInfo} className="text-xs text-primary hover:underline whitespace-nowrap">
                  {profileLoading ? 'Lade...' : '(mehr Infos)'}
                </button>
              </span>
            </div>
            {showProfileInfo && (
              <div className="rounded-md border bg-muted/50 p-2 text-xs max-h-40 overflow-y-auto">
                <p className="font-medium mb-1">Folgende Infos über dich können von der KI genutzt werden:</p>
                {profileData ? Object.values(profileData).map((v, i) => (
                  <span key={i}>{i > 0 && ", "}{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                )) : (
                  <span className="text-muted-foreground">Profil konnte nicht geladen werden</span>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !scanning && fileInputRef.current?.click()}
              className={`
                relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
                ${scanning
                  ? 'border-primary/40 bg-primary/5'
                  : scanSuccess
                    ? 'border-green-500/40 bg-green-50/50 dark:bg-green-950/20'
                    : dragOver
                      ? 'border-primary bg-primary/10 scale-[1.01]'
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              {scanning ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <Loader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">KI analysiert...</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Felder werden automatisch ausgefüllt</p>
                  </div>
                </div>
              ) : scanSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">Felder ausgefüllt!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Prüfe die Werte und passe sie ggf. an</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/8 flex items-center justify-center">
                    <ImagePlus className="h-7 w-7 text-primary/70" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Foto oder Dokument hierher ziehen oder auswählen</p>
                  </div>
                </div>
              )}

              {preview && !scanning && (
                <div className="absolute top-2 right-2">
                  <div className="relative group">
                    <img src={preview} alt="" className="h-10 w-10 rounded-md object-cover border shadow-sm" />
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setPreview(null); }}
                      className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-muted-foreground/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); cameraInputRef.current?.click(); }}>
                <Camera className="h-3.5 w-3.5 mr-1.5" />Kamera
              </Button>
              <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <Upload className="h-3.5 w-3.5 mr-1.5" />Foto wählen
              </Button>
              <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs" disabled={scanning}
                onClick={e => {
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'application/pdf,.pdf';
                    fileInputRef.current.click();
                    setTimeout(() => { if (fileInputRef.current) fileInputRef.current.accept = 'image/*,application/pdf'; }, 100);
                  }
                }}>
                <FileText className="h-3.5 w-3.5 mr-1.5" />Dokument
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="teilnahme">Teilnahme</Label>
            <Select
              value={extractRecordId(fields.teilnahme) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, teilnahme: v === 'none' ? undefined : createRecordUrl(APP_IDS.TEILNEHMERVERWALTUNG, v) }))}
            >
              <SelectTrigger id="teilnahme"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {teilnehmerverwaltungList.map(r => (
                  <SelectItem key={r.record_id} value={r.record_id}>
                    {r.fields.bemerkungen ?? r.record_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="empfaenger">Empfänger</Label>
            <Select
              value={extractRecordId(fields.empfaenger) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, empfaenger: v === 'none' ? undefined : createRecordUrl(APP_IDS.MITARBEITER, v) }))}
            >
              <SelectTrigger id="empfaenger"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {mitarbeiterList.map(r => (
                  <SelectItem key={r.record_id} value={r.record_id}>
                    {r.fields.nachname ?? r.record_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="schulung">Schulung</Label>
            <Select
              value={extractRecordId(fields.schulung) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, schulung: v === 'none' ? undefined : createRecordUrl(APP_IDS.SCHULUNGSKATALOG, v) }))}
            >
              <SelectTrigger id="schulung"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {schulungskatalogList.map(r => (
                  <SelectItem key={r.record_id} value={r.record_id}>
                    {r.fields.titel ?? r.record_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="zertifikatstyp">Zertifikatstyp</Label>
            <Select
              value={lookupKey(fields.zertifikatstyp) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, zertifikatstyp: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="zertifikatstyp"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="teilnahmebestaetigung">Teilnahmebestätigung</SelectItem>
                <SelectItem value="abschlusszertifikat">Abschlusszertifikat</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="zertifikatsnummer">Zertifikatsnummer</Label>
            <Input
              id="zertifikatsnummer"
              value={fields.zertifikatsnummer ?? ''}
              onChange={e => setFields(f => ({ ...f, zertifikatsnummer: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="beschreibung">Beschreibung der Leistung/Kurs</Label>
            <Textarea
              id="beschreibung"
              value={fields.beschreibung ?? ''}
              onChange={e => setFields(f => ({ ...f, beschreibung: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aussteller">Name des Ausstellers</Label>
            <Input
              id="aussteller"
              value={fields.aussteller ?? ''}
              onChange={e => setFields(f => ({ ...f, aussteller: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aussteller_position">Position des Ausstellers</Label>
            <Input
              id="aussteller_position"
              value={fields.aussteller_position ?? ''}
              onChange={e => setFields(f => ({ ...f, aussteller_position: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unterschrift">Unterschrift (Dateiname/Bild)</Label>
            <Input
              id="unterschrift"
              value={fields.unterschrift ?? ''}
              onChange={e => setFields(f => ({ ...f, unterschrift: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="siegel">Siegel (Dateiname/Bild)</Label>
            <Input
              id="siegel"
              value={fields.siegel ?? ''}
              onChange={e => setFields(f => ({ ...f, siegel: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="logo">Logo (Dateiname/Bild)</Label>
            <Input
              id="logo"
              value={fields.logo ?? ''}
              onChange={e => setFields(f => ({ ...f, logo: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vorlage">Zertifikatsvorlage</Label>
            <Select
              value={lookupKey(fields.vorlage) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, vorlage: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="vorlage"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="klassisch">Klassisch</SelectItem>
                <SelectItem value="modern">Modern</SelectItem>
                <SelectItem value="individuell">Individuell</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="hintergrundfarbe">Hintergrundfarbe</Label>
            <Select
              value={lookupKey(fields.hintergrundfarbe) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, hintergrundfarbe: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="hintergrundfarbe"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="weiss">Weiß</SelectItem>
                <SelectItem value="blau">Blau</SelectItem>
                <SelectItem value="gruen">Grün</SelectItem>
                <SelectItem value="gelb">Gelb</SelectItem>
                <SelectItem value="individuell">Individuell</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="schriftart">Schriftart & -größe</Label>
            <Input
              id="schriftart"
              value={fields.schriftart ?? ''}
              onChange={e => setFields(f => ({ ...f, schriftart: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="layoutwuensche">Layoutwünsche</Label>
            <Textarea
              id="layoutwuensche"
              value={fields.layoutwuensche ?? ''}
              onChange={e => setFields(f => ({ ...f, layoutwuensche: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qr_code_url">QR-Code für digitale Überprüfung</Label>
            <Input
              id="qr_code_url"
              value={fields.qr_code_url ?? ''}
              onChange={e => setFields(f => ({ ...f, qr_code_url: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="digitale_signatur">Digitale Signatur integriert</Label>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="digitale_signatur"
                checked={!!fields.digitale_signatur}
                onCheckedChange={(v) => setFields(f => ({ ...f, digitale_signatur: !!v }))}
              />
              <Label htmlFor="digitale_signatur" className="font-normal">Digitale Signatur integriert</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="social_media">Social-Media-Elemente</Label>
            <Input
              id="social_media"
              value={fields.social_media ?? ''}
              onChange={e => setFields(f => ({ ...f, social_media: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={lookupKey(fields.status) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, status: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="status"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="aktiv">Aktiv</SelectItem>
                <SelectItem value="inaktiv">Inaktiv</SelectItem>
                <SelectItem value="widerrufen">Widerrufen</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ausstellungsdatum">Ausstellungsdatum</Label>
            <Input
              id="ausstellungsdatum"
              type="date"
              value={fields.ausstellungsdatum ?? ''}
              onChange={e => setFields(f => ({ ...f, ausstellungsdatum: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Speichern...' : defaultValues ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}