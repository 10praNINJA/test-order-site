"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../supabaseClient";

const emptyForm = {
  label: "",
  recipient_name: "",
  postal_code: "",
  address: "",
  phone_number: "",
};

export default function AddressesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [addresses, setAddresses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
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
    setUser(data.user);
    setCheckingAuth(false);
    fetchAddresses();
  }

  async function fetchAddresses() {
    const { data, error } = await supabase
      .from("delivery_addresses")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) {
      setError("配達先の取得に失敗しました: " + error.message);
      return;
    }
    setAddresses(data);
  }

  function openNewForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setShowForm(true);
  }

  function openEditForm(addr) {
    setEditingId(addr.id);
    setForm({
      label: addr.label ?? "",
      recipient_name: addr.recipient_name ?? "",
      postal_code: addr.postal_code ?? "",
      address: addr.address ?? "",
      phone_number: addr.phone_number ?? "",
    });
    setError("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    if (editingId) {
      const { error } = await supabase
        .from("delivery_addresses")
        .update(form)
        .eq("id", editingId);
      if (error) {
        setError("更新に失敗しました: " + error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from("delivery_addresses")
        .insert([{ ...form, user_id: user.id }]);
      if (error) {
        setError("追加に失敗しました: " + error.message);
        setSaving(false);
        return;
      }
    }

    await fetchAddresses();
    closeForm();
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm("この配達先を削除しますか？")) return;
    setDeletingId(id);
    const { error } = await supabase
      .from("delivery_addresses")
      .delete()
      .eq("id", id);
    if (error) {
      setError("削除に失敗しました: " + error.message);
    } else {
      await fetchAddresses();
    }
    setDeletingId(null);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const inputStyle = {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #ddd",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
  };

  if (checkingAuth) {
    return (
      <main style={{ maxWidth: 560, margin: "0 auto", padding: "40px 20px" }}>
        <p style={{ color: "#999" }}>確認中...</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "40px 20px" }}>
      {/* ヘッダー */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>配達先管理</h1>
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

      {/* ナビゲーション */}
      <nav style={{ display: "flex", gap: 16, marginBottom: 24, fontSize: 13 }}>
        <Link href="/" style={{ color: "#555", textDecoration: "none" }}>
          注文する
        </Link>
        <span style={{ color: "#111", fontWeight: 600 }}>配達先</span>
        <Link href="/orders" style={{ color: "#555", textDecoration: "none" }}>
          注文履歴
        </Link>
      </nav>

      {error && !showForm && (
        <p style={{ color: "#c00", fontSize: 13, marginBottom: 16 }}>{error}</p>
      )}

      {/* 追加ボタン */}
      {!showForm && (
        <button
          onClick={openNewForm}
          style={{
            background: "#111",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: 8,
            border: "none",
            fontSize: 14,
            cursor: "pointer",
            marginBottom: 24,
          }}
        >
          + 新しい配達先を追加
        </button>
      )}

      {/* 追加・編集フォーム */}
      {showForm && (
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 10,
            padding: 20,
            marginBottom: 24,
            background: "#fafafa",
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
            {editingId ? "配達先を編集" : "新しい配達先"}
          </h2>
          <form
            onSubmit={handleSave}
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            <input
              type="text"
              placeholder="ラベル（例：自宅、会社）"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              required
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="受取人名"
              value={form.recipient_name}
              onChange={(e) =>
                setForm({ ...form, recipient_name: e.target.value })
              }
              required
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="郵便番号（例：123-4567）"
              value={form.postal_code}
              onChange={(e) =>
                setForm({ ...form, postal_code: e.target.value })
              }
              required
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="住所"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              required
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="電話番号"
              value={form.phone_number}
              onChange={(e) =>
                setForm({ ...form, phone_number: e.target.value })
              }
              required
              style={inputStyle}
            />
            {error && (
              <p style={{ color: "#c00", fontSize: 13 }}>{error}</p>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  background: saving ? "#999" : "#111",
                  color: "#fff",
                  padding: "10px 20px",
                  borderRadius: 8,
                  border: "none",
                  fontSize: 14,
                  cursor: saving ? "default" : "pointer",
                }}
              >
                {saving ? "保存中..." : "保存する"}
              </button>
              <button
                type="button"
                onClick={closeForm}
                style={{
                  background: "none",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  padding: "10px 16px",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 配達先一覧 */}
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
          登録済み配達先（{addresses.length}件）
        </h2>
        {addresses.length === 0 && (
          <p style={{ color: "#999", fontSize: 14 }}>
            まだ配達先が登録されていません
          </p>
        )}
        <ul style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {addresses.map((addr) => (
            <li
              key={addr.id}
              style={{
                border: "1px solid #eee",
                borderRadius: 10,
                padding: "14px 16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ fontSize: 14, lineHeight: 1.7 }}>
                  <strong style={{ fontSize: 15 }}>{addr.label}</strong>
                  <br />
                  {addr.recipient_name}
                  <br />
                  〒{addr.postal_code}
                  <br />
                  {addr.address}
                  <br />
                  TEL: {addr.phone_number}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => openEditForm(addr)}
                    style={{
                      background: "none",
                      border: "1px solid #ddd",
                      borderRadius: 6,
                      padding: "5px 10px",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(addr.id)}
                    disabled={deletingId === addr.id}
                    style={{
                      background: "none",
                      border: "1px solid #fcc",
                      borderRadius: 6,
                      padding: "5px 10px",
                      fontSize: 12,
                      color: "#c00",
                      cursor: deletingId === addr.id ? "default" : "pointer",
                    }}
                  >
                    {deletingId === addr.id ? "削除中..." : "削除"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
