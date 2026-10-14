import { Resend } from "resend";

let resendClient = null;

function getResend() {
  if (!resendClient && process.env.RESEND_API_KEY) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

const DEFAULT_FROM =
  process.env.EMAIL_FROM && !process.env.EMAIL_FROM.includes("onboarding@resend.dev")
    ? process.env.EMAIL_FROM
    : "Abhyasa <support@abhyasalearning.in>";
const DEFAULT_ADMIN = process.env.ADMIN_EMAIL || "bhuvanamallesh08@gmail.com";

/**
 * Send 6-digit registration verification OTP to user
 */
export async function sendRegistrationOtpEmail({ to, name, otp }) {
  // Always log OTP for development and debugging resilience
  console.log(`[EmailService] 📧 Registration OTP generated for ${to}: [${otp}]`);

  try {
    const resend = getResend();
    if (!resend) {
      console.warn("[EmailService] RESEND_API_KEY is not set. OTP for registration:", otp);
      return { success: false, reason: "NO_API_KEY", otp };
    }

    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to,
      subject: "Verify Your Email - Abhyasa Learning",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #0f766e; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">ABHYASA</h1>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Digital Learning Platform</p>
          </div>

          <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0;">Welcome, ${name || "Student"}!</h2>
          <p style="font-size: 15px; line-height: 1.6; color: #334155;">
            Thank you for registering with Abhyasa. To activate your account and verify your email address, please use the 6-digit verification code below:
          </p>

          <div style="background: #f0fdfa; border: 2px dashed #0f766e; border-radius: 10px; padding: 20px; text-align: center; margin: 28px 0;">
            <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0f766e; font-family: monospace;">${otp}</span>
          </div>

          <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
            This verification code is valid for <strong>10 minutes</strong>. If you did not create an account on Abhyasa, please disregard this email.
          </p>

          <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 28px 0 20px;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
            © ${new Date().getFullYear()} Abhyasa Learning Platform. All rights reserved.
          </p>
        </div>
      `,
    });

    if (error) {
      console.warn(`[EmailService] Resend API notice for ${to}:`, error.message || error);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (err) {
    console.error("[EmailService] Exception in sendRegistrationOtpEmail:", err);
    return { success: false, error: err };
  }
}

/**
 * Send official Payment Receipt to the student upon successful payment
 */
export async function sendPaymentReceiptEmail({ to, name, amount, paymentId, expiresAt, payerEmail }) {
  try {
    const resend = getResend();
    if (!resend) {
      console.warn("[EmailService] RESEND_API_KEY is not set. Cannot send receipt for:", paymentId);
      return { success: false, reason: "NO_API_KEY" };
    }

    const formattedDate = new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const expiryFormatted = expiresAt
      ? new Date(expiresAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "30 Days from purchase";

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f766e; padding-bottom: 16px; margin-bottom: 24px;">
          <div>
            <h1 style="color: #0f766e; margin: 0; font-size: 24px; font-weight: 800;">ABHYASA</h1>
            <p style="color: #64748b; font-size: 13px; margin: 2px 0 0;">Official Payment Receipt</p>
          </div>
          <div style="text-align: right;">
            <span style="display: inline-block; background: #dcfce7; color: #166534; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px;">PAID ✓</span>
          </div>
        </div>

        <h2 style="font-size: 17px; font-weight: 700; color: #0f172a; margin-top: 0;">Thank you for your payment, ${name || "Student"}!</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #334155;">
          Your payment has been successfully processed and verified. Your subscription to <strong>Test Yourself</strong> is now active.
        </p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 20px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="color: #64748b; padding: 6px 0;">Plan / Item:</td>
              <td style="font-weight: 600; text-align: right; color: #0f172a;">Test Yourself (30-Day Access)</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 6px 0;">Amount Paid:</td>
              <td style="font-weight: 700; text-align: right; color: #0f766e; font-size: 16px;">₹${amount}.00</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 6px 0;">Payment ID:</td>
              <td style="font-family: monospace; text-align: right; color: #334155; font-size: 13px;">${paymentId}</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 6px 0;">Payment Date:</td>
              <td style="text-align: right; color: #334155;">${formattedDate}</td>
            </tr>
            <tr style="border-top: 1px dashed #cbd5e1;">
              <td style="color: #64748b; padding: 10px 0 4px;">Subscription Valid Until:</td>
              <td style="font-weight: 700; text-align: right; color: #0f766e; padding: 10px 0 4px;">${expiryFormatted}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
          You can now log in anytime to access all chapter questions, step-by-step solutions, and detailed explanations.
        </p>

        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 28px 0 16px;" />
        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
          Need help? Contact support at support@abhyasa.com
        </p>
      </div>
    `;

    // Send to primary registered email
    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to,
      subject: `Payment Receipt - Abhyasa Subscription Confirmed (₹${amount})`,
      html: emailHtml,
    });

    if (error) {
      console.warn(`[EmailService] Notice sending receipt to ${to}:`, error.message || error);
    }

    // If payer used a different email during UPI/checkout, attempt delivery there as well
    if (payerEmail && payerEmail.toLowerCase() !== to.toLowerCase() && /\S+@\S+\.\S+/.test(payerEmail)) {
      resend.emails.send({
        from: DEFAULT_FROM,
        to: payerEmail,
        subject: `Payment Receipt - Abhyasa Subscription Confirmed (₹${amount})`,
        html: emailHtml,
      }).catch((e) => console.warn(`[EmailService] Payer email copy notice:`, e.message));
    }

    return { success: !error, data, error };
  } catch (err) {
    console.error("[EmailService] Exception in sendPaymentReceiptEmail:", err);
    return { success: false, error: err };
  }
}

