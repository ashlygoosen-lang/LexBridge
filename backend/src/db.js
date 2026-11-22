import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

export const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'data'))
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

export const db = new Database(path.join(DATA_DIR, 'lexbridge.db'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'client'
    CHECK (role IN ('client','lawyer','legal-aid','saps','prosecutor','clerk','judicial-officer','admin')),
  preferred_language TEXT NOT NULL DEFAULT 'en',
  identity_status TEXT NOT NULL DEFAULT 'not-started'
    CHECK (identity_status IN ('not-started','pending','verified','rejected')),
  id_last4 TEXT,
  identity_verified_at TEXT,
  account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active','suspended')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS lawyer_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  practitioner_type TEXT NOT NULL DEFAULT 'Attorney' CHECK (practitioner_type IN ('Attorney','Advocate')),
  firm TEXT,
  city TEXT,
  province TEXT,
  areas TEXT NOT NULL DEFAULT '[]',
  courts TEXT NOT NULL DEFAULT '[]',
  languages TEXT NOT NULL DEFAULT '["English"]',
  years_experience INTEGER NOT NULL DEFAULT 0,
  consult_fee INTEGER NOT NULL DEFAULT 85000,
  bio TEXT,
  photo_url TEXT,
  lpc_number TEXT,
  practising_cert_expiry TEXT,
  fidelity_cert TEXT,
  checks TEXT NOT NULL DEFAULT '{}',
  verification_status TEXT NOT NULL DEFAULT 'incomplete'
    CHECK (verification_status IN ('incomplete','pending','more-info','approved','rejected')),
  review_note TEXT,
  submitted_at TEXT,
  reviewed_at TEXT,
  rating REAL NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  response_minutes INTEGER NOT NULL DEFAULT 60,
  available INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS matters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,
  client_id INTEGER NOT NULL REFERENCES users(id),
  category TEXT NOT NULL CHECK (category IN ('criminal','civil','family','appeal','unsure')),
  side TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'Soon',
  budget TEXT,
  court_level TEXT,
  province TEXT,
  city TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','assigned','closed','cancelled')),
  lawyer_id INTEGER REFERENCES users(id),
  accepted_offer_id INTEGER,
  court_name TEXT,
  next_court_date TEXT,
  moderation_status TEXT NOT NULL DEFAULT 'visible' CHECK (moderation_status IN ('visible','hidden')),
  moderation_note TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_matters_client ON matters(client_id);
CREATE INDEX IF NOT EXISTS idx_matters_lawyer ON matters(lawyer_id);

CREATE TABLE IF NOT EXISTS offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  matter_id INTEGER NOT NULL REFERENCES matters(id),
  lawyer_id INTEGER NOT NULL REFERENCES users(id),
  consult_fee INTEGER NOT NULL,
  total_fee INTEGER NOT NULL,
  fee_structure TEXT NOT NULL DEFAULT 'Staged fee',
  note TEXT NOT NULL,
  breakdown TEXT NOT NULL DEFAULT '[]',
  inclusions TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','withdrawn')),
  viewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (matter_id, lawyer_id)
);

CREATE TABLE IF NOT EXISTS saved_matters (
  lawyer_id INTEGER NOT NULL REFERENCES users(id),
  matter_id INTEGER NOT NULL REFERENCES matters(id),
  PRIMARY KEY (lawyer_id, matter_id)
);

CREATE TABLE IF NOT EXISTS saved_lawyers (
  client_id INTEGER NOT NULL REFERENCES users(id),
  lawyer_id INTEGER NOT NULL REFERENCES users(id),
  PRIMARY KEY (client_id, lawyer_id)
);

CREATE TABLE IF NOT EXISTS matter_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  matter_id INTEGER NOT NULL REFERENCES matters(id),
  sender_id INTEGER NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS matter_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  matter_id INTEGER NOT NULL REFERENCES matters(id),
  uploader_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready','review')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS matter_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  matter_id INTEGER NOT NULL REFERENCES matters(id),
  created_by INTEGER REFERENCES users(id),
  kind TEXT NOT NULL CHECK (kind IN ('hearing','consultation','deadline','update','milestone')),
  title TEXT NOT NULL,
  details TEXT,
  event_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  matter_id INTEGER NOT NULL REFERENCES matters(id),
  offer_id INTEGER REFERENCES offers(id),
  client_id INTEGER NOT NULL REFERENCES users(id),
  lawyer_id INTEGER NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL CHECK (kind IN ('consultation','invoice')),
  description TEXT NOT NULL,
  amount INTEGER NOT NULL,
  vat INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','failed','refunded','disputed')),
  method TEXT,
  provider TEXT,
  provider_ref TEXT,
  dispute_note TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  paid_at TEXT
);

