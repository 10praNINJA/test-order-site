export const metadata = {
  title: "テスト注文サイト",
  description: "GitHub + Vercel + Supabase 構成のテストサイト",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body style={{ fontFamily: "sans-serif", margin: 0 }}>{children}</body>
    </html>
  );
}
