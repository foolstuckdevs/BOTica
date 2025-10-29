import { Resend } from 'resend';

interface SendPasswordResetEmailParams {
  to: string;
  resetLink: string;
  expiresInMinutes: number;
  fullName?: string | null;
}

function buildEmailHtml(params: SendPasswordResetEmailParams) {
  const safeName = params.fullName?.trim() || 'there';
  return `<!DOCTYPE html><html><head><meta charSet="utf-8" /><title>Password reset</title></head><body style="font-family: Arial, sans-serif; color: #1f2933;">
  <p>Hi ${safeName},</p>
  <p>We received a request to reset your BOTica account password. Click the button below to choose a new password. This link will expire in ${params.expiresInMinutes} minutes.</p>
  <p style="text-align: center; margin: 24px 0;">
    <a href="${params.resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px;">Reset your password</a>
  </p>
  <p>If you did not request this change, you can safely ignore this email.</p>
  <p>Stay secure,<br/>The BOTica Team</p>
</body></html>`;
}

function buildEmailText(params: SendPasswordResetEmailParams) {
  const safeName = params.fullName?.trim() || 'there';
  return [
    `Hi ${safeName},`,
    '',
    'We received a request to reset your BOTica account password.',
    `Use the link below (valid for ${params.expiresInMinutes} minutes):`,
    params.resetLink,
    '',
    'If you did not request this change, you can ignore this email.',
    '',
    'Stay secure,',
    'The BOTica Team',
  ].join('\n');
}

export async function sendPasswordResetEmail(
  params: SendPasswordResetEmailParams,
) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is not configured');
  }

  if (!from) {
    throw new Error('RESEND_FROM_EMAIL environment variable is not configured');
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to: params.to,
    subject: 'Reset your BOTica password',
    html: buildEmailHtml(params),
    text: buildEmailText(params),
  });
}
