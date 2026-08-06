// ============================================================
// LeGrand — Mail utility (Resend)
// Sends transactional emails: contact form, enquiries, etc.
// ============================================================

const { Resend } = require('resend');

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.EMAIL_FROM || 'LeGrand <onboarding@resend.dev>';
const contactEmail = process.env.CONTACT_EMAIL || 'orarashid18289@gmail.com';

let resend = null;

if (apiKey) {
  resend = new Resend(apiKey);
} else {
  console.warn('[mail] RESEND_API_KEY not set — emails will not be sent.');
}

/**
 * Send an email using Resend.
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content of the email
 * @param {string} [options.text] - Plain text fallback
 * @param {string} [options.replyTo] - Reply-to address
 * @returns {Promise<Object>} Resend response or error object
 */
async function sendEmail({ to, subject, html, text, replyTo }) {
  if (!resend) {
    console.warn('[mail] Resend not configured — skipping email send.');
    return { ok: false, error: 'Email service not configured' };
  }

  try {
    const result = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
      ...(replyTo ? { reply_to: replyTo } : {}),
    });

    if (result.error) {
      console.error('[mail] Resend error:', result.error);
      return { ok: false, error: result.error };
    }

    console.log('[mail] Email sent successfully:', result.data?.id);
    return { ok: true, id: result.data?.id };
  } catch (err) {
    console.error('[mail] Failed to send email:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Send a contact form notification to the site owner.
 */
async function sendContactNotification({ name, email, phone, subject, message }) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a2e; border-bottom: 2px solid #e94560; padding-bottom: 10px;">
        New Contact Enquiry
      </h2>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 10px; font-weight: bold; color: #555;">Name:</td>
          <td style="padding: 10px;">${name}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold; color: #555;">Email:</td>
          <td style="padding: 10px;">${email || 'Not provided'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold; color: #555;">Phone:</td>
          <td style="padding: 10px;">${phone || 'Not provided'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold; color: #555;">Subject:</td>
          <td style="padding: 10px;">${subject}</td>
        </tr>
      </table>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #333; margin-top: 0;">Message:</h3>
        <p style="color: #555; line-height: 1.6;">${message}</p>
      </div>
      <p style="color: #999; font-size: 12px; text-align: center;">
        Sent from LeGrand Contact Form
      </p>
    </div>
  `;

  return sendEmail({
    to: contactEmail,
    subject: `[LeGrand] ${subject} — from ${name}`,
    html,
    replyTo: email || undefined,
  });
}

/**
 * Send a confirmation email to the person who submitted the contact form.
 */
async function sendContactConfirmation({ name, email }) {
  if (!email) return { ok: false, error: 'No email provided' };

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a2e; border-bottom: 2px solid #e94560; padding-bottom: 10px;">
        Thank You, ${name}!
      </h2>
      <p style="color: #555; line-height: 1.6;">
        We've received your message and will get back to you shortly.
      </p>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="color: #333; margin: 0;">
          <strong>What happens next?</strong><br>
          Our team will review your enquiry and respond within 24 hours.
          If your matter is urgent, feel free to reach us via WhatsApp.
        </p>
      </div>
      <p style="color: #555; line-height: 1.6;">
        Best regards,<br>
        <strong>The LeGrand Team</strong>
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 12px; text-align: center;">
        LeGrand — Discover Exceptional Stays Across Siaya
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Thank you for contacting LeGrand!',
    html,
  });
}

module.exports = {
  sendEmail,
  sendContactNotification,
  sendContactConfirmation,
};
