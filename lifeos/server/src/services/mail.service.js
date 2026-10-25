'use strict';

const nodemailer = require('nodemailer');
const env = require('../config/env');

// No SMTP configured (e.g. local dev) → emails are printed to the server console instead.
const transporter = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  : null;

function baseHtml(title, greeting, bodyHtml, ctaLabel, ctaUrl) {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f1f5f9;font-family:Segoe UI,Arial,Helvetica,sans-serif;color:#0f172a;padding:32px">
    <table width="100%" style="max-width:520px;margin:auto;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0">
      <tr><td style="padding:24px 28px">
        <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:#4f46e5">LifeOS</p>
        <h1 style="margin:0 0 12px;font-size:20px">${title}</h1>
        <p style="margin:0 0 12px;font-size:14px;color:#334155">Hi ${greeting},</p>
        <div style="font-size:14px;line-height:1.6;color:#334155">${bodyHtml}</div>
        <p style="margin:24px 0">
          <a href="${ctaUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;padding:12px 20px;border-radius:10px;text-decoration:none;font-size:14px">${ctaLabel}</a>
        </p>
        <p style="margin:0;font-size:12px;color:#94a3b8">If you did not request this, you can safely ignore this email.</p>
      </td></tr>
    </table>
  </body>
</html>`;
}

// Never throws: a broken SMTP server must not fail registration/reset flows.
async function sendMail({ to, subject, html, text }) {
  if (!transporter) {
    if (env.NODE_ENV !== 'test') {
      console.log(`[mail] SMTP not configured — to=${to} subject="${subject}"\n${text}`);
    }
    return { delivered: false };
  }
  try {
    await transporter.sendMail({ from: env.SMTP_FROM, to, subject, html, text });
    return { delivered: true };
  } catch (err) {
    console.error('[mail] Send failed:', err.message);
    return { delivered: false };
  }
}

function sendVerificationEmail({ email, name = 'there', token }) {
  const url = `${env.CLIENT_URL}/verify-email?token=${token}`;
  return sendMail({
    to: email,
    subject: 'Verify your LifeOS email',
    text: `Welcome to LifeOS!\n\nConfirm your email address:\n${url}\n\nThis link expires in 24 hours.`,
    html: baseHtml(
      'Confirm your email',
      name,
      '<p>Please confirm your email address to finish setting up LifeOS.</p>',
      'Verify email',
      url,
    ),
  });
}

function sendPasswordResetEmail({ email, name = 'there', token }) {
  const url = `${env.CLIENT_URL}/reset-password?token=${token}`;
  return sendMail({
    to: email,
    subject: 'Reset your LifeOS password',
    text: `Reset your LifeOS password:\n${url}\n\nThis link expires in 1 hour.`,
    html: baseHtml(
      'Password reset',
      name,
      '<p>We received a request to reset your password. This link expires in 1 hour.</p>',
      'Reset password',
      url,
    ),
  });
}

module.exports = { sendMail, sendVerificationEmail, sendPasswordResetEmail };
