// AUTOMATICALLY GENERATED SERVICE
import { APP_IDS, LOOKUP_OPTIONS, FIELD_TYPES } from '@/types/app';
import type { Schulungstermine, Zertifikate, Schulungsanmeldung, Raeume, Trainer, Bewertungen, Teilnehmerverwaltung, Schulungskatalog, Mitarbeiter } from '@/types/app';

// Base Configuration
const API_BASE_URL = 'https://my.living-apps.de/rest';

// --- HELPER FUNCTIONS ---
export function extractRecordId(url: unknown): string | null {
  if (!url) return null;
  if (typeof url !== 'string') return null;
  const match = url.match(/([a-f0-9]{24})$/i);
  return match ? match[1] : null;
}

export function createRecordUrl(appId: string, recordId: string): string {
  return `https://my.living-apps.de/rest/apps/${appId}/records/${recordId}`;
}

async function callApi(method: string, endpoint: string, data?: any) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',  // Nutze Session Cookies für Auth
    body: data ? JSON.stringify(data) : undefined
  });
  if (!response.ok) throw new Error(await response.text());
  // DELETE returns often empty body or simple status
  if (method === 'DELETE') return true;
  return response.json();
}

/** Upload a file to LivingApps. Returns the file URL for use in record fields. */
export async function uploadFile(file: File | Blob, filename?: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file, filename ?? (file instanceof File ? file.name : 'upload'));
  const res = await fetch(`${API_BASE_URL}/files`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) throw new Error(`File upload failed: ${res.status}`);
  const data = await res.json();
  return data.url;
}

function enrichLookupFields<T extends { fields: Record<string, unknown> }>(
  records: T[], entityKey: string
): T[] {
  const opts = LOOKUP_OPTIONS[entityKey];
  if (!opts) return records;
  return records.map(r => {
    const fields = { ...r.fields };
    for (const [fieldKey, options] of Object.entries(opts)) {
      const val = fields[fieldKey];
      if (typeof val === 'string') {
        const m = options.find(o => o.key === val);
        fields[fieldKey] = m ?? { key: val, label: val };
      } else if (Array.isArray(val)) {
        fields[fieldKey] = val.map(v => {
          if (typeof v === 'string') {
            const m = options.find(o => o.key === v);
            return m ?? { key: v, label: v };
          }
          return v;
        });
      }
    }
    return { ...r, fields } as T;
  });
}

/** Normalize fields for API writes: strip lookup objects to keys, fix date formats. */
export function cleanFieldsForApi(
  fields: Record<string, unknown>,
  entityKey: string
): Record<string, unknown> {
  const clean: Record<string, unknown> = { ...fields };
  for (const [k, v] of Object.entries(clean)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && 'key' in v) clean[k] = (v as any).key;
    if (Array.isArray(v)) clean[k] = v.map((item: any) => item && typeof item === 'object' && 'key' in item ? item.key : item);
  }
  const types = FIELD_TYPES[entityKey];
  if (types) {
    for (const [k, ft] of Object.entries(types)) {
      const val = clean[k];
      if (typeof val !== 'string' || !val) continue;
      if (ft === 'date/datetimeminute') clean[k] = val.slice(0, 16);
      else if (ft === 'date/date') clean[k] = val.slice(0, 10);
    }
  }
  return clean;
}

let _cachedUserProfile: Record<string, unknown> | null = null;

export async function getUserProfile(): Promise<Record<string, unknown>> {
  if (_cachedUserProfile) return _cachedUserProfile;
  const raw = await callApi('GET', '/user');
  const skip = new Set(['id', 'image', 'lang', 'gender', 'title', 'fax', 'menus', 'initials']);
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v != null && !skip.has(k)) data[k] = v;
  }
  _cachedUserProfile = data;
  return data;
}

export interface HeaderProfile {
  firstname: string;
  surname: string;
  email: string;
  image: string | null;
  company: string | null;
}

let _cachedHeaderProfile: HeaderProfile | null = null;

export async function getHeaderProfile(): Promise<HeaderProfile> {
  if (_cachedHeaderProfile) return _cachedHeaderProfile;
  const raw = await callApi('GET', '/user');
  _cachedHeaderProfile = {
    firstname: raw.firstname ?? '',
    surname: raw.surname ?? '',
    email: raw.email ?? '',
    image: raw.image ?? null,
    company: raw.company ?? null,
  };
  return _cachedHeaderProfile;
}

export interface AppGroupInfo {
  id: string;
  name: string;
  image: string | null;
  createdat: string;
  /** Resolved link: /objects/{id}/ if the dashboard exists, otherwise /gateway/apps/{firstAppId}?template=list_page */
  href: string;
}

let _cachedAppGroups: AppGroupInfo[] | null = null;

