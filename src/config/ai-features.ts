/**
 * AI feature toggles per entity.
 * Set to true to show "Foto scannen" button in the create/edit dialog.
 * The agent can change these values — all other AI files are pre-generated.
 */

export const AI_PHOTO_SCAN: Record<string, boolean> = {
  Schulungstermine: true,
  Zertifikate: true,
  Schulungsanmeldung: true,
  Raeume: true,
  Trainer: true,
  Bewertungen: true,
  Teilnehmerverwaltung: true,
  Schulungskatalog: true,
  Mitarbeiter: true,
};

/**
 * Extract GPS coordinates from photo EXIF metadata and use them
 * to provide location context (reverse geocoding) to the AI extraction
 * and to auto-populate geo fields.
 */
export const AI_PHOTO_LOCATION: Record<string, boolean> = {
  Schulungstermine: true,
  Zertifikate: true,
  Schulungsanmeldung: true,
  Raeume: true,
  Trainer: true,
  Bewertungen: true,
  Teilnehmerverwaltung: true,
  Schulungskatalog: true,
  Mitarbeiter: true,
};