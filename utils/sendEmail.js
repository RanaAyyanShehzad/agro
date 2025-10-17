import nodemailer from "nodemailer";

export const sendEmail = async (to, subject, text) => {
  const host = process.env.EMAIL_HOST; // e.g., smtp.gmail.com
  const portStr = process.env.EMAIL_PORT; // "465" or "587"
  const secureEnv = process.env.EMAIL_SECURE; // "true" or "false"
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !portStr || !user || !pass) {
    throw new Error(
      "SMTP env vars missing. Required: EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS"
    );
  }

  const port = Number(portStr);
  const secure = secureEnv ? secureEnv === "true" : port === 465;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure, // true for 465, false for 587 (STARTTLS)
    auth: { user, pass },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    tls: { servername: host },
  });

  // Optional: surface handshake issues early in logs
  try {
    await transporter.verify();
  } catch (verifyErr) {
    // Continue to attempt send; verify can fail on some providers but send still works
    console.warn("SMTP verify warning:", verifyErr?.message || verifyErr);
  }

  try {
    const info = await transporter.sendMail({
      from: `"FarmConnect" <${user}>`,
      to,
      subject,
      text,
    });
    console.log("✅ Email sent:", info.messageId || info);
    return info;
  } catch (error) {
    console.error("❌ Email sending failed:", error?.message || error);
    throw error;
  }
};
