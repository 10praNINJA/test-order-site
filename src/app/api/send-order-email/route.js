import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  const { to, order } = await request.json();

  const itemsHtml = order.items
    .map(
      (item) =>
        `<tr>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;">${item.name}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:center;">${item.qty}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">¥${(item.price * item.qty).toLocaleString()}</td>
        </tr>`
    )
    .join("");

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;">
      <h2 style="font-size:20px;margin-bottom:4px;">ご注文ありがとうございます</h2>
      <p style="color:#666;font-size:13px;margin-bottom:24px;">以下の内容でご注文を受け付けました。</p>

      <h3 style="font-size:14px;font-weight:600;margin-bottom:8px;">ご注文内容</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">
        <thead>
          <tr style="background:#f5f5f5;">
            <th style="padding:6px 12px;text-align:left;">商品</th>
            <th style="padding:6px 12px;text-align:center;">数量</th>
            <th style="padding:6px 12px;text-align:right;">小計</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding:10px 12px;font-weight:700;text-align:right;">合計</td>
            <td style="padding:10px 12px;font-weight:700;text-align:right;">¥${order.total.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>

      <h3 style="font-size:14px;font-weight:600;margin-bottom:8px;">配達先</h3>
      <p style="font-size:14px;color:#333;margin-bottom:4px;">${order.address.label}：${order.address.recipient_name}</p>
      <p style="font-size:14px;color:#333;margin-bottom:20px;">〒${order.address.postal_code} ${order.address.prefecture ?? ""}${order.address.city ?? ""}${order.address.street ?? ""}<br>TEL: ${order.address.phone_number ?? ""}</p>

      <h3 style="font-size:14px;font-weight:600;margin-bottom:8px;">納品希望日時</h3>
      <p style="font-size:14px;color:#333;margin-bottom:24px;">${order.desired_date} ${order.desired_time}</p>

      <p style="font-size:12px;color:#999;border-top:1px solid #eee;padding-top:16px;">
        ※ キャンセルは納品希望日前日の16:00まで注文履歴ページから受け付けています。
      </p>
    </div>
  `;

  const { error } = await resend.emails.send({
    from: "テスト注文サイト <onboarding@resend.dev>",
    to,
    subject: "【注文確認】ご注文ありがとうございます",
    html,
  });

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true });
}
