import { env } from "cloudflare:workers";

interface PasswordResetEmail {
	name: string;
	to: string;
	token: string;
	url: string;
}

function escapeHtml(value: string) {
	return value.replace(
		/[&<>"']/g,
		(character) =>
			({
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				'"': "&quot;",
				"'": "&#039;",
			})[character] ?? character,
	);
}

export async function sendPasswordResetEmail({
	name,
	to,
	token,
	url,
}: PasswordResetEmail) {
	const apiKey = env.RESEND_API_KEY?.trim();
	const from = env.EMAIL_FROM?.trim();
	const brandName = env.EMAIL_BRAND_NAME?.trim() || "DV LMS";
	const replyTo = env.EMAIL_REPLY_TO?.trim();
	const supportEmail = env.EMAIL_SUPPORT?.trim();

	if (!apiKey || !from) {
		throw new Error("Resend is not configured for password reset emails.");
	}

	const safeName = escapeHtml(name || "there");
	const safeBrandName = escapeHtml(brandName);
	const safeUrl = escapeHtml(url);
	const supportMessage = supportEmail
		? `If you need help, contact ${supportEmail}.`
		: "If you need help, contact your workspace administrator.";
	const response = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
			"Idempotency-Key": `password-reset/${token}`,
		},
		body: JSON.stringify({
			from,
			to: [to],
			reply_to: replyTo || undefined,
			subject: `Reset your ${brandName} password`,
			text: [
				`Hi ${name || "there"},`,
				"",
				`We received a request to reset your ${brandName} password.`,
				`Reset your password: ${url}`,
				"",
				"This link expires in 1 hour. If you did not request this, you can ignore this email.",
				"",
				supportMessage,
			].join("\n"),
			html: `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#171717">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;background:#f5f5f5">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e5e5;border-radius:12px">
            <tr>
              <td style="padding:32px">
                <p style="margin:0 0 24px;font-size:18px;font-weight:700">${safeBrandName}</p>
                <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25">Reset your password</h1>
                <p style="margin:0 0 12px;font-size:15px;line-height:1.6">Hi ${safeName},</p>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6">We received a request to reset your password. This link expires in 1 hour.</p>
                <p style="margin:0 0 24px">
                  <a href="${safeUrl}" style="display:inline-block;border-radius:8px;background:#171717;padding:12px 18px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none">Reset password</a>
                </p>
                <p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#737373">If the button does not work, copy and paste this URL into your browser:</p>
                <p style="margin:0 0 24px;overflow-wrap:anywhere;font-size:13px;line-height:1.6;color:#525252">${safeUrl}</p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#737373">If you did not request this, you can safely ignore this email. ${escapeHtml(supportMessage)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
		}),
	});

	if (!response.ok) {
		const details = await response.text();
		throw new Error(
			`Resend rejected the password reset email (${response.status}): ${details}`,
		);
	}
}