/**
 * Send Payment Notification to Admin whenever a user pays
 */
export async function sendAdminPaymentNotificationEmail({ user, amount, paymentId, paymentMethod, payerDetails = {} }) {
  try {
    const resend = getResend();
    if (!resend) {
      console.warn("[EmailService] RESEND_API_KEY is not set. Admin alert skipped for:", paymentId);
      return { success: false, reason: "NO_API_KEY" };
    }

    const adminEmail = DEFAULT_ADMIN;
    const formattedDate = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to: adminEmail,
      subject: `[Abhyasa Admin] Payment Received: ₹${amount} from ${user.name || user.email}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 16px;">
            <h2 style="color: #0f766e; margin: 0; font-size: 20px;">New Subscription Payment Received</h2>
            <span style="background: #dcfce7; color: #166534; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px;">VERIFIED ✓</span>
          </div>

          <p style="font-size: 14px; color: #475569; margin: 0 0 16px;">A student has completed payment on the Abhyasa platform:</p>

          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin: 16px 0;">
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; color: #64748b; width: 40%;">Student Name:</td>
              <td style="padding: 8px 0; font-weight: 600;">${user.name || "N/A"}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; color: #64748b;">Registered Account Email:</td>
              <td style="padding: 8px 0; font-weight: 600;">${user.email}</td>
            </tr>
            ${payerDetails.email ? `
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; color: #64748b;">Payment Payer Email:</td>
              <td style="padding: 8px 0; font-weight: 600;">${payerDetails.email}</td>
            </tr>` : ""}
            ${payerDetails.contact ? `
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; color: #64748b;">Payer Contact Phone:</td>
              <td style="padding: 8px 0; font-weight: 600;">${payerDetails.contact}</td>
            </tr>` : ""}
            ${payerDetails.vpa ? `
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; color: #64748b;">UPI VPA / App:</td>
              <td style="padding: 8px 0; font-family: monospace;">${payerDetails.vpa}</td>
            </tr>` : ""}
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; color: #64748b;">Amount Received:</td>
              <td style="padding: 8px 0; font-weight: 700; color: #0f766e; font-size: 16px;">₹${amount}.00</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; color: #64748b;">Razorpay Payment ID:</td>
              <td style="padding: 8px 0; font-family: monospace;">${paymentId}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; color: #64748b;">Payment Method:</td>
              <td style="padding: 8px 0;">${paymentMethod || "UPI QR"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Timestamp (IST):</td>
              <td style="padding: 8px 0;">${formattedDate}</td>
            </tr>
          </table>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-top: 16px;">
            <p style="margin: 0; font-size: 12px; color: #64748b;">
              Subscription has been activated for 30 days. Full questions and solutions unlocked for this user.
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("[EmailService] Failed to send admin payment alert:", error);
      return { success: false, error };
    }
    console.log(`[EmailService] Admin payment confirmation email sent to ${adminEmail} for ${paymentId}`);
    return { success: true, data };
  } catch (err) {
    console.error("[EmailService] Exception in sendAdminPaymentNotificationEmail:", err);
    return { success: false, error: err };
  }
}
