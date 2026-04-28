import { useEffect, useState } from "react";
import {
  Activity,
  Ambulance,
  ArrowLeft,
  Bell,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Info,
  MapPin,
  PhoneCall,
  PlusCircle,
  Search,
  FileDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ADMIN_ROLE, ROLE_ACCESS } from "./config";
import { severityBadgeClass, statusBadgeClass } from "./helpers";
import { Field, InfoBox, SectionCard, SimpleList, StatCard, inputClass } from "./shared";

export function DashboardPage({ incidents }) {
  const closed = incidents.filter((incident) => incident.status === "مغلق").length;
  const pending = incidents.filter((incident) => incident.status !== "مغلق").length;
  const redCrescent = incidents.filter((incident) => incident.source.includes("الهلال")).length;
  const selfResponses = incidents.filter((incident) => incident.source.includes("ذاتية")).length;
  const totalPatients = incidents.reduce((sum, incident) => sum + Number(incident.patientCount || 0), 0);
  const latestIncidents = incidents.slice().reverse().slice(0, 4);
  const cityCounts = Object.entries(
    incidents.reduce((accumulator, incident) => {
      accumulator[incident.city] = (accumulator[incident.city] || 0) + 1;
      return accumulator;
    }, {}),
  ).sort(([, left], [, right]) => right - left);
  const totalDistribution = cityCounts.reduce((sum, [, count]) => sum + count, 0) || 1;
  const distributionColors = ["#2f9e44", "#4c6ef5", "#f08c00", "#845ef7", "#e03131"];
  const donutStops = cityCounts.length
    ? cityCounts
        .reduce(
          (accumulator, [, count], index) => {
            const start = accumulator.offset;
            const end = start + (count / totalDistribution) * 100;
            accumulator.segments.push(
              `${distributionColors[index % distributionColors.length]} ${start}% ${end}%`,
            );
            accumulator.offset = end;
            return accumulator;
          },
          { offset: 0, segments: [] },
        )
        .segments.join(", ")
    : "#e2e8f0 0% 100%";

  const statCards = [
    {
      title: "مباشرة مكتملة",
      value: closed,
      note: "اليوم",
      color: "text-emerald-600",
      icon: CheckCircle2,
      iconClass: "text-emerald-500",
    },
    {
      title: "قيد المتابعة",
      value: pending,
      note: "اليوم",
      color: "text-amber-500",
      icon: Clock3,
      iconClass: "text-amber-500",
    },
    {
      title: "مباشرات ذاتية",
      value: selfResponses,
      note: "اليوم",
      color: "text-blue-600",
      icon: Ambulance,
      iconClass: "text-blue-500",
    },
    {
      title: "بلاغات الهلال الأحمر",
      value: redCrescent,
      note: "اليوم",
      color: "text-rose-500",
      icon: PhoneCall,
      iconClass: "text-rose-500",
    },
    {
      title: "إجمالي البلاغات",
      value: incidents.length,
      note: "اليوم",
      color: "text-violet-600",
      icon: ClipboardList,
      iconClass: "text-violet-500",
    },
  ];

  const coverageRows = cityCounts.length
    ? cityCounts.map(([city, count], index) => ({
        city,
        count,
        percent: Math.round((count / totalDistribution) * 100),
        color: distributionColors[index % distributionColors.length],
      }))
    : [{ city: "لا توجد بيانات", count: 0, percent: 0, color: "#cbd5e1" }];

  const alertRows = [
    pending
      ? {
          title: `تنبيه: يوجد ${pending} بلاغ ${pending === 1 ? "قيد المتابعة" : "قيد المتابعة"}`,
          subtitle: "يلزم استكمال التوثيق والمتابعة",
          dot: "bg-rose-400",
        }
      : null,
    incidents.some((incident) => incident.type.includes("حراري"))
      ? {
          title: "تذكير: راقب الحالات الحرارية",
          subtitle: "سجّل الحيويات ونتيجة التدخل بدقة",
          dot: "bg-amber-400",
        }
      : null,
    {
      title: `إجمالي المستفيدين اليوم: ${totalPatients}`,
      subtitle: "ملخص محدث حسب نطاق الصلاحية",
      dot: "bg-emerald-400",
    },
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="rounded-[26px] border border-slate-200 bg-white px-5 py-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="text-right">
                  <p className={`text-4xl font-black ${card.color}`}>{card.value}</p>
                  <p className="mt-3 font-bold text-slate-800">{card.title}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">{card.note}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50">
                  <Icon size={24} className={card.iconClass} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-[24px] border border-sky-100 bg-sky-50/80 px-5 py-4 text-right text-sky-700">
        <Info size={18} className="shrink-0" />
        <p className="flex-1 text-sm font-semibold leading-7">
          نرجو من الجميع الالتزام بتوثيق جميع التفاصيل بدقة لضمان تقديم أفضل خدمة إنسانية لضيوف الرحمن.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_1.1fr_0.9fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]">
          <div className="mb-6 flex items-start justify-between gap-3">
            <MapPin size={18} className="text-slate-400" />
            <div className="text-right">
              <h3 className="text-xl font-black text-slate-900">توزيع الحالات حسب الموقع</h3>
              <p className="mt-1 text-sm text-slate-500">ملخص الحالات حسب المدن المتاحة ضمن صلاحيتك</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start">
            <div
              className="relative h-44 w-44 shrink-0 rounded-full"
              style={{ background: `conic-gradient(${donutStops})` }}
            >
              <div className="absolute inset-[22px] rounded-full bg-white shadow-inner" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-900">
                <span className="text-sm font-semibold text-slate-500">إجمالي</span>
                <span className="text-3xl font-black">{incidents.length}</span>
              </div>
            </div>

            <div className="w-full space-y-3">
              {coverageRows.map((row, index) => (
                <div key={`${row.city}-${index}`} className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-slate-600">{row.percent}%</span>
                  <div className="flex flex-1 items-center justify-end gap-3">
                    <span className="text-sm font-semibold text-slate-700">{row.city}</span>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]">
          <div className="mb-5 flex items-start justify-between gap-3">
            <ArrowLeft size={18} className="text-slate-400" />
            <div className="text-right">
              <h3 className="text-xl font-black text-slate-900">آخر البلاغات</h3>
              <p className="mt-1 text-sm text-slate-500">أحدث البلاغات ضمن نطاق الصلاحية الحالية</p>
            </div>
          </div>

          <div className="space-y-3">
            {latestIncidents.length ? (
              latestIncidents.map((incident) => (
                <div key={incident.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusBadgeClass(incident.status)}`}>
                      {incident.status}
                    </span>
                    <div className="text-right">
                      <p className="font-black text-slate-900">{incident.id}</p>
                      <p className="mt-1 text-sm text-slate-600">{incident.location}</p>
                      <p className="mt-2 text-xs text-slate-400">
                        {incident.city} - {incident.createdBy}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                لا توجد بلاغات حتى الآن
              </div>
            )}
          </div>

          <button className="mt-4 w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200">
            عرض جميع البلاغات
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-[28px] bg-[linear-gradient(135deg,#2f9e44,#2b8a3e,#1f6f31)] p-6 text-white shadow-[0_22px_50px_-30px_rgba(47,158,68,0.75)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-emerald-600">
                <PlusCircle size={24} />
              </div>
              <div className="text-right">
                <h3 className="text-2xl font-black">بلاغ جديد</h3>
                <p className="mt-2 text-sm text-emerald-50">سجّل مباشرة حالة جديدة ضمن الفريق الميداني</p>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between gap-3">
              <Activity className="text-rose-500" size={24} />
              <div className="text-right">
                <p className="font-bold text-slate-900">بلاغ محال من الهلال الأحمر</p>
                <p className="mt-1 text-sm text-slate-500">عدد البلاغات الحالية: {redCrescent}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between gap-3">
              <Ambulance className="text-emerald-500" size={24} />
              <div className="text-right">
                <p className="font-bold text-slate-900">مباشرة ذاتية</p>
                <p className="mt-1 text-sm text-slate-500">من الفرق الميدانية: {selfResponses}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.85fr_1.2fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]">
          <div className="mb-5 flex items-start justify-between gap-3">
            <BookOpen size={18} className="text-emerald-500" />
            <div className="text-right">
              <h3 className="text-xl font-black text-slate-900">إرشادات سريعة</h3>
              <p className="mt-1 text-sm text-slate-500">تذكير مختصر قبل إغلاق أو إحالة البلاغ</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              "تأكد من سلامتك أولًا",
              "قيّم الحالة بدقة",
              "وثّق جميع المعلومات",
              "تابع الحالة حتى الاستقرار",
              "تواصل مع المشرف عند الحاجة",
            ].map((item) => (
              <div key={item} className="flex items-center justify-between gap-3">
                <CheckCircle2 size={18} className="text-emerald-500" />
                <p className="text-sm font-semibold text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]">
          <div className="mb-5 flex items-start justify-between gap-3">
            <MapPin size={18} className="text-violet-500" />
            <div className="text-right">
              <h3 className="text-xl font-black text-slate-900">مناطق التغطية</h3>
              <p className="mt-1 text-sm text-slate-500">توزيع العمل حسب المدن المرئية لك</p>
            </div>
          </div>

          <div className="space-y-4">
            {coverageRows.slice(0, 3).map((row, index) => (
              <div key={`${row.city}-coverage-${index}`} className="rounded-2xl bg-slate-50 px-4 py-4 text-right">
                <p className="font-black text-slate-900">{row.city}</p>
                <p className="mt-1 text-sm text-slate-500">{row.count} حالة ضمن النطاق</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]">
          <div className="mb-5 flex items-start justify-between gap-3">
            <Bell size={18} className="text-rose-500" />
            <div className="text-right">
              <h3 className="text-xl font-black text-slate-900">التنبيهات</h3>
              <p className="mt-1 text-sm text-slate-500">ملخص سريع يحتاج انتباه الفريق</p>
            </div>
          </div>

          <div className="space-y-4">
            {alertRows.map((alert, index) => (
              <div key={`${alert.title}-${index}`} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-4">
                <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${alert.dot}`} />
                <div className="text-right">
                  <p className="font-bold text-slate-900">{alert.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{alert.subtitle}</p>
                </div>
              </div>
            ))}
          </div>

          <button className="mt-4 w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200">
            عرض جميع التنبيهات
          </button>
        </div>
      </div>
    </div>
  );
}

export function NewIncidentPage({ cities, sites, currentUser, onSave, onCancel }) {
  const [form, setForm] = useState({
    source: "مباشرة ذاتية من الفريق",
    rc: "",
    city: cities[0] || "",
    seasonLocation: "",
    location: "",
    time: "",
    type: "إجهاد حراري",
    severity: "بسيط",
    patientCount: 1,
    category: "حاج",
    intervention: "تقييم أولي",
    handover: "علاج بالموقع",
    gender: "غير محدد",
    nationality: "",
    approximateAge: "",
    language: "",
    consciousnessLevel: "واعي",
    pulse: "",
    bloodPressure: "",
    oxygenSaturation: "",
    bloodSugar: "",
    vitals: "",
    notes: "",
  });

  useEffect(() => {
    const available = sites.filter((site) => site.city === form.city);
    const firstSite = available[0]?.name || "";
    setForm((current) => ({
      ...current,
      seasonLocation: available.some((site) => site.name === current.seasonLocation) ? current.seasonLocation : firstSite,
    }));
  }, [form.city, sites]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function buildVitalsSummary() {
    const details = [
      ["صفة المستفيد", form.category],
      ["الجنس", form.gender],
      ["الجنسية", form.nationality],
      ["العمر التقريبي", form.approximateAge],
      ["اللغة", form.language],
      ["مستوى الوعي", form.consciousnessLevel],
      ["تصنيف الحالة", form.severity],
      ["النبض", form.pulse],
      ["الضغط", form.bloodPressure],
      ["نسبة الأكسجين", form.oxygenSaturation],
      ["السكر", form.bloodSugar],
    ].filter(([, value]) => String(value || "").trim());

    return details.map(([label, value]) => `${label}: ${String(value).trim()}`).join(" | ");
  }

  function handleSubmit(status) {
    onSave(
      {
        ...form,
        vitals: buildVitalsSummary(),
      },
      status,
      currentUser,
    );
  }

  const availableSites = sites.filter((site) => site.city === form.city);

  return (
    <SectionCard title="تسجيل مباشرة حالة إسعافية" subtitle="للحجاج والمعتمرين في مكة المكرمة والمدينة المنورة">
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <Field label="مصدر البلاغ">
          <select value={form.source} onChange={(event) => updateField("source", event.target.value)} className={inputClass}>
            <option>مباشرة ذاتية من الفريق</option>
            <option>بلاغ محال من الهلال الأحمر</option>
            <option>نقطة فرز/مركز تطوعي</option>
            <option>جهة تنظيمية</option>
          </select>
        </Field>

        <Field label="رقم بلاغ الهلال الأحمر">
          <input value={form.rc} onChange={(event) => updateField("rc", event.target.value)} placeholder="997-12345" className={inputClass} />
        </Field>

        <Field label="المدينة">
          <select value={form.city} onChange={(event) => updateField("city", event.target.value)} className={inputClass}>
            {cities.map((city) => (
              <option key={city}>{city}</option>
            ))}
          </select>
        </Field>

        <Field label="الموقع الموسمي">
          <select value={form.seasonLocation} onChange={(event) => updateField("seasonLocation", event.target.value)} className={inputClass}>
            {availableSites.map((site) => (
              <option key={`${site.city}-${site.name}`}>{site.name}</option>
            ))}
          </select>
        </Field>

        <Field label="وصف الموقع أو الإحداثيات">
          <input value={form.location} onChange={(event) => updateField("location", event.target.value)} placeholder="مثال: بوابة الملك عبدالعزيز - الدور الأول" className={inputClass} />
        </Field>

        <Field label="وقت البلاغ">
          <input type="time" value={form.time} onChange={(event) => updateField("time", event.target.value)} className={inputClass} />
        </Field>

        <Field label="نوع الحالة">
          <select value={form.type} onChange={(event) => updateField("type", event.target.value)} className={inputClass}>
            {["إجهاد حراري", "ضربة شمس", "إغماء", "هبوط سكر", "سقوط", "اختناق", "توقف قلب وتنفس", "وفاة"].map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </Field>

        <Field label="عدد الحالات">
          <input type="number" min="1" value={form.patientCount} onChange={(event) => updateField("patientCount", event.target.value)} className={inputClass} />
        </Field>

        <Field label="الإجراء الإسعافي">
          <select value={form.intervention} onChange={(event) => updateField("intervention", event.target.value)} className={inputClass}>
            {["تقييم أولي", "تبريد/كمادات", "إنعاش قلبي رئوي", "تضميد", "جبيرة", "أكسجين", "قياس حيويات", "إحالة"].map((intervention) => (
              <option key={intervention}>{intervention}</option>
            ))}
          </select>
        </Field>

        <Field label="نتيجة التسليم">
          <select value={form.handover} onChange={(event) => updateField("handover", event.target.value)} className={inputClass}>
            {["علاج بالموقع", "تسليم للهلال الأحمر", "تسليم لمستشفى", "رفض النقل", "إغلاق موقعي"].map((handover) => (
              <option key={handover}>{handover}</option>
            ))}
          </select>
        </Field>

        <Field label="المستخدم الحالي" className="xl:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {currentUser.name} — {currentUser.role}
          </div>
        </Field>
      </div>

      <div className="mt-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-base font-black text-red-600">
            1
          </div>
          <div className="text-right">
            <h4 className="text-lg font-black text-slate-900">بيانات المستفيد رقم 1</h4>
            <p className="mt-1 text-sm text-slate-500">
              لا يتم إدخال الاسم أو رقم الجواز أو الهوية إلا عند الحاجة النظامية.
            </p>
          </div>
        </div>

        <div className="grid gap-4 bg-slate-50/60 px-5 py-5 md:grid-cols-2 xl:grid-cols-4">
          <Field label="صفة المستفيد">
            <select value={form.category} onChange={(event) => updateField("category", event.target.value)} className={inputClass}>
              {["حاج", "معتمر", "زائر", "متطوع", "موظف"].map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </Field>

          <Field label="الجنس">
            <select value={form.gender} onChange={(event) => updateField("gender", event.target.value)} className={inputClass}>
              {["غير محدد", "ذكر", "أنثى"].map((gender) => (
                <option key={gender}>{gender}</option>
              ))}
            </select>
          </Field>

          <Field label="الجنسية">
            <input
              value={form.nationality}
              onChange={(event) => updateField("nationality", event.target.value)}
              placeholder="مثال: إندونيسي"
              className={inputClass}
            />
          </Field>

          <Field label="العمر التقريبي">
            <input
              type="number"
              min="0"
              value={form.approximateAge}
              onChange={(event) => updateField("approximateAge", event.target.value)}
              placeholder="مثال: 35"
              className={inputClass}
            />
          </Field>

          <Field label="اللغة">
            <input
              value={form.language}
              onChange={(event) => updateField("language", event.target.value)}
              placeholder="مثال: عربي / إنجليزي / أردو"
              className={inputClass}
            />
          </Field>

          <Field label="مستوى الوعي">
            <select
              value={form.consciousnessLevel}
              onChange={(event) => updateField("consciousnessLevel", event.target.value)}
              className={inputClass}
            >
              {["واعي", "مشوش", "فاقد الوعي"].map((level) => (
                <option key={level}>{level}</option>
              ))}
            </select>
          </Field>

          <Field label="تصنيف الحالة">
            <select value={form.severity} onChange={(event) => updateField("severity", event.target.value)} className={inputClass}>
              {["بسيط", "متوسط", "حرج", "وفاة"].map((severity) => (
                <option key={severity}>{severity}</option>
              ))}
            </select>
          </Field>

          <Field label="النبض">
            <input
              value={form.pulse}
              onChange={(event) => updateField("pulse", event.target.value)}
              placeholder="نبضة/دقيقة"
              className={inputClass}
            />
          </Field>

          <Field label="الضغط">
            <input
              value={form.bloodPressure}
              onChange={(event) => updateField("bloodPressure", event.target.value)}
              placeholder="120/80"
              className={inputClass}
            />
          </Field>

          <Field label="نسبة الأكسجين">
            <input
              value={form.oxygenSaturation}
              onChange={(event) => updateField("oxygenSaturation", event.target.value)}
              placeholder="% SpO2"
              className={inputClass}
            />
          </Field>

          <Field label="السكر">
            <input
              value={form.bloodSugar}
              onChange={(event) => updateField("bloodSugar", event.target.value)}
              placeholder="mg/dL"
              className={inputClass}
            />
          </Field>
        </div>
      </div>

      <Field label="ملاحظات إضافية" className="mt-4">
        <textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} rows={4} className={inputClass} />
      </Field>

      <div className="mt-6 flex flex-wrap justify-start gap-3">
        <Button variant="outline" onClick={onCancel}>
          إلغاء
        </Button>
        <Button variant="outline" onClick={() => handleSubmit("مسودة")}>
          حفظ كمسودة
        </Button>
        <Button className="bg-red-600 hover:bg-red-500" onClick={() => handleSubmit("قيد المراجعة")}>
          حفظ وإرسال
        </Button>
        {["قائد فريق", "مشرف عمليات", "مدير النظام"].includes(currentUser.role) ? (
          <Button className="bg-emerald-600 hover:bg-emerald-500" onClick={() => handleSubmit("مغلق")}>
            إغلاق مباشر
          </Button>
        ) : null}
      </div>
    </SectionCard>
  );
}

export function IncidentsPage({ incidents, currentUser, onApprove, onDelete }) {
  const [query, setQuery] = useState("");
  const filtered = incidents.filter((incident) =>
    [incident.id, incident.location, incident.city, incident.type, incident.createdBy, incident.team]
      .join(" ")
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  return (
    <SectionCard
      title="سجل البلاغات"
      subtitle="بحث وعرض البلاغات المتاحة حسب صلاحية المستخدم"
      action={
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث سريع..." className={`${inputClass} pr-10`} />
        </div>
      }
    >
      <div className="hidden overflow-x-auto lg:block">
        <table className="min-w-full text-right text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500">
              {["رقم البلاغ", "المدينة", "النوع/الشدة", "الموقع", "الفريق", "الحالة", "إجراءات"].map((header, index) => (
                <th key={header} className={`px-4 py-3 ${index === 0 ? "rounded-r-2xl" : ""} ${index === 6 ? "rounded-l-2xl" : ""}`}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((incident) => (
              <tr key={incident.id} className="border-b border-slate-100 last:border-b-0">
                <td className="px-4 py-4">
                  <p className="font-black text-slate-900">{incident.id}</p>
                  <p className="mt-1 text-xs text-slate-400">{incident.time}</p>
                  <p className="mt-1 text-xs text-slate-400">{incident.rc || "لا يوجد رقم هلال"}</p>
                </td>
                <td className="px-4 py-4 text-slate-600">{incident.city}</td>
                <td className="px-4 py-4 text-slate-600">
                  {incident.type}
                  <div className="mt-2 flex justify-end gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${severityBadgeClass(incident.severity)}`}>{incident.severity}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{incident.patientCount} حالة</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-slate-600">{incident.location}</td>
                <td className="px-4 py-4 text-slate-600">
                  {incident.team}
                  <p className="mt-1 text-xs text-slate-400">{incident.createdBy}</p>
                </td>
                <td className="px-4 py-4">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusBadgeClass(incident.status)}`}>{incident.status}</span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap justify-end gap-2">
                    {["قائد فريق", "مشرف عمليات", "مدير النظام"].includes(currentUser.role) && incident.status !== "مغلق" ? (
                      <Button className="bg-emerald-600 px-3 py-2 text-xs hover:bg-emerald-500" onClick={() => onApprove(incident.id)}>
                        اعتماد
                      </Button>
                    ) : null}
                    {["مشرف عمليات", "مدير النظام"].includes(currentUser.role) ? (
                      <Button className="bg-red-600 px-3 py-2 text-xs hover:bg-red-500" onClick={() => onDelete(incident.id)}>
                        حذف
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 lg:hidden">
        {filtered.map((incident) => (
          <div key={incident.id} className="rounded-3xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="text-right">
                <p className="font-black text-slate-900">{incident.id}</p>
                <p className="mt-1 text-sm text-slate-600">{incident.location}</p>
                <p className="mt-2 text-xs text-slate-400">
                  {incident.city} — {incident.time}
                </p>
              </div>
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusBadgeClass(incident.status)}`}>{incident.status}</span>
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${severityBadgeClass(incident.severity)}`}>{incident.severity}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{incident.patientCount} حالة</span>
            </div>

            <div className="mt-4 flex flex-wrap justify-start gap-2">
              {["قائد فريق", "مشرف عمليات", "مدير النظام"].includes(currentUser.role) && incident.status !== "مغلق" ? (
                <Button className="bg-emerald-600 px-3 py-2 text-xs hover:bg-emerald-500" onClick={() => onApprove(incident.id)}>
                  اعتماد
                </Button>
              ) : null}
              {["مشرف عمليات", "مدير النظام"].includes(currentUser.role) ? (
                <Button className="bg-red-600 px-3 py-2 text-xs hover:bg-red-500" onClick={() => onDelete(incident.id)}>
                  حذف
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

export function ReportsPage({ incidents, currentUser, onExport, cities }) {
  const heat = incidents.filter((incident) => incident.type.includes("حراري")).length;
  const byCity = cities.map((city) => ({
    city,
    count: incidents.filter((incident) => incident.city === city).length,
  }));
  const redCrescent = incidents.filter((incident) => incident.source === "بلاغ محال من الهلال الأحمر").length;
  const selfResponses = incidents.filter((incident) => incident.source === "مباشرة ذاتية من الفريق").length;
  const totalPatients = incidents.reduce((sum, incident) => sum + Number(incident.patientCount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="إجهاد/ضربات حرارية" value={heat} note="مؤشر مهم للموسم" />
        <StatCard title="بلاغات الهلال الأحمر" value={redCrescent} note="محالة رسميًا" />
        <StatCard title="مباشرات ذاتية" value={selfResponses} note="من الفرق الميدانية" />
        <StatCard title="إجمالي الحالات" value={totalPatients} note="بدون بيانات تعريفية" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <SectionCard title="توزيع حسب المدينة" subtitle="ملخص سريع للحالات حسب المدينة">
          <div className="overflow-x-auto">
            <table className="min-w-full text-right text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500">
                  <th className="rounded-r-2xl px-4 py-3">المدينة</th>
                  <th className="rounded-l-2xl px-4 py-3">العدد</th>
                </tr>
              </thead>
              <tbody>
                {byCity.map((row) => (
                  <tr key={row.city} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-4 py-4 text-slate-700">{row.city}</td>
                    <td className="px-4 py-4 font-bold text-slate-900">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard
          title="تصدير"
          subtitle="التصدير هنا تجريبي بصيغة CSV"
          action={
            currentUser.role === "مسعف ميداني" ? null : (
              <Button onClick={onExport}>
                <FileDown size={16} />
                تصدير CSV
              </Button>
            )
          }
        >
          <div className="space-y-3 text-sm leading-7 text-slate-600">
            <p>يمكن للمشرفين ومدير النظام ومسؤول الإحصائيات تصدير السجل الحالي حسب الصلاحية.</p>
            <p>الملف الناتج مناسب للفرز والتحليل الأولي ومشاركته داخليًا.</p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function createUserForm(cities, departments, user = {}) {
  return {
    name: user.name || "",
    username: user.username || "",
    password: "",
    mobile: user.mobile && user.mobile !== "غير محدد" ? user.mobile : "",
    role: user.role || "مسعف ميداني",
    city: user.city || cities[0] || "",
    team: user.team && user.team !== "غير محدد" ? user.team : departments[0] || "",
  };
}

export function UsersPage({ users, cities, departments, currentUser, onAddUser, onUpdateUser, onDeleteUser, onResetPassword }) {
  const [form, setForm] = useState(() => createUserForm(cities, departments));
  const [editingUserId, setEditingUserId] = useState(null);
  const isAdmin = currentUser?.role === ADMIN_ROLE;
  const tableHeaders = ["الاسم", "اسم المستخدم", "الجوال", "الدور", "المدينة", "الفريق", "الحالة"];

  if (isAdmin) {
    tableHeaders.push("إجراءات");
  }

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setEditingUserId(null);
    setForm(createUserForm(cities, departments));
  }

  function startEdit(user) {
    setEditingUserId(user.id);
    setForm(createUserForm(cities, departments, user));
  }

  async function handleSubmit() {
    const ok = editingUserId ? await onUpdateUser(editingUserId, form) : await onAddUser(form);
    if (ok) {
      resetForm();
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
      <SectionCard title="المستخدمون" subtitle="الحسابات المحلية المحفوظة داخل المتصفح">
        <div className="overflow-x-auto">
          <table className="min-w-full text-right text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500">
                {tableHeaders.map((header, index) => (
                  <th key={header} className={`px-4 py-3 ${index === 0 ? "rounded-r-2xl" : ""} ${index === tableHeaders.length - 1 ? "rounded-l-2xl" : ""}`}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-4 py-4 font-semibold text-slate-800">{user.name}</td>
                  <td className="px-4 py-4 text-slate-600">{user.username}</td>
                  <td className="px-4 py-4 text-slate-600">{user.mobile}</td>
                  <td className="px-4 py-4 text-slate-600">{user.role}</td>
                  <td className="px-4 py-4 text-slate-600">{user.city}</td>
                  <td className="px-4 py-4 text-slate-600">{user.team}</td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">{user.status}</span>
                  </td>
                  {isAdmin ? (
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button variant="outline" className="px-3 py-2 text-xs" onClick={() => startEdit(user)}>
                          تعديل
                        </Button>
                        <Button variant="outline" className="border-amber-200 px-3 py-2 text-xs text-amber-700 hover:bg-amber-50" onClick={() => onResetPassword(user.id)}>
                          إعادة التعيين
                        </Button>
                        <Button className="bg-red-600 px-3 py-2 text-xs hover:bg-red-500" onClick={() => onDeleteUser(user.id)}>
                          حذف
                        </Button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard
        title={editingUserId ? "تعديل مستخدم" : "إضافة مستخدم"}
        subtitle={
          editingUserId
            ? "يمكن للأدمن تعديل بيانات الحساب، بينما تتم إعادة تعيين كلمة المرور من إجراءات الجدول."
            : "الحسابات تُنشأ فقط من قبل المشرف أو مدير النظام، بينما تبقى صلاحيات التعديل والحذف وإعادة التعيين للأدمن."
        }
      >
        <div className="space-y-4">
          <Field label="الاسم">
            <input value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="اسم المستخدم" className={inputClass} />
          </Field>
          <Field label="اسم المستخدم">
            <input value={form.username} onChange={(event) => updateField("username", event.target.value)} placeholder="مثال: ahmed.saleh" className={inputClass} />
          </Field>
          {editingUserId ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-800">
              إعادة تعيين كلمة المرور تتم من زر <span className="font-bold">إعادة التعيين</span> أمام الحساب المطلوب.
            </div>
          ) : (
            <Field label="كلمة المرور الأولية">
              <input type="password" value={form.password} onChange={(event) => updateField("password", event.target.value)} placeholder="أدخل كلمة المرور" className={inputClass} />
            </Field>
          )}
          <Field label="الجوال">
            <input value={form.mobile} onChange={(event) => updateField("mobile", event.target.value)} placeholder="05xxxxxxxx" className={inputClass} />
          </Field>
          <Field label="الدور">
            <select value={form.role} onChange={(event) => updateField("role", event.target.value)} className={inputClass}>
              {Object.keys(ROLE_ACCESS).map((role) => (
                <option key={role}>{role}</option>
              ))}
            </select>
          </Field>
          <Field label="المدينة">
            <select value={form.city} onChange={(event) => updateField("city", event.target.value)} className={inputClass}>
              {[...cities, "الكل"].map((city) => (
                <option key={city}>{city}</option>
              ))}
            </select>
          </Field>
          <Field label="القسم">
            <select value={form.team} onChange={(event) => updateField("team", event.target.value)} className={inputClass}>
              {departments.map((department) => (
                <option key={department}>{department}</option>
              ))}
            </select>
          </Field>

          <div className={`grid gap-3 ${editingUserId ? "sm:grid-cols-2" : ""}`}>
            <Button className="w-full bg-red-600 hover:bg-red-500" onClick={handleSubmit}>
              {editingUserId ? "حفظ التعديلات" : "حفظ المستخدم"}
            </Button>
            {editingUserId ? (
              <Button className="w-full" variant="outline" onClick={resetForm}>
                إلغاء التعديل
              </Button>
            ) : null}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

export function AccountPage({ currentUser, onChangePassword }) {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
      <SectionCard title="بيانات الحساب" subtitle="هذه البيانات خاصة بالمستخدم الحالي">
        <div className="grid gap-4 md:grid-cols-2">
          <InfoBox label="الاسم" value={currentUser.name} />
          <InfoBox label="اسم المستخدم" value={currentUser.username} />
          <InfoBox label="الجوال" value={currentUser.mobile} />
          <InfoBox label="الدور" value={currentUser.role} />
          <InfoBox label="المدينة" value={currentUser.city} />
          <InfoBox label="القسم" value={currentUser.team} />
        </div>
      </SectionCard>

      <SectionCard title="تغيير كلمة المرور" subtitle="يحق لكل مستخدم تغيير الرقم السري الخاص به">
        <div className="space-y-4">
          <Field label="كلمة المرور الحالية">
            <input type="password" value={form.currentPassword} onChange={(event) => setForm((current) => ({ ...current, currentPassword: event.target.value }))} className={inputClass} />
          </Field>
          <Field label="كلمة المرور الجديدة">
            <input type="password" value={form.newPassword} onChange={(event) => setForm((current) => ({ ...current, newPassword: event.target.value }))} className={inputClass} />
          </Field>
          <Field label="تأكيد كلمة المرور الجديدة">
            <input type="password" value={form.confirmPassword} onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))} className={inputClass} />
          </Field>
          <Button
            className="w-full bg-red-600 hover:bg-red-500"
            onClick={async () => {
              const ok = await onChangePassword(form);
              if (ok) {
                setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
              }
            }}
          >
            تحديث كلمة المرور
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}

export function SecurityPage({
  departments,
  cities,
  sites,
  auditLogs,
  incidentSequence,
  onAddDepartment,
  onDeleteDepartment,
  onAddCity,
  onDeleteCity,
  onAddSite,
  onDeleteSite,
  onResetData,
}) {
  const [departmentName, setDepartmentName] = useState("");
  const [cityName, setCityName] = useState("");
  const [siteCity, setSiteCity] = useState(cities[0] || "");
  const [siteName, setSiteName] = useState("");

  useEffect(() => {
    if (!cities.includes(siteCity)) {
      setSiteCity(cities[0] || "");
    }
  }, [cities, siteCity]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="سياسات الأمان" subtitle="ملخص سريع للصلاحيات الحالية">
          <div className="overflow-x-auto">
            <table className="min-w-full text-right text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500">
                  <th className="rounded-r-2xl px-4 py-3">السياسة</th>
                  <th className="rounded-l-2xl px-4 py-3">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["الدخول بالحساب وكلمة المرور", "مفعل"],
                  ["إنشاء الحسابات", "للمشرف ومدير النظام فقط"],
                  ["تغيير كلمة المرور", "متاح لكل مستخدم"],
                  ["تقييد الصفحات حسب الدور", "مفعل"],
                  ["تقييد عرض المباشرات حسب الصلاحية", "مفعل"],
                  ["إدارة المدن والمواقع", "مدير النظام فقط"],
                  ["سجل تتبع الحسابات", "مفعل"],
                ].map(([policy, status]) => (
                  <tr key={policy} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-4 py-4 text-slate-700">{policy}</td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">{status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="إدارة البيانات التجريبية" subtitle="يمسح البيانات المحفوظة محليًا في المتصفح فقط">
          <div className="space-y-4 text-right">
            <p className="text-sm text-slate-600">
              آخر رقم تسلسلي محفوظ: <span className="font-black text-slate-900">{incidentSequence}</span>
            </p>
            <Button className="bg-red-600 hover:bg-red-500" onClick={onResetData}>
              مسح البيانات التجريبية
            </Button>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="إدارة الأقسام" subtitle="إضافة أو حذف الأقسام المرتبطة بالمستخدمين">
          <div className="mb-4 flex flex-wrap gap-3">
            <input value={departmentName} onChange={(event) => setDepartmentName(event.target.value)} placeholder="اسم القسم الجديد" className={`${inputClass} min-w-[240px] flex-1`} />
            <Button onClick={async () => {
              await onAddDepartment(departmentName);
              setDepartmentName("");
            }}>
              إضافة قسم
            </Button>
          </div>
          <SimpleList rows={departments.map((department) => ({
            primary: department,
            action: (
              <Button className="bg-red-600 px-3 py-2 text-xs hover:bg-red-500" onClick={() => onDeleteDepartment(department)}>
                حذف
              </Button>
            ),
          }))} />
        </SectionCard>

        <SectionCard title="إدارة المدن" subtitle="إضافة أو حذف المدن المفعلة في البوابة">
          <div className="mb-4 flex flex-wrap gap-3">
            <input value={cityName} onChange={(event) => setCityName(event.target.value)} placeholder="اسم المدينة" className={`${inputClass} min-w-[240px] flex-1`} />
            <Button onClick={async () => {
              await onAddCity(cityName);
              setCityName("");
            }}>
              إضافة مدينة
            </Button>
          </div>
          <SimpleList rows={cities.map((city) => ({
            primary: city,
            action: (
              <Button className="bg-red-600 px-3 py-2 text-xs hover:bg-red-500" onClick={() => onDeleteCity(city)}>
                حذف
              </Button>
            ),
          }))} />
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <SectionCard title="إدارة المواقع" subtitle="إضافة أو حذف المواقع داخل كل مدينة">
          <div className="mb-4 grid gap-4 md:grid-cols-2">
            <Field label="المدينة">
              <select value={siteCity} onChange={(event) => setSiteCity(event.target.value)} className={inputClass}>
                {cities.map((city) => (
                  <option key={city}>{city}</option>
                ))}
              </select>
            </Field>
            <Field label="اسم الموقع">
              <input value={siteName} onChange={(event) => setSiteName(event.target.value)} placeholder="مثال: باب الملك عبدالعزيز" className={inputClass} />
            </Field>
          </div>

          <div className="mb-4">
            <Button onClick={async () => {
              await onAddSite(siteCity, siteName);
              setSiteName("");
            }}>
              إضافة موقع
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-right text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500">
                  <th className="rounded-r-2xl px-4 py-3">المدينة</th>
                  <th className="px-4 py-3">الموقع</th>
                  <th className="rounded-l-2xl px-4 py-3">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {sites.map((site, index) => (
                  <tr key={`${site.city}-${site.name}-${index}`} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-4 py-4 text-slate-700">{site.city}</td>
                    <td className="px-4 py-4 text-slate-700">{site.name}</td>
                    <td className="px-4 py-4">
                      <Button className="bg-red-600 px-3 py-2 text-xs hover:bg-red-500" onClick={() => onDeleteSite(index)}>
                        حذف
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="سجل تتبع الحسابات" subtitle="آخر 40 عملية محلية">
          <div className="overflow-x-auto">
            <table className="min-w-full text-right text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500">
                  <th className="rounded-r-2xl px-4 py-3">الوقت</th>
                  <th className="px-4 py-3">المستخدم</th>
                  <th className="px-4 py-3">العملية</th>
                  <th className="rounded-l-2xl px-4 py-3">التفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length ? (
                  auditLogs.slice(0, 40).map((log, index) => (
                    <tr key={`${log.time}-${index}`} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-4 py-4 text-slate-600">{log.time}</td>
                      <td className="px-4 py-4 text-slate-600">{log.user}</td>
                      <td className="px-4 py-4 font-semibold text-slate-800">{log.action}</td>
                      <td className="px-4 py-4 text-slate-600">{log.details}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-4 py-8 text-center text-slate-500">
                      لا يوجد سجل حتى الآن
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
