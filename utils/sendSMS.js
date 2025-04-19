
import twilio from "twilio";

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export const sendSMS = async (to, body) => {
  try {
    await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to, // Example: +923001234567
    });
  } catch (error) {
    console.error("SMS Error:", error.message);
    throw new Error("Failed to send SMS");
  }
};
