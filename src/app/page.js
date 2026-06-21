"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "./supabaseClient";

const emptyAddrForm = {
  label: "", recipient_name: "", postal_code: "", address: "", phone_number: "",
};

const inputStyle = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #ddd",
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
};

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState({}); // { product_id: [variant, ...] }
  const [addresses, setAddresses] = useState([]);
  // cart: { "productId" | "productId:variantId": { productId, variantId?, name, price, qty } }
  const [cart, setCart] = useState({});
  const [selectedVariant, setSelectedVariant] = useState({}); // { product_id: variantId }
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [ordering, setOrdering] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

  // 配達先フォーム
  const [addrForm, setAddrForm] = useState(emptyAddrForm);
  const [addrFormMode, setAddrFormMode] = useState(null);
  const [addrSaving, setAddrSaving] = useState(false);
  const [addrError, setAddrError] = useState("");

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) { router.push("/login"); return; }
    setUser(data.user);
    setCheckingAuth(false);
    await Promise.all([fetchProducts(), fetchAddresses()]);
  }

  async function fetchProducts() {
    const { data: prods, error: pe } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: true });
    if (pe) { setError("商品の取得に失敗しました: " + pe.message); return; }

    const { data: vars, error: ve } = await supabase
      .from("product_variants")
      .select("*")
      .order("price", { ascending: true });
    if (ve) { setError("バリアントの取得に失敗しました: " + ve.message); return; }

    // product_idでグループ化
    const varMap = {};
    for (const v of vars) {
      if (!varMap[v.product_id]) varMap[v.product_id] = [];
      varMap[v.product_id].push(v);
    }

    setProducts(prods);
    setVariants(varMap);

    // 各商品のデフォルト選択バリアントを設定
    const defaults = {};
    for (const p of prods) {
      if (varMap[p.id]?.length > 0) defaults[p.id] = varMap[p.id][0].id;
    }
    setSelectedVariant(defaults);
  }

  async function fetchAddresses() {
    const { data, error } = await supabase
      .from("delivery_addresses")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) return;
    setAddresses(data);
    if (data.length > 0) setSelectedAddressId((prev) => prev || data[0].id);
  }

  function getCartKey(product, variantId) {
    return variantId ? `${product.id}:${variantId}` : `${product.id}`;
  }

  function changeQty(product, delta) {
    const productVariants = variants[product.id];
    const hasVariants = productVariants?.length > 0;
    const variantId = hasVariants ? selectedVariant[product.id] : null;
    const key = getCartKey(product, variantId);

    setCart((prev) => {
      const current = prev[key]?.qty ?? 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      const variant = hasVariants ? productVariants.find((v) => v.id === variantId) : null;
      const price = variant ? variant.price : product.price;
      const name = variant ? `${product.name} (${variant.name})` : product.name;
      return { ...prev, [key]: { productId: product.id, variantId, name, price, qty: next } };
    });
  }

  function getQty(product) {
    const productVariants = variants[product.id];
    const hasVariants = productVariants?.length > 0;
    const variantId = hasVariants ? selectedVariant[product.id] : null;
    return cart[getCartKey(product, variantId)]?.qty ?? 0;
  }

  const cartItems = Object.values(cart);
  const total = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);

  async function handleOrder() {
    if (cartItems.length === 0) { setError("商品を1つ以上選んでください"); return; }
    if (!selectedAddressId) { setError("配達先を選択してください"); return; }
    setOrdering(true);
    setError("");
    setSuccessMessage("");

    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert([{ user_id: user.id, delivery_address_id: selectedAddressId, status: "受付済み" }])
      .select()
      .single();
    if (orderError) { setError("注文の作成に失敗しました: " + orderError.message); setOrdering(false); return; }

    const items = cartItems.map((item) => ({
      order_id: orderData.id,
      product_id: item.productId,
      product_name: item.name,
      quantity: item.qty,
      price_at_order: item.price,
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(items);
    if (itemsError) { setError("注文明細の保存に失敗しました: " + itemsError.message); setOrdering(false); return; }

    setCart({});
    setSuccessMessage("注文が完了しました！");
    setOrdering(false);
  }

  // 配達先フォーム
  function openAddAddr() { setAddrForm(emptyAddrForm); setAddrError(""); setAddrFormMode("add"); }
  function openEditAddr() {
    const addr = addresses.find((a) => a.id === selectedAddressId);
    if (!addr) return;
    setAddrForm({ label: addr.label ?? "", recipient_name: addr.recipient_name ?? "", postal_code: addr.postal_code ?? "", address: addr.address ?? "", phone_number: addr.phone_number ?? "" });
    setAddrError(""); setAddrFormMode("edit");
  }
  function closeAddrForm() { setAddrFormMode(null); setAddrForm(emptyAddrForm); setAddrError(""); }

  async function handleAddrSave(e) {
    e.preventDefault();
    setAddrSaving(true); setAddrError("");
    if (addrFormMode === "add") {
      const { data, error } = await supabase.from("delivery_addresses").insert([{ ...addrForm, user_id: user.id }]).select().single();
      if (error) { setAddrError("追加に失敗しました: " + error.message); setAddrSaving(false); return; }
      await fetchAddresses();
      setSelectedAddressId(data.id);
    } else {
      const { error } = await supabase.from("delivery_addresses").update(addrForm).eq("id", selectedAddressId);
      if (error) { setAddrError("更新に失敗しました: " + error.message); setAddrSaving(false); return; }
      await fetchAddresses();
    }
    closeAddrForm(); setAddrSaving(false);
  }

  async function handleLogout() { await supabase.auth.signOut(); router.push("/login"); }

  if (checkingAuth) {
    return <main style={{ maxWidth: 520, margin: "0 auto", padding: "40px 20px" }}><p style={{ color: "#999" }}>確認中...</p></main>;
  }

  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: "40px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>テスト注文サイト</h1>
        <button onClick={handleLogout} style={{ background: "none", border: "1px solid #ddd", borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer" }}>ログアウト</button>
      </div>
      <p style={{ color: "#666", marginBottom: 8, fontSize: 13 }}>ログイン中: {user?.email}</p>
      <nav style={{ display: "flex", gap: 16, marginBottom: 28, fontSize: 13 }}>
        <span style={{ color: "#111", fontWeight: 600 }}>注文する</span>
        <Link href="/addresses" style={{ color: "#555", textDecoration: "none" }}>配達先</Link>
        <Link href="/orders" style={{ color: "#555", textDecoration: "none" }}>注文履歴</Link>
      </nav>

      {/* 商品一覧 */}
      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>商品を選ぶ</h2>
        <ul style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {products.map((p) => {
            const productVariants = variants[p.id] ?? [];
            const hasVariants = productVariants.length > 0;
            const qty = getQty(p);

            return (
              <li key={p.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: "12px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: hasVariants ? 10 : 0 }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{p.name}</p>
                    <p style={{ fontSize: 13, color: "#666", margin: 0 }}>
                      {hasVariants
                        ? `¥${Math.min(...productVariants.map((v) => v.price)).toLocaleString()} 〜`
                        : `¥${p.price.toLocaleString()}`}
                    </p>
                  </div>
                  {!hasVariants && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button onClick={() => changeQty(p, -1)} disabled={qty === 0}
                        style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid #ddd", background: qty === 0 ? "#f5f5f5" : "#fff", fontSize: 18, cursor: qty === 0 ? "default" : "pointer", lineHeight: 1 }}>−</button>
                      <span style={{ fontSize: 15, minWidth: 20, textAlign: "center" }}>{qty}</span>
                      <button onClick={() => changeQty(p, 1)}
                        style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid #ddd", background: "#fff", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>＋</button>
                    </div>
                  )}
                </div>

                {/* バリアント選択 */}
                {hasVariants && (
                  <div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                      {productVariants.map((v) => {
                        const selected = selectedVariant[p.id] === v.id;
                        return (
                          <button key={v.id} onClick={() => setSelectedVariant((prev) => ({ ...prev, [p.id]: v.id }))}
                            style={{
                              padding: "5px 14px",
                              borderRadius: 20,
                              border: selected ? "2px solid #111" : "1px solid #ddd",
                              background: selected ? "#111" : "#fff",
                              color: selected ? "#fff" : "#333",
                              fontSize: 13,
                              cursor: "pointer",
                              fontWeight: selected ? 600 : 400,
                            }}>
                            {v.name} ¥{v.price.toLocaleString()}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button onClick={() => changeQty(p, -1)} disabled={qty === 0}
                        style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid #ddd", background: qty === 0 ? "#f5f5f5" : "#fff", fontSize: 18, cursor: qty === 0 ? "default" : "pointer", lineHeight: 1 }}>−</button>
                      <span style={{ fontSize: 15, minWidth: 20, textAlign: "center" }}>{qty}</span>
                      <button onClick={() => changeQty(p, 1)}
                        style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid #ddd", background: "#fff", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>＋</button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* カート */}
      {cartItems.length > 0 && (
        <section style={{ border: "1px solid #ddd", borderRadius: 10, padding: "16px 18px", marginBottom: 20, background: "#fafafa" }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>カート</h2>
          <ul style={{ marginBottom: 10 }}>
            {cartItems.map((item) => {
              const key = item.variantId ? `${item.productId}:${item.variantId}` : `${item.productId}`;
              return (
                <li key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14, padding: "6px 0", borderBottom: "1px solid #eee" }}>
                  <span style={{ flex: 1 }}>{item.name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => setCart((prev) => {
                      const next = prev[key].qty - 1;
                      if (next === 0) { const { [key]: _, ...rest } = prev; return rest; }
                      return { ...prev, [key]: { ...prev[key], qty: next } };
                    })} style={{ width: 24, height: 24, borderRadius: "50%", border: "1px solid #ddd", background: "#fff", fontSize: 14, cursor: "pointer", lineHeight: 1 }}>−</button>
                    <span style={{ minWidth: 16, textAlign: "center" }}>{item.qty}</span>
                    <button onClick={() => setCart((prev) => ({ ...prev, [key]: { ...prev[key], qty: prev[key].qty + 1 } }))}
                      style={{ width: 24, height: 24, borderRadius: "50%", border: "1px solid #ddd", background: "#fff", fontSize: 14, cursor: "pointer", lineHeight: 1 }}>＋</button>
                    <span style={{ minWidth: 60, textAlign: "right" }}>¥{(item.price * item.qty).toLocaleString()}</span>
                  </div>
                </li>
              );
            })}
          </ul>
          <p style={{ textAlign: "right", fontWeight: 700, fontSize: 16, margin: 0 }}>合計 ¥{total.toLocaleString()}</p>
        </section>
      )}

      {/* 配達先 */}
      <section style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>配達先</h2>
        {addresses.length > 0 && addrFormMode === null && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <select value={selectedAddressId} onChange={(e) => setSelectedAddressId(e.target.value)}
              style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, background: "#fff" }}>
              {addresses.map((addr) => (
                <option key={addr.id} value={addr.id}>{addr.label}：{addr.recipient_name}（{addr.address}）</option>
              ))}
            </select>
            <button onClick={openEditAddr} style={{ background: "none", border: "1px solid #ddd", borderRadius: 8, padding: "9px 12px", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>編集</button>
          </div>
        )}
        {addrFormMode === null && (
          <button onClick={openAddAddr} style={{ background: "none", border: "1px dashed #bbb", borderRadius: 8, padding: "8px 14px", fontSize: 13, color: "#555", cursor: "pointer", width: addresses.length === 0 ? "100%" : "auto" }}>
            ＋ 新しい配達先を追加
          </button>
        )}
        {addrFormMode !== null && (
          <div style={{ border: addrFormMode === "edit" ? "1.5px solid #4a90e2" : "1px solid #ddd", borderRadius: 10, padding: 16, background: addrFormMode === "edit" ? "#f0f6ff" : "#fafafa" }}>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: addrFormMode === "edit" ? "#2a6bbf" : "#111" }}>
              {addrFormMode === "add" ? "＋ 新しい配達先を追加" : "✎ 配達先を編集"}
            </p>
            <form onSubmit={handleAddrSave} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input type="text" placeholder="ラベル（例：自宅、会社）" value={addrForm.label} onChange={(e) => setAddrForm({ ...addrForm, label: e.target.value })} required style={inputStyle} />
              <input type="text" placeholder="受取人名" value={addrForm.recipient_name} onChange={(e) => setAddrForm({ ...addrForm, recipient_name: e.target.value })} required style={inputStyle} />
              <input type="text" placeholder="郵便番号（例：123-4567）" value={addrForm.postal_code} onChange={(e) => setAddrForm({ ...addrForm, postal_code: e.target.value })} required style={inputStyle} />
              <input type="text" placeholder="住所" value={addrForm.address} onChange={(e) => setAddrForm({ ...addrForm, address: e.target.value })} required style={inputStyle} />
              <input type="text" placeholder="電話番号" value={addrForm.phone_number} onChange={(e) => setAddrForm({ ...addrForm, phone_number: e.target.value })} required style={inputStyle} />
              {addrError && <p style={{ color: "#c00", fontSize: 13 }}>{addrError}</p>}
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button type="submit" disabled={addrSaving} style={{ background: addrSaving ? "#999" : "#111", color: "#fff", padding: "10px 20px", borderRadius: 8, border: "none", fontSize: 14, cursor: addrSaving ? "default" : "pointer" }}>
                  {addrSaving ? "保存中..." : "保存する"}
                </button>
                <button type="button" onClick={closeAddrForm} style={{ background: "none", border: "1px solid #ddd", borderRadius: 8, padding: "10px 16px", fontSize: 14, cursor: "pointer" }}>キャンセル</button>
              </div>
            </form>
          </div>
        )}
      </section>

      {error && <p style={{ color: "#c00", fontSize: 13, marginBottom: 12 }}>{error}</p>}
      {successMessage && <p style={{ color: "#080", fontSize: 13, marginBottom: 12 }}>{successMessage}</p>}

      <button onClick={handleOrder} disabled={ordering || cartItems.length === 0 || !selectedAddressId}
        style={{ width: "100%", background: ordering || cartItems.length === 0 || !selectedAddressId ? "#999" : "#111", color: "#fff", padding: "12px 20px", borderRadius: 8, border: "none", fontSize: 15, fontWeight: 600, cursor: ordering || cartItems.length === 0 || !selectedAddressId ? "default" : "pointer" }}>
        {ordering ? "注文処理中..." : "注文を確定する"}
      </button>
    </main>
  );
}
