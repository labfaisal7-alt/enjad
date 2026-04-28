import { ROLE_ACCESS } from "./config";

export function normalizeLoginIdentifier(value) {
  return String(value || "").trim().toLowerCase();
}

export function allowedPages(role) {
  return ROLE_ACCESS[role] || [];
}

export function canAccess(role, page) {
  return allowedPages(role).includes(page);
}

export function visibleIncidents(currentUser, incidents) {
  if (!currentUser) return [];
  if (["مشرف عمليات", "مدير النظام", "مسؤول إحصائيات"].includes(currentUser.role)) return incidents;
  if (currentUser.role === "قائد فريق") {
    return incidents.filter(
      (incident) => incident.team === currentUser.team || incident.city === currentUser.city,
    );
  }
  return incidents.filter((incident) => incident.createdBy === currentUser.name);
}

export function statusBadgeClass(status) {
  if (status === "مغلق") return "bg-emerald-100 text-emerald-700";
  if (status === "قيد المراجعة") return "bg-amber-100 text-amber-700";
  if (status === "مسودة") return "bg-slate-100 text-slate-700";
  return "bg-sky-100 text-sky-700";
}

export function severityBadgeClass(severity) {
  if (severity === "حرج" || severity === "وفاة") return "bg-red-100 text-red-700";
  if (severity === "متوسط") return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

export function exportIncidentsCsv(incidents) {
  const headers = [
    "id",
    "source",
    "rc",
    "city",
    "location",
    "type",
    "severity",
    "patientCount",
    "category",
    "intervention",
    "handover",
    "status",
    "createdBy",
    "team",
    "time",
    "vitals",
    "notes",
  ];

  const rows = [
    headers,
    ...incidents.map((incident) =>
      headers.map((key) => String(incident[key] ?? "").replaceAll(",", " ")),
    ),
  ];

  const csv = rows.map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "hajj_incidents.csv";
  link.click();
}
