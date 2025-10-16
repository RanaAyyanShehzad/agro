import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,          // smtp.gmail.com
  port: Number(process.env.EMAIL_PORT),  // 465
  secure: process.env.EMAIL_SECURE === "true", // true for 465
  auth: {
    user: process.env.EMAIL_USER,        // yourgmail@gmail.com
    pass: process.env.EMAIL_PASS,        // app password
  },
  connectionTimeout: 15000,
  greetingTimeout: 10000,
  socketTimeout: 20000,
});

export async function sendEmail(to, subject, text) {
  await transporter.verify(); // optional: surfaces handshake issues early
  await transporter.sendMail({
    from: `"FarmConnect" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
  });
}
// utils/sendEmail.js
// import { Resend } from "resend";

// export const sendEmail = async (to, subject, text) => {
//   const apiKey = process.env.RESEND_API_KEY;
//   if (!apiKey) {
//     throw new Error("RESEND_API_KEY is not set. Check data/config.env and dotenv loading.");
//   }

//   const resend = new Resend(apiKey);

//   try {
//     const { data, error } = await resend.emails.send({
//       from: "onboarding@resend.dev",
//       to,
//       subject,
//       text,
//     });

//     if (error) {
//       console.error("❌ Resend email error:", error);
//       throw new Error("Email sending failed");
//     }

//     console.log("✅ Email sent:", data);
//     return data;
//   } catch (err) {
//     console.error("❌ Email sending failed:", err);
//     throw err;
//   }
// };
