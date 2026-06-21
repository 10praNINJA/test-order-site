"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "./supabaseClient";
import DatePicker from "./components/DatePicker";

const emptyAddrForm = {
  label: "", recipient_name: "", postal_code: "",
  prefecture: "", city: "", street: "", building: "", phone_number: "",
};

const inputStyle = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #D5CFC5",
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
};

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState({}); // { product_id: [variant, ...] }
  const [addresses, setAddresses] = useState([]);
  // cart: { "productId" | "productId:variantId": { productId, variantId?, name, price, qty } }
  const [cart, setCart] = useState({});
  const [selectedVariant, setSelectedVariant] = useState({}); // { product_id: variantId }
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [error, setError] = useState("");

  // 納品希望日時
  const [desiredDate, setDesiredDate] = useState("");
  const [desiredTime, setDesiredTime] = useState("");

  // 配達先フォーム
  const [addrForm, setAddrForm] = useState(emptyAddrForm);
  const [addrFormMode, setAddrFormMode] = useState(null);
  const [addrSaving, setAddrSaving] = useState(false);
  const [addrError, setAddrError] = useState("");
  const [addrPostalResults, setAddrPostalResults] = useState([]);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) { router.push("/login"); return; }
    setUser(data.user);
    setCheckingAuth(false);
    const { data: prof } = await supabase.from("profiles").select("name").eq("id", data.user.id).single();
    if (prof) setProfile(prof);
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
    if (data.length > 0) setSelectedAddressId((prev) => prev || String(data[0].id));
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

  // 都道府県判定
  const selectedAddress = addresses.find((a) => String(a.id) === String(selectedAddressId));
  const pref = selectedAddress?.prefecture ?? selectedAddress?.address ?? "";
  const isHokkaido = pref.startsWith("北海道");
  const isOkinawa = pref.startsWith("沖縄");
  const isRemote = isHokkaido || isOkinawa;

  const transitDays = isRemote ? 2 : 1;
  const NO_SHIP_DAYS = [2, 6]; // 火曜=2, 土曜=6

  // ローカル日付を "YYYY-MM-DD" 形式で返す（タイムゾーンずれ防止）
  function toLocalDateStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // 発送日が火曜・土曜でないか確認
  function isValidDeliveryDate(dateStr) {
    const delivery = new Date(dateStr + "T00:00:00");
    const ship = new Date(delivery);
    ship.setDate(ship.getDate() - transitDays);
    return !NO_SHIP_DAYS.includes(ship.getDay());
  }

  // 指定日以降で最初の有効な納品日を返す
  function getNextValidDate(fromDate) {
    const d = new Date(fromDate + "T00:00:00");
    while (!isValidDeliveryDate(toLocalDateStr(d))) {
      d.setDate(d.getDate() + 1);
    }
    return toLocalDateStr(d);
  }

  // 最短納品日（翌日 or 翌々日 + 火土スキップ）
  function getMinDate() {
    const d = new Date();
    d.setDate(d.getDate() + transitDays);
    return getNextValidDate(toLocalDateStr(d));
  }

  // 配達先変更時に日付・時間をリセット
  useEffect(() => {
    const minDate = getMinDate();
    setDesiredDate(minDate);
    setDesiredTime(isHokkaido ? "午後（13:00〜17:00）" : "午前（9:00〜12:00）");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAddressId, addresses]);

  function handleConfirm() {
    if (cartItems.length === 0) { setError("商品を1つ以上選んでください"); return; }
    if (!selectedAddressId) { setError("配達先を選択してください"); return; }
    setError("");
    const addr = addresses.find((a) => String(a.id) === String(selectedAddressId));
    sessionStorage.setItem("pendingOrder", JSON.stringify({
      cartItems,
      total,
      selectedAddressId,
      address: addr,
      desiredDate,
      desiredTime,
      userEmail: user.email,
      userId: user.id,
    }));
    router.push("/order/confirm");
  }

  // 配達先フォーム
  function openAddAddr() { setAddrForm(emptyAddrForm); setAddrError(""); setAddrFormMode("add"); }
  function openEditAddr() {
    const addr = addresses.find((a) => String(a.id) === String(selectedAddressId));
    if (!addr) return;
    setAddrForm({
      label: addr.label ?? "", recipient_name: addr.recipient_name ?? "",
      postal_code: addr.postal_code ?? "", prefecture: addr.prefecture ?? "",
      city: addr.city ?? "", street: addr.street ?? "",
      building: addr.building ?? "", phone_number: addr.phone_number ?? "",
    });
    setAddrError(""); setAddrFormMode("edit");
  }

  async function lookupAddrPostalCode(code) {
    const cleaned = code.replace(/-/g, "");
    if (cleaned.length !== 7) return;
    setAddrPostalResults([]);
    setAddrForm((prev) => ({ ...prev, prefecture: "", city: "", street: "" }));
    try {
      const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleaned}`);
      const json = await res.json();
      if (json.results?.length === 1) {
        applyAddrPostalResult(json.results[0]);
      } else if (json.results?.length > 1) {
        setAddrPostalResults(json.results);
      }
    } catch (e) { /* 失敗しても無視 */ }
  }

  function applyAddrPostalResult(r) {
    setAddrForm((prev) => ({ ...prev, prefecture: r.address1, city: r.address2, street: r.address3 }));
    setAddrPostalResults([]);
  }
  function closeAddrForm() { setAddrFormMode(null); setAddrForm(emptyAddrForm); setAddrError(""); }

  async function handleAddrSave(e) {
    e.preventDefault();
    setAddrSaving(true); setAddrError("");
    const payload = {
      label: addrForm.label, recipient_name: addrForm.recipient_name,
      postal_code: addrForm.postal_code, prefecture: addrForm.prefecture,
      city: addrForm.city, street: addrForm.street,
      building: addrForm.building, phone_number: addrForm.phone_number,
    };
    if (addrFormMode === "add") {
      const { data, error } = await supabase.from("delivery_addresses").insert([{ ...payload, user_id: user.id }]).select().single();
      if (error) { setAddrError("追加に失敗しました: " + error.message); setAddrSaving(false); return; }
      await fetchAddresses();
      setSelectedAddressId(String(data.id));
    } else {
      const { error } = await supabase.from("delivery_addresses").update(payload).eq("id", selectedAddressId);
      if (error) { setAddrError("更新に失敗しました: " + error.message); setAddrSaving(false); return; }
      await fetchAddresses();
    }
    closeAddrForm(); setAddrSaving(false);
  }

  async function handleLogout() { await supabase.auth.signOut(); router.push("/login"); }

  if (checkingAuth) {
    return <main style={{ maxWidth: 560, margin: "0 auto", padding: "40px 20px" }}><p style={{ color: "#999" }}>確認中...</p></main>;
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
            <span style={{ padding: "8px 14px", fontSize: 13, color: "#2D5A3D", fontWeight: 700, borderBottom: "2px solid #2D5A3D", marginBottom: -2 }}>注文する</span>
            <Link href="/addresses" style={{ padding: "8px 14px", fontSize: 13, color: "#888", textDecoration: "none", borderBottom: "2px solid transparent", marginBottom: -2 }}>配達先</Link>
            <Link href="/orders" style={{ padding: "8px 14px", fontSize: 13, color: "#888", textDecoration: "none", borderBottom: "2px solid transparent", marginBottom: -2 }}>注文履歴</Link>
            <Link href="/mypage" style={{ padding: "8px 14px", fontSize: 13, color: "#888", textDecoration: "none", borderBottom: "2px solid transparent", marginBottom: -2 }}>マイページ</Link>
          </nav>
        </div>
      </header>
      <main style={{ maxWidth: 560, margin: "0 auto", padding: "120px 20px 40px" }}>

      {/* 商品一覧 */}
      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>商品を選ぶ</h2>
        <ul style={{ display: "flex", flexDirection: "column", gap: 10, listStyle: "none", padding: 0, margin: 0 }}>
          {products.map((p) => {
            const productVariants = variants[p.id] ?? [];
            const hasVariants = productVariants.length > 0;
            const qty = getQty(p);

            return (
              <li key={p.id} style={{ border: "1px solid #e0e0e0", borderRadius: 10, padding: "12px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
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
                        style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid #D5CFC5", background: qty === 0 ? "#f5f5f5" : "#fff", fontSize: 18, cursor: qty === 0 ? "default" : "pointer", lineHeight: 1 }}>−</button>
                      <span style={{ fontSize: 15, minWidth: 20, textAlign: "center" }}>{qty}</span>
                      <button onClick={() => changeQty(p, 1)}
                        style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid #D5CFC5", background: "#fff", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>＋</button>
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
                              border: selected ? "2px solid #111" : "1px solid #D5CFC5",
                              background: selected ? "#2D5A3D" : "#fff",
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
                        style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid #D5CFC5", background: qty === 0 ? "#f5f5f5" : "#fff", fontSize: 18, cursor: qty === 0 ? "default" : "pointer", lineHeight: 1 }}>−</button>
                      <span style={{ fontSize: 15, minWidth: 20, textAlign: "center" }}>{qty}</span>
                      <button onClick={() => changeQty(p, 1)}
                        style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid #D5CFC5", background: "#fff", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>＋</button>
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
        <section style={{ border: "1px solid #e0e0e0", borderRadius: 10, padding: "16px 18px", marginBottom: 20, background: "#FDFCFB", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>カート</h2>
          <ul style={{ marginBottom: 10, listStyle: "none", padding: 0, margin: 0 }}>
            {cartItems.map((item) => {
              const key = item.variantId ? `${item.productId}:${item.variantId}` : `${item.productId}`;
              return (
                <li key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14, padding: "6px 0", borderBottom: "1px solid #E5DFD5" }}>
                  <span style={{ flex: 1 }}>{item.name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => setCart((prev) => {
                      const next = prev[key].qty - 1;
                      if (next === 0) { const { [key]: _, ...rest } = prev; return rest; }
                      return { ...prev, [key]: { ...prev[key], qty: next } };
                    })} style={{ width: 24, height: 24, borderRadius: "50%", border: "1px solid #D5CFC5", background: "#fff", fontSize: 14, cursor: "pointer", lineHeight: 1 }}>−</button>
                    <span style={{ minWidth: 16, textAlign: "center" }}>{item.qty}</span>
                    <button onClick={() => setCart((prev) => ({ ...prev, [key]: { ...prev[key], qty: prev[key].qty + 1 } }))}
                      style={{ width: 24, height: 24, borderRadius: "50%", border: "1px solid #D5CFC5", background: "#fff", fontSize: 14, cursor: "pointer", lineHeight: 1 }}>＋</button>
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
              style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #D5CFC5", fontSize: 14, background: "#fff" }}>
              {addresses.map((addr) => {
                const addrStr = addr.prefecture
                  ? `${addr.prefecture}${addr.city}${addr.street}`
                  : (addr.address ?? "");
                return (
                  <option key={addr.id} value={addr.id}>{addr.label}：{addr.recipient_name}（{addrStr}）</option>
                );
              })}
            </select>
            <button onClick={openEditAddr} style={{ background: "none", border: "1px solid #D5CFC5", borderRadius: 8, padding: "9px 12px", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>編集</button>
          </div>
        )}
        {addrFormMode === null && (
          <button onClick={openAddAddr} style={{ background: "none", border: "1px dashed #bbb", borderRadius: 8, padding: "8px 14px", fontSize: 13, color: "#555", cursor: "pointer", width: addresses.length === 0 ? "100%" : "auto" }}>
            ＋ 新しい配達先を追加
          </button>
        )}
        {addrFormMode !== null && (
          <div style={{ border: addrFormMode === "edit" ? "1.5px solid #4a90e2" : "1px solid #D5CFC5", borderRadius: 10, padding: 16, background: addrFormMode === "edit" ? "#f0f6ff" : "#FDFCFB" }}>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: addrFormMode === "edit" ? "#2a6bbf" : "#2D5A3D" }}>
              {addrFormMode === "add" ? "＋ 新しい配達先を追加" : "✎ 配達先を編集"}
            </p>
            <form onSubmit={handleAddrSave} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input type="text" placeholder="ラベル（例：自宅、会社）" value={addrForm.label} onChange={(e) => setAddrForm({ ...addrForm, label: e.target.value })} required style={inputStyle} />
              <input type="text" placeholder="受取人名" value={addrForm.recipient_name} onChange={(e) => setAddrForm({ ...addrForm, recipient_name: e.target.value })} required style={inputStyle} />
              <div style={{ position: "relative" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <input type="text" placeholder="郵便番号（例：123-4567）" value={addrForm.postal_code}
                    onChange={(e) => setAddrForm({ ...addrForm, postal_code: e.target.value })}
                    onBlur={(e) => lookupAddrPostalCode(e.target.value)}
                    required style={{ ...inputStyle, flex: 1 }} />
                  <button type="button" onClick={() => addrPostalResults.length > 1 ? setAddrPostalResults([]) : lookupAddrPostalCode(addrForm.postal_code)}
                    style={{ padding: "10px 10px", borderRadius: 8, border: "1px solid #D5CFC5", background: "#fff", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
                    {addrPostalResults.length > 1 ? "閉じる" : "住所検索"}
                  </button>
                </div>
                {addrPostalResults.length > 1 && (
                  <ul style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, marginTop: 4, border: "1px solid #c8d8f0", borderRadius: 8, padding: "4px 0", background: "#f0f6ff", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", listStyle: "none" }}>
                    <li style={{ display: "flex", justifyContent: "flex-end", padding: "2px 6px 0" }}>
                      <button type="button" onClick={() => setAddrPostalResults([])}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#888", lineHeight: 1, padding: "2px 4px" }}>×</button>
                    </li>
                    {addrPostalResults.map((r, i) => (
                      <li key={i}>
                        <button type="button" onMouseDown={() => applyAddrPostalResult(r)}
                          style={{ width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#1a4f9c", borderBottom: i < addrPostalResults.length - 1 ? "1px solid #dbe8f8" : "none" }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "#dbe8f8"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "none"}>
                          {r.address2}{r.address3}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <input type="text" placeholder="都道府県" value={addrForm.prefecture} onChange={(e) => setAddrForm({ ...addrForm, prefecture: e.target.value })} required style={{ ...inputStyle, flex: "0 0 100px" }} />
                <input type="text" placeholder="市区町村" value={addrForm.city} onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })} required style={{ ...inputStyle, flex: 1 }} />
              </div>
              <input type="text" placeholder="番地（例：千代田1-1）" value={addrForm.street} onChange={(e) => setAddrForm({ ...addrForm, street: e.target.value })} required style={inputStyle} />
              <input type="text" placeholder="アパート・建物名（任意）" value={addrForm.building} onChange={(e) => setAddrForm({ ...addrForm, building: e.target.value })} style={inputStyle} />
              <input type="text" placeholder="電話番号" value={addrForm.phone_number} onChange={(e) => setAddrForm({ ...addrForm, phone_number: e.target.value })} required style={inputStyle} />
              {addrError && <p style={{ color: "#c00", fontSize: 13 }}>{addrError}</p>}
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button type="submit" disabled={addrSaving} style={{ background: addrSaving ? "#999" : "#2D5A3D", color: "#fff", padding: "10px 20px", borderRadius: 8, border: "none", fontSize: 14, cursor: addrSaving ? "default" : "pointer" }}>
                  {addrSaving ? "保存中..." : "保存する"}
                </button>
                <button type="button" onClick={closeAddrForm} style={{ background: "none", border: "1px solid #D5CFC5", borderRadius: 8, padding: "10px 16px", fontSize: 14, cursor: "pointer" }}>キャンセル</button>
              </div>
            </form>
          </div>
        )}
      </section>

      {/* 納品希望日時 */}
      {selectedAddressId && (
        <section style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>納品希望日時</h2>
          <p style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>
            ※ 火曜・土曜は発送をお休みしています
          </p>
          {isRemote && (
            <p style={{ fontSize: 12, color: "#e07000", marginBottom: 8 }}>
              ※ {isHokkaido ? "北海道" : "沖縄"}は翌々日以降の納品となります
              {isHokkaido && "（時間帯は午後のみ）"}
            </p>
          )}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 6 }}>希望日</label>
            <DatePicker
              value={desiredDate}
              minDate={getMinDate()}
              isDisabled={(dateStr) => !isValidDeliveryDate(dateStr)}
              onChange={(dateStr) => setDesiredDate(dateStr)}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>希望時間帯</label>
            <select
              value={desiredTime}
              onChange={(e) => setDesiredTime(e.target.value)}
              style={{ ...inputStyle, width: "100%", boxSizing: "border-box", background: "#fff" }}
            >
              {!isHokkaido && <option value="午前（9:00〜12:00）">午前（9:00〜12:00）</option>}
              <option value="午後（13:00〜17:00）">午後（13:00〜17:00）</option>
            </select>
          </div>
        </section>
      )}

      {error && <p style={{ color: "#c00", fontSize: 13, marginBottom: 12 }}>{error}</p>}

      <button onClick={handleConfirm} disabled={cartItems.length === 0 || !selectedAddressId}
        style={{ width: "100%", background: cartItems.length === 0 || !selectedAddressId ? "#999" : "#2D5A3D", color: "#fff", padding: "12px 20px", borderRadius: 8, border: "none", fontSize: 15, fontWeight: 600, cursor: cartItems.length === 0 || !selectedAddressId ? "default" : "pointer" }}>
        注文内容を確認する
      </button>
    </main>
    </>
  );
}
