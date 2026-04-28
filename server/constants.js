export const ADMIN_ROLE = "مدير النظام";
export const DEFAULT_RESET_PASSWORD = "Enjad@1234";
export const ROLE_ACCESS = {
  "مسعف ميداني": ["dashboard", "new", "incidents", "account"],
  "قائد فريق": ["dashboard", "new", "incidents", "reports", "account"],
  "مشرف عمليات": ["dashboard", "new", "incidents", "reports", "users", "account"],
  "مسؤول إحصائيات": ["dashboard", "reports", "account"],
  "مدير النظام": ["dashboard", "new", "incidents", "reports", "users", "account", "security"],
};

export const DEFAULT_USERS = [
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

export const DEFAULT_DEPARTMENTS = [
  "العمليات",
  "الإسعاف الميداني",
  "الإحصائيات",
  "إدارة المتطوعين",
  "الدعم اللوجستي",
];

export const DEFAULT_CITIES = ["مكة المكرمة", "المدينة المنورة"];

export const DEFAULT_SITES = [
  { city: "مكة المكرمة", name: "المسجد الحرام" },
  { city: "مكة المكرمة", name: "منى" },
  { city: "مكة المكرمة", name: "عرفات" },
  { city: "مكة المكرمة", name: "مزدلفة" },
  { city: "المدينة المنورة", name: "المسجد النبوي" },
  { city: "المدينة المنورة", name: "محطة نقل" },
  { city: "المدينة المنورة", name: "سكن الحجاج" },
];

export const DEFAULT_INCIDENTS = [
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
    vitals: "",
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
    vitals: "",
    notes: "علاج بالموقع",
  },
];

export function hasAccess(role, page) {
  return (ROLE_ACCESS[role] || []).includes(page);
}
