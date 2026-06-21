"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMessage("登録に失敗しました: " + error.message);
      } else {
        setMessage(
          "登録できました。確認メールが送られている場合があります。ログインしてください。"
        );
        setMode("login");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setMessage("ログインに失敗しました: " + error.message);
      } else {
        router.push("/");
      }
    }

    setLoading(false);
  }

  return (
    <main style={{ maxWidth: 360, margin: "0 auto", padding: "60px 20px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
        {mode === "login" ? "ログイン" : "新規登録"}
      </h1>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <input
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #ddd",
            fontSize: 14,
          }}
        />
        <input
          type="password"
          placeholder="パスワード(6文字以上)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #ddd",
            fontSize: 14,
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            background: loading ? "#999" : "#111",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: 8,
            border: "none",
            fontSize: 15,
            cursor: loading ? "default" : "pointer",
            marginTop: 8,
          }}
        >
          {loading
            ? "処理中..."
            : mode === "login"
            ? "ログイン"
            : "登録する"}
        </button>
      </form>

      {message && (
        <p style={{ color: "#c00", fontSize: 13, marginTop: 16 }}>
          {message}
        </p>
      )}

      <button
        onClick={() => {
          setMode(mode === "login" ? "signup" : "login");
          setMessage("");
        }}
        style={{
          background: "none",
          border: "none",
          color: "#666",
          fontSize: 13,
          marginTop: 20,
          cursor: "pointer",
          textDecoration: "underline",
        }}
      >
        {mode === "login"
          ? "アカウントがない場合はこちら(新規登録)"
          : "すでにアカウントがある場合はこちら(ログイン)"}
      </button>
    </main>
  );
}