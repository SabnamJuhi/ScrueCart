exports.sendSMS = async (mobile, message) => {
  // Integrate: Fast2SMS / MSG91 / TextLocal
  console.log("SMS sent to", mobile);
};

exports.sendWhatsApp = async (mobile, message) => {
  // Integrate: Twilio / Meta WhatsApp Cloud API / Interakt
  console.log("WhatsApp sent to", mobile);
};
