import "./globals.css";

export const metadata = {
  title: "注文サイト",
  description: "GitHub + Vercel + Supabase 構成のテストサイト",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
