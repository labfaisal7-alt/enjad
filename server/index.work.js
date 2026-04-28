import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = resolve(__dirname, "data.json");
const PORT = Number(process.env.PORT || 4000);

const ADMIN_ROLE = "مدير النظام";
const DEFAULT_RESET_PASSWORD = "Enjad@1234";
const ROLE_ACCESS = {
  "مسعف ميداني": ["dashboard", "new", "incidents", "account"],
  "قائد فريق": ["dashboard", "new", "incidents", "reports", "account"],
  "مشرف عمليات": ["dashboard", "new", "incidents", "reports", "users", "account"],
  "مسؤول إحصائيات": ["dashboard", "reports", "account"],
  "مدير النظام": ["dashboard", "new", "incidents", "reports", "users", "account", "security"],
};

const DEFAULT_USERS = [
  {
    id: 1,
    name: "فيصل العسيري",
    username: "faisal.aseeri",
    password: "Enjad@1001",
    mobile: "0500000001",
    role: "مسعف ميداني",
    city: "مكة المكرمة",
    team: "فريق الحرم 1",
    status: "نشط",
  },
  {
    id: 2,
    name: "علي المطيري",
    username: "ali.mutairi",
    password: "Enjad@2002",
    mobile: "0500000002",
    role: "مشرف عمليات",
    city: "الكل",
    team: "العمليات",
    status: "نشط",
  },
  {
    id: 3,
    name: "مدير النظام",
    username: "admin.enjad",
    password: "Enjad@3003",
    mobile: "0500000003",
    role: "مدير النظام",
    city: "الكل",
    team: "الإدارة",
    status: "نشط",
  },
];

const DEFAULT_DEPARTMENTS = [
  "العمليات",
  "الإسعاف الميداني",
  "الإحصائيات",
  "إدارة المتطوعين",
  "الدعم اللوجستي",
];

const DEFAULT_CITIES = ["مكة المكرمة", "المدينة المنورة"];

const DEFAULT_SITES = [
  { city: "مكة المكرمة", name: "المسجد الحرام" },
  { city: "مكة المكرمة", name: "منى" },
  { city: "مكة المكرمة", name: "عرفات" },
  { city: "مكة المكرمة", name: "مزدلفة" },
  { city: "المدينة المنورة", name: "المسجد النبوي" },
  { city: "المدينة المنورة", name: "محطة نقل" },
  { city: "المدينة المنورة", name: "سكن الحجاج" },
];

const DEFAULT_INCIDENTS = [
  {
    id: "HAJJ-1447-0001",
    source: "بلاغ محال من الهلال الأحمر",
    rc: "997-12345",
    city: "مكة المكرمة",
    location: "المسجد الحرام - ساحة الحرم",
    type: "إجهاد حراري",
    severity: "متوسط",
    patientCount: 1,
    category: "حاج",
    intervention: "تبريد/كمادات",
    handover: "تسليم للهلال الأحمر",
    status: "قيد المراجعة",
    createdBy: "فيصل العسيري",
    team: "فريق الحرم 1",
    time: "10:42",
    notes: "تم التبريد وتسليم الحالة للهلال الأحمر",
  },
  {
    id: "HAJJ-1447-0002",
    source: "مباشرة ذاتية من الفريق",
    rc: "",
    city: "المدينة المنورة",
    location: "المسجد النبوي - باب السلام",
    type: "إغماء",
    severity: "بسيط",
    patientCount: 1,
    category: "زائر",
    intervention: "تقييم أولي",
    handover: "علاج بالموقع",
    status: "مغلق",
    createdBy: "علي المطيري",
    team: "فريق النبوي 1",
    time: "09:15",
    notes: "علاج بالموقع",
  },
];

const sessions = new Map();

function respondJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  });
  res.end(JSON.stringify(payload));
}

function normalizeLoginIdentifier(value) {
  return String(value || "").trim().toLowerCase();
}

function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, passwordHash) {
  const [salt, originalHash] = String(passwordHash || "").split(":");
  if (!salt || !originalHash) return false;
  const candidateHash = scryptSync(password, salt, 64);
  const originalBuffer = Buffer.from(originalHash, "hex");
  return originalBuffer.length === candidateHash.length && timingSafeEqual(originalBuffer, candidateHash);
}

function createAuditEntry(currentUser, action, details) {
  return {
    time: new Date().toLocaleString("ar-SA"),
    user: currentUser ? `${currentUser.name} - ${currentUser.role}` : "النظام",
    action,
    details,
  };
}

