import type { Bewertungen, Schulungsanmeldung, Schulungstermine, Teilnehmerverwaltung, Zertifikate } from './app';

export type EnrichedSchulungstermine = Schulungstermine & {
  schulungName: string;
  trainerName: string;
  raumName: string;
};

export type EnrichedSchulungsanmeldung = Schulungsanmeldung & {
  mitarbeiterName: string;
  schulungsterminName: string;
};

export type EnrichedTeilnehmerverwaltung = Teilnehmerverwaltung & {
  schulungsterminName: string;
  mitarbeiterName: string;
};

export type EnrichedZertifikate = Zertifikate & {
  teilnahmeName: string;
  empfaengerName: string;
  schulungName: string;
};

export type EnrichedBewertungen = Bewertungen & {
  teilnahmeName: string;
};
