"use client";

import { useState } from "react";

const SAMPLE_ORDERS = [
  { id: 1, item: "コーヒー", price: 450 },
  { id: 2, item: "サンドイッチ", price: 600 },
  { id: 3, item: "クッキー", price: 250 },
];

export default function Home() {
  const [orders, setOrders] = useState([]);

  function addTestOrder() {
    const sample =
      SAMPLE_ORDERS[Math.floor(Math.random() * SAMPLE_ORDERS.length)];
    const newOrder = {
      ...sample,
      orderId: Date.now(),
    };
    setOrders((prev) => [newOrder, ...prev]);
  }

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "40px 20px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        テスト注文サイト
      </h1>
      <p style={{ color: "#666", marginBottom: 24 }}>
        ボタンを押すとテスト注文がリストに追加されます(まだ保存先には繋がっていません)。
      </p>

      <button
        onClick={addTestOrder}
        style={{
          background: "#111",
          color: "#fff",
          padding: "10px 20px",
          borderRadius: 8,
          border: "none",
          fontSize: 15,
          cursor: "pointer",
          marginBottom: 24,
        }}
      >
        テスト注文を追加
      </button>

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
              key={order.orderId}
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