function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, password, ...safeUser } = user;
  return safeUser;
}

function visibleIncidents(currentUser, incidents) {
  if (!currentUser) return [];
  if (["مشرف عمليات", "مدير النظام", "مسؤول إحصائيات"].includes(currentUser.role)) {
    return incidents;
  }
  if (currentUser.role === "قائد فريق") {
    return incidents.filter(
      (incident) => incident.team === currentUser.team || incident.city === currentUser.city,
    );
  }
  return incidents.filter((incident) => incident.createdBy === currentUser.name);
}

function hasAccess(role, page) {
  return (ROLE_ACCESS[role] || []).includes(page);
}

function buildAppState(currentUser, state) {
  const actor = currentUser ? state.users.find((user) => user.id === currentUser.id) || currentUser : null;
  return {
    currentUser: sanitizeUser(actor),
    users: actor && hasAccess(actor.role, "users") ? state.users.map(sanitizeUser) : [],
    incidents: visibleIncidents(actor, state.incidents),
    departments: state.departments,
    cities: state.cities,
    sites: state.sites,
    auditLogs: actor && hasAccess(actor.role, "security") ? state.auditLogs.slice(0, 200) : [],
    incidentSequence: String(state.incidentSequence || 0),
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

function normalizeState(state) {
  const next = state && typeof state === "object" ? JSON.parse(JSON.stringify(state)) : createSeedState();
  next.users = (next.users || createSeedState().users).map((user) => {
    if (user.passwordHash) {
      const { password, ...safeUser } = user;
      return safeUser;
    }
    return {
      ...user,
      passwordHash: hashPassword(user.password || DEFAULT_RESET_PASSWORD),
    };
  });
  next.incidents = next.incidents || DEFAULT_INCIDENTS;
  next.departments = next.departments || DEFAULT_DEPARTMENTS;
  next.cities = next.cities || DEFAULT_CITIES;
  next.sites = next.sites || DEFAULT_SITES;
  next.auditLogs = next.auditLogs || [];
  next.incidentSequence =
    Number(next.incidentSequence) ||
    next.incidents
      .map((incident) => {
        const match = String(incident.id || "").match(/HAJJ-1447-(\d+)/);
        return match ? Number(match[1]) : 0;
      })
      .reduce((max, current) => Math.max(max, current), 0);
  return next;
}

async function ensureDataFile() {
  await mkdir(__dirname, { recursive: true });
  try {
    await readFile(DATA_FILE, "utf8");
  } catch {
    await writeFile(DATA_FILE, JSON.stringify(createSeedState(), null, 2), "utf8");
  }
}

async function readState() {
  await ensureDataFile();
  const raw = await readFile(DATA_FILE, "utf8");
  return normalizeState(JSON.parse(raw));
}

async function writeState(state) {
  await writeFile(DATA_FILE, JSON.stringify(normalizeState(state), null, 2), "utf8");
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function getTokenFromRequest(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

function getAuthenticatedUser(req, state) {
  const token = getTokenFromRequest(req);
  const session = sessions.get(token);
  if (!token || !session) return null;
  const user = state.users.find((entry) => entry.id === session.userId && entry.status === "نشط");
  return user || null;
}

function assert(condition, message, statusCode = 400) {
  if (!condition) {
    const error = new Error(message);
    error.statusCode = statusCode;
    throw error;
  }
}

function requireUser(req, state) {
  const user = getAuthenticatedUser(req, state);
  assert(user, "الجلسة غير صالحة. سجّل الدخول مرة أخرى.", 401);
  return user;
}

function requireRole(user, allowedRoles, message = "لا تملك صلاحية تنفيذ هذه العملية.") {
  assert(allowedRoles.includes(user.role), message, 403);
}

function nextIncidentId(state) {
  const next = Number(state.incidentSequence || 0) + 1;
  state.incidentSequence = next;
  return `HAJJ-1447-${String(next).padStart(4, "0")}`;
}

function createIncidentRecord(form, status, actor, state) {
  assert(form.source, "حدد مصدر البلاغ.");
  if (String(form.source).includes("الهلال") && !String(form.rc || "").trim()) {
    throw new Error("رقم بلاغ الهلال الأحمر مطلوب لهذا النوع من البلاغات.");
  }
  assert(String(form.location || "").trim(), "أدخل وصف الموقع أو الإحداثيات.");

  const patientCount = Number(form.patientCount || 0);
  assert(patientCount >= 1, "عدد الحالات يجب أن يكون 1 على الأقل.");

  return {
    id: nextIncidentId(state),
    source: form.source,
    rc: String(form.rc || "").trim(),
    city: form.city,
    location: `${form.seasonLocation}${String(form.location || "").trim() ? ` - ${String(form.location).trim()}` : ""}`,
    type: form.type,
    severity: form.severity,
    patientCount,
    category: form.category,
    intervention: form.intervention,
    handover: form.handover,
    status,
    createdBy: actor.name,
    team: actor.team,
    time:
      form.time ||
      new Date().toLocaleTimeString("ar-SA", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    notes: String(form.notes || "").trim(),
  };
}

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    return respondJson(res, 200, { ok: true });
  }

  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname;
    const method = req.method || "GET";

    if (method === "GET" && pathname === "/api/health") {
      return respondJson(res, 200, { ok: true });
    }

    let state = await readState();

    if (method === "POST" && pathname === "/api/auth/login") {
      const body = await readJsonBody(req);
      const identifier = normalizeLoginIdentifier(body.identifier);
      const password = String(body.password || "").trim();

      assert(identifier && password, "أدخل اسم المستخدم أو الجوال وكلمة المرور.", 400);

      const user = state.users.find(
        (entry) =>
          entry.status === "نشط" &&
          (normalizeLoginIdentifier(entry.username) === identifier ||
            normalizeLoginIdentifier(entry.mobile) === identifier),
      );

      assert(user, "لم يتم العثور على مستخدم مطابق.", 404);
      assert(verifyPassword(password, user.passwordHash), "كلمة المرور غير صحيحة.", 401);

      const token = randomUUID();
      sessions.set(token, {
        userId: user.id,
        createdAt: Date.now(),
      });

      state.auditLogs = [createAuditEntry(user, "تسجيل دخول", "دخول المستخدم إلى البوابة"), ...state.auditLogs].slice(0, 200);
      await writeState(state);

      return respondJson(res, 200, {
        token,
        state: buildAppState(user, state),
      });
    }

    if (method === "GET" && pathname === "/api/auth/session") {
      const user = requireUser(req, state);
      return respondJson(res, 200, {
        state: buildAppState(user, state),
      });
    }

    if (method === "POST" && pathname === "/api/auth/logout") {
      const user = requireUser(req, state);
      const token = getTokenFromRequest(req);
      sessions.delete(token);
      state.auditLogs = [createAuditEntry(user, "تسجيل خروج", "خروج المستخدم من البوابة"), ...state.auditLogs].slice(0, 200);
      await writeState(state);
      return respondJson(res, 200, { ok: true });
    }

    if (method === "GET" && pathname === "/api/app-state") {
      const user = requireUser(req, state);
      return respondJson(res, 200, {
        state: buildAppState(user, state),
      });
    }

    if (method === "POST" && pathname === "/api/incidents") {
      const user = requireUser(req, state);
      assert(hasAccess(user.role, "new"), "لا تملك صلاحية إضافة البلاغات.", 403);

      const body = await readJsonBody(req);
      const incident = createIncidentRecord(body.form || body, body.status || "قيد المراجعة", user, state);
      state.incidents = [...state.incidents, incident];
      state.auditLogs = [
        createAuditEntry(user, "حفظ مباشرة", `تم حفظ المباشرة رقم ${incident.id} بحالة: ${incident.status}`),
        ...state.auditLogs,
      ].slice(0, 200);
      await writeState(state);

      return respondJson(res, 200, {
        state: buildAppState(user, state),
        incident,
      });
    }

    const closeMatch = pathname.match(/^\/api\/incidents\/([^/]+)\/close$/);
    if (method === "PATCH" && closeMatch) {
      const user = requireUser(req, state);
      requireRole(user, ["قائد فريق", "مشرف عمليات", "مدير النظام"], "لا تملك صلاحية اعتماد البلاغات.");
      const incidentId = decodeURIComponent(closeMatch[1]);
      const visibleIds = new Set(visibleIncidents(user, state.incidents).map((incident) => incident.id));
      assert(visibleIds.has(incidentId), "لا يمكنك تعديل هذا البلاغ.", 403);

      state.incidents = state.incidents.map((incident) =>
        incident.id === incidentId ? { ...incident, status: "مغلق" } : incident,
      );
      state.auditLogs = [
        createAuditEntry(user, "اعتماد مباشرة", `تم اعتماد وإغلاق المباشرة رقم ${incidentId}`),
        ...state.auditLogs,
      ].slice(0, 200);
      await writeState(state);

      return respondJson(res, 200, {
        state: buildAppState(user, state),
      });
    }

    const incidentMatch = pathname.match(/^\/api\/incidents\/([^/]+)$/);
    if (method === "DELETE" && incidentMatch) {
      const user = requireUser(req, state);
      requireRole(user, ["مشرف عمليات", "مدير النظام"], "لا تملك صلاحية حذف البلاغات.");
      const incidentId = decodeURIComponent(incidentMatch[1]);
      const existing = state.incidents.find((incident) => incident.id === incidentId);
      assert(existing, "البلاغ المطلوب غير موجود.", 404);
      state.incidents = state.incidents.filter((incident) => incident.id !== incidentId);
      state.auditLogs = [
        createAuditEntry(user, "حذف مباشرة", `تم حذف المباشرة رقم ${incidentId}`),
        ...state.auditLogs,
      ].slice(0, 200);
      await writeState(state);

      return respondJson(res, 200, {
        state: buildAppState(user, state),
      });
    }

    if (method === "POST" && pathname === "/api/users") {
      const user = requireUser(req, state);
      requireRole(user, ["مشرف عمليات", "مدير النظام"], "صلاحية إنشاء الحسابات للمشرف أو مدير النظام فقط.");
      const body = await readJsonBody(req);
      const name = String(body.name || "").trim();
      const username = normalizeLoginIdentifier(body.username);
      const password = String(body.password || "").trim();
      const mobile = String(body.mobile || "").trim();

      assert(name, "أدخل اسم المستخدم.");
      assert(username, "أدخل اسم مستخدم صالحًا.");
      assert(password.length >= 4, "كلمة المرور يجب ألا تقل عن 4 أحرف.");
      assert(
        !state.users.some((entry) => normalizeLoginIdentifier(entry.username) === username),
        "اسم المستخدم مستخدم مسبقًا.",
      );

      const nextUser = {
        id: Date.now(),
        name,
        username,
        passwordHash: hashPassword(password),
        mobile: mobile || "غير محدد",
        role: body.role,
        city: body.city,
        team: body.team || "غير محدد",
        status: "نشط",
      };

      state.users = [...state.users, nextUser];
      state.auditLogs = [
        createAuditEntry(user, "إضافة مستخدم", `تم إضافة المستخدم: ${name}`),
        ...state.auditLogs,
      ].slice(0, 200);
      await writeState(state);

      return respondJson(res, 200, {
        state: buildAppState(user, state),
      });
    }

    const resetPasswordMatch = pathname.match(/^\/api\/users\/(\d+)\/reset-password$/);
    if (method === "POST" && resetPasswordMatch) {
      const user = requireUser(req, state);
      requireRole(user, [ADMIN_ROLE], "صلاحية إعادة تعيين كلمة المرور متاحة لمدير النظام فقط.");
      const userId = Number(resetPasswordMatch[1]);
      const targetUser = state.users.find((entry) => entry.id === userId);
      assert(targetUser, "لم يتم العثور على الحساب المطلوب.", 404);

      state.users = state.users.map((entry) =>
        entry.id === userId ? { ...entry, passwordHash: hashPassword(DEFAULT_RESET_PASSWORD) } : entry,
      );
      state.auditLogs = [
        createAuditEntry(user, "إعادة تعيين كلمة المرور", `تمت إعادة تعيين كلمة مرور المستخدم: ${targetUser.name}`),
        ...state.auditLogs,
      ].slice(0, 200);
      await writeState(state);

      return respondJson(res, 200, {
        state: buildAppState(user, state),
        temporaryPassword: DEFAULT_RESET_PASSWORD,
      });
    }

    const userMatch = pathname.match(/^\/api\/users\/(\d+)$/);
    if (method === "PATCH" && userMatch) {
      const user = requireUser(req, state);
      requireRole(user, [ADMIN_ROLE], "صلاحية التعديل متاحة لمدير النظام فقط.");
      const userId = Number(userMatch[1]);
      const body = await readJsonBody(req);
      const targetUser = state.users.find((entry) => entry.id === userId);
      assert(targetUser, "لم يتم العثور على الحساب المطلوب.", 404);

      const name = String(body.name || "").trim();
      const username = normalizeLoginIdentifier(body.username);
      const mobile = String(body.mobile || "").trim();
      const adminCount = state.users.filter((entry) => entry.role === ADMIN_ROLE).length;

      assert(name, "أدخل اسم المستخدم.");
      assert(username, "أدخل اسم مستخدم صالحًا.");
      assert(
        !state.users.some((entry) => entry.id !== userId && normalizeLoginIdentifier(entry.username) === username),
        "اسم المستخدم مستخدم مسبقًا.",
      );
      assert(
        !(targetUser.role === ADMIN_ROLE && body.role !== ADMIN_ROLE && adminCount === 1),
        "لا يمكن تغيير صلاحية آخر حساب أدمن في النظام.",
      );

      state.users = state.users.map((entry) =>
        entry.id === userId
          ? {
              ...entry,
              name,
              username,
              mobile: mobile || "غير محدد",
              role: body.role,
              city: body.city,
              team: body.team || "غير محدد",
            }
          : entry,
      );
      state.auditLogs = [
        createAuditEntry(user, "تعديل مستخدم", `تم تعديل بيانات المستخدم: ${targetUser.name}`),
        ...state.auditLogs,
      ].slice(0, 200);
      await writeState(state);

      return respondJson(res, 200, {
        state: buildAppState(user, state),
      });
    }

    if (method === "DELETE" && userMatch) {
      const user = requireUser(req, state);
      requireRole(user, [ADMIN_ROLE], "صلاحية حذف الحسابات متاحة لمدير النظام فقط.");
      const userId = Number(userMatch[1]);
      const targetUser = state.users.find((entry) => entry.id === userId);
      assert(targetUser, "لم يتم العثور على الحساب المطلوب.", 404);
      assert(user.id !== userId, "لا يمكن حذف الحساب الذي تستخدمه حاليًا.");
      assert(
        !(targetUser.role === ADMIN_ROLE && state.users.filter((entry) => entry.role === ADMIN_ROLE).length === 1),
        "لا يمكن حذف آخر حساب أدمن في النظام.",
      );

      state.users = state.users.filter((entry) => entry.id !== userId);
      state.auditLogs = [
        createAuditEntry(user, "حذف مستخدم", `تم حذف حساب المستخدم: ${targetUser.name}`),
        ...state.auditLogs,
      ].slice(0, 200);
      await writeState(state);

      return respondJson(res, 200, {
        state: buildAppState(user, state),
      });
    }

    if (method === "POST" && pathname === "/api/users/change-password") {
      const user = requireUser(req, state);
      const body = await readJsonBody(req);
      const currentPassword = String(body.currentPassword || "");
      const newPassword = String(body.newPassword || "").trim();
      const confirmPassword = String(body.confirmPassword || "");
      const currentRecord = state.users.find((entry) => entry.id === user.id);

      assert(currentRecord, "تعذر العثور على المستخدم الحالي.", 404);
      assert(verifyPassword(currentPassword, currentRecord.passwordHash), "كلمة المرور الحالية غير صحيحة.");
      assert(newPassword.length >= 4, "كلمة المرور الجديدة يجب ألا تقل عن 4 أحرف.");
      assert(newPassword === confirmPassword, "تأكيد كلمة المرور الجديدة غير مطابق.");

      state.users = state.users.map((entry) =>
        entry.id === user.id ? { ...entry, passwordHash: hashPassword(newPassword) } : entry,
      );
      state.auditLogs = [
        createAuditEntry(user, "تغيير كلمة المرور", "تم تغيير كلمة المرور الخاصة بالمستخدم الحالي"),
        ...state.auditLogs,
      ].slice(0, 200);
      await writeState(state);

      return respondJson(res, 200, {
        state: buildAppState(user, state),
      });
    }

    if (method === "POST" && pathname === "/api/departments") {
      const user = requireUser(req, state);
      requireRole(user, [ADMIN_ROLE], "إدارة الأقسام متاحة لمدير النظام فقط.");
      const body = await readJsonBody(req);
      const name = String(body.name || "").trim();
      assert(name, "اكتب اسم القسم.");
      assert(!state.departments.includes(name), "القسم موجود مسبقًا.");
      state.departments = [...state.departments, name];
      state.auditLogs = [
        createAuditEntry(user, "إضافة قسم", `تم إضافة القسم: ${name}`),
        ...state.auditLogs,
      ].slice(0, 200);
      await writeState(state);
      return respondJson(res, 200, { state: buildAppState(user, state) });
    }

    const departmentMatch = pathname.match(/^\/api\/departments\/(.+)$/);
    if (method === "DELETE" && departmentMatch) {
      const user = requireUser(req, state);
      requireRole(user, [ADMIN_ROLE], "إدارة الأقسام متاحة لمدير النظام فقط.");
      const name = decodeURIComponent(departmentMatch[1]);
      state.departments = state.departments.filter((entry) => entry !== name);
      state.auditLogs = [
        createAuditEntry(user, "حذف قسم", `تم حذف القسم: ${name}`),
        ...state.auditLogs,
      ].slice(0, 200);
      await writeState(state);
      return respondJson(res, 200, { state: buildAppState(user, state) });
    }

    if (method === "POST" && pathname === "/api/cities") {
      const user = requireUser(req, state);
      requireRole(user, [ADMIN_ROLE], "إدارة المدن متاحة لمدير النظام فقط.");
      const body = await readJsonBody(req);
      const name = String(body.name || "").trim();
      assert(name, "اكتب اسم المدينة.");
      assert(!state.cities.includes(name), "المدينة موجودة مسبقًا.");
      state.cities = [...state.cities, name];
      state.auditLogs = [
        createAuditEntry(user, "إضافة مدينة", `تم إضافة المدينة: ${name}`),
        ...state.auditLogs,
      ].slice(0, 200);
      await writeState(state);
      return respondJson(res, 200, { state: buildAppState(user, state) });
    }

    const cityMatch = pathname.match(/^\/api\/cities\/(.+)$/);
    if (method === "DELETE" && cityMatch) {
      const user = requireUser(req, state);
      requireRole(user, [ADMIN_ROLE], "إدارة المدن متاحة لمدير النظام فقط.");
      const name = decodeURIComponent(cityMatch[1]);
      state.cities = state.cities.filter((entry) => entry !== name);
      state.sites = state.sites.filter((site) => site.city !== name);
      state.auditLogs = [
        createAuditEntry(user, "حذف مدينة", `تم حذف المدينة ومواقعها: ${name}`),
        ...state.auditLogs,
      ].slice(0, 200);
      await writeState(state);
      return respondJson(res, 200, { state: buildAppState(user, state) });
    }

    if (method === "POST" && pathname === "/api/sites") {
      const user = requireUser(req, state);
      requireRole(user, [ADMIN_ROLE], "إدارة المواقع متاحة لمدير النظام فقط.");
      const body = await readJsonBody(req);
      const name = String(body.name || "").trim();
      assert(name, "اكتب اسم الموقع.");
      assert(
        !state.sites.some((site) => site.city === body.city && site.name === name),
        "الموقع موجود مسبقًا.",
      );
      state.sites = [...state.sites, { city: body.city, name }];
      state.auditLogs = [
        createAuditEntry(user, "إضافة موقع", `تم إضافة موقع: ${name} في ${body.city}`),
        ...state.auditLogs,
      ].slice(0, 200);
      await writeState(state);
      return respondJson(res, 200, { state: buildAppState(user, state) });
    }

    const siteMatch = pathname.match(/^\/api\/sites\/(\d+)$/);
    if (method === "DELETE" && siteMatch) {
      const user = requireUser(req, state);
      requireRole(user, [ADMIN_ROLE], "إدارة المواقع متاحة لمدير النظام فقط.");
      const index = Number(siteMatch[1]);
      const site = state.sites[index];
      assert(site, "الموقع المطلوب غير موجود.", 404);
      state.sites = state.sites.filter((_, currentIndex) => currentIndex !== index);
      state.auditLogs = [
        createAuditEntry(user, "حذف موقع", `تم حذف موقع: ${site.name}`),
        ...state.auditLogs,
      ].slice(0, 200);
      await writeState(state);
      return respondJson(res, 200, { state: buildAppState(user, state) });
    }

    if (method === "POST" && pathname === "/api/reset-data") {
      const user = requireUser(req, state);
      requireRole(user, [ADMIN_ROLE], "مسح البيانات متاح لمدير النظام فقط.");
      state = createSeedState();
      state.auditLogs = [createAuditEntry(user, "مسح البيانات", "تمت إعادة تحميل البيانات الافتراضية")];
      await writeState(state);
      return respondJson(res, 200, { state: buildAppState(user, state) });
    }

    return respondJson(res, 404, { message: "المسار المطلوب غير موجود." });
  } catch (error) {
    return respondJson(res, error.statusCode || 500, {
      message: error.message || "حدث خطأ غير متوقع في الخادم.",
    });
  }
});

server.listen(PORT, () => {
  console.log(`Enjad API listening on http://localhost:${PORT}`);
});
