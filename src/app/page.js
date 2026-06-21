"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./supabaseClient";

const SAMPLE_ORDERS = [
  { item: "コーヒー", price: 450 },
  { item: "サンドイッチ", price: 600 },
  { item: "クッキー", price: 250 },
];

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      router.push("/login");
      return;
    }
    setUser(data.user);
    setCheckingAuth(false);
    fetchOrders();
  }

  async function fetchOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setErrorMessage("注文一覧の取得に失敗しました: " + error.message);
      return;
    }
    setOrders(data);
  }

  async function addTestOrder() {
    setLoading(true);
    setErrorMessage("");

    const sample =
      SAMPLE_ORDERS[Math.floor(Math.random() * SAMPLE_ORDERS.length)];

    const { error } = await supabase.from("orders").insert([sample]);

    if (error) {
      console.error(error);
      setErrorMessage("保存に失敗しました: " + error.message);
      setLoading(false);
      return;
    }

    await fetchOrders();
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (checkingAuth) {
    return (
      <main style={{ maxWidth: 480, margin: "0 auto", padding: "40px 20px" }}>
        <p style={{ color: "#999" }}>確認中...</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "40px 20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>テスト注文サイト</h1>
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

      <p style={{ color: "#666", marginBottom: 24, fontSize: 13 }}>
        ログイン中: {user?.email}
      </p>

      <button
        onClick={addTestOrder}
        disabled={loading}
        style={{
          background: loading ? "#999" : "#111",
          color: "#fff",
          padding: "10px 20px",
          borderRadius: 8,
          border: "none",
          fontSize: 15,
          cursor: loading ? "default" : "pointer",
          marginBottom: 16,
        }}
      >
        {loading ? "保存中..." : "テスト注文を追加"}
      </button>

      {errorMessage && (
        <p style={{ color: "#c00", fontSize: 13, marginBottom: 16 }}>
          {errorMessage}
        </p>
      )}

      <div>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
          注文一覧({orders.length}件)
        </h2>
        {orders.length === 0 && (
          <p style={{ color: "#999", fontSize: 14 }}>まだ注文がありません</p>
        )}
        <ul style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {orders.map((order) => (
            <li
              key={order.id}
              style={{
                border: "1px solid #eee",
                borderRadius: 8,
                padding: "10px 14px",
                display: "flex",
                justifyContent: "space-between",
                fontSize: 14,
              }}
            >
              <span>{order.item}</span>
              <span>¥{order.price.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}