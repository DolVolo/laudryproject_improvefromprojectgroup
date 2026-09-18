"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import UserTopNavbar from "@/components/UserTopNavbar";

type DailyRevenue = {
  date: string;
  revenue: number;
  count: number;
};

type StatusDist = {
  status: string;
  count: number;
};

type RecentOrder = {
  _id: string;
  productName: string;
  totalPrice: number;
  status: string;
  completedAt: string;
  laundryType: string;
  weightCategory: string;
};

type DashboardData = {
  users: {
    totalCustomers: number;
    totalRiders: number;
    totalEmployees: number;
    totalAdmins: number;
  };
  orders: {
    totalOrders: number;
    activeOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    todayOrders: number;
  };
  revenue: {
    totalRevenue: number;
    todayRevenue: number;
  };
  dailyRevenue: DailyRevenue[];
  statusDistribution: StatusDist[];
  totalShops: number;
  recentOrders: RecentOrder[];
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  assigned: "bg-blue-100 text-blue-700",
  picked_up: "bg-sky-100 text-sky-700",
  at_shop: "bg-indigo-100 text-indigo-700",
  washing: "bg-cyan-100 text-cyan-700",
  drying: "bg-teal-100 text-teal-700",
  laundry_done: "bg-emerald-100 text-emerald-700",
  out_for_delivery: "bg-violet-100 text-violet-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-rose-100 text-rose-700",
};

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backHref, setBackHref] = useState("/admin");
  const [backLabel, setBackLabel] = useState("← Back to Admin");
  const [fromRole, setFromRole] = useState<string | null>(null);

  useEffect(() => {
    const from = new URLSearchParams(window.location.search).get("from");
    if (from === "customer") {
      setBackHref("/customer");
      setBackLabel("← Back to Customer");
      setFromRole("customer");
    } else if (from === "employee") {
      setBackHref("/employee");
      setBackLabel("← Back to Employee");
      setFromRole("employee");
    } else if (from === "rider") {
      setBackHref("/rider");
      setBackLabel("← Back to Rider");
      setFromRole("rider");
    }

    const fetchDashboard = async () => {
      try {
        const result = await apiFetch("/customers/admin/dashboard/stats");
        setData(result);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const navbarConfig = fromRole === "customer"
    ? { role: "user" as const, homeHref: "/customer", settingsHref: "/customer/settings", extraItems: [{ label: "New Order", href: "/customer/create-order" }, { label: "History", href: "/customer/history" }, { label: "Wallet", href: "/customer/wallet" }] }
    : fromRole === "employee"
    ? { role: "employee" as const, homeHref: "/employee", settingsHref: "/employee/settings", extraItems: [{ label: "Shop", href: "/employee/shop" }] }
    : fromRole === "rider"
    ? { role: "rider" as const, homeHref: "/rider", settingsHref: "/rider/settings", extraItems: [{ label: "Profile", href: "/rider/profile" }, { label: "My Tasks", href: "/rider/tasks" }] }
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans text-blue-900">
        {navbarConfig && (
          <UserTopNavbar role={navbarConfig.role} homeHref={navbarConfig.homeHref} settingsHref={navbarConfig.settingsHref} extraItems={navbarConfig.extraItems} />
        )}
        <div className="p-8">
          <div className="flex flex-col items-center gap-4 mt-20">
            <div className="h-12 w-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-blue-900 font-black uppercase tracking-widest text-xs animate-pulse">
              กำลังโหลด Dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans text-blue-900">
        {navbarConfig && (
          <UserTopNavbar role={navbarConfig.role} homeHref={navbarConfig.homeHref} settingsHref={navbarConfig.settingsHref} extraItems={navbarConfig.extraItems} />
        )}
        <div className="p-8">
          <div className="max-w-xl mx-auto mt-20 p-10 bg-white rounded-3xl shadow-2xl text-center">
            <p className="text-rose-500 font-bold">{error || "Failed to load"}</p>
            <button onClick={() => window.location.reload()} className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold">
              ลองใหม่
            </button>
          </div>
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(...data.dailyRevenue.map((d) => d.revenue), 1);
  const totalUsers =
    data.users.totalCustomers + data.users.totalRiders + data.users.totalEmployees + data.users.totalAdmins;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-blue-900">
      {navbarConfig && (
        <UserTopNavbar role={navbarConfig.role} homeHref={navbarConfig.homeHref} settingsHref={navbarConfig.settingsHref} extraItems={navbarConfig.extraItems} />
      )}
      <div className="p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl lg:text-4xl font-black text-blue-900 tracking-tight mb-1">Dashboard</h1>
            <p className="text-blue-700/60 font-medium text-sm">สรุปภาพรวมระบบร้านซักผ้าแบบ Real-time</p>
          </div>
          <Link href={backHref} className="rounded-xl border border-blue-100 bg-white px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50">
            {backLabel}
          </Link>
        </div>

        {/* ===== KPI Cards ===== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-10">
          <KPICard icon="💰" label="รายได้รวม" value={`฿${data.revenue.totalRevenue.toLocaleString()}`} color="blue" />
          <KPICard icon="📅" label="รายได้วันนี้" value={`฿${data.revenue.todayRevenue.toLocaleString()}`} color="emerald" />
          <KPICard icon="🧺" label="ออเดอร์ทั้งหมด" value={String(data.orders.totalOrders)} sub={`วันนี้ ${data.orders.todayOrders}`} color="sky" />
          <KPICard icon="⚡" label="กำลังดำเนินการ" value={String(data.orders.activeOrders)} color="amber" />
        </div>

        {/* ===== Revenue Chart + Status Pie ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* Bar Chart - Daily Revenue (7 days) */}
          <div className="lg:col-span-2 bg-white rounded-[2rem] p-8 shadow-2xl shadow-blue-100/40 border border-white">
            <h3 className="text-lg font-black text-blue-900 mb-6">รายได้ 7 วันย้อนหลัง</h3>
            <div className="flex items-end gap-2 h-48">
              {data.dailyRevenue.map((day) => {
                const pct = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                const dateLabel = new Date(day.date).toLocaleDateString("th-TH", { weekday: "short", day: "numeric" });
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group">
                    <div className="text-[10px] font-bold text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      ฿{day.revenue.toLocaleString()}
                    </div>
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-blue-600 to-blue-400 transition-all duration-500 hover:from-blue-700 hover:to-blue-500 shadow-lg shadow-blue-200/30 relative group min-h-[4px]"
                      style={{ height: `${Math.max(pct, 2)}%` }}
                    >
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-black text-blue-600 opacity-0 group-hover:opacity-100 whitespace-nowrap">
                        {day.count} orders
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-blue-400 mt-1 whitespace-nowrap">{dateLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status Distribution */}
          <div className="bg-white rounded-[2rem] p-8 shadow-2xl shadow-blue-100/40 border border-white">
            <h3 className="text-lg font-black text-blue-900 mb-4">สถานะออเดอร์</h3>
            <div className="space-y-2.5 max-h-48 overflow-y-auto">
              {data.statusDistribution
                .sort((a, b) => b.count - a.count)
                .map((s) => {
                  const pct = data.orders.totalOrders > 0 ? (s.count / data.orders.totalOrders) * 100 : 0;
                  return (
                    <div key={s.status} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${statusColors[s.status] || "bg-slate-100 text-slate-600"}`}>
                          {s.status.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs font-black text-blue-900">{s.count}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* ===== User & Shop Stats ===== */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6 mb-10">
          <MiniStat icon="👤" label="ลูกค้า" value={data.users.totalCustomers} />
          <MiniStat icon="🛵" label="ไรเดอร์" value={data.users.totalRiders} />
          <MiniStat icon="🧑‍🔧" label="พนักงาน" value={data.users.totalEmployees} />
          <MiniStat icon="🛡️" label="แอดมิน" value={data.users.totalAdmins} />
          <MiniStat icon="🏪" label="ร้านซัก" value={data.totalShops} />
        </div>

        {/* ===== Order Summary Cards ===== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <OrderStatCard label="ทั้งหมด" count={data.orders.totalOrders} color="bg-blue-50 text-blue-700" />
          <OrderStatCard label="กำลังดำเนินการ" count={data.orders.activeOrders} color="bg-amber-50 text-amber-700" />
          <OrderStatCard label="สำเร็จ" count={data.orders.completedOrders} color="bg-emerald-50 text-emerald-700" />
          <OrderStatCard label="ยกเลิก" count={data.orders.cancelledOrders} color="bg-rose-50 text-rose-700" />
        </div>

        {/* ===== Recent Completed Orders ===== */}
        <div className="bg-white rounded-[2.5rem] p-8 lg:p-10 shadow-2xl shadow-blue-100/40 border border-white">
          <h3 className="text-lg font-black text-blue-900 mb-6">ออเดอร์ที่เสร็จล่าสุด</h3>
          {data.recentOrders.length === 0 ? (
            <p className="text-sm text-blue-400 text-center py-8">ยังไม่มีออเดอร์ที่เสร็จ</p>
          ) : (
            <div className="space-y-3">
              {data.recentOrders.map((order) => (
                <div
                  key={order._id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-lg">
                      ✅
                    </div>
                    <div>
                      <p className="text-sm font-bold text-blue-900">{order.productName}</p>
                      <p className="text-[10px] font-bold text-blue-400 uppercase tracking-tight">
                        {order.completedAt
                          ? new Date(order.completedAt).toLocaleString("th-TH")
                          : "-"}
                        {" "}·{" "}
                        {order.laundryType === "wash" ? "ซัก" : "อบ"}{" "}
                        {order.weightCategory}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-black text-emerald-600">
                    ฿{(order.totalPrice || 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

/* ── KPI Card ───────────────────────────────────────────── */
function KPICard({ icon, label, value, sub, color }: { icon: string; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-white p-6 lg:p-8 rounded-[2rem] shadow-2xl shadow-blue-100/50 border border-white relative overflow-hidden group hover:-translate-y-1 transition-all">
      <div className={`absolute top-0 right-0 h-20 w-20 bg-${color}-50 rounded-bl-full -mr-6 -mt-6`} />
      <span className="text-2xl lg:text-3xl mb-3 block">{icon}</span>
      <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest block mb-1">{label}</span>
      <span className="text-2xl lg:text-3xl font-black text-blue-900">{value}</span>
      {sub && <span className="block text-[10px] font-bold text-blue-400 mt-1">{sub}</span>}
    </div>
  );
}

/* ── Mini Stat ──────────────────────────────────────────── */
function MiniStat({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-lg shadow-blue-100/30 border border-white text-center hover:-translate-y-0.5 transition-all">
      <span className="text-2xl block mb-1">{icon}</span>
      <p className="text-2xl font-black text-blue-900">{value}</p>
      <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest">{label}</p>
    </div>
  );
}

/* ── Order Stat Card ────────────────────────────────────── */
function OrderStatCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`rounded-2xl p-5 ${color} border border-white/50`}>
      <p className="text-2xl font-black">{count}</p>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</p>
    </div>
  );
}
