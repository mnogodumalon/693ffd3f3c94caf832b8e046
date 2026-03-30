// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Schulungstermine {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    schulung?: string; // applookup -> URL zu 'Schulungskatalog' Record
    startdatum?: string; // Format: YYYY-MM-DD oder ISO String
    enddatum?: string; // Format: YYYY-MM-DD oder ISO String
    trainer?: string; // applookup -> URL zu 'Trainer' Record
    raum?: string; // applookup -> URL zu 'Raeume' Record
    status?: LookupValue;
    verfuegbare_plaetze?: number;
    bemerkungen?: string;
  };
}

export interface Schulungsanmeldung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    mitarbeiter?: string; // applookup -> URL zu 'Mitarbeiter' Record
    schulungstermin?: string; // applookup -> URL zu 'Schulungstermine' Record
    bemerkungen?: string;
  };
}

export interface Trainer {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    typ?: LookupValue;
    email?: string;
    telefon?: string;
    expertise?: LookupValue[];
    qualifikationen?: string;
  };
}

export interface Teilnehmerverwaltung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    schulungstermin?: string; // applookup -> URL zu 'Schulungstermine' Record
    anmeldedatum?: string; // Format: YYYY-MM-DD oder ISO String
    status?: LookupValue;
    anwesenheit?: boolean;
    bemerkungen?: string;
    mitarbeiter?: string; // applookup -> URL zu 'Mitarbeiter' Record
    zertifikat_ausgestellt?: boolean;
  };
}

export interface Zertifikate {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    teilnahme?: string; // applookup -> URL zu 'Teilnehmerverwaltung' Record
    empfaenger?: string; // applookup -> URL zu 'Mitarbeiter' Record
    schulung?: string; // applookup -> URL zu 'Schulungskatalog' Record
    zertifikatstyp?: LookupValue;
    zertifikatsnummer?: string;
    beschreibung?: string;
    aussteller?: string;
    aussteller_position?: string;
    unterschrift?: string;
    siegel?: string;
    logo?: string;
    vorlage?: LookupValue;
    hintergrundfarbe?: LookupValue;
    schriftart?: string;
    layoutwuensche?: string;
    qr_code_url?: string;
    digitale_signatur?: boolean;
    social_media?: string;
    status?: LookupValue;
    ausstellungsdatum?: string; // Format: YYYY-MM-DD oder ISO String
  };
}

export interface Bewertungen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    teilnahme?: string; // applookup -> URL zu 'Teilnehmerverwaltung' Record
    gesamtbewertung?: LookupValue;
    inhaltsbewertung?: LookupValue;
    organisationsbewertung?: LookupValue;
    kommentar?: string;
    verbesserungsvorschlaege?: string;
    trainerbewertung?: LookupValue;
  };
}

export interface Raeume {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    raumname?: string;
    standort?: string;
    kapazitaet?: number;
    ausstattung?: LookupValue[];
    bemerkungen?: string;
  };
}

export interface Mitarbeiter {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    nachname?: string;
    personalnummer?: string;
    telefon?: string;
    abteilung?: string;
    vorname?: string;
    email?: string;
    position?: string;
  };
}

export interface Schulungskatalog {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    kategorie?: LookupValue;
    dauer_tage?: number;
    max_teilnehmer?: number;
    zielgruppe?: string;
    lernziele?: string;
    voraussetzungen?: string;
    titel?: string;
    beschreibung?: string;
    elearning_dateien?: string;
  };
}

