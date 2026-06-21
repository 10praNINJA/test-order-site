"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../supabaseClient";

const emptyForm = {
  label: "", recipient_name: "", postal_code: "",
  prefecture: "", city: "", street: "", building: "", phone_number: "",
};

const inputStyle = {
  padding: "10px 12px", borderRadius: 8, border: "1px solid #D5CFC5",
  fontSize: 14, width: "100%", boxSizing: "border-box",
};

function formatAddress(addr) {
  if (addr.prefecture) {
    return [addr.prefecture, addr.city, addr.street, addr.building].filter(Boolean).join(" ");
  }
  return addr.address ?? "";
}

export default function AddressesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [addresses, setAddresses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [postalResults, setPostalResults] = useState([]);

  useEffect(() => { checkUser(); }, []);

  async function checkUser() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) { router.push("/login"); return; }
    setUser(data.user);
    setCheckingAuth(false);
    const { data: prof } = await supabase.from("profiles").select("name").eq("id", data.user.id).single();
    if (prof) setProfile(prof);
    fetchAddresses();
  }

  async function fetchAddresses() {
    const { data, error } = await supabase
      .from("delivery_addresses").select("*").order("created_at", { ascending: true });
    if (error) { setError("配達先の取得に失敗しました: " + error.message); return; }
    setAddresses(data);
  }

  async function lookupPostalCode(code) {
    const cleaned = code.replace(/-/g, "");
    if (cleaned.length !== 7) return;
    setLookingUp(true);
    setPostalResults([]);
    setForm((prev) => ({ ...prev, prefecture: "", city: "", street: "" }));
    try {
      const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleaned}`);
      const json = await res.json();
      if (json.results?.length === 1) {
        applyPostalResult(json.results[0]);
      } else if (json.results?.length > 1) {
        setPostalResults(json.results);
      }
    } catch (e) {
      // 失敗しても無視
    } finally {
      setLookingUp(false);
    }
  }

  function applyPostalResult(r) {
    setForm((prev) => ({ ...prev, prefecture: r.address1, city: r.address2, street: r.address3 }));
    setPostalResults([]);
  }

  function openNewForm() { setEditingId(null); setForm(emptyForm); setError(""); setShowForm(true); }

  function openEditForm(addr) {
    setEditingId(addr.id);
    setForm({
      label: addr.label ?? "",
      recipient_name: addr.recipient_name ?? "",
      postal_code: addr.postal_code ?? "",
      prefecture: addr.prefecture ?? "",
      city: addr.city ?? "",
      street: addr.street ?? "",
      building: addr.building ?? "",
      phone_number: addr.phone_number ?? "",
    });
    setError(""); setShowForm(true);
  }

  function closeForm() { setShowForm(false); setEditingId(null); setForm(emptyForm); setError(""); }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setError("");
    const payload = {
      label: form.label, recipient_name: form.recipient_name,
      postal_code: form.postal_code, prefecture: form.prefecture,
      city: form.city, street: form.street, building: form.building,
      phone_number: form.phone_number,
    };
    if (editingId) {
      const { error } = await supabase.from("delivery_addresses").update(payload).eq("id", editingId);
      if (error) { setError("更新に失敗しました: " + error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("delivery_addresses").insert([{ ...payload, user_id: user.id }]);
      if (error) { setError("追加に失敗しました: " + error.message); setSaving(false); return; }
    }
    await fetchAddresses(); closeForm(); setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm("この配達先を削除しますか？")) return;
    setDeletingId(id);
    const { error } = await supabase.from("delivery_addresses").delete().eq("id", id);
    if (error) setError("削除に失敗しました: " + error.message);
    else await fetchAddresses();
    setDeletingId(null);
  }

  async function handleLogout() { await supabase.auth.signOut(); router.push("/login"); }

  if (checkingAuth) return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "40px 20px" }}>
      <p style={{ color: "#999" }}>確認中...</p>
    </main>
  );

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
            <span style={{ padding: "8px 14px", fontSize: 13, color: "#2D5A3D", fontWeight: 700, borderBottom: "2px solid #2D5A3D", marginBottom: -2 }}>配達先</span>
            <Link href="/orders" style={{ padding: "8px 14px", fontSize: 13, color: "#888", textDecoration: "none", borderBottom: "2px solid transparent", marginBottom: -2 }}>注文履歴</Link>
            <Link href="/mypage" style={{ padding: "8px 14px", fontSize: 13, color: "#888", textDecoration: "none", borderBottom: "2px solid transparent", marginBottom: -2 }}>マイページ</Link>
          </nav>
        </div>
      </header>
      <main style={{ maxWidth: 560, margin: "0 auto", padding: "110px 20px 40px" }}>

      {error && !showForm && <p style={{ color: "#c00", fontSize: 13, marginBottom: 16 }}>{error}</p>}

      {!showForm && (
        <button onClick={openNewForm} style={{ background: "#2D5A3D", color: "#fff", padding: "10px 20px", borderRadius: 8, border: "none", fontSize: 14, cursor: "pointer", marginBottom: 24 }}>
          + 新しい配達先を追加
        </button>
      )}

      {showForm && (
        <div style={{ border: "1px solid #D5CFC5", borderRadius: 10, padding: 20, marginBottom: 24, background: "#FDFCFB" }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
            {editingId ? "配達先を編集" : "新しい配達先"}
          </h2>
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input type="text" placeholder="ラベル（例：自宅、会社）" value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })} required style={inputStyle} />
            <input type="text" placeholder="受取人名" value={form.recipient_name}
              onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} required style={inputStyle} />

            {/* 郵便番号 */}
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="text" placeholder="郵便番号（例：123-4567）" value={form.postal_code}
                  onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                  onBlur={(e) => lookupPostalCode(e.target.value)}
                  required style={{ ...inputStyle, flex: 1 }} />
                <button type="button" onClick={() => postalResults.length > 1 ? setPostalResults([]) : lookupPostalCode(form.postal_code)} disabled={lookingUp}
                  style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #D5CFC5", background: "#fff", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
                  {lookingUp ? "検索中…" : postalResults.length > 1 ? "閉じる" : "住所検索"}
                </button>
              </div>
              {/* 複数候補ポップアップ */}
              {postalResults.length > 1 && (
                <ul style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, marginTop: 4, border: "1px solid #c8d8f0", borderRadius: 8, padding: "4px 0", background: "#f0f6ff", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", listStyle: "none" }}>
                  <li style={{ display: "flex", justifyContent: "flex-end", padding: "2px 6px 0" }}>
                    <button type="button" onClick={() => setPostalResults([])}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#888", lineHeight: 1, padding: "2px 4px" }}>×</button>
                  </li>
                  {postalResults.map((r, i) => (
                    <li key={i}>
                      <button type="button" onMouseDown={() => applyPostalResult(r)}
                        style={{ width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#1a4f9c", borderBottom: i < postalResults.length - 1 ? "1px solid #dbe8f8" : "none" }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#dbe8f8"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "none"}>
                        {r.address2}{r.address3}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 都道府県・市区町村 */}
            <div style={{ display: "flex", gap: 8 }}>
              <input type="text" placeholder="都道府県" value={form.prefecture}
                onChange={(e) => setForm({ ...form, prefecture: e.target.value })}
                required style={{ ...inputStyle, flex: "0 0 120px" }} />
              <input type="text" placeholder="市区町村" value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                required style={{ ...inputStyle, flex: 1 }} />
            </div>

            <input type="text" placeholder="番地（例：千代田1-1）" value={form.street}
              onChange={(e) => setForm({ ...form, street: e.target.value })} required style={inputStyle} />
            <input type="text" placeholder="アパート・建物名・部屋番号（任意）" value={form.building}
              onChange={(e) => setForm({ ...form, building: e.target.value })} style={inputStyle} />
            <input type="text" placeholder="電話番号" value={form.phone_number}
              onChange={(e) => setForm({ ...form, phone_number: e.target.value })} required style={inputStyle} />

            {error && <p style={{ color: "#c00", fontSize: 13 }}>{error}</p>}
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button type="submit" disabled={saving}
                style={{ background: saving ? "#999" : "#2D5A3D", color: "#fff", padding: "10px 20px", borderRadius: 8, border: "none", fontSize: 14, cursor: saving ? "default" : "pointer" }}>
                {saving ? "保存中..." : "保存する"}
              </button>
              <button type="button" onClick={closeForm}
                style={{ background: "none", border: "1px solid #D5CFC5", borderRadius: 8, padding: "10px 16px", fontSize: 14, cursor: "pointer" }}>
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 一覧 */}
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>登録済み配達先（{addresses.length}件）</h2>
        {addresses.length === 0 && <p style={{ color: "#999", fontSize: 14 }}>まだ配達先が登録されていません</p>}
        <ul style={{ display: "flex", flexDirection: "column", gap: 10, listStyle: "none", padding: 0, margin: 0 }}>
          {addresses.map((addr) => (
            <li key={addr.id} style={{ border: "1px solid #e0e0e0", borderRadius: 10, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontSize: 14, lineHeight: 1.8 }}>
                  <strong style={{ fontSize: 15 }}>{addr.label}</strong><br />
                  {addr.recipient_name}<br />
                  〒{addr.postal_code}<br />
                  {addr.prefecture}{addr.city}{addr.street}{addr.building ? ` ${addr.building}` : ""}
                  {!addr.prefecture && addr.address}<br />
                  TEL: {addr.phone_number}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => openEditForm(addr)}
                    style={{ background: "none", border: "1px solid #D5CFC5", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>編集</button>
                  <button onClick={() => handleDelete(addr.id)} disabled={deletingId === addr.id}
                    style={{ background: "none", border: "1px solid #fcc", borderRadius: 6, padding: "5px 10px", fontSize: 12, color: "#c00", cursor: deletingId === addr.id ? "default" : "pointer" }}>
                    {deletingId === addr.id ? "削除中..." : "削除"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
    </>
  );
}
