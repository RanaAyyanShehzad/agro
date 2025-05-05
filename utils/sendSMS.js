
import twilio from 'twilio';

// Ensure proper initialization - both should work but let's use the recommended approach


export const sendSMS = async (to, body) => {
  try {
    // Verify client was initialized
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    // Only create the client if credentials are available
    let client = null;
    if (accountSid && authToken) {
      client = twilio(accountSid, authToken);
    }
    if (!client) {
      throw new Error("Twilio client not initialized - check credentials");
    }

    // Verify phone number is set
    if (!twilioPhone) {
      throw new Error("Twilio phone number is missing");
    }

    // Make sure phone number is in E.164 format
  

    // Send message
    const message = await client.messages.create({
      body,
      from: twilioPhone,
      to,
    });

    
    return {
      success: true,
      messageSid: message.sid,
      status: message.status
    };
  } catch (error) {
   
    return {
      success: false,
      message: `Failed to send SMS: ${error.message}`
    };
  }
};

// Helper to ensure phone number is in E.164 format
function ensureE164Format(phoneNumber) {
  // Strip all non-numeric characters
  let cleaned = phoneNumber.replace(/\D/g, '');

  // If doesn't start with country code, add Pakistan code
  if (!phoneNumber.startsWith('+')) {
    if (cleaned.startsWith('0')) {
      // Remove leading 0 and add Pakistan code
      cleaned = '92' + cleaned.substring(1);
    } else if (!cleaned.startsWith('92')) {
      cleaned = '92' + cleaned;
    }
    cleaned = '+' + cleaned;
  }

  return cleaned;
}