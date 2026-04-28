import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-red-300";

export function HeroLogo() {
  return (
    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/95 text-3xl shadow-lg">
      {"\u{1F691}"}
    </div>
  );
}

export function Notice({ notice, onClose }) {
  if (!notice) return null;
  const isError = notice.type === "error";

  return (
    <div className="fixed left-4 top-4 z-[100] w-[min(92vw,420px)]">
      <div
        className={`flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg ${
          isError
            ? "border-red-200 bg-red-50 text-red-800"
            : "border-emerald-200 bg-emerald-50 text-emerald-800"
        }`}
      >
        {isError ? <AlertCircle size={18} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={18} className="mt-0.5 shrink-0" />}
        <div className="flex-1 text-right text-sm leading-7">{notice.message}</div>
        <button onClick={onClose} className="shrink-0 rounded-lg p-1 hover:bg-black/5">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, description, confirmText = "تأكيد", onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 text-right shadow-2xl">
        <h3 className="text-xl font-black text-slate-900">{title}</h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
        <div className="mt-6 flex justify-start gap-3">
          <Button className="bg-red-600 hover:bg-red-500" onClick={onConfirm}>
            {confirmText}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            إلغاء
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SectionCard({ title, subtitle, children, action }) {
  return (
    <Card className="rounded-[26px] border-slate-200">
      <CardContent className="space-y-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="text-right">
            <h3 className="text-xl font-black text-slate-900">{title}</h3>
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          {action}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export function StatCard({ title, value, note }) {
  return (
    <Card className="rounded-[24px] border-slate-200">
      <CardContent className="p-5 text-right">
        <p className="text-sm font-semibold text-slate-500">{title}</p>
        <p className="mt-3 text-4xl font-black text-slate-900">{value}</p>
        <p className="mt-2 text-xs text-slate-400">{note}</p>
      </CardContent>
    </Card>
  );
}

export function SimpleList({ rows }) {
  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div key={`${row.primary}-${index}`} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
          {row.action || <span />}
          <div className="text-right">
            <p className="font-semibold text-slate-800">{row.primary}</p>
            {row.secondary ? <p className="text-xs text-slate-500">{row.secondary}</p> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function InfoBox({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 text-right">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-2 font-bold text-slate-900">{value}</p>
    </div>
  );
}

export function Field({ label, children, className = "" }) {
  return (
    <label className={`block text-right text-sm font-bold text-slate-700 ${className}`}>
      <span>{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}
