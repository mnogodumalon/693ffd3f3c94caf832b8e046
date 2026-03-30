import { useState, useEffect, useRef, useCallback } from 'react';
import type { Trainer } from '@/types/app';
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
import { IconCamera, IconCircleCheck, IconFileText, IconLoader2, IconPhotoPlus, IconSparkles, IconUpload, IconX } from '@tabler/icons-react';
import { fileToDataUri, extractFromPhoto, extractPhotoMeta, reverseGeocode } from '@/lib/ai';
import { lookupKey, lookupKeys } from '@/lib/formatters';

interface TrainerDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Trainer['fields']) => Promise<void>;
  defaultValues?: Trainer['fields'];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

export function TrainerDialog({ open, onClose, onSubmit, defaultValues, enablePhotoScan = true, enablePhotoLocation = true }: TrainerDialogProps) {
  const [fields, setFields] = useState<Partial<Trainer['fields']>>({});
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
      const clean = cleanFieldsForApi({ ...fields }, 'trainer');
      await onSubmit(clean as Trainer['fields']);
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
      if (usePersonalInfo) {
        try {
          const profile = await getUserProfile();
          contextParts.push(`<user-profile>\nThe following is the logged-in user\'s personal information. Use this to pre-fill relevant fields like name, email, address, company etc. when appropriate:\n${JSON.stringify(profile, null, 2)}\n</user-profile>`);
        } catch (err) {
          console.warn('Failed to fetch user profile:', err);
        }
      }
      const photoContext = contextParts.length ? contextParts.join('\n') : undefined;
      const schema = `{\n  "vorname": string | null, // Vorname\n  "nachname": string | null, // Nachname\n  "typ": LookupValue | null, // Trainer-Typ (select one key: "extern" | "intern") mapping: extern=Extern, intern=Intern\n  "email": string | null, // E-Mail\n  "telefon": string | null, // Telefon\n  "expertise": LookupValue[] | null, // Expertise-Bereiche (select one or more keys: "it_software" | "fuehrung_management" | "kommunikation" | "projektmanagement" | "vertrieb_marketing" | "compliance_recht" | "gesundheit_sicherheit" | "persoenliche_entwicklung") mapping: it_software=IT & Software, fuehrung_management=Führung & Management, kommunikation=Kommunikation, projektmanagement=Projektmanagement, vertrieb_marketing=Vertrieb & Marketing, compliance_recht=Compliance & Recht, gesundheit_sicherheit=Gesundheit & Sicherheit, persoenliche_entwicklung=Persönliche Entwicklung\n  "qualifikationen": string | null, // Qualifikationen & Zertifikate\n}`;
      const raw = await extractFromPhoto<Record<string, unknown>>(uri, schema, photoContext, DIALOG_INTENT);
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        for (const [k, v] of Object.entries(raw)) {
          if (v != null) merged[k] = v;
        }
        return merged as Partial<Trainer['fields']>;
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

  const DIALOG_INTENT = defaultValues ? 'Trainer bearbeiten' : 'Trainer hinzufügen';

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
                <IconSparkles className="h-4 w-4 text-primary" />
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
                    <IconLoader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">KI analysiert...</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Felder werden automatisch ausgefüllt</p>
                  </div>
                </div>
              ) : scanSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <IconCircleCheck className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">Felder ausgefüllt!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Prüfe die Werte und passe sie ggf. an</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/8 flex items-center justify-center">
                    <IconPhotoPlus className="h-7 w-7 text-primary/70" />
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
                      className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-muted-foreground/80 text-white flex items-center justify-center"
                    >
                      <IconX className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); cameraInputRef.current?.click(); }}>
                <IconCamera className="h-3.5 w-3.5 mr-1.5" />Kamera
              </Button>
              <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <IconUpload className="h-3.5 w-3.5 mr-1.5" />Foto wählen
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
                <IconFileText className="h-3.5 w-3.5 mr-1.5" />Dokument
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vorname">Vorname</Label>
            <Input
              id="vorname"
              value={fields.vorname ?? ''}
              onChange={e => setFields(f => ({ ...f, vorname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nachname">Nachname</Label>
            <Input
              id="nachname"
              value={fields.nachname ?? ''}
              onChange={e => setFields(f => ({ ...f, nachname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="typ">Trainer-Typ</Label>
            <Select
              value={lookupKey(fields.typ) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, typ: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="typ"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="extern">Extern</SelectItem>
                <SelectItem value="intern">Intern</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              value={fields.email ?? ''}
              onChange={e => setFields(f => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefon">Telefon</Label>
            <Input
              id="telefon"
              value={fields.telefon ?? ''}
              onChange={e => setFields(f => ({ ...f, telefon: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expertise">Expertise-Bereiche</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="expertise_it_software"
                  checked={lookupKeys(fields.expertise).includes('it_software')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.expertise);
                      const next = checked ? [...current, 'it_software'] : current.filter(k => k !== 'it_software');
                      return { ...f, expertise: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="expertise_it_software" className="font-normal">IT & Software</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="expertise_fuehrung_management"
                  checked={lookupKeys(fields.expertise).includes('fuehrung_management')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.expertise);
                      const next = checked ? [...current, 'fuehrung_management'] : current.filter(k => k !== 'fuehrung_management');
                      return { ...f, expertise: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="expertise_fuehrung_management" className="font-normal">Führung & Management</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="expertise_kommunikation"
                  checked={lookupKeys(fields.expertise).includes('kommunikation')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.expertise);
                      const next = checked ? [...current, 'kommunikation'] : current.filter(k => k !== 'kommunikation');
                      return { ...f, expertise: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="expertise_kommunikation" className="font-normal">Kommunikation</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="expertise_projektmanagement"
                  checked={lookupKeys(fields.expertise).includes('projektmanagement')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.expertise);
                      const next = checked ? [...current, 'projektmanagement'] : current.filter(k => k !== 'projektmanagement');
                      return { ...f, expertise: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="expertise_projektmanagement" className="font-normal">Projektmanagement</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="expertise_vertrieb_marketing"
                  checked={lookupKeys(fields.expertise).includes('vertrieb_marketing')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.expertise);
                      const next = checked ? [...current, 'vertrieb_marketing'] : current.filter(k => k !== 'vertrieb_marketing');
                      return { ...f, expertise: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="expertise_vertrieb_marketing" className="font-normal">Vertrieb & Marketing</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="expertise_compliance_recht"
                  checked={lookupKeys(fields.expertise).includes('compliance_recht')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.expertise);
                      const next = checked ? [...current, 'compliance_recht'] : current.filter(k => k !== 'compliance_recht');
                      return { ...f, expertise: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="expertise_compliance_recht" className="font-normal">Compliance & Recht</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="expertise_gesundheit_sicherheit"
                  checked={lookupKeys(fields.expertise).includes('gesundheit_sicherheit')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.expertise);
                      const next = checked ? [...current, 'gesundheit_sicherheit'] : current.filter(k => k !== 'gesundheit_sicherheit');
                      return { ...f, expertise: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="expertise_gesundheit_sicherheit" className="font-normal">Gesundheit & Sicherheit</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="expertise_persoenliche_entwicklung"
                  checked={lookupKeys(fields.expertise).includes('persoenliche_entwicklung')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.expertise);
                      const next = checked ? [...current, 'persoenliche_entwicklung'] : current.filter(k => k !== 'persoenliche_entwicklung');
                      return { ...f, expertise: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="expertise_persoenliche_entwicklung" className="font-normal">Persönliche Entwicklung</Label>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="qualifikationen">Qualifikationen & Zertifikate</Label>
            <Textarea
              id="qualifikationen"
              value={fields.qualifikationen ?? ''}
              onChange={e => setFields(f => ({ ...f, qualifikationen: e.target.value }))}
              rows={3}
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