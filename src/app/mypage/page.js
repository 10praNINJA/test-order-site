"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../supabaseClient";

const inputStyle = {
  padding: "10px 12px", borderRadius: 8, border: "1px solid #D5CFC5",
  fontSize: 14, width: "100%", boxSizing: "border-box", background: "#fff",
};

export default function MyPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [profile, setProfile] = useState({ name: "", furigana: "", phone_number: "" });
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  const [newEmail, setNewEmail] = useState("");
  const [emailMsg, setEmailMsg] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => { checkUser(); }, []);

  async function checkUser() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) { router.push("/login"); return; }
    setUser(data.user);
    setCheckingAuth(false);
    const { data: prof } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
    if (prof) setProfile(prof);
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaving(true); setProfileMsg("");
    const { error } = await supabase.from("profiles").upsert({
      id: user.id, name: profile.name, furigana: profile.furigana, phone_number: profile.phone_number,
    });
    setProfileMsg(error ? "保存に失敗しました: " + error.message : "保存しました");
    setSaving(false);
  }

  async function handleChangeEmail(e) {
    e.preventDefault();
    setEmailSaving(true); setEmailMsg("");
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setEmailMsg(error ? "変更に失敗しました: " + error.message : "確認メールを送信しました。メールのリンクをクリックして変更を完了してください。");
    setEmailSaving(false);
    setNewEmail("");
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwSaving(true); setPwMsg("");
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
    if (signInError) { setPwMsg("現在のパスワードが正しくありません"); setPwSaving(false); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwMsg(error ? "変更に失敗しました: " + error.message : "パスワードを変更しました");
    setPwSaving(false);
    setCurrentPassword(""); setNewPassword("");
  }

  async function handleLogout() { await supabase.auth.signOut(); router.push("/login"); }

  if (checkingAuth) return <main style={{ maxWidth: 560, margin: "0 auto", padding: "40px 20px" }}><p style={{ color: "#999" }}>確認中...</p></main>;

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
            <Link href="/orders" style={{ padding: "8px 14px", fontSize: 13, color: "#888", textDecoration: "none", borderBottom: "2px solid transparent", marginBottom: -2 }}>注文履歴</Link>
            <span style={{ padding: "8px 14px", fontSize: 13, color: "#2D5A3D", fontWeight: 700, borderBottom: "2px solid #2D5A3D", marginBottom: -2 }}>マイページ</span>
          </nav>
        </div>
      </header>
      <main style={{ maxWidth: 560, margin: "0 auto", padding: "110px 20px 40px" }}>

        {/* 基本情報 */}
        <section style={{ border: "1px solid #E5DFD5", borderRadius: 10, padding: "20px", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", background: "#fff" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>基本情報</h2>
          <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>お名前 <span style={{ color: "#c00" }}>*</span></label>
              <input type="text" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>ふりがな</label>
              <input type="text" value={profile.furigana ?? ""} onChange={(e) => setProfile({ ...profile, furigana: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>電話番号</label>
              <input type="tel" value={profile.phone_number ?? ""} onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>メールアドレス（現在）</label>
              <input type="text" value={user.email} disabled style={{ ...inputStyle, background: "#F7F3EE", color: "#888" }} />
            </div>
            {profileMsg && <p style={{ fontSize: 13, color: profileMsg.includes("失敗") ? "#c00" : "#2D5A3D", margin: 0 }}>{profileMsg}</p>}
            <button type="submit" disabled={saving}
              style={{ background: saving ? "#B5B0A8" : "#2D5A3D", color: "#fff", padding: "10px", borderRadius: 8, border: "none", fontSize: 14, fontWeight: 600, cursor: saving ? "default" : "pointer" }}>
              {saving ? "保存中..." : "保存する"}
            </button>
          </form>
        </section>

        {/* メールアドレス変更 */}
        <section style={{ border: "1px solid #E5DFD5", borderRadius: 10, padding: "20px", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", background: "#fff" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>メールアドレスの変更</h2>
          <form onSubmit={handleChangeEmail} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>新しいメールアドレス</label>
              <input type="email" placeholder="new@example.com" value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)} required style={inputStyle} />
            </div>
            {emailMsg && <p style={{ fontSize: 13, color: emailMsg.includes("失敗") ? "#c00" : "#2D5A3D", margin: 0 }}>{emailMsg}</p>}
            <button type="submit" disabled={emailSaving}
              style={{ background: emailSaving ? "#B5B0A8" : "#2D5A3D", color: "#fff", padding: "10px", borderRadius: 8, border: "none", fontSize: 14, fontWeight: 600, cursor: emailSaving ? "default" : "pointer" }}>
              {emailSaving ? "送信中..." : "確認メールを送る"}
            </button>
          </form>
        </section>

        {/* パスワード変更 */}
        <section style={{ border: "1px solid #E5DFD5", borderRadius: 10, padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", background: "#fff" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>パスワードの変更</h2>
          <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>現在のパスワード</label>
              <input type="password" placeholder="••••••" value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)} required style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>新しいパスワード（6文字以上）</label>
              <input type="password" placeholder="••••••" value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)} required minLength={6} style={inputStyle} />
            </div>
            {pwMsg && <p style={{ fontSize: 13, color: pwMsg.includes("失敗") || pwMsg.includes("正しくありません") ? "#c00" : "#2D5A3D", margin: 0 }}>{pwMsg}</p>}
            <button type="submit" disabled={pwSaving}
              style={{ background: pwSaving ? "#B5B0A8" : "#2D5A3D", color: "#fff", padding: "10px", borderRadius: 8, border: "none", fontSize: 14, fontWeight: 600, cursor: pwSaving ? "default" : "pointer" }}>
              {pwSaving ? "変更中..." : "パスワードを変更する"}
            </button>
          </form>
        </section>

        {/* 配達先へのリンク */}
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <Link href="/addresses" style={{ fontSize: 13, color: "#2D5A3D", textDecoration: "underline" }}>
            配達先の管理はこちら →
          </Link>
        </div>
      </main>
    </>
  );
}