CREATE TABLE IF NOT EXISTS consultations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  matter_id INTEGER NOT NULL REFERENCES matters(id),
  lawyer_id INTEGER NOT NULL REFERENCES users(id),
  client_id INTEGER NOT NULL REFERENCES users(id),
  starts_at TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('video','phone','in-person')),
  status TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked','completed','cancelled')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_consult_slot ON consultations(lawyer_id, starts_at) WHERE status = 'booked';

CREATE TABLE IF NOT EXISTS mandates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  matter_id INTEGER NOT NULL REFERENCES matters(id),
  offer_id INTEGER NOT NULL REFERENCES offers(id),
  version TEXT NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  signed_name TEXT NOT NULL,
  signed_at TEXT NOT NULL,
  signer_ip TEXT,
  client_id INTEGER NOT NULL REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  matter_id INTEGER,
  case_id INTEGER,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  channel TEXT NOT NULL DEFAULT 'in-app' CHECK (channel IN ('in-app','email','sms')),
  delivery_status TEXT NOT NULL DEFAULT 'sent' CHECK (delivery_status IN ('queued','sent','failed','read')),
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_owner ON notifications(owner_id);

-- Police case management -------------------------------------------------
CREATE TABLE IF NOT EXISTS police_stations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  province TEXT NOT NULL DEFAULT 'Western Cape',
  district TEXT NOT NULL,
  commander TEXT,
  phone_numbers TEXT NOT NULL DEFAULT '[]',
  address TEXT NOT NULL,
  source_label TEXT,
  updated_from_source TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS police_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  incident_type TEXT NOT NULL,
  incident_date TEXT NOT NULL,
  incident_location TEXT NOT NULL,
  summary TEXT NOT NULL,
  is_emergency INTEGER NOT NULL DEFAULT 0,
  station_id INTEGER REFERENCES police_stations(id),
  official_status TEXT NOT NULL DEFAULT 'platform-draft'
    CHECK (official_status IN ('platform-draft','ready-for-saps','reported-to-saps','under-investigation','court-enrolled','closed')),
  cas_number TEXT,
  io_name TEXT,
  io_rank TEXT,
  io_contact TEXT,
  assigned_lawyer_id INTEGER REFERENCES users(id),
  linked_court TEXT,
  next_court_date TEXT,
  current_statement_id INTEGER,
  consent_saps INTEGER NOT NULL,
  consent_lawyer INTEGER NOT NULL,
  consent_sensitive INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_reports_owner ON police_reports(owner_id);

CREATE TABLE IF NOT EXISTS statement_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id INTEGER NOT NULL REFERENCES police_reports(id),
  owner_id INTEGER NOT NULL REFERENCES users(id),
  version_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('original','amendment')),
  change_summary TEXT,
  previous_revision_id INTEGER REFERENCES statement_revisions(id),
  changed_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (report_id, version_number)
);

