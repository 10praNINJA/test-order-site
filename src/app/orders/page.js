"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../supabaseClient";

export default function OrdersPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");

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
    fetchOrders();
  }

  async function fetchOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        created_at,
        delivery_addresses ( label, recipient_name, postal_code, address ),
        order_items ( product_name, quantity, price_at_order )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      setError("注文履歴の取得に失敗しました: " + error.message);
      return;
    }
    setOrders(data);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (checkingAuth) {
    return (
      <main style={{ maxWidth: 600, margin: "0 auto", padding: "40px 20px" }}>
        <p style={{ color: "#999" }}>確認中...</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 600, margin: "0 auto", padding: "40px 20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>注文履歴</h1>
        <button
          onClick={handleLogout}
          style={{
            background: "none",
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          ログアウト
        </button>
      </div>

      <nav style={{ display: "flex", gap: 16, marginBottom: 24, fontSize: 13 }}>
        <Link href="/" style={{ color: "#555", textDecoration: "none" }}>
          注文する
        </Link>
        <Link href="/addresses" style={{ color: "#555", textDecoration: "none" }}>
          配達先
        </Link>
        <span style={{ color: "#111", fontWeight: 600 }}>注文履歴</span>
      </nav>

      {error && (
        <p style={{ color: "#c00", fontSize: 13, marginBottom: 16 }}>{error}</p>
      )}

      {orders.length === 0 && !error && (
        <p style={{ color: "#999", fontSize: 14 }}>まだ注文がありません</p>
      )}

      <ul style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
                border: "1px solid #eee",
                borderRadius: 10,
                padding: "16px 18px",
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
                <span>{date}</span>
                <span
                  style={{
                    background: "#f5f5f5",
                    borderRadius: 4,
                    padding: "2px 8px",
                    fontSize: 12,
                  }}
                >
                  {order.status ?? "受付済み"}
                </span>
              </div>

              <ul style={{ marginBottom: 10 }}>
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

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                }}
              >
                {addr && (
                  <p style={{ fontSize: 12, color: "#888", margin: 0 }}>
                    {addr.label}：{addr.recipient_name} 〒{addr.postal_code} {addr.address}
                  </p>
                )}
                <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>
                  合計 ¥{total.toLocaleString()}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
