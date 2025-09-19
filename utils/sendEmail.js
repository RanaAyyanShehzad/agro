// import nodemailer from "nodemailer";

// export const sendEmail = async (to, subject, text) => {
//   try {
//     const transporter = nodemailer.createTransport({
//   host: "smtp.gmail.com",
//   port: 587, // TLS
//   secure: false,
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });


//     // Optional: verify transporter before sending
//     await transporter.verify();

//     await transporter.sendMail({
//       from: `"Farm Marketplace" <${process.env.EMAIL_USER}>`,
//       to,
//       subject,
//       text,
//     });

//     console.log("✅ Email sent successfully");
//   } catch (error) {
//     console.error("❌ Email sending failed:", error.message);
//     throw error;
//   }
// };
// utils/sendEmail.js
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async (to, subject, text) => {
  try {
    const { data, error } = await resend.emails.send({
      from: "onboarding@resend.dev", // default free domain
      to,
      subject,
      text,
    });

    if (error) {
      console.error("❌ Resend email error:", error);
      throw new Error("Email sending failed");
    }

    console.log("✅ Email sent:", data);
    return data;
  } catch (err) {
    console.error("❌ Email sending failed:", err);
    throw err;
  }
};
