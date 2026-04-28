import { hasAccess } from "./constants.js";
import { sanitizeUser } from "./auth.js";

export function createAuditEntry(currentUser, action, details) {
  return {
    time: new Date().toLocaleString("ar-SA"),
    user: currentUser ? `${currentUser.name} - ${currentUser.role}` : "النظام",
    action,
    details,
  };
}

export function visibleIncidents(currentUser, incidents) {
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

export function buildAppState(currentUser, state) {
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
