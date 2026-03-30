import type { EnrichedBewertungen, EnrichedSchulungsanmeldung, EnrichedSchulungstermine, EnrichedTeilnehmerverwaltung, EnrichedZertifikate } from '@/types/enriched';
import type { Bewertungen, Mitarbeiter, Raeume, Schulungsanmeldung, Schulungskatalog, Schulungstermine, Teilnehmerverwaltung, Trainer, Zertifikate } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface SchulungstermineMaps {
  schulungskatalogMap: Map<string, Schulungskatalog>;
  trainerMap: Map<string, Trainer>;
  raeumeMap: Map<string, Raeume>;
}

export function enrichSchulungstermine(
  schulungstermine: Schulungstermine[],
  maps: SchulungstermineMaps
): EnrichedSchulungstermine[] {
  return schulungstermine.map(r => ({
    ...r,
    schulungName: resolveDisplay(r.fields.schulung, maps.schulungskatalogMap, 'titel'),
    trainerName: resolveDisplay(r.fields.trainer, maps.trainerMap, 'vorname', 'nachname'),
    raumName: resolveDisplay(r.fields.raum, maps.raeumeMap, 'raumname'),
  }));
}

interface SchulungsanmeldungMaps {
  mitarbeiterMap: Map<string, Mitarbeiter>;
  schulungstermineMap: Map<string, Schulungstermine>;
}

export function enrichSchulungsanmeldung(
  schulungsanmeldung: Schulungsanmeldung[],
  maps: SchulungsanmeldungMaps
): EnrichedSchulungsanmeldung[] {
  return schulungsanmeldung.map(r => ({
    ...r,
    mitarbeiterName: resolveDisplay(r.fields.mitarbeiter, maps.mitarbeiterMap, 'vorname', 'nachname'),
    schulungsterminName: resolveDisplay(r.fields.schulungstermin, maps.schulungstermineMap, 'bemerkungen'),
  }));
}

interface TeilnehmerverwaltungMaps {
  schulungstermineMap: Map<string, Schulungstermine>;
  mitarbeiterMap: Map<string, Mitarbeiter>;
}

export function enrichTeilnehmerverwaltung(
  teilnehmerverwaltung: Teilnehmerverwaltung[],
  maps: TeilnehmerverwaltungMaps
): EnrichedTeilnehmerverwaltung[] {
  return teilnehmerverwaltung.map(r => ({
    ...r,
    schulungsterminName: resolveDisplay(r.fields.schulungstermin, maps.schulungstermineMap, 'bemerkungen'),
    mitarbeiterName: resolveDisplay(r.fields.mitarbeiter, maps.mitarbeiterMap, 'vorname', 'nachname'),
  }));
}

interface ZertifikateMaps {
  teilnehmerverwaltungMap: Map<string, Teilnehmerverwaltung>;
  mitarbeiterMap: Map<string, Mitarbeiter>;
  schulungskatalogMap: Map<string, Schulungskatalog>;
}

export function enrichZertifikate(
  zertifikate: Zertifikate[],
  maps: ZertifikateMaps
): EnrichedZertifikate[] {
  return zertifikate.map(r => ({
    ...r,
    teilnahmeName: resolveDisplay(r.fields.teilnahme, maps.teilnehmerverwaltungMap, 'bemerkungen'),
    empfaengerName: resolveDisplay(r.fields.empfaenger, maps.mitarbeiterMap, 'vorname', 'nachname'),
    schulungName: resolveDisplay(r.fields.schulung, maps.schulungskatalogMap, 'titel'),
  }));
}

interface BewertungenMaps {
  teilnehmerverwaltungMap: Map<string, Teilnehmerverwaltung>;
}

export function enrichBewertungen(
  bewertungen: Bewertungen[],
  maps: BewertungenMaps
): EnrichedBewertungen[] {
  return bewertungen.map(r => ({
    ...r,
    teilnahmeName: resolveDisplay(r.fields.teilnahme, maps.teilnehmerverwaltungMap, 'bemerkungen'),
  }));
}
