import nodemailer from "nodemailer";

export const sendEmail = async (to, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587, // TLS
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


    // Optional: verify transporter before sending
    await transporter.verify();

    await transporter.sendMail({
      from: `"Farm Marketplace" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    });

    console.log("✅ Email sent successfully");
  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
    throw error;
  }
};
