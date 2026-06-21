"use client";

import { useRouter } from "next/navigation";

export default function DonePage() {
  const router = useRouter();

  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
      <p style={{ fontSize: 26, fontWeight: 700, marginBottom: 12 }}>ご注文ありがとうございます</p>
      <p style={{ fontSize: 14, color: "#666", marginBottom: 40 }}>確認メールをお送りしました。</p>
      <button onClick={() => router.push("/")}
        style={{ background: "#2D5A3D", color: "#fff", padding: "12px 32px", borderRadius: 8, border: "none", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
        注文フォームに戻る
      </button>
    </main>
  );
}
