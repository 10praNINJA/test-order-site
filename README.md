# テスト注文サイト

GitHub + Vercel + Supabase の構成を試すための最小サンプルです。

## 今のこのバージョンでできること

- ボタンを押すとテスト注文がページ内のリストに追加される(まだデータベースには保存していません)

## 今後追加していく予定

- [ ] Supabaseに接続して注文データを保存
- [ ] Supabase Authでログイン機能を追加
- [ ] Googleスプレッドシートへのデータ転送(GAS経由)

## ローカルで動かす方法

```bash
npm install
npm run dev
```

`http://localhost:3000` を開くと確認できます。