export async function getAppGroups(): Promise<AppGroupInfo[]> {
  if (_cachedAppGroups) return _cachedAppGroups;
  const raw = await callApi('GET', '/appgroups?with=apps');
  const groups: AppGroupInfo[] = Object.values(raw)
    .map((g: any) => {
      const firstAppId = Object.keys(g.apps ?? {})[0] ?? g.id;
      return {
        id: g.id,
        name: g.name,
        image: g.image ?? null,
        createdat: g.createdat ?? '',
        href: `/gateway/apps/${firstAppId}?template=list_page`,
        _firstAppId: firstAppId,
      };
    })
    .sort((a, b) => b.createdat.localeCompare(a.createdat));

  // Check which appgroups have a working dashboard at /objects/{id}/
  const checks = await Promise.allSettled(
    groups.map(g => fetch(`/objects/${g.id}/`, { method: 'HEAD', credentials: 'include' }))
  );
  checks.forEach((result, i) => {
    if (result.status === 'fulfilled' && result.value.ok) {
      groups[i].href = `/objects/${groups[i].id}/`;
    }
  });

  // Clean up internal helper property
  groups.forEach(g => delete (g as any)._firstAppId);

  _cachedAppGroups = groups;
  return _cachedAppGroups;
}

export class LivingAppsService {
  // --- SCHULUNGSTERMINE ---
  static async getSchulungstermine(): Promise<Schulungstermine[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.SCHULUNGSTERMINE}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Schulungstermine[];
    return enrichLookupFields(records, 'schulungstermine');
  }
  static async getSchulungstermineEntry(id: string): Promise<Schulungstermine | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.SCHULUNGSTERMINE}/records/${id}`);
    const record = { record_id: data.id, ...data } as Schulungstermine;
    return enrichLookupFields([record], 'schulungstermine')[0];
  }
  static async createSchulungstermineEntry(fields: Schulungstermine['fields']) {
    return callApi('POST', `/apps/${APP_IDS.SCHULUNGSTERMINE}/records`, { fields });
  }
  static async updateSchulungstermineEntry(id: string, fields: Partial<Schulungstermine['fields']>) {
    return callApi('PATCH', `/apps/${APP_IDS.SCHULUNGSTERMINE}/records/${id}`, { fields });
  }
  static async deleteSchulungstermineEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.SCHULUNGSTERMINE}/records/${id}`);
  }

  // --- ZERTIFIKATE ---
  static async getZertifikate(): Promise<Zertifikate[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.ZERTIFIKATE}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Zertifikate[];
    return enrichLookupFields(records, 'zertifikate');
  }
  static async getZertifikateEntry(id: string): Promise<Zertifikate | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.ZERTIFIKATE}/records/${id}`);
    const record = { record_id: data.id, ...data } as Zertifikate;
    return enrichLookupFields([record], 'zertifikate')[0];
  }
  static async createZertifikateEntry(fields: Zertifikate['fields']) {
    return callApi('POST', `/apps/${APP_IDS.ZERTIFIKATE}/records`, { fields });
  }
  static async updateZertifikateEntry(id: string, fields: Partial<Zertifikate['fields']>) {
    return callApi('PATCH', `/apps/${APP_IDS.ZERTIFIKATE}/records/${id}`, { fields });
  }
  static async deleteZertifikateEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.ZERTIFIKATE}/records/${id}`);
  }

  // --- SCHULUNGSANMELDUNG ---
  static async getSchulungsanmeldung(): Promise<Schulungsanmeldung[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.SCHULUNGSANMELDUNG}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Schulungsanmeldung[];
    return enrichLookupFields(records, 'schulungsanmeldung');
  }
  static async getSchulungsanmeldungEntry(id: string): Promise<Schulungsanmeldung | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.SCHULUNGSANMELDUNG}/records/${id}`);
    const record = { record_id: data.id, ...data } as Schulungsanmeldung;
    return enrichLookupFields([record], 'schulungsanmeldung')[0];
  }
  static async createSchulungsanmeldungEntry(fields: Schulungsanmeldung['fields']) {
    return callApi('POST', `/apps/${APP_IDS.SCHULUNGSANMELDUNG}/records`, { fields });
  }
  static async updateSchulungsanmeldungEntry(id: string, fields: Partial<Schulungsanmeldung['fields']>) {
    return callApi('PATCH', `/apps/${APP_IDS.SCHULUNGSANMELDUNG}/records/${id}`, { fields });
  }
  static async deleteSchulungsanmeldungEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.SCHULUNGSANMELDUNG}/records/${id}`);
  }

  // --- RAEUME ---
  static async getRaeume(): Promise<Raeume[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.RAEUME}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Raeume[];
    return enrichLookupFields(records, 'raeume');
  }
  static async getRaeumeEntry(id: string): Promise<Raeume | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.RAEUME}/records/${id}`);
    const record = { record_id: data.id, ...data } as Raeume;
    return enrichLookupFields([record], 'raeume')[0];
  }
  static async createRaeumeEntry(fields: Raeume['fields']) {
    return callApi('POST', `/apps/${APP_IDS.RAEUME}/records`, { fields });
  }
  static async updateRaeumeEntry(id: string, fields: Partial<Raeume['fields']>) {
    return callApi('PATCH', `/apps/${APP_IDS.RAEUME}/records/${id}`, { fields });
  }
  static async deleteRaeumeEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.RAEUME}/records/${id}`);
  }

  // --- TRAINER ---
  static async getTrainer(): Promise<Trainer[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.TRAINER}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Trainer[];
    return enrichLookupFields(records, 'trainer');
  }
  static async getTrainerEntry(id: string): Promise<Trainer | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.TRAINER}/records/${id}`);
    const record = { record_id: data.id, ...data } as Trainer;
    return enrichLookupFields([record], 'trainer')[0];
  }
  static async createTrainerEntry(fields: Trainer['fields']) {
    return callApi('POST', `/apps/${APP_IDS.TRAINER}/records`, { fields });
  }
  static async updateTrainerEntry(id: string, fields: Partial<Trainer['fields']>) {
    return callApi('PATCH', `/apps/${APP_IDS.TRAINER}/records/${id}`, { fields });
  }
  static async deleteTrainerEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.TRAINER}/records/${id}`);
  }

  // --- BEWERTUNGEN ---
  static async getBewertungen(): Promise<Bewertungen[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.BEWERTUNGEN}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Bewertungen[];
    return enrichLookupFields(records, 'bewertungen');
  }
  static async getBewertungenEntry(id: string): Promise<Bewertungen | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.BEWERTUNGEN}/records/${id}`);
    const record = { record_id: data.id, ...data } as Bewertungen;
    return enrichLookupFields([record], 'bewertungen')[0];
  }
  static async createBewertungenEntry(fields: Bewertungen['fields']) {
    return callApi('POST', `/apps/${APP_IDS.BEWERTUNGEN}/records`, { fields });
  }
  static async updateBewertungenEntry(id: string, fields: Partial<Bewertungen['fields']>) {
    return callApi('PATCH', `/apps/${APP_IDS.BEWERTUNGEN}/records/${id}`, { fields });
  }
  static async deleteBewertungenEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.BEWERTUNGEN}/records/${id}`);
  }

  // --- TEILNEHMERVERWALTUNG ---
  static async getTeilnehmerverwaltung(): Promise<Teilnehmerverwaltung[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.TEILNEHMERVERWALTUNG}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Teilnehmerverwaltung[];
    return enrichLookupFields(records, 'teilnehmerverwaltung');
  }
  static async getTeilnehmerverwaltungEntry(id: string): Promise<Teilnehmerverwaltung | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.TEILNEHMERVERWALTUNG}/records/${id}`);
    const record = { record_id: data.id, ...data } as Teilnehmerverwaltung;
    return enrichLookupFields([record], 'teilnehmerverwaltung')[0];
  }
  static async createTeilnehmerverwaltungEntry(fields: Teilnehmerverwaltung['fields']) {
    return callApi('POST', `/apps/${APP_IDS.TEILNEHMERVERWALTUNG}/records`, { fields });
  }
  static async updateTeilnehmerverwaltungEntry(id: string, fields: Partial<Teilnehmerverwaltung['fields']>) {
    return callApi('PATCH', `/apps/${APP_IDS.TEILNEHMERVERWALTUNG}/records/${id}`, { fields });
  }
  static async deleteTeilnehmerverwaltungEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.TEILNEHMERVERWALTUNG}/records/${id}`);
  }

  // --- SCHULUNGSKATALOG ---
  static async getSchulungskatalog(): Promise<Schulungskatalog[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.SCHULUNGSKATALOG}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Schulungskatalog[];
    return enrichLookupFields(records, 'schulungskatalog');
  }
  static async getSchulungskatalogEntry(id: string): Promise<Schulungskatalog | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.SCHULUNGSKATALOG}/records/${id}`);
    const record = { record_id: data.id, ...data } as Schulungskatalog;
    return enrichLookupFields([record], 'schulungskatalog')[0];
  }
  static async createSchulungskatalogEntry(fields: Schulungskatalog['fields']) {
    return callApi('POST', `/apps/${APP_IDS.SCHULUNGSKATALOG}/records`, { fields });
  }
  static async updateSchulungskatalogEntry(id: string, fields: Partial<Schulungskatalog['fields']>) {
    return callApi('PATCH', `/apps/${APP_IDS.SCHULUNGSKATALOG}/records/${id}`, { fields });
  }
  static async deleteSchulungskatalogEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.SCHULUNGSKATALOG}/records/${id}`);
  }

  // --- MITARBEITER ---
  static async getMitarbeiter(): Promise<Mitarbeiter[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.MITARBEITER}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Mitarbeiter[];
    return enrichLookupFields(records, 'mitarbeiter');
  }
  static async getMitarbeiterEntry(id: string): Promise<Mitarbeiter | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.MITARBEITER}/records/${id}`);
    const record = { record_id: data.id, ...data } as Mitarbeiter;
    return enrichLookupFields([record], 'mitarbeiter')[0];
  }
  static async createMitarbeiterEntry(fields: Mitarbeiter['fields']) {
    return callApi('POST', `/apps/${APP_IDS.MITARBEITER}/records`, { fields });
  }
  static async updateMitarbeiterEntry(id: string, fields: Partial<Mitarbeiter['fields']>) {
    return callApi('PATCH', `/apps/${APP_IDS.MITARBEITER}/records/${id}`, { fields });
  }
  static async deleteMitarbeiterEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.MITARBEITER}/records/${id}`);
  }

}