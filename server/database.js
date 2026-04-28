import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ADMIN_ROLE,
  DEFAULT_CITIES,
  DEFAULT_DEPARTMENTS,
  DEFAULT_INCIDENTS,
  DEFAULT_RESET_PASSWORD,
  DEFAULT_SITES,
  DEFAULT_USERS,
} from "./constants.js";
import { hashPassword, normalizeLoginIdentifier } from "./auth.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_FILE = process.env.ENJAD_DB_FILE
  ? resolve(process.cwd(), process.env.ENJAD_DB_FILE)
  : resolve(__dirname, "enjad.db");
const LEGACY_DATA_FILE = process.env.ENJAD_LEGACY_DATA_FILE
  ? resolve(process.cwd(), process.env.ENJAD_LEGACY_DATA_FILE)
  : resolve(__dirname, "data.json");

mkdirSync(dirname(DB_FILE), { recursive: true });

const db = new DatabaseSync(DB_FILE);
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

function exec(sql) {
  db.exec(sql);
}

function prepare(sql) {
  return db.prepare(sql);
}

function transaction(callback) {
  exec("BEGIN IMMEDIATE;");
  try {
    const result = callback();
    exec("COMMIT;");
    return result;
  } catch (error) {
    exec("ROLLBACK;");
    throw error;
  }
}

function mapUserRow(row) {
  return row
    ? {
        id: row.id,
        name: row.name,
        username: row.username,
        mobile: row.mobile,
        role: row.role,
        city: row.city,
        team: row.team,
        status: row.status,
        passwordHash: row.password_hash,
      }
    : null;
}

function mapIncidentRow(row) {
  return {
    id: row.id,
    source: row.source,
    rc: row.rc,
    city: row.city,
    location: row.location,
    type: row.type,
    severity: row.severity,
    patientCount: row.patient_count,
    category: row.category,
    intervention: row.intervention,
    handover: row.handover,
    status: row.status,
    createdBy: row.created_by,
    team: row.team,
    time: row.time,
    vitals: row.vitals || "",
    notes: row.notes,
  };
}

function tableHasColumn(tableName, columnName) {
  return prepare(`PRAGMA table_info(${tableName})`)
    .all()
    .some((row) => row.name === columnName);
}

function countTable(tableName) {
  return prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get().count;
}

function readLegacyState() {
  if (!existsSync(LEGACY_DATA_FILE)) {
    return null;
  }

  const parsed = JSON.parse(readFileSync(LEGACY_DATA_FILE, "utf8"));
  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const incidents = parsed.incidents || DEFAULT_INCIDENTS;
  const maxIncidentNumber = incidents
    .map((incident) => {
      const match = String(incident.id || "").match(/HAJJ-1447-(\d+)/);
      return match ? Number(match[1]) : 0;
    })
    .reduce((max, current) => Math.max(max, current), 0);

  return {
    users: (parsed.users || DEFAULT_USERS).map((user) => ({
      ...user,
      passwordHash: user.passwordHash || hashPassword(user.password || DEFAULT_RESET_PASSWORD),
    })),
    incidents,
    departments: parsed.departments || DEFAULT_DEPARTMENTS,
    cities: parsed.cities || DEFAULT_CITIES,
    sites: parsed.sites || DEFAULT_SITES,
    auditLogs: parsed.auditLogs || [],
    incidentSequence: Number(parsed.incidentSequence || maxIncidentNumber || 0),
  };
}

function createSeedState() {
  return {
    users: DEFAULT_USERS.map(({ password, ...user }) => ({
      ...user,
      passwordHash: hashPassword(password),
    })),
    incidents: DEFAULT_INCIDENTS,
    departments: DEFAULT_DEPARTMENTS,
    cities: DEFAULT_CITIES,
    sites: DEFAULT_SITES,
    auditLogs: [],
    incidentSequence: 2,
  };
}

function seedState(state) {
  transaction(() => {
    exec("DELETE FROM audit_logs;");
    exec("DELETE FROM incidents;");
    exec("DELETE FROM sites;");
    exec("DELETE FROM cities;");
    exec("DELETE FROM departments;");
    exec("DELETE FROM users;");
    exec("DELETE FROM settings;");

    const insertUser = prepare(`
      INSERT INTO users (id, name, username, mobile, role, city, team, status, password_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertIncident = prepare(`
      INSERT INTO incidents (
        id, source, rc, city, location, type, severity, patient_count, category,
        intervention, handover, status, created_by, team, time, vitals, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertDepartment = prepare("INSERT INTO departments (name) VALUES (?)");
    const insertCity = prepare("INSERT INTO cities (name) VALUES (?)");
    const insertSite = prepare("INSERT INTO sites (city, name) VALUES (?, ?)");
    const insertAudit = prepare("INSERT INTO audit_logs (time, user, action, details) VALUES (?, ?, ?, ?)");
    const setSetting = prepare("INSERT INTO settings (key, value) VALUES (?, ?)");

    for (const user of state.users) {
      insertUser.run(
        user.id,
        user.name,
        normalizeLoginIdentifier(user.username),
        user.mobile || "غير محدد",
        user.role,
        user.city,
        user.team || "غير محدد",
        user.status || "نشط",
        user.passwordHash,
      );
    }

    for (const incident of state.incidents) {
      insertIncident.run(
        incident.id,
        incident.source,
        incident.rc || "",
        incident.city,
        incident.location,
        incident.type,
        incident.severity,
        Number(incident.patientCount || 0),
        incident.category,
        incident.intervention,
        incident.handover,
        incident.status,
        incident.createdBy,
        incident.team,
        incident.time,
        incident.vitals || "",
        incident.notes || "",
      );
    }

    for (const department of state.departments) {
      insertDepartment.run(department);
    }

    for (const city of state.cities) {
      insertCity.run(city);
    }

    for (const site of state.sites) {
      insertSite.run(site.city, site.name);
    }

    for (const log of state.auditLogs) {
      insertAudit.run(log.time, log.user, log.action, log.details);
    }

    setSetting.run("incident_sequence", String(state.incidentSequence || 0));
  });
}

export function initDatabase() {
  exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      mobile TEXT NOT NULL,
      role TEXT NOT NULL,
      city TEXT NOT NULL,
      team TEXT NOT NULL,
      status TEXT NOT NULL,
      password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      rc TEXT NOT NULL,
      city TEXT NOT NULL,
      location TEXT NOT NULL,
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      patient_count INTEGER NOT NULL,
      category TEXT NOT NULL,
      intervention TEXT NOT NULL,
      handover TEXT NOT NULL,
      status TEXT NOT NULL,
      created_by TEXT NOT NULL,
      team TEXT NOT NULL,
      time TEXT NOT NULL,
      vitals TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS departments (
      name TEXT PRIMARY KEY
    );

    CREATE TABLE IF NOT EXISTS cities (
      name TEXT PRIMARY KEY
    );

    CREATE TABLE IF NOT EXISTS sites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      city TEXT NOT NULL,
      name TEXT NOT NULL,
      UNIQUE(city, name)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      time TEXT NOT NULL,
      user TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  if (!tableHasColumn("incidents", "vitals")) {
    exec("ALTER TABLE incidents ADD COLUMN vitals TEXT NOT NULL DEFAULT '';");
  }

  if (countTable("users") > 0) {
    return;
  }

  seedState(readLegacyState() || createSeedState());
}

function trimAuditLogs() {
  exec(`
    DELETE FROM audit_logs
    WHERE id NOT IN (
      SELECT id FROM audit_logs
      ORDER BY id DESC
      LIMIT 200
    )
  `);
}

export function getState() {
  const users = prepare(`
    SELECT id, name, username, mobile, role, city, team, status, password_hash
    FROM users
    ORDER BY id
  `)
    .all()
    .map(mapUserRow);

  const incidents = prepare(`
    SELECT id, source, rc, city, location, type, severity, patient_count, category,
           intervention, handover, status, created_by, team, time, vitals, notes
    FROM incidents
    ORDER BY id
  `)
    .all()
    .map(mapIncidentRow);

  const departments = prepare("SELECT name FROM departments ORDER BY name").all().map((row) => row.name);
  const cities = prepare("SELECT name FROM cities ORDER BY name").all().map((row) => row.name);
  const sites = prepare("SELECT id, city, name FROM sites ORDER BY id").all().map((row) => ({ id: row.id, city: row.city, name: row.name }));
  const auditLogs = prepare("SELECT id, time, user, action, details FROM audit_logs ORDER BY id DESC")
    .all()
    .map((row) => ({
      id: row.id,
      time: row.time,
      user: row.user,
      action: row.action,
      details: row.details,
    }));
  const incidentSequence = Number(
    prepare("SELECT value FROM settings WHERE key = 'incident_sequence'").get()?.value || "0",
  );

  return {
    users,
    incidents,
    departments,
    cities,
    sites,
    auditLogs,
    incidentSequence,
  };
}

export function getUserById(id) {
  return mapUserRow(
    prepare(`
      SELECT id, name, username, mobile, role, city, team, status, password_hash
      FROM users
      WHERE id = ?
    `).get(id),
  );
}

export function getUserByIdentifier(identifier) {
  return mapUserRow(
    prepare(`
      SELECT id, name, username, mobile, role, city, team, status, password_hash
      FROM users
      WHERE status = 'نشط' AND (username = ? OR lower(mobile) = ?)
      LIMIT 1
    `).get(identifier, identifier),
  );
}

export function addAuditLog(entry) {
  prepare("INSERT INTO audit_logs (time, user, action, details) VALUES (?, ?, ?, ?)")
    .run(entry.time, entry.user, entry.action, entry.details);
  trimAuditLogs();
}

export function createIncident(incident) {
  transaction(() => {
    const nextSequence = Number(
      prepare("SELECT value FROM settings WHERE key = 'incident_sequence'").get()?.value || "0",
    ) + 1;
    const id = `HAJJ-1447-${String(nextSequence).padStart(4, "0")}`;
    prepare(`
      INSERT INTO incidents (
        id, source, rc, city, location, type, severity, patient_count, category,
        intervention, handover, status, created_by, team, time, vitals, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      incident.source,
      incident.rc || "",
      incident.city,
      incident.location,
      incident.type,
      incident.severity,
      Number(incident.patientCount || 0),
      incident.category,
      incident.intervention,
      incident.handover,
      incident.status,
      incident.createdBy,
      incident.team,
      incident.time,
      incident.vitals || "",
      incident.notes || "",
    );
    prepare(`
      INSERT INTO settings (key, value)
      VALUES ('incident_sequence', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(String(nextSequence));
  });

  return prepare(`
    SELECT id, source, rc, city, location, type, severity, patient_count, category,
           intervention, handover, status, created_by, team, time, vitals, notes
    FROM incidents
    ORDER BY rowid DESC
    LIMIT 1
  `)
    .all()
    .map(mapIncidentRow)[0];
}

export function updateIncidentStatus(id, status) {
  prepare("UPDATE incidents SET status = ? WHERE id = ?").run(status, id);
}

export function deleteIncident(id) {
  prepare("DELETE FROM incidents WHERE id = ?").run(id);
}

export function createUser(user) {
  prepare(`
    INSERT INTO users (id, name, username, mobile, role, city, team, status, password_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    user.id,
    user.name,
    normalizeLoginIdentifier(user.username),
    user.mobile || "غير محدد",
    user.role,
    user.city,
    user.team || "غير محدد",
    user.status || "نشط",
    user.passwordHash,
  );
}

export function updateUser(userId, user) {
  prepare(`
    UPDATE users
    SET name = ?, username = ?, mobile = ?, role = ?, city = ?, team = ?
    WHERE id = ?
  `).run(
    user.name,
    normalizeLoginIdentifier(user.username),
    user.mobile || "غير محدد",
    user.role,
    user.city,
    user.team || "غير محدد",
    userId,
  );
}

export function updateUserPassword(userId, passwordHash) {
  prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, userId);
}

export function deleteUser(userId) {
  prepare("DELETE FROM users WHERE id = ?").run(userId);
}

export function addDepartment(name) {
  prepare("INSERT INTO departments (name) VALUES (?)").run(name);
}

export function deleteDepartment(name) {
  prepare("DELETE FROM departments WHERE name = ?").run(name);
}

export function addCity(name) {
  prepare("INSERT INTO cities (name) VALUES (?)").run(name);
}

export function deleteCity(name) {
  transaction(() => {
    prepare("DELETE FROM cities WHERE name = ?").run(name);
    prepare("DELETE FROM sites WHERE city = ?").run(name);
  });
}

export function addSite(city, name) {
  prepare("INSERT INTO sites (city, name) VALUES (?, ?)").run(city, name);
}

export function getSiteByIndex(index) {
  const row = prepare("SELECT id, city, name FROM sites ORDER BY id LIMIT 1 OFFSET ?").get(index);
  return row ? { id: row.id, city: row.city, name: row.name } : null;
}

export function deleteSite(siteId) {
  prepare("DELETE FROM sites WHERE id = ?").run(siteId);
}

export function resetDatabase() {
  seedState(createSeedState());
}

export function closeDatabase() {
  db.close();
}
