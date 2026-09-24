type KlinzoEmailAction = { label: string; url: string };

type KlinzoEmailOptions = {
  title: string;
  message: string;
  preheader?: string;
  code?: string;
  action?: KlinzoEmailAction;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function buildKlinzoEmail({
  title,
  message,
  preheader,
  code,
  action,
}: KlinzoEmailOptions): string {
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message).replaceAll('\n', '<br>');
  const codeBlock = code
    ? `<tr><td align="center" style="padding:4px 32px 28px"><div style="display:inline-block;background:#f0f7f2;border:1px solid #cfe0d5;border-radius:14px;padding:16px 28px;font-size:30px;line-height:1;font-weight:800;letter-spacing:8px;color:#155f3d">${escapeHtml(code)}</div></td></tr>`
    : '';
  const actionBlock = action
    ? `<tr><td style="padding:4px 32px 32px"><a href="${escapeHtml(action.url)}" style="display:inline-block;background:#155f3d;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:13px 20px;border-radius:10px">${escapeHtml(action.label)}</a></td></tr>`
    : '';

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f0f7f2;font-family:Arial,Helvetica,sans-serif;color:#17211b">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>` : ''}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0f7f2;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #dbe8df;border-radius:20px;overflow:hidden">
<tr><td style="background:#155f3d;padding:24px 32px"><div style="font-size:24px;line-height:1;font-weight:800;letter-spacing:-0.5px;color:#ffffff">KLINZO</div><div style="margin-top:7px;font-size:12px;color:#d8efe1">La collecte, simplement.</div></td></tr>
<tr><td style="padding:32px 32px 12px"><h1 style="margin:0;font-size:22px;line-height:1.3;color:#17211b">${safeTitle}</h1></td></tr>
<tr><td style="padding:8px 32px 24px;font-size:15px;line-height:1.7;color:#46524a">${safeMessage}</td></tr>
${codeBlock}${actionBlock}
<tr><td style="border-top:1px solid #e7eee9;padding:20px 32px;font-size:11px;line-height:1.6;color:#738078">Cet e-mail a été envoyé automatiquement par KLINZO. Merci de ne pas répondre directement à ce message.</td></tr>
</table></td></tr></table></body></html>`;
}
