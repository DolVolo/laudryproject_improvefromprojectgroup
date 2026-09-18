"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import Link from "next/link";

type Coupon = {
  code: string;
  description: string;
  discountType: "fixed" | "percent";
  discountValue: number;
  minOrderPrice: number;
  usedAt: string | null;
  expiresAt: string | null;
};

type Transaction = {
  type: "topup" | "payment" | "refund" | "points_earned" | "points_redeemed";
  amount: number;
  pointsChange: number;
  description: string;
  orderId: string | null;
  createdAt: string;
};

type WalletInfo = {
  walletBalance: number;
  loyaltyPoints: number;
  coupons: Coupon[];
  transactions: Transaction[];
};

type Order = {
  _id: string;
  productName: string;
  totalPrice: number;
  status: string;
  createdAt: string;
};

const TOPUP_AMOUNTS = [50, 100, 200, 500, 1000, 2000];

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Top-up state
  const [topUpAmount, setTopUpAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState("");
  const [showQR, setShowQR] = useState(false);
  const [topUpLoading, setTopUpLoading] = useState(false);

  // Payment state
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [selectedCoupon, setSelectedCoupon] = useState<string>("");
  const [payLoading, setPayLoading] = useState(false);
  const [payResult, setPayResult] = useState<any>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<"topup" | "pay" | "history">("topup");

  const fetchWallet = async () => {
    try {
      const data = await apiFetch("/customers/wallet");
      setWallet(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingOrders = async () => {
    try {
      const data = await apiFetch("/customers/orders");
      const pending = (Array.isArray(data) ? data : []).filter(
        (o: Order) => !["completed", "cancelled"].includes(o.status)
      );
      setPendingOrders(pending);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchWallet();
    fetchPendingOrders();
  }, []);

  const effectiveTopUpAmount = useMemo(() => {
    const custom = parseFloat(customAmount);
    if (custom > 0) return custom;
    return topUpAmount;
  }, [topUpAmount, customAmount]);

  const handleTopUp = async () => {
    setTopUpLoading(true);
    try {
      await apiFetch("/customers/wallet/topup", {
        method: "POST",
        body: JSON.stringify({ amount: effectiveTopUpAmount }),
      });
      setShowQR(false);
      setCustomAmount("");
      await fetchWallet();
      alert(`เติมเงิน ฿${effectiveTopUpAmount} สำเร็จ!`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setTopUpLoading(false);
    }
  };

  const handlePay = async () => {
    if (!selectedOrderId) {
      alert("กรุณาเลือกออเดอร์");
      return;
    }
    setPayLoading(true);
    setPayResult(null);
    try {
      const result = await apiFetch("/customers/wallet/pay", {
        method: "POST",
        body: JSON.stringify({
          orderId: selectedOrderId,
          couponCode: selectedCoupon || undefined,
        }),
      });
      setPayResult(result);
      await fetchWallet();
      await fetchPendingOrders();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setPayLoading(false);
    }
  };

  const txnIcon = (type: Transaction["type"]) => {
    switch (type) {
      case "topup": return "💰";
      case "payment": return "💳";
      case "refund": return "↩️";
      case "points_earned": return "⭐";
      case "points_redeemed": return "🎁";
      default: return "📝";
    }
  };

  const txnColor = (type: Transaction["type"]) => {
    if (type === "topup" || type === "refund") return "text-emerald-600";
    if (type === "payment") return "text-rose-600";
    return "text-blue-600";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-blue-900 font-black uppercase tracking-widest text-xs animate-pulse">
            กำลังโหลด Wallet...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto mt-20 p-10 bg-white rounded-3xl shadow-2xl text-center">
        <p className="text-rose-500 font-bold">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold">
          ลองใหม่
        </button>
      </div>
    );
  }

  const selectedOrder = pendingOrders.find((o) => o._id === selectedOrderId);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header Card */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-8 text-white shadow-2xl shadow-blue-200/50 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 h-40 w-40 bg-white/5 rounded-full" />
        <div className="absolute -bottom-6 -left-6 h-24 w-24 bg-white/5 rounded-full" />
        <div className="relative">
          <p className="text-xs font-black uppercase tracking-widest text-blue-200 mb-1">Wallet Balance</p>
          <p className="text-5xl font-black tracking-tight">
            ฿{(wallet?.walletBalance || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
          </p>
          <div className="mt-4 flex items-center gap-4">
            <div className="bg-white/10 backdrop-blur px-4 py-2 rounded-xl">
              <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">Loyalty Points</p>
              <p className="text-xl font-black">{wallet?.loyaltyPoints || 0} <span className="text-xs font-bold text-blue-200">pts</span></p>
            </div>
            <div className="bg-white/10 backdrop-blur px-4 py-2 rounded-xl">
              <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">Coupons</p>
              <p className="text-xl font-black">{wallet?.coupons?.length || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white rounded-2xl p-1.5 shadow-lg border border-slate-100">
        {(["topup", "pay", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === tab
                ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                : "text-blue-400 hover:bg-blue-50"
            }`}
          >
            {tab === "topup" ? "เติมเงิน" : tab === "pay" ? "ชำระเงิน" : "ประวัติ"}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-3xl shadow-2xl shadow-blue-100/40 border border-white overflow-hidden">
        {/* ===== TOP UP ===== */}
        {activeTab === "topup" && (
          <div className="p-8 space-y-6">
            <h2 className="text-xl font-black text-blue-900">เติมเงินเข้า Wallet</h2>

            {/* Quick amount buttons */}
            <div>
              <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3">เลือกจำนวนเงิน</p>
              <div className="grid grid-cols-3 gap-3">
                {TOPUP_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => { setTopUpAmount(amt); setCustomAmount(""); }}
                    className={`py-4 rounded-2xl text-sm font-black transition-all border-2 ${
                      topUpAmount === amt && !customAmount
                        ? "border-blue-600 bg-blue-50 text-blue-700 shadow-lg shadow-blue-100"
                        : "border-slate-100 bg-slate-50 text-blue-900 hover:border-blue-200"
                    }`}
                  >
                    ฿{amt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom amount */}
            <div>
              <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">หรือใส่จำนวนเอง</p>
              <input
                type="number"
                min="1"
                max="100000"
                placeholder="ใส่จำนวนเงิน (฿)"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-blue-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>

            {/* Show QR */}
            {!showQR ? (
              <button
                onClick={() => setShowQR(true)}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 active:scale-[0.98] transition-all shadow-xl shadow-blue-200"
              >
                แสดง QR Code เติมเงิน ฿{effectiveTopUpAmount.toLocaleString()}
              </button>
            ) : (
              <div className="space-y-4">
                {/* QR Code Display */}
                <div className="bg-slate-50 rounded-2xl p-8 flex flex-col items-center gap-4 border border-slate-100">
                  <div className="bg-white p-4 rounded-2xl shadow-inner border border-slate-200">
                    {/* QR Code placeholder using SVG pattern */}
                    <svg width="200" height="200" viewBox="0 0 200 200" className="rounded-lg">
                      <rect width="200" height="200" fill="white" />
                      {/* QR pattern approximation */}
                      <rect x="20" y="20" width="50" height="50" rx="4" fill="#1e3a5f" />
                      <rect x="130" y="20" width="50" height="50" rx="4" fill="#1e3a5f" />
                      <rect x="20" y="130" width="50" height="50" rx="4" fill="#1e3a5f" />
                      <rect x="30" y="30" width="30" height="30" rx="2" fill="white" />
                      <rect x="140" y="30" width="30" height="30" rx="2" fill="white" />
                      <rect x="30" y="140" width="30" height="30" rx="2" fill="white" />
                      <rect x="38" y="38" width="14" height="14" rx="2" fill="#1e3a5f" />
                      <rect x="148" y="38" width="14" height="14" rx="2" fill="#1e3a5f" />
                      <rect x="38" y="148" width="14" height="14" rx="2" fill="#1e3a5f" />
                      {/* Data pattern */}
                      {Array.from({ length: 8 }).map((_, row) =>
                        Array.from({ length: 8 }).map((_, col) => {
                          const show = (row + col) % 3 !== 0 && (row * col) % 2 !== 0;
                          return show ? (
                            <rect
                              key={`${row}-${col}`}
                              x={80 + col * 6}
                              y={80 + row * 6}
                              width="5"
                              height="5"
                              fill="#1e3a5f"
                            />
                          ) : null;
                        })
                      )}
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-black text-blue-900">฿{effectiveTopUpAmount.toLocaleString()}</p>
                    <p className="text-xs text-blue-400 font-bold">สแกน QR Code เพื่อเติมเงิน</p>
                    <p className="text-[10px] text-slate-400 mt-1">PromptPay / Mobile Banking</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowQR(false)}
                    className="flex-1 py-3 bg-slate-100 text-blue-900 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleTopUp}
                    disabled={topUpLoading}
                    className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-lg shadow-emerald-200 disabled:opacity-50"
                  >
                    {topUpLoading ? "กำลังดำเนินการ..." : "ยืนยันเติมเงิน"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== PAYMENT ===== */}
        {activeTab === "pay" && (
          <div className="p-8 space-y-6">
            <h2 className="text-xl font-black text-blue-900">ชำระเงินออเดอร์</h2>

            {/* Select Order */}
            <div>
              <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">เลือกออเดอร์</p>
              {pendingOrders.length === 0 ? (
                <div className="bg-slate-50 rounded-xl p-6 text-center">
                  <p className="text-sm text-blue-400 font-bold">ไม่มีออเดอร์ที่ต้องชำระ</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {pendingOrders.map((order) => (
                    <button
                      key={order._id}
                      onClick={() => setSelectedOrderId(order._id)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${
                        selectedOrderId === order._id
                          ? "border-blue-600 bg-blue-50"
                          : "border-slate-100 hover:border-blue-200"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-black text-blue-900">{order.productName}</p>
                        <p className="text-[10px] font-bold text-blue-400 uppercase">
                          {order.status.replace(/_/g, " ")} &middot;{" "}
                          {new Date(order.createdAt).toLocaleDateString("th-TH")}
                        </p>
                      </div>
                      <p className="text-sm font-black text-blue-900">฿{order.totalPrice}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Coupon */}
            {selectedOrder && wallet && wallet.coupons.length > 0 && (
              <div>
                <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">คูปองส่วนลด</p>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedCoupon("")}
                    className={`w-full p-3 rounded-xl border-2 text-left text-sm transition-all ${
                      !selectedCoupon ? "border-blue-600 bg-blue-50 font-bold" : "border-slate-100"
                    }`}
                  >
                    ไม่ใช้คูปอง
                  </button>
                  {wallet.coupons.map((coupon) => (
                    <button
                      key={coupon.code}
                      onClick={() => setSelectedCoupon(coupon.code)}
                      className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                        selectedCoupon === coupon.code
                          ? "border-emerald-600 bg-emerald-50"
                          : "border-slate-100 hover:border-emerald-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-black text-blue-900">🎫 {coupon.code}</p>
                          <p className="text-[10px] text-blue-400 font-bold">{coupon.description}</p>
                        </div>
                        <span className="text-xs font-black text-emerald-600 bg-emerald-100 px-2 py-1 rounded-lg">
                          {coupon.discountType === "percent"
                            ? `${coupon.discountValue}%`
                            : `฿${coupon.discountValue}`}
                        </span>
                      </div>
                      {coupon.minOrderPrice > 0 && (
                        <p className="text-[10px] text-slate-400 mt-1">ขั้นต่ำ ฿{coupon.minOrderPrice}</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loyalty Points Display */}
            {selectedOrder && (wallet?.loyaltyPoints || 0) > 0 && (
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">แต้มสะสม</p>
                    <p className="text-sm text-amber-800 font-bold mt-1">
                      ⭐ {wallet!.loyaltyPoints} แต้ม = ส่วนลด ฿{Math.floor(wallet!.loyaltyPoints / 10)}
                    </p>
                    <p className="text-[10px] text-amber-500">(10 แต้ม = ฿1 ใช้อัตโนมัติ)</p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Summary */}
            {selectedOrder && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2">
                <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">สรุปการชำระ</p>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700">ราคาออเดอร์</span>
                  <span className="font-bold text-blue-900">฿{selectedOrder.totalPrice}</span>
                </div>
                {selectedCoupon && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>คูปอง ({selectedCoupon})</span>
                    <span className="font-bold">
                      -{wallet?.coupons.find((c) => c.code === selectedCoupon)?.discountType === "percent"
                        ? `${wallet?.coupons.find((c) => c.code === selectedCoupon)?.discountValue}%`
                        : `฿${wallet?.coupons.find((c) => c.code === selectedCoupon)?.discountValue}`}
                    </span>
                  </div>
                )}
                {(wallet?.loyaltyPoints || 0) >= 10 && (
                  <div className="flex justify-between text-sm text-amber-600">
                    <span>แลกแต้ม</span>
                    <span className="font-bold">-฿{Math.floor((wallet?.loyaltyPoints || 0) / 10)}</span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-2 flex justify-between text-sm">
                  <span className="font-black text-blue-900">ยอดชำระจาก Wallet</span>
                  <span className="font-black text-blue-900">
                    ฿{Math.max(0, selectedOrder.totalPrice - Math.floor((wallet?.loyaltyPoints || 0) / 10))}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-blue-400">
                  <span>ยอดคงเหลือ</span>
                  <span>฿{(wallet?.walletBalance || 0).toLocaleString()}</span>
                </div>
              </div>
            )}

            <button
              onClick={handlePay}
              disabled={!selectedOrderId || payLoading}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 active:scale-[0.98] transition-all shadow-xl shadow-blue-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {payLoading ? "กำลังดำเนินการ..." : "ยืนยันชำระเงิน"}
            </button>

            {/* Payment Result */}
            {payResult && (
              <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-200 text-center space-y-2">
                <p className="text-3xl">✅</p>
                <p className="text-lg font-black text-emerald-700">{payResult.message}</p>
                <div className="text-sm text-emerald-600 space-y-1">
                  <p>ชำระ: ฿{payResult.paid}</p>
                  {payResult.couponDiscount > 0 && <p>ส่วนลดคูปอง: ฿{payResult.couponDiscount}</p>}
                  {payResult.pointsDiscount > 0 && <p>ส่วนลดแต้ม: ฿{payResult.pointsDiscount}</p>}
                  {payResult.pointsEarned > 0 && <p>ได้รับแต้ม: +{payResult.pointsEarned} pts</p>}
                  <p className="font-bold">คงเหลือ: ฿{payResult.walletBalance} | {payResult.loyaltyPoints} pts</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== HISTORY ===== */}
        {activeTab === "history" && (
          <div className="p-8 space-y-4">
            <h2 className="text-xl font-black text-blue-900">ประวัติ Wallet</h2>

            {!wallet?.transactions?.length ? (
              <div className="bg-slate-50 rounded-xl p-10 text-center">
                <p className="text-3xl mb-2">📋</p>
                <p className="text-sm text-blue-400 font-bold">ยังไม่มีรายการ</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {wallet.transactions.map((txn, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{txnIcon(txn.type)}</span>
                      <div>
                        <p className="text-sm font-bold text-blue-900">{txn.description}</p>
                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-tight">
                          {new Date(txn.createdAt).toLocaleString("th-TH")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-black ${txnColor(txn.type)}`}>
                        {txn.amount > 0 ? "+" : ""}
                        {txn.amount !== 0 ? `฿${txn.amount}` : ""}
                      </p>
                      {txn.pointsChange !== 0 && (
                        <p className="text-[10px] font-bold text-amber-500">
                          {txn.pointsChange > 0 ? "+" : ""}
                          {txn.pointsChange} pts
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
