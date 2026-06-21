"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabaseClient";

const inputStyle = {
  padding: "10px 12px", borderRadius: 8, border: "1px solid #D5CFC5", fontSize: 14, width: "100%",
};

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [furigana, setFurigana] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMessage("登録に失敗しました: " + error.message);
        setLoading(false);
        return;
      }
      if (data.user) {
        await supabase.from("profiles").insert([{
          id: data.user.id,
          name,
          furigana,
          phone_number: phone,
        }]);
      }
      setMessage("登録できました。ログインしてください。");
      setMode("login");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage("ログインに失敗しました: " + error.message);
      } else {
        router.push("/");
      }
    }
    setLoading(false);
  }

  return (
    <main style={{ maxWidth: 400, margin: "0 auto", padding: "60px 20px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
        {mode === "login" ? "ログイン" : "新規会員登録"}
      </h1>
      {mode === "signup" && (
        <p style={{ fontSize: 13, color: "#888", marginBottom: 24 }}>
          以下の情報を入力して会員登録してください
        </p>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: mode === "login" ? 24 : 0 }}>
        {mode === "signup" && (
          <>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>お名前 <span style={{ color: "#c00" }}>*</span></label>
                <input type="text" placeholder="山田 太郎" value={name}
                  onChange={(e) => setName(e.target.value)} required style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>ふりがな</label>
              <input type="text" placeholder="やまだ たろう" value={furigana}
                onChange={(e) => setFurigana(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>電話番号 <span style={{ color: "#c00" }}>*</span></label>
              <input type="tel" placeholder="090-0000-0000" value={phone}
                onChange={(e) => setPhone(e.target.value)} required style={inputStyle} />
            </div>
            <hr style={{ border: "none", borderTop: "1px solid #E5DFD5", margin: "4px 0" }} />
          </>
        )}

        <div>
          <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>メールアドレス <span style={{ color: "#c00" }}>*</span></label>
          <input type="email" placeholder="example@email.com" value={email}
            onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>パスワード（6文字以上） <span style={{ color: "#c00" }}>*</span></label>
          <input type="password" placeholder="••••••" value={password}
            onChange={(e) => setPassword(e.target.value)} required minLength={6} style={inputStyle} />
        </div>

        <button type="submit" disabled={loading}
          style={{ background: loading ? "#B5B0A8" : "#2D5A3D", color: "#fff", padding: "12px 20px", borderRadius: 8, border: "none", fontSize: 15, fontWeight: 600, cursor: loading ? "default" : "pointer", marginTop: 4 }}>
          {loading ? "処理中..." : mode === "login" ? "ログイン" : "登録する"}
        </button>
      </form>

      {message && (
        <p style={{ fontSize: 13, marginTop: 16, color: message.includes("失敗") ? "#c00" : "#2D5A3D" }}>
          {message}
        </p>
      )}

      <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}
        style={{ background: "none", border: "none", color: "#2D5A3D", fontSize: 13, marginTop: 20, cursor: "pointer", textDecoration: "underline", padding: 0 }}>
        {mode === "login" ? "アカウントがない場合はこちら（新規登録）" : "すでにアカウントがある場合はこちら（ログイン）"}
      </button>
    </main>
  );
}
