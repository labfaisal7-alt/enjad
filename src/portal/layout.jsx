import { LogOut, Menu, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PAGE_META } from "./config";
import { allowedPages, canAccess } from "./helpers";
import { Field, HeroLogo, inputClass } from "./shared";

export function LoginScreen({ onLogin, loginIdentifier, onLoginIdentifierChange, password, onPasswordChange }) {
  return (
    <div className="grid min-h-screen bg-slate-50 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="hidden bg-[linear-gradient(135deg,#991b1b,#450a0a,#020617)] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="space-y-6">
          <HeroLogo />
          <div className="space-y-3">
            <h1 className="text-4xl font-black leading-snug">جمعية إنجاد للبحث والإنقاذ</h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-200">
              بوابة مباشرة الحالات الإسعافية للحجاج والمعتمرين في مكة المكرمة والمدينة المنورة.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/10 p-6 text-sm leading-7 text-slate-100 backdrop-blur">
          <p>تسجيل الدخول متاح فقط للحسابات التي ينشئها مشرف العمليات أو مدير النظام.</p>
          <p className="mt-2">الحسابات التجريبية الحالية: faisal.aseeri / ali.mutairi / admin.enjad</p>
        </div>
      </section>

      <section className="flex items-center justify-center p-6 lg:p-10">
        <Card className="w-full max-w-xl rounded-[28px] border-slate-200 shadow-xl shadow-slate-200/70">
          <CardContent className="space-y-6 p-8">
            <div className="space-y-2 text-right">
              <p className="text-sm font-semibold text-sky-600">بوابة مباشرة الحالات</p>
              <h2 className="text-3xl font-black text-slate-900">تسجيل الدخول</h2>
              <p className="text-sm leading-7 text-slate-500">
                أدخل اسم المستخدم أو رقم الجوال مع كلمة المرور. لا يمكن إنشاء الحساب من شاشة الدخول.
              </p>
            </div>

            <div className="space-y-4">
              <Field label="اسم المستخدم أو رقم الجوال">
                <input
                  value={loginIdentifier}
                  onChange={(event) => onLoginIdentifierChange(event.target.value)}
                  placeholder="مثال: admin.enjad أو 0500000003"
                  className={inputClass}
                />
              </Field>

              <Field label="كلمة المرور">
                <input
                  type="password"
                  value={password}
                  onChange={(event) => onPasswordChange(event.target.value)}
                  placeholder="أدخل كلمة المرور"
                  className={inputClass}
                />
              </Field>
            </div>

            <Button className="w-full bg-red-600 hover:bg-red-500" onClick={onLogin}>
              دخول
            </Button>

            <div className="rounded-2xl bg-slate-50 p-4 text-right text-sm leading-7 text-slate-600">
              <p className="font-bold text-slate-900">حسابات تجريبية</p>
              <p>faisal.aseeri / Enjad@1001</p>
              <p>ali.mutairi / Enjad@2002</p>
              <p>admin.enjad / Enjad@3003</p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

export function Sidebar({ currentUser, activePage, onNavigate, onLogout, mobileOpen, onCloseMobile }) {
  const items = allowedPages(currentUser.role);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/35 transition lg:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onCloseMobile}
      />

      <aside
        className={`fixed inset-y-0 right-0 z-50 w-80 border-l border-slate-200 bg-white p-5 transition lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="mb-6 flex items-start justify-between lg:hidden">
          <div className="text-right">
            <p className="text-sm font-semibold text-red-600">جمعية إنجاد</p>
            <p className="text-xs text-slate-500">بوابة مباشرة الحالات</p>
          </div>
          <button className="rounded-xl border border-slate-200 p-2 text-slate-500" onClick={onCloseMobile}>
            <X size={18} />
          </button>
        </div>

        <div className="rounded-[28px] bg-slate-950 p-5 text-white">
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl">{"\u{1F691}"}</div>
            <div className="text-right">
              <h2 className="font-black">جمعية إنجاد</h2>
              <p className="text-xs text-slate-300">بوابة مباشرة الحالات الإسعافية</p>
            </div>
          </div>

          <div className="rounded-2xl bg-white/10 p-4 text-right">
            <p className="font-bold">{currentUser.name}</p>
            <p className="mt-1 text-sm text-slate-300">{currentUser.role}</p>
            <p className="mt-1 text-xs text-slate-400">
              {currentUser.city} — {currentUser.team}
            </p>
          </div>

          <Button
            variant="outline"
            className="mt-4 w-full border-white/20 bg-white/5 text-white hover:bg-white/10"
            onClick={onLogout}
          >
            <LogOut size={16} />
            تسجيل خروج
          </Button>
        </div>

        <nav className="mt-6 space-y-2">
          {items.map((key) => {
            const meta = PAGE_META[key];
            const Icon = meta.icon;
            const isActive = activePage === key;
            return (
              <button
                key={key}
                onClick={() => {
                  onNavigate(key);
                  onCloseMobile();
                }}
                className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-right transition ${
                  isActive ? "bg-red-50 text-red-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className="font-semibold">{meta.label}</span>
                <Icon size={18} />
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

export function Header({ currentUser, activePage, onQuickNew, onOpenMenu }) {
  const meta = PAGE_META[activePage];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 lg:hidden">
          <button className="rounded-xl border border-slate-200 p-2" onClick={onOpenMenu}>
            <Menu size={18} />
          </button>
        </div>

        <div className="flex-1 text-right">
          <h1 className="text-2xl font-black text-slate-900">{meta.label}</h1>
          <p className="text-sm text-slate-500">{meta.subtitle}</p>
        </div>

        {canAccess(currentUser.role, "new") ? (
          <Button className="bg-red-600 hover:bg-red-500" onClick={onQuickNew}>
            <Plus size={16} />
            بلاغ جديد
          </Button>
        ) : null}
      </div>
    </header>
  );
}
