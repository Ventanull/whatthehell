const getEmailContent = (otp, type = "login") => {
  const subject = type === "email_change"
    ? "Change Your Email Address - Digi Ratna WhatsApp"
    : "Your Login OTP - Digi Ratna WhatsApp";

  const title = type === "email_change"
    ? "Email Address Change Request"
    : "Login to Digi Ratna WhatsApp";

  const text = type === "email_change"
    ? `Your OTP to change your email address is: ${otp}. It is valid for 10 minutes. If you didn't request this, please ignore this email.`
    : `Your OTP for login is: ${otp}. It is valid for 5 minutes.`;

  const html = `
    <div style="font-family: sans-serif; padding: 20px;">
      <h2 style="color: #4F46E5;">${title}</h2>
      <p>${type === "email_change" ? "You requested to change your email address. Use the OTP below to verify:" : "Your One-Time Password (OTP) for login is:"}</p>
      <div style="background: #f3f4f6; padding: 15px; font-size: 24px; font-weight: bold; color: #4F46E5; letter-spacing: 5px; text-align: center; border-radius: 8px;">
        ${otp}
      </div>
      <p style="font-size: 12px; color: #666; margin-top: 20px;">
        This OTP is valid for ${type === "email_change" ? "10" : "5"} minutes. Do not share it with anyone.
      </p>
    </div>
  `;

  return { subject, text, html };
};

const sendWithElasticEmail = async (email, otp, type = "login") => {
  const apiKey = process.env.ELASTICEMAIL_API_KEY;
  const from = process.env.ELASTICEMAIL_FROM;
  const fromName = process.env.ELASTICEMAIL_FROM_NAME || "Digi Ratna WhatsApp";

  if (!apiKey || !from) {
    console.error("Elastic Email error: ELASTICEMAIL_API_KEY and ELASTICEMAIL_FROM are required.");
    return false;
  }

  const content = getEmailContent(otp, type);
  const form = new URLSearchParams({
    apikey: apiKey,
    from,
    fromName,
    to: email,
    subject: content.subject,
    bodyText: content.text,
    bodyHtml: content.html,
    isTransactional: "true",
  });

  if (process.env.ELASTICEMAIL_REPLY_TO) {
    form.set("replyTo", process.env.ELASTICEMAIL_REPLY_TO);
  }

  const response = await fetch("https://api.elasticemail.com/v2/email/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });

  const body = await response.text();
  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    payload = body;
  }

  if (!response.ok || payload?.success === false) {
    console.error("Elastic Email error:", {
      status: response.status,
      body: payload,
    });
    return false;
  }

  console.log("OTP email sent with Elastic Email:", payload?.data?.messageid || payload);
  return true;
};

exports.sendOTPEmail = async (email, otp, type = "login") => {
  try {
    return await sendWithElasticEmail(email, otp, type);
  } catch (error) {
    console.error("Elastic Email error:", error);
    return false;
  }
};
