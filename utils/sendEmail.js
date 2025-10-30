export const sendEmail = async (to, subject, text) => {
  try {
    const response = await fetch("https://farm-blush-seven.vercel.app/api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to, subject, text }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ Email service error:", errorData);
      throw new Error(`Email API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("✅ Email sent successfully via Vercel:", data);
    return data;
  } catch (error) {
    console.error("❌ Failed to send email via Vercel API:", error.message);
    throw error;
  }
};
