import { useEffect, useMemo, useState } from "react";
import { api, TOKEN_STORAGE_KEY } from "./src/lib/api";
import {
  canAccess,
  exportIncidentsCsv,
  normalizeLoginIdentifier,
  visibleIncidents,
} from "./src/portal/helpers";
import { ConfirmDialog, Notice } from "./src/portal/shared";
import { Header, LoginScreen, Sidebar } from "./src/portal/layout";
import {
  AccountPage,
  DashboardPage,
  IncidentsPage,
  NewIncidentPage,
  ReportsPage,
  SecurityPage,
  UsersPage,
} from "./src/portal/pages";

export default function EmergencyResponderPortal() {
  const [users, setUsers] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [cities, setCities] = useState([]);
  const [sites, setSites] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [incidentSequence, setIncidentSequence] = useState("0");
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [sessionToken, setSessionToken] = useState(() => window.localStorage.getItem(TOKEN_STORAGE_KEY) || "");
  const [activePage, setActivePage] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notice, setNotice] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  function clearAppState() {
    setUsers([]);
    setIncidents([]);
    setDepartments([]);
    setCities([]);
    setSites([]);
    setAuditLogs([]);
    setIncidentSequence("0");
    setCurrentUser(null);
    setActivePage("dashboard");
    setMobileOpen(false);
  }

  function applyState(state) {
    setUsers(state?.users || []);
    setIncidents(state?.incidents || []);
    setDepartments(state?.departments || []);
    setCities(state?.cities || []);
    setSites(state?.sites || []);
    setAuditLogs(state?.auditLogs || []);
    setIncidentSequence(String(state?.incidentSequence || "0"));
    setCurrentUser(state?.currentUser || null);
  }

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      if (!sessionToken) {
        clearAppState();
        if (active) {
          setAuthReady(true);
        }
        return;
      }

      try {
        const response = await api.getSession(sessionToken);
        if (!active) return;
        applyState(response.state);
      } catch {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        if (!active) return;
        setSessionToken("");
        clearAppState();
      } finally {
        if (active) {
          setAuthReady(true);
        }
      }
    }

    restoreSession();

    return () => {
      active = false;
    };
  }, [sessionToken]);

  useEffect(() => {
    if (!currentUser || !users.length) return;
    const freshUser = users.find((user) => user.id === currentUser.id);
    if (!freshUser) {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      setSessionToken("");
      clearAppState();
      return;
    }
    if (JSON.stringify(freshUser) !== JSON.stringify(currentUser)) {
      setCurrentUser(freshUser);
      if (!canAccess(freshUser.role, activePage)) {
        setActivePage("dashboard");
      }
    }
  }, [users, currentUser, activePage]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const scopedIncidents = useMemo(() => visibleIncidents(currentUser, incidents), [currentUser, incidents]);

  function showNotice(type, message) {
    setNotice({ type, message });
  }

  async function runRequest(action, successMessage) {
    try {
      const response = await action();
      if (response?.state) {
        applyState(response.state);
      }
      if (successMessage) {
        showNotice("success", typeof successMessage === "function" ? successMessage(response) : successMessage);
      }
      return response;
    } catch (error) {
      showNotice("error", error.message || "تعذر إكمال الطلب.");
      return null;
    }
  }

  async function handleLogin() {
    const identifier = loginIdentifier.trim();
    const password = passwordInput.trim();

    if (!identifier || !password) {
      showNotice("error", "أدخل اسم المستخدم أو الجوال وكلمة المرور.");
      return;
    }

    const response = await runRequest(
      () => api.login(identifier, password),
      (payload) => `مرحبًا ${payload.state.currentUser.name}`,
    );
    if (!response) return;

    window.localStorage.setItem(TOKEN_STORAGE_KEY, response.token);
    setSessionToken(response.token);
    setActivePage("dashboard");
    setPasswordInput("");
  }

  async function handleLogout() {
    if (sessionToken) {
      try {
        await api.logout(sessionToken);
      } catch {
        // Ignore logout transport failures and clear the local session anyway.
      }
    }

    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    setSessionToken("");
    clearAppState();
    setLoginIdentifier("");
    setPasswordInput("");
    showNotice("success", "تم تسجيل الخروج بنجاح.");
  }

  function navigate(page) {
    if (!currentUser || !canAccess(currentUser.role, page)) {
      showNotice("error", "لا تملك صلاحية الوصول لهذه الصفحة.");
      return;
    }
    setActivePage(page);
  }

  async function handleSaveIncident(form, status) {
    const response = await runRequest(
      () => api.createIncident(sessionToken, { form, status }),
      (payload) => `تم حفظ المباشرة: ${payload.incident.id}`,
    );
    if (response) {
      setActivePage("incidents");
    }
  }

  async function handleApproveIncident(id) {
    await runRequest(() => api.closeIncident(sessionToken, id), `تم اعتماد البلاغ ${id}`);
  }

  function handleDeleteIncident(id) {
    setConfirmState({
      title: "حذف البلاغ",
      description: `سيتم حذف البلاغ رقم ${id} نهائيًا من البيانات.`,
      confirmText: "حذف",
      onConfirm: async () => {
        const response = await runRequest(() => api.deleteIncident(sessionToken, id), `تم حذف البلاغ ${id}`);
        if (response) {
          setConfirmState(null);
        }
      },
    });
  }

  async function handleAddUser(form) {
    const response = await runRequest(
      () => api.addUser(sessionToken, form),
      `تم إنشاء حساب ${normalizeLoginIdentifier(form.username)}`,
    );
    return Boolean(response);
  }

  async function handleUpdateUser(userId, form) {
    const response = await runRequest(
      () => api.updateUser(sessionToken, userId, form),
      `تم تحديث بيانات الحساب ${normalizeLoginIdentifier(form.username)}`,
    );
    return Boolean(response);
  }

  function handleResetUserPassword(userId) {
    const targetUser = users.find((user) => user.id === userId);
    if (!targetUser) {
      showNotice("error", "لم يتم العثور على الحساب المطلوب.");
      return;
    }

    setConfirmState({
      title: "إعادة تعيين كلمة المرور",
      description: `سيتم تعيين كلمة مرور جديدة للمستخدم ${targetUser.name}.`,
      confirmText: "إعادة التعيين",
      onConfirm: async () => {
        const response = await runRequest(
          () => api.resetUserPassword(sessionToken, userId),
          (payload) => `تمت إعادة التعيين. كلمة المرور المؤقتة: ${payload.temporaryPassword}`,
        );
        if (response) {
          setConfirmState(null);
        }
      },
    });
  }

  function handleDeleteUser(userId) {
    const targetUser = users.find((user) => user.id === userId);
    if (!targetUser) {
      showNotice("error", "لم يتم العثور على الحساب المطلوب.");
      return;
    }

    setConfirmState({
      title: "حذف حساب مستخدم",
      description: `سيتم حذف حساب ${targetUser.name} نهائيًا من البيانات، ولن يتمكن من تسجيل الدخول بعد ذلك.`,
      confirmText: "حذف",
      onConfirm: async () => {
        const response = await runRequest(
          () => api.deleteUser(sessionToken, userId),
          `تم حذف الحساب ${targetUser.username}`,
        );
        if (response) {
          setConfirmState(null);
        }
      },
    });
  }

  async function handleChangePassword(form) {
    const response = await runRequest(
      () => api.changePassword(sessionToken, form),
      "تم تحديث كلمة المرور بنجاح.",
    );
    return Boolean(response);
  }

  async function handleAddDepartment(name) {
    await runRequest(() => api.addDepartment(sessionToken, name), `تمت إضافة القسم: ${name.trim()}`);
  }

  function handleDeleteDepartment(name) {
    setConfirmState({
      title: "حذف القسم",
      description: `سيتم حذف القسم: ${name}`,
      confirmText: "حذف",
      onConfirm: async () => {
        const response = await runRequest(() => api.deleteDepartment(sessionToken, name), `تم حذف القسم: ${name}`);
        if (response) {
          setConfirmState(null);
        }
      },
    });
  }

  async function handleAddCity(name) {
    await runRequest(() => api.addCity(sessionToken, name), `تمت إضافة المدينة: ${name.trim()}`);
  }

  function handleDeleteCity(name) {
    setConfirmState({
      title: "حذف المدينة",
      description: `سيتم حذف المدينة ${name} مع جميع مواقعها.`,
      confirmText: "حذف",
      onConfirm: async () => {
        const response = await runRequest(() => api.deleteCity(sessionToken, name), `تم حذف المدينة: ${name}`);
        if (response) {
          setConfirmState(null);
        }
      },
    });
  }

  async function handleAddSite(city, name) {
    await runRequest(() => api.addSite(sessionToken, city, name), `تمت إضافة الموقع: ${name.trim()}`);
  }

  function handleDeleteSite(index) {
    const site = sites[index];
    if (!site) return;

    setConfirmState({
      title: "حذف الموقع",
      description: `سيتم حذف الموقع: ${site.name}`,
      confirmText: "حذف",
      onConfirm: async () => {
        const response = await runRequest(() => api.deleteSite(sessionToken, index), `تم حذف الموقع: ${site.name}`);
        if (response) {
          setConfirmState(null);
        }
      },
    });
  }

  function handleResetData() {
    setConfirmState({
      title: "مسح البيانات التجريبية",
      description: "سيتم حذف جميع البيانات الحالية وإعادة تحميل النسخة الافتراضية من الخادم.",
      confirmText: "مسح",
      onConfirm: async () => {
        const response = await runRequest(() => api.resetData(sessionToken), "تمت إعادة تحميل البيانات الافتراضية.");
        if (response) {
          setActivePage("dashboard");
          setConfirmState(null);
        }
      },
    });
  }

  function handleExport() {
    exportIncidentsCsv(scopedIncidents);
    showNotice("success", "تم تصدير الملف بنجاح.");
  }

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-700">
        جارٍ تحميل الجلسة والبيانات...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <Notice notice={notice} onClose={() => setNotice(null)} />
        <LoginScreen
          onLogin={handleLogin}
          loginIdentifier={loginIdentifier}
          onLoginIdentifierChange={setLoginIdentifier}
          password={passwordInput}
          onPasswordChange={setPasswordInput}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Notice notice={notice} onClose={() => setNotice(null)} />
      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title}
        description={confirmState?.description}
        confirmText={confirmState?.confirmText}
        onCancel={() => setConfirmState(null)}
        onConfirm={() => confirmState?.onConfirm?.()}
      />

      <div className="lg:grid lg:grid-cols-[320px_1fr]">
        <Sidebar
          currentUser={currentUser}
          activePage={activePage}
          onNavigate={navigate}
          onLogout={handleLogout}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        <main className="min-w-0">
          <Header
            currentUser={currentUser}
            activePage={activePage}
            onQuickNew={() => setActivePage("new")}
            onOpenMenu={() => setMobileOpen(true)}
          />

          <div className="space-y-6 p-5 lg:p-8">
            {activePage === "dashboard" ? <DashboardPage incidents={scopedIncidents} /> : null}
            {activePage === "new" ? (
              <NewIncidentPage
                cities={cities}
                sites={sites}
                currentUser={currentUser}
                onSave={handleSaveIncident}
                onCancel={() => setActivePage("dashboard")}
              />
            ) : null}
            {activePage === "incidents" ? (
              <IncidentsPage
                incidents={scopedIncidents}
                currentUser={currentUser}
                onApprove={handleApproveIncident}
                onDelete={handleDeleteIncident}
              />
            ) : null}
            {activePage === "reports" ? (
              <ReportsPage
                incidents={scopedIncidents}
                currentUser={currentUser}
                onExport={handleExport}
                cities={cities}
              />
            ) : null}
            {activePage === "users" ? (
              <UsersPage
                users={users}
                cities={cities}
                departments={departments}
                currentUser={currentUser}
                onAddUser={handleAddUser}
                onUpdateUser={handleUpdateUser}
                onDeleteUser={handleDeleteUser}
                onResetPassword={handleResetUserPassword}
              />
            ) : null}
            {activePage === "account" ? (
              <AccountPage currentUser={currentUser} onChangePassword={handleChangePassword} />
            ) : null}
            {activePage === "security" ? (
              <SecurityPage
                departments={departments}
                cities={cities}
                sites={sites}
                auditLogs={auditLogs}
                incidentSequence={incidentSequence}
                onAddDepartment={handleAddDepartment}
                onDeleteDepartment={handleDeleteDepartment}
                onAddCity={handleAddCity}
                onDeleteCity={handleDeleteCity}
                onAddSite={handleAddSite}
                onDeleteSite={handleDeleteSite}
                onResetData={handleResetData}
              />
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
