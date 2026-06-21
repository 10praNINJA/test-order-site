"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../supabaseClient";

export default function OrdersPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      router.push("/login");
      return;
    }
    setCheckingAuth(false);
    const { data: prof } = await supabase.from("profiles").select("name").eq("id", data.user.id).single();
    if (prof) setProfile(prof);
    fetchOrders();
  }

  async function fetchOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        created_at,
        desired_date,
        desired_time,
        delivery_addresses ( label, recipient_name, postal_code, address, prefecture, city, street, building ),
        order_items ( product_name, quantity, price_at_order )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      setError("注文履歴の取得に失敗しました: " + error.message);
      return;
    }
    setOrders(data);
  }

  function canCancel(order) {
    if (!order.desired_date) return true; // 日付不明は許可
    const deadline = new Date(order.desired_date + "T16:00:00");
    deadline.setDate(deadline.getDate() - 1); // 前日16時
    return new Date() < deadline;
  }

  async function handleCancel(id) {
    if (!confirm("この注文をキャンセルしますか？")) return;
    setCancellingId(id);
    const { error } = await supabase.from("orders").update({ status: "キャンセル済み" }).eq("id", id);
    if (error) setError("キャンセルに失敗しました: " + error.message);
    else await fetchOrders();
    setCancellingId(null);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (checkingAuth) {
    return (
      <main style={{ maxWidth: 560, margin: "0 auto", padding: "40px 20px" }}>
        <p style={{ color: "#999" }}>確認中...</p>
      </main>
    );
  }

  return (
    <>
      <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "#F7F3EE", borderBottom: "1px solid #E5DFD5" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "16px 20px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>注文サイト</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {profile?.name && <span style={{ fontSize: 13, color: "#555" }}>{profile.name} 様</span>}
              <button onClick={handleLogout} style={{ background: "none", border: "1px solid #D5CFC5", borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer" }}>ログアウト</button>
            </div>
          </div>
          <nav style={{ display: "flex", gap: 0, borderBottom: "2px solid #E5DFD5" }}>
            <Link href="/" style={{ padding: "8px 14px", fontSize: 13, color: "#888", textDecoration: "none", borderBottom: "2px solid transparent", marginBottom: -2 }}>注文する</Link>
            <Link href="/addresses" style={{ padding: "8px 14px", fontSize: 13, color: "#888", textDecoration: "none", borderBottom: "2px solid transparent", marginBottom: -2 }}>配達先</Link>
            <span style={{ padding: "8px 14px", fontSize: 13, color: "#2D5A3D", fontWeight: 700, borderBottom: "2px solid #2D5A3D", marginBottom: -2 }}>注文履歴</span>
            <Link href="/mypage" style={{ padding: "8px 14px", fontSize: 13, color: "#888", textDecoration: "none", borderBottom: "2px solid transparent", marginBottom: -2 }}>マイページ</Link>
          </nav>
        </div>
      </header>
      <main style={{ maxWidth: 560, margin: "0 auto", padding: "110px 20px 40px" }}>

      {error && (
        <p style={{ color: "#c00", fontSize: 13, marginBottom: 16 }}>{error}</p>
      )}

      {orders.length === 0 && !error && (
        <p style={{ color: "#999", fontSize: 14 }}>まだ注文がありません</p>
      )}

      <ul style={{ display: "flex", flexDirection: "column", gap: 16, listStyle: "none", padding: 0, margin: 0 }}>
        {orders.map((order) => {
          const total = (order.order_items || []).reduce(
            (sum, item) => sum + item.price_at_order * item.quantity,
            0
          );
          const addr = order.delivery_addresses;
          const date = new Date(order.created_at).toLocaleString("ja-JP");

          return (
            <li
              key={order.id}
              style={{
                border: "1px solid #e0e0e0",
                borderRadius: 10,
                padding: "16px 18px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 10,
                  fontSize: 13,
                  color: "#666",
                }}
              >
                <div>
                  <span>{date}</span>
                  {order.desired_date && (
                    <span style={{ marginLeft: 10, fontSize: 12, color: "#888" }}>
                      納品希望：{order.desired_date} {order.desired_time}
                    </span>
                  )}
                </div>
                <span style={{
                    background: order.status === "キャンセル済み" ? "#F7EDED" : "#EBF3EE",
                    color: order.status === "キャンセル済み" ? "#8B2525" : "#2D5A3D",
                    borderRadius: 4, padding: "2px 10px", fontSize: 12, flexShrink: 0, fontWeight: 600,
                  }}>
                  {order.status ?? "受付済み"}
                </span>
              </div>

              <ul style={{ marginBottom: 10, listStyle: "none", padding: 0 }}>
                {(order.order_items || []).map((item, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 14,
                      padding: "4px 0",
                      borderBottom: "1px solid #f5f5f5",
                    }}
                  >
                    <span>
                      {item.product_name} × {item.quantity}
                    </span>
                    <span>¥{(item.price_at_order * item.quantity).toLocaleString()}</span>
                  </li>
                ))}
              </ul>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                {addr && (
                  <p style={{ fontSize: 12, color: "#888", margin: 0 }}>
                    {addr.label}：{addr.recipient_name} 〒{addr.postal_code}{" "}
                    {addr.prefecture
                      ? `${addr.prefecture}${addr.city}${addr.street}${addr.building ? ` ${addr.building}` : ""}`
                      : addr.address}
                  </p>
                )}
                <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>
                  合計 ¥{total.toLocaleString()}
                </p>
              </div>
              {order.status !== "キャンセル済み" && (
                <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
                  {!canCancel(order) && (
                    <span style={{ fontSize: 11, color: "#999" }}>キャンセル受付終了（前日16時まで）</span>
                  )}
                  <button
                    onClick={() => handleCancel(order.id)}
                    disabled={cancellingId === order.id || !canCancel(order)}
                    style={{ background: "none", border: "1px solid #fcc", borderRadius: 6, padding: "5px 12px", fontSize: 12, color: canCancel(order) ? "#c00" : "#ccc", cursor: (cancellingId === order.id || !canCancel(order)) ? "default" : "pointer" }}>
                    {cancellingId === order.id ? "キャンセル中..." : "注文をキャンセル"}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </main>
    </>
  );
}