export const APP_IDS = {
  SCHULUNGSTERMINE: '693ffd1c598f914b8770d838',
  SCHULUNGSANMELDUNG: '693ffd1ed4fbbcda56f1b83e',
  TRAINER: '693ffd1961c93d563b523829',
  TEILNEHMERVERWALTUNG: '693ffd1c2abdda157f9b3873',
  ZERTIFIKATE: '69400b1ad27549fae3a988e8',
  BEWERTUNGEN: '693ffd1d0fd5fac77b223db6',
  RAEUME: '693ffd1ab347945f97bce858',
  MITARBEITER: '693ffd127128a18c7909c8d2',
  SCHULUNGSKATALOG: '693ffd1b64c092bd3fb64dec',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'schulungstermine': {
    status: [{ key: "geplant", label: "Geplant" }, { key: "bestaetigt", label: "Bestätigt" }, { key: "durchgefuehrt", label: "Durchgeführt" }, { key: "abgesagt", label: "Abgesagt" }],
  },
  'trainer': {
    typ: [{ key: "extern", label: "Extern" }, { key: "intern", label: "Intern" }],
    expertise: [{ key: "it_software", label: "IT & Software" }, { key: "fuehrung_management", label: "Führung & Management" }, { key: "kommunikation", label: "Kommunikation" }, { key: "projektmanagement", label: "Projektmanagement" }, { key: "vertrieb_marketing", label: "Vertrieb & Marketing" }, { key: "compliance_recht", label: "Compliance & Recht" }, { key: "gesundheit_sicherheit", label: "Gesundheit & Sicherheit" }, { key: "persoenliche_entwicklung", label: "Persönliche Entwicklung" }],
  },
  'teilnehmerverwaltung': {
    status: [{ key: "angemeldet", label: "Angemeldet" }, { key: "warteliste", label: "Warteliste" }, { key: "teilgenommen", label: "Teilgenommen" }, { key: "abgesagt", label: "Abgesagt" }, { key: "nicht_erschienen", label: "Nicht erschienen" }],
  },
  'zertifikate': {
    zertifikatstyp: [{ key: "teilnahmebestaetigung", label: "Teilnahmebestätigung" }, { key: "abschlusszertifikat", label: "Abschlusszertifikat" }],
    vorlage: [{ key: "klassisch", label: "Klassisch" }, { key: "modern", label: "Modern" }, { key: "individuell", label: "Individuell" }],
    hintergrundfarbe: [{ key: "weiss", label: "Weiß" }, { key: "blau", label: "Blau" }, { key: "gruen", label: "Grün" }, { key: "gelb", label: "Gelb" }, { key: "individuell", label: "Individuell" }],
    status: [{ key: "aktiv", label: "Aktiv" }, { key: "inaktiv", label: "Inaktiv" }, { key: "widerrufen", label: "Widerrufen" }],
  },
  'bewertungen': {
    gesamtbewertung: [{ key: "rating_1", label: "1 - Sehr schlecht" }, { key: "rating_2", label: "2 - Schlecht" }, { key: "rating_3", label: "3 - Befriedigend" }, { key: "rating_4", label: "4 - Gut" }, { key: "rating_5", label: "5 - Sehr gut" }],
    inhaltsbewertung: [{ key: "rating_1", label: "1 - Sehr schlecht" }, { key: "rating_2", label: "2 - Schlecht" }, { key: "rating_3", label: "3 - Befriedigend" }, { key: "rating_4", label: "4 - Gut" }, { key: "rating_5", label: "5 - Sehr gut" }],
    organisationsbewertung: [{ key: "rating_1", label: "1 - Sehr schlecht" }, { key: "rating_2", label: "2 - Schlecht" }, { key: "rating_3", label: "3 - Befriedigend" }, { key: "rating_4", label: "4 - Gut" }, { key: "rating_5", label: "5 - Sehr gut" }],
    trainerbewertung: [{ key: "rating_1", label: "1 - Sehr schlecht" }, { key: "rating_2", label: "2 - Schlecht" }, { key: "rating_3", label: "3 - Befriedigend" }, { key: "rating_4", label: "4 - Gut" }, { key: "rating_5", label: "5 - Sehr gut" }],
  },
  'raeume': {
    ausstattung: [{ key: "beamer", label: "Beamer" }, { key: "whiteboard", label: "Whiteboard" }, { key: "flipchart", label: "Flipchart" }, { key: "computer", label: "Computer" }, { key: "wlan", label: "WLAN" }, { key: "videokonferenz", label: "Videokonferenz" }, { key: "klimaanlage", label: "Klimaanlage" }, { key: "barrierefrei", label: "Barrierefreier Zugang" }],
  },
  'schulungskatalog': {
    kategorie: [{ key: "it_software", label: "IT & Software" }, { key: "fuehrung_management", label: "Führung & Management" }, { key: "kommunikation", label: "Kommunikation" }, { key: "projektmanagement", label: "Projektmanagement" }, { key: "vertrieb_marketing", label: "Vertrieb & Marketing" }, { key: "compliance_recht", label: "Compliance & Recht" }, { key: "gesundheit_sicherheit", label: "Gesundheit & Sicherheit" }, { key: "persoenliche_entwicklung", label: "Persönliche Entwicklung" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'schulungstermine': {
    'schulung': 'applookup/select',
    'startdatum': 'date/datetimeminute',
    'enddatum': 'date/datetimeminute',
    'trainer': 'applookup/select',
    'raum': 'applookup/select',
    'status': 'lookup/select',
    'verfuegbare_plaetze': 'number',
    'bemerkungen': 'string/textarea',
  },
  'schulungsanmeldung': {
    'mitarbeiter': 'applookup/select',
    'schulungstermin': 'applookup/select',
    'bemerkungen': 'string/textarea',
  },
  'trainer': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'typ': 'lookup/select',
    'email': 'string/email',
    'telefon': 'string/tel',
    'expertise': 'multiplelookup/checkbox',
    'qualifikationen': 'string/textarea',
  },
  'teilnehmerverwaltung': {
    'schulungstermin': 'applookup/select',
    'anmeldedatum': 'date/date',
    'status': 'lookup/select',
    'anwesenheit': 'bool',
    'bemerkungen': 'string/textarea',
    'mitarbeiter': 'applookup/select',
    'zertifikat_ausgestellt': 'bool',
  },
  'zertifikate': {
    'teilnahme': 'applookup/select',
    'empfaenger': 'applookup/select',
    'schulung': 'applookup/select',
    'zertifikatstyp': 'lookup/select',
    'zertifikatsnummer': 'string/text',
    'beschreibung': 'string/textarea',
    'aussteller': 'string/text',
    'aussteller_position': 'string/text',
    'unterschrift': 'string/text',
    'siegel': 'string/text',
    'logo': 'string/text',
    'vorlage': 'lookup/select',
    'hintergrundfarbe': 'lookup/select',
    'schriftart': 'string/text',
    'layoutwuensche': 'string/textarea',
    'qr_code_url': 'string/text',
    'digitale_signatur': 'bool',
    'social_media': 'string/text',
    'status': 'lookup/select',
    'ausstellungsdatum': 'date/date',
  },
  'bewertungen': {
    'teilnahme': 'applookup/select',
    'gesamtbewertung': 'lookup/radio',
    'inhaltsbewertung': 'lookup/radio',
    'organisationsbewertung': 'lookup/radio',
    'kommentar': 'string/textarea',
    'verbesserungsvorschlaege': 'string/textarea',
    'trainerbewertung': 'lookup/radio',
  },
  'raeume': {
    'raumname': 'string/text',
    'standort': 'string/text',
    'kapazitaet': 'number',
    'ausstattung': 'multiplelookup/checkbox',
    'bemerkungen': 'string/textarea',
  },
  'mitarbeiter': {
    'nachname': 'string/text',
    'personalnummer': 'string/text',
    'telefon': 'string/tel',
    'abteilung': 'string/text',
    'vorname': 'string/text',
    'email': 'string/email',
    'position': 'string/text',
  },
  'schulungskatalog': {
    'kategorie': 'lookup/select',
    'dauer_tage': 'number',
    'max_teilnehmer': 'number',
    'zielgruppe': 'string/text',
    'lernziele': 'string/textarea',
    'voraussetzungen': 'string/textarea',
    'titel': 'string/text',
    'beschreibung': 'string/textarea',
    'elearning_dateien': 'file',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateSchulungstermine = StripLookup<Schulungstermine['fields']>;
export type CreateSchulungsanmeldung = StripLookup<Schulungsanmeldung['fields']>;
export type CreateTrainer = StripLookup<Trainer['fields']>;
export type CreateTeilnehmerverwaltung = StripLookup<Teilnehmerverwaltung['fields']>;
export type CreateZertifikate = StripLookup<Zertifikate['fields']>;
export type CreateBewertungen = StripLookup<Bewertungen['fields']>;
export type CreateRaeume = StripLookup<Raeume['fields']>;
export type CreateMitarbeiter = StripLookup<Mitarbeiter['fields']>;
export type CreateSchulungskatalog = StripLookup<Schulungskatalog['fields']>;