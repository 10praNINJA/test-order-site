# テスト注文サイト

Next.js (App Router) + Supabase + Vercel で構築した会員制注文サイトのプロトタイプです。

## 機能

- **ログイン / 新規登録** — Supabase Auth によるメール＋パスワード認証
- **注文フォーム** (`/`) — 商品一覧をカート形式で表示。バリアント（サイズ・種類）対応。カート内で数量を直接変更可能
- **配達先管理** (`/addresses`) — 配達先の追加・編集・削除。注文フォームからもインラインで操作可能
- **注文履歴** (`/orders`) — 過去の注文を新しい順に表示（商品・数量・配達先・合計金額）

## 技術スタック

| 項目 | 内容 |
|------|------|
| フレームワーク | Next.js 15 (App Router) |
| 認証・DB | Supabase (Auth + PostgreSQL) |
| ホスティング | Vercel |
| スタイル | インラインスタイル |

## Supabaseテーブル構成

| テーブル | 概要 |
|----------|------|
| `products` | 商品マスター |
| `product_variants` | 商品のバリアント（S/M/L、卵/レタスなど） |
| `delivery_addresses` | ユーザーごとの配達先 |
| `orders` | 注文ヘッダー（1注文＝1行） |
| `order_items` | 注文明細（1注文に複数行） |

全テーブルでRow Level Securityを有効化し、自分のデータのみ読み書き可能。

## ローカルで動かす方法

```bash
npm install
npm run dev
```

`.env.local` に Supabase の接続情報を設定してください。

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

`http://localhost:3000` を開くと確認できます。
