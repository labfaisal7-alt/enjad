import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { ADMIN_ROLE, DEFAULT_RESET_PASSWORD, hasAccess } from "./constants.js";
import { buildAppState, createAuditEntry, visibleIncidents } from "./app-state.js";
import { hashPassword, normalizeLoginIdentifier, verifyPassword } from "./auth.js";
import {
  addAuditLog,
  addCity,
  addDepartment,
  addSite,
  closeDatabase,
  createIncident,
  createUser,
  deleteCity,
  deleteDepartment,
  deleteIncident,
  deleteSite,
  deleteUser,
  getSiteByIndex,
  getState,
  getUserById,
  getUserByIdentifier,
  initDatabase,
  resetDatabase,
  updateIncidentStatus,
  updateUser,
  updateUserPassword,
} from "./database.js";

const PORT = Number(process.env.PORT || 4000);
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

function assert(condition, message, statusCode = 400) {
  if (!condition) {
    const error = new Error(message);
    error.statusCode = statusCode;
    throw error;
  }
}

function requireRole(user, allowedRoles, message = "لا تملك صلاحية تنفيذ هذه العملية.") {
  assert(allowedRoles.includes(user.role), message, 403);
}

function requireUser(req) {
  const token = getTokenFromRequest(req);
  const session = sessions.get(token);
  assert(session, "الجلسة غير صالحة. سجّل الدخول مرة أخرى.", 401);

  const user = getUserById(session.userId);
  assert(user && user.status === "نشط", "الجلسة غير صالحة. سجّل الدخول مرة أخرى.", 401);
  return user;
}

function currentStateForUser(user) {
  return buildAppState(user, getState());
}

function createIncidentRecord(form, status, actor) {
  assert(form.source, "حدد مصدر البلاغ.");
  if (String(form.source).includes("الهلال") && !String(form.rc || "").trim()) {
    throw new Error("رقم بلاغ الهلال الأحمر مطلوب لهذا النوع من البلاغات.");
  }
  assert(String(form.location || "").trim(), "أدخل وصف الموقع أو الإحداثيات.");

  const patientCount = Number(form.patientCount || 0);
  assert(patientCount >= 1, "عدد الحالات يجب أن يكون 1 على الأقل.");

  return {
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
    vitals: String(form.vitals || "").trim(),
    notes: String(form.notes || "").trim(),
  };
}

