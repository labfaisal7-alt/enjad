import {
  BarChart3,
  ClipboardList,
  Home,
  Plus,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";

export const ADMIN_ROLE = "مدير النظام";

export const PAGE_META = {
  dashboard: {
    label: "الرئيسية",
    subtitle: "متابعة مباشرة الحالات الإسعافية للحجاج والمعتمرين",
    icon: Home,
  },
  new: {
    label: "بلاغ جديد",
    subtitle: "تسجيل مباشرة حالة إسعافية جديدة",
    icon: Plus,
  },
  incidents: {
    label: "البلاغات",
    subtitle: "عرض ومتابعة جميع المباشرات حسب الصلاحية",
    icon: ClipboardList,
  },
  reports: {
    label: "التقارير والإحصائيات",
    subtitle: "مؤشرات الموسم وتصدير البيانات",
    icon: BarChart3,
  },
  users: {
    label: "المستخدمون والصلاحيات",
    subtitle: "إدارة الحسابات المحلية وصلاحيات الوصول",
    icon: Users,
  },
  account: {
    label: "الحساب وكلمة المرور",
    subtitle: "تعديل كلمة المرور الخاصة بالمستخدم الحالي",
    icon: UserCog,
  },
  security: {
    label: "الأمان والإعدادات",
    subtitle: "إدارة الأقسام والمدن والمواقع وسجل التتبع",
    icon: ShieldCheck,
  },
};

export const ROLE_ACCESS = {
  "مسعف ميداني": ["dashboard", "new", "incidents", "account"],
  "قائد فريق": ["dashboard", "new", "incidents", "reports", "account"],
  "مشرف عمليات": ["dashboard", "new", "incidents", "reports", "users", "account"],
  "مسؤول إحصائيات": ["dashboard", "reports", "account"],
  "مدير النظام": ["dashboard", "new", "incidents", "reports", "users", "account", "security"],
};
