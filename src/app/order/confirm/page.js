"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../supabaseClient";

export default function ConfirmPage() {
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [ordering, setOrdering] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const data = sessionStorage.getItem("pendingOrder");
    if (!data) { router.replace("/"); return; }
    setOrder(JSON.parse(data));
  }, [router]);

  async function handlePlaceOrder() {
    setOrdering(true);
    setError("");

    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert([{
        user_id: order.userId,
        delivery_address_id: order.selectedAddressId,
        status: "受付済み",
        desired_date: order.desiredDate,
        desired_time: order.desiredTime,
      }])
      .select()
      .single();
    if (orderError) { setError("注文の作成に失敗しました: " + orderError.message); setOrdering(false); return; }

    const items = order.cartItems.map((item) => ({
      order_id: orderData.id,
      product_id: item.productId,
      product_name: item.name,
      quantity: item.qty,
      price_at_order: item.price,
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(items);
    if (itemsError) { setError("注文明細の保存に失敗しました: " + itemsError.message); setOrdering(false); return; }

    fetch("/api/send-order-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: order.userEmail,
        order: {
          items: order.cartItems.map((item) => ({ name: item.name, qty: item.qty, price: item.price })),
          total: order.total,
          address: order.address,
          desired_date: order.desiredDate,
          desired_time: order.desiredTime,
        },
      }),
    });

    sessionStorage.removeItem("pendingOrder");
    router.replace("/order/done");
  }

  if (!order) return null;

  const { cartItems, total, address, desiredDate, desiredTime } = order;

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "40px 20px" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>注文内容の確認</h1>

      <section style={{ border: "1px solid #E5DFD5", borderRadius: 10, padding: "16px 18px", marginBottom: 20 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>ご注文内容</h2>
        <ul style={{ fontSize: 14 }}>
          {cartItems.map((item, i) => (
            <li key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f0f0f0" }}>
              <span>{item.name} × {item.qty}</span>
              <span>¥{(item.price * item.qty).toLocaleString()}</span>
            </li>
          ))}
          <li style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontWeight: 700 }}>
            <span>合計</span>
            <span>¥{total.toLocaleString()}</span>
          </li>
        </ul>
      </section>

      {address && (
        <section style={{ border: "1px solid #E5DFD5", borderRadius: 10, padding: "16px 18px", marginBottom: 20, fontSize: 14 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>配達先</h2>
          <p style={{ margin: 0, lineHeight: 1.8 }}>
            {address.label}：{address.recipient_name}<br />
            〒{address.postal_code} {address.prefecture}{address.city}{address.street}
            {address.building ? ` ${address.building}` : ""}<br />
            TEL: {address.phone_number}
          </p>
        </section>
      )}

      {desiredDate && (
        <section style={{ border: "1px solid #E5DFD5", borderRadius: 10, padding: "16px 18px", marginBottom: 28, fontSize: 14 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>納品希望日時</h2>
          <p style={{ margin: 0 }}>{desiredDate}　{desiredTime}</p>
        </section>
      )}

      {error && <p style={{ color: "#c00", fontSize: 13, marginBottom: 12 }}>{error}</p>}

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => router.back()} disabled={ordering}
          style={{ flex: 1, background: "none", border: "1px solid #D5CFC5", borderRadius: 8, padding: "12px", fontSize: 14, cursor: "pointer" }}>
          戻る
        </button>
        <button onClick={handlePlaceOrder} disabled={ordering}
          style={{ flex: 2, background: ordering ? "#999" : "#2D5A3D", color: "#fff", border: "none", borderRadius: 8, padding: "12px", fontSize: 15, fontWeight: 600, cursor: ordering ? "default" : "pointer" }}>
          {ordering ? "発注中..." : "発注する"}
        </button>
      </div>
    </main>
  );
}