initDatabase();

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

    if (method === "POST" && pathname === "/api/auth/login") {
      const body = await readJsonBody(req);
      const identifier = normalizeLoginIdentifier(body.identifier);
      const password = String(body.password || "").trim();

      assert(identifier && password, "أدخل اسم المستخدم أو الجوال وكلمة المرور.", 400);

      const user = getUserByIdentifier(identifier);
      assert(user, "لم يتم العثور على مستخدم مطابق.", 404);
      assert(verifyPassword(password, user.passwordHash), "كلمة المرور غير صحيحة.", 401);

      const token = randomUUID();
      sessions.set(token, { userId: user.id, createdAt: Date.now() });
      addAuditLog(createAuditEntry(user, "تسجيل دخول", "دخول المستخدم إلى البوابة"));

      return respondJson(res, 200, {
        token,
        state: currentStateForUser(user),
      });
    }

    if (method === "GET" && pathname === "/api/auth/session") {
      const user = requireUser(req);
      return respondJson(res, 200, {
        state: currentStateForUser(user),
      });
    }

    if (method === "POST" && pathname === "/api/auth/logout") {
      const user = requireUser(req);
      sessions.delete(getTokenFromRequest(req));
      addAuditLog(createAuditEntry(user, "تسجيل خروج", "خروج المستخدم من البوابة"));
      return respondJson(res, 200, { ok: true });
    }

    if (method === "GET" && pathname === "/api/app-state") {
      const user = requireUser(req);
      return respondJson(res, 200, {
        state: currentStateForUser(user),
      });
    }

    if (method === "POST" && pathname === "/api/incidents") {
      const user = requireUser(req);
      assert(hasAccess(user.role, "new"), "لا تملك صلاحية إضافة البلاغات.", 403);

      const body = await readJsonBody(req);
      const incident = createIncident(createIncidentRecord(body.form || body, body.status || "قيد المراجعة", user));
      addAuditLog(createAuditEntry(user, "حفظ مباشرة", `تم حفظ المباشرة رقم ${incident.id} بحالة: ${incident.status}`));

      return respondJson(res, 200, {
        state: currentStateForUser(user),
        incident,
      });
    }

    const closeMatch = pathname.match(/^\/api\/incidents\/([^/]+)\/close$/);
    if (method === "PATCH" && closeMatch) {
      const user = requireUser(req);
      requireRole(user, ["قائد فريق", "مشرف عمليات", "مدير النظام"], "لا تملك صلاحية اعتماد البلاغات.");
      const incidentId = decodeURIComponent(closeMatch[1]);
      const visibleIds = new Set(visibleIncidents(user, getState().incidents).map((incident) => incident.id));
      assert(visibleIds.has(incidentId), "لا يمكنك تعديل هذا البلاغ.", 403);

      updateIncidentStatus(incidentId, "مغلق");
      addAuditLog(createAuditEntry(user, "اعتماد مباشرة", `تم اعتماد وإغلاق المباشرة رقم ${incidentId}`));

      return respondJson(res, 200, {
        state: currentStateForUser(user),
      });
    }

    const incidentMatch = pathname.match(/^\/api\/incidents\/([^/]+)$/);
    if (method === "DELETE" && incidentMatch) {
      const user = requireUser(req);
      requireRole(user, ["مشرف عمليات", "مدير النظام"], "لا تملك صلاحية حذف البلاغات.");
      const incidentId = decodeURIComponent(incidentMatch[1]);
      const existing = getState().incidents.find((incident) => incident.id === incidentId);
      assert(existing, "البلاغ المطلوب غير موجود.", 404);

      deleteIncident(incidentId);
      addAuditLog(createAuditEntry(user, "حذف مباشرة", `تم حذف المباشرة رقم ${incidentId}`));

      return respondJson(res, 200, {
        state: currentStateForUser(user),
      });
    }

    if (method === "POST" && pathname === "/api/users") {
      const user = requireUser(req);
      requireRole(user, ["مشرف عمليات", "مدير النظام"], "صلاحية إنشاء الحسابات للمشرف أو مدير النظام فقط.");
      const body = await readJsonBody(req);
      const name = String(body.name || "").trim();
      const username = normalizeLoginIdentifier(body.username);
      const password = String(body.password || "").trim();
      const mobile = String(body.mobile || "").trim();

      assert(name, "أدخل اسم المستخدم.");
      assert(username, "أدخل اسم مستخدم صالحًا.");
      assert(password.length >= 4, "كلمة المرور يجب ألا تقل عن 4 أحرف.");
      assert(!getState().users.some((entry) => normalizeLoginIdentifier(entry.username) === username), "اسم المستخدم مستخدم مسبقًا.");

      createUser({
        id: Date.now(),
        name,
        username,
        passwordHash: hashPassword(password),
        mobile: mobile || "غير محدد",
        role: body.role,
        city: body.city,
        team: body.team || "غير محدد",
        status: "نشط",
      });
      addAuditLog(createAuditEntry(user, "إضافة مستخدم", `تم إضافة المستخدم: ${name}`));

      return respondJson(res, 200, {
        state: currentStateForUser(user),
      });
    }

    const resetPasswordMatch = pathname.match(/^\/api\/users\/(\d+)\/reset-password$/);
    if (method === "POST" && resetPasswordMatch) {
      const user = requireUser(req);
      requireRole(user, [ADMIN_ROLE], "صلاحية إعادة تعيين كلمة المرور متاحة لمدير النظام فقط.");
      const userId = Number(resetPasswordMatch[1]);
      const targetUser = getUserById(userId);
      assert(targetUser, "لم يتم العثور على الحساب المطلوب.", 404);

      updateUserPassword(userId, hashPassword(DEFAULT_RESET_PASSWORD));
      addAuditLog(createAuditEntry(user, "إعادة تعيين كلمة المرور", `تمت إعادة تعيين كلمة مرور المستخدم: ${targetUser.name}`));

      return respondJson(res, 200, {
        state: currentStateForUser(user),
        temporaryPassword: DEFAULT_RESET_PASSWORD,
      });
    }

    const userMatch = pathname.match(/^\/api\/users\/(\d+)$/);
    if (method === "PATCH" && userMatch) {
      const user = requireUser(req);
      requireRole(user, [ADMIN_ROLE], "صلاحية التعديل متاحة لمدير النظام فقط.");
      const userId = Number(userMatch[1]);
      const body = await readJsonBody(req);
      const targetUser = getUserById(userId);
      assert(targetUser, "لم يتم العثور على الحساب المطلوب.", 404);

      const name = String(body.name || "").trim();
      const username = normalizeLoginIdentifier(body.username);
      const mobile = String(body.mobile || "").trim();
      const state = getState();
      const adminCount = state.users.filter((entry) => entry.role === ADMIN_ROLE).length;

      assert(name, "أدخل اسم المستخدم.");
      assert(username, "أدخل اسم مستخدم صالحًا.");
      assert(
        !state.users.some((entry) => entry.id !== userId && normalizeLoginIdentifier(entry.username) === username),
        "اسم المستخدم مستخدم مسبقًا.",
      );
      assert(!(targetUser.role === ADMIN_ROLE && body.role !== ADMIN_ROLE && adminCount === 1), "لا يمكن تغيير صلاحية آخر حساب أدمن في النظام.");

      updateUser(userId, {
        name,
        username,
        mobile: mobile || "غير محدد",
        role: body.role,
        city: body.city,
        team: body.team || "غير محدد",
      });
      addAuditLog(createAuditEntry(user, "تعديل مستخدم", `تم تعديل بيانات المستخدم: ${targetUser.name}`));

      return respondJson(res, 200, {
        state: currentStateForUser(user),
      });
    }

    if (method === "DELETE" && userMatch) {
      const user = requireUser(req);
      requireRole(user, [ADMIN_ROLE], "صلاحية حذف الحسابات متاحة لمدير النظام فقط.");
      const userId = Number(userMatch[1]);
      const targetUser = getUserById(userId);
      assert(targetUser, "لم يتم العثور على الحساب المطلوب.", 404);
      const state = getState();

      assert(user.id !== userId, "لا يمكن حذف الحساب الذي تستخدمه حاليًا.");
      assert(
        !(targetUser.role === ADMIN_ROLE && state.users.filter((entry) => entry.role === ADMIN_ROLE).length === 1),
        "لا يمكن حذف آخر حساب أدمن في النظام.",
      );

      deleteUser(userId);
      addAuditLog(createAuditEntry(user, "حذف مستخدم", `تم حذف حساب المستخدم: ${targetUser.name}`));

      return respondJson(res, 200, {
        state: currentStateForUser(user),
      });
    }

    if (method === "POST" && pathname === "/api/users/change-password") {
      const user = requireUser(req);
      const body = await readJsonBody(req);
      const currentPassword = String(body.currentPassword || "");
      const newPassword = String(body.newPassword || "").trim();
      const confirmPassword = String(body.confirmPassword || "");
      const currentRecord = getUserById(user.id);

      assert(currentRecord, "تعذر العثور على المستخدم الحالي.", 404);
      assert(verifyPassword(currentPassword, currentRecord.passwordHash), "كلمة المرور الحالية غير صحيحة.");
      assert(newPassword.length >= 4, "كلمة المرور الجديدة يجب ألا تقل عن 4 أحرف.");
      assert(newPassword === confirmPassword, "تأكيد كلمة المرور الجديدة غير مطابق.");

      updateUserPassword(user.id, hashPassword(newPassword));
      addAuditLog(createAuditEntry(user, "تغيير كلمة المرور", "تم تغيير كلمة المرور الخاصة بالمستخدم الحالي"));

      return respondJson(res, 200, {
        state: currentStateForUser(user),
      });
    }

    if (method === "POST" && pathname === "/api/departments") {
      const user = requireUser(req);
      requireRole(user, [ADMIN_ROLE], "إدارة الأقسام متاحة لمدير النظام فقط.");
      const body = await readJsonBody(req);
      const name = String(body.name || "").trim();
      const state = getState();

      assert(name, "اكتب اسم القسم.");
      assert(!state.departments.includes(name), "القسم موجود مسبقًا.");

      addDepartment(name);
      addAuditLog(createAuditEntry(user, "إضافة قسم", `تم إضافة القسم: ${name}`));

      return respondJson(res, 200, { state: currentStateForUser(user) });
    }

    const departmentMatch = pathname.match(/^\/api\/departments\/(.+)$/);
    if (method === "DELETE" && departmentMatch) {
      const user = requireUser(req);
      requireRole(user, [ADMIN_ROLE], "إدارة الأقسام متاحة لمدير النظام فقط.");
      const name = decodeURIComponent(departmentMatch[1]);

      deleteDepartment(name);
      addAuditLog(createAuditEntry(user, "حذف قسم", `تم حذف القسم: ${name}`));

      return respondJson(res, 200, { state: currentStateForUser(user) });
    }

    if (method === "POST" && pathname === "/api/cities") {
      const user = requireUser(req);
      requireRole(user, [ADMIN_ROLE], "إدارة المدن متاحة لمدير النظام فقط.");
      const body = await readJsonBody(req);
      const name = String(body.name || "").trim();
      const state = getState();

      assert(name, "اكتب اسم المدينة.");
      assert(!state.cities.includes(name), "المدينة موجودة مسبقًا.");

      addCity(name);
      addAuditLog(createAuditEntry(user, "إضافة مدينة", `تم إضافة المدينة: ${name}`));

      return respondJson(res, 200, { state: currentStateForUser(user) });
    }

    const cityMatch = pathname.match(/^\/api\/cities\/(.+)$/);
    if (method === "DELETE" && cityMatch) {
      const user = requireUser(req);
      requireRole(user, [ADMIN_ROLE], "إدارة المدن متاحة لمدير النظام فقط.");
      const name = decodeURIComponent(cityMatch[1]);

      deleteCity(name);
      addAuditLog(createAuditEntry(user, "حذف مدينة", `تم حذف المدينة ومواقعها: ${name}`));

      return respondJson(res, 200, { state: currentStateForUser(user) });
    }

    if (method === "POST" && pathname === "/api/sites") {
      const user = requireUser(req);
      requireRole(user, [ADMIN_ROLE], "إدارة المواقع متاحة لمدير النظام فقط.");
      const body = await readJsonBody(req);
      const name = String(body.name || "").trim();
      const state = getState();

      assert(name, "اكتب اسم الموقع.");
      assert(!state.sites.some((site) => site.city === body.city && site.name === name), "الموقع موجود مسبقًا.");

      addSite(body.city, name);
      addAuditLog(createAuditEntry(user, "إضافة موقع", `تم إضافة موقع: ${name} في ${body.city}`));

      return respondJson(res, 200, { state: currentStateForUser(user) });
    }

    const siteMatch = pathname.match(/^\/api\/sites\/(\d+)$/);
    if (method === "DELETE" && siteMatch) {
      const user = requireUser(req);
      requireRole(user, [ADMIN_ROLE], "إدارة المواقع متاحة لمدير النظام فقط.");
      const siteIndex = Number(siteMatch[1]);
      const site = getSiteByIndex(siteIndex);
      assert(site, "الموقع المطلوب غير موجود.", 404);

      deleteSite(site.id);
      addAuditLog(createAuditEntry(user, "حذف موقع", `تم حذف موقع: ${site.name}`));

      return respondJson(res, 200, { state: currentStateForUser(user) });
    }

    if (method === "POST" && pathname === "/api/reset-data") {
      const user = requireUser(req);
      requireRole(user, [ADMIN_ROLE], "مسح البيانات متاح لمدير النظام فقط.");

      resetDatabase();
      addAuditLog(createAuditEntry(user, "مسح البيانات", "تمت إعادة تحميل البيانات الافتراضية"));

      return respondJson(res, 200, { state: currentStateForUser(user) });
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

let closed = false;

function shutdown() {
  if (closed) return;
  closed = true;
  closeDatabase();
}

process.on("exit", shutdown);
process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});
process.on("SIGTERM", () => {
  shutdown();
  process.exit(0);
});
