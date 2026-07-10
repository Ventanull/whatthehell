require("dotenv").config();

const testEmail = async () => {
  try {
    const config = {
      apiKey: process.env.ELASTICEMAIL_API_KEY,
      from: process.env.ELASTICEMAIL_FROM,
      fromName: process.env.ELASTICEMAIL_FROM_NAME || "Digi Ratna WhatsApp",
      replyTo: process.env.ELASTICEMAIL_REPLY_TO,
      to: process.env.TEST_EMAIL_TO || process.env.ELASTICEMAIL_REPLY_TO || process.env.ELASTICEMAIL_FROM,
    };

    if (!config.apiKey || !config.from || !config.to) {
      console.error("Error: Missing required Elastic Email test environment variables.");
      console.error("Please set ELASTICEMAIL_API_KEY, ELASTICEMAIL_FROM, and TEST_EMAIL_TO or ELASTICEMAIL_REPLY_TO.");
      return;
    }

    console.log("Using Elastic Email configuration (API key masked):", {
      ...config,
      apiKey: "********",
    });

    const form = new URLSearchParams({
      apikey: config.apiKey,
      from: config.from,
      fromName: config.fromName,
      to: config.to,
      subject: "Elastic Email API Test",
      bodyText: "Test message from server",
      bodyHtml: "<p>Test message from server</p>",
      isTransactional: "true",
    });

    if (config.replyTo) {
      form.set("replyTo", config.replyTo);
    }

    const response = await fetch("https://api.elasticemail.com/v2/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });

    const body = await response.text();
    if (!response.ok) {
      console.error("Elastic Email Error:", {
        status: response.status,
        body,
      });
      return;
    }

    console.log("Message sent:", body);
  } catch (error) {
    console.error("Elastic Email Error:", error);
  }
};

testEmail();