CREATE TABLE IF NOT EXISTS case_timeline_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id INTEGER NOT NULL REFERENCES police_reports(id),
  owner_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  details TEXT,
  event_date TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('client','platform','saps','lawyer','court')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS case_evidence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id INTEGER NOT NULL REFERENCES police_reports(id),
  owner_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('photo','video','document','medical','communication','other')),
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  captured_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Digital justice ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS justice_cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,
  official_case_number TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  case_type TEXT NOT NULL CHECK (case_type IN ('criminal','civil')),
  stage TEXT NOT NULL DEFAULT 'intake'
    CHECK (stage IN ('intake','docket','prosecutor-review','enrolled','hearing','judgment','sentence','appeal','closed')),
  summary TEXT NOT NULL,
  jurisdiction TEXT,
  source_report_id INTEGER REFERENCES police_reports(id),
  court_name TEXT,
  next_deadline TEXT,
  detention_deadline TEXT,
  rights_confirmed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS case_participants (
  case_id INTEGER NOT NULL REFERENCES justice_cases(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  team TEXT NOT NULL CHECK (team IN ('clients','legalTeam','assignedPolice','courtTeam')),
  added_by INTEGER REFERENCES users(id),
  added_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (case_id, user_id, team)
);

CREATE TABLE IF NOT EXISTS docket_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL REFERENCES justice_cases(id),
  owner_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  entry_type TEXT NOT NULL,
  details TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS case_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL REFERENCES justice_cases(id),
  owner_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  file_type TEXT NOT NULL,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  filing_status TEXT NOT NULL DEFAULT 'submitted' CHECK (filing_status IN ('draft','submitted','accepted','rejected','sealed')),
  confidentiality TEXT NOT NULL DEFAULT 'case-participants',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS hearings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL REFERENCES justice_cases(id),
  owner_id INTEGER NOT NULL REFERENCES users(id),
  hearing_type TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  courtroom TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','in-progress','postponed','completed','cancelled')),
  outcome TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS court_decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL REFERENCES justice_cases(id),
  owner_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  decision_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  effective_at TEXT NOT NULL,
  appealable INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS case_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL REFERENCES justice_cases(id),
  owner_id INTEGER NOT NULL REFERENCES users(id),
  recipient_id INTEGER NOT NULL REFERENCES users(id),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS legal_aid_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL REFERENCES justice_cases(id),
  owner_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','screening','approved','declined','assigned')),
  motivation TEXT NOT NULL,
  assigned_practitioner_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS time_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL REFERENCES justice_cases(id),
  owner_id INTEGER NOT NULL REFERENCES users(id),
  description TEXT NOT NULL,
  worked_at TEXT NOT NULL,
  minutes INTEGER NOT NULL CHECK (minutes >= 1),
  billable INTEGER NOT NULL DEFAULT 1,
  hourly_rate REAL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS justice_audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL REFERENCES justice_cases(id),
  owner_id INTEGER NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Append-only records: the database itself refuses edits and deletes.
CREATE TRIGGER IF NOT EXISTS statement_revisions_no_update BEFORE UPDATE ON statement_revisions
BEGIN SELECT RAISE(ABORT, 'Statement revisions are append-only'); END;
CREATE TRIGGER IF NOT EXISTS statement_revisions_no_delete BEFORE DELETE ON statement_revisions
BEGIN SELECT RAISE(ABORT, 'Statement revisions are append-only'); END;
CREATE TRIGGER IF NOT EXISTS timeline_no_update BEFORE UPDATE ON case_timeline_events
BEGIN SELECT RAISE(ABORT, 'Timeline events are append-only'); END;
CREATE TRIGGER IF NOT EXISTS timeline_no_delete BEFORE DELETE ON case_timeline_events
BEGIN SELECT RAISE(ABORT, 'Timeline events are append-only'); END;
CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON justice_audit_logs
BEGIN SELECT RAISE(ABORT, 'Audit logs are append-only'); END;
CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON justice_audit_logs
BEGIN SELECT RAISE(ABORT, 'Audit logs are append-only'); END;
CREATE TRIGGER IF NOT EXISTS docket_no_update BEFORE UPDATE ON docket_entries
BEGIN SELECT RAISE(ABORT, 'Docket entries are append-only'); END;
CREATE TRIGGER IF NOT EXISTS docket_no_delete BEFORE DELETE ON docket_entries
BEGIN SELECT RAISE(ABORT, 'Docket entries are append-only'); END;
CREATE TRIGGER IF NOT EXISTS decisions_no_update BEFORE UPDATE ON court_decisions
BEGIN SELECT RAISE(ABORT, 'Court decisions are sealed'); END;
CREATE TRIGGER IF NOT EXISTS decisions_no_delete BEFORE DELETE ON court_decisions
BEGIN SELECT RAISE(ABORT, 'Court decisions are sealed'); END;
CREATE TRIGGER IF NOT EXISTS mandates_no_update BEFORE UPDATE ON mandates
BEGIN SELECT RAISE(ABORT, 'Signed mandates cannot be changed'); END;
`)

// Lightweight migrations for columns added after the first release.
const addColumn = (table, column, ddl) => {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name)
  if (!cols.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`)
}
addColumn('payments', 'refund_amount', 'INTEGER NOT NULL DEFAULT 0')
addColumn('payments', 'refund_reason', 'TEXT')
addColumn('payments', 'refund_status', 'TEXT') // null | 'pending' | 'paid'
addColumn('payments', 'refunded_at', 'TEXT')
addColumn('consultations', 'cancelled_by', 'INTEGER')
addColumn('consultations', 'cancel_reason', 'TEXT')

export const now = () => new Date().toISOString()
export const json = (value, fallback = []) => {
  try {
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}
export const tx = (fn) => db.transaction(fn)
