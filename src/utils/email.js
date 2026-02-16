const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.sendResetPasswordEmail = async (email, resetLink) => {
  await transporter.sendMail({
    from: `"SajDhaj Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Reset your password",
    html: `
      <p>You requested a password reset.</p>
      <p>Click below link to reset your password:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>This link expires in 15 minutes.</p>
    `,
  });
};

/* ================= DELIVERY ASSIGNMENT EMAIL ================= */
exports.sendDeliveryAssignmentEmail = async ({
  to,
  orderNumber,
  customerName,
  phone,
  address,
  verificationLink,
   codPaymentLink = null,   
  isCOD = false, 
}) => {
  await transporter.sendMail({
    from: `"Admin" <${process.env.EMAIL_USER}>`,
    to,
    subject: "New Delivery Assigned",
    html: `
      <h2>New Order Assigned</h2>

      <p><b>Order Number:</b> ${orderNumber}</p>
      <p><b>Customer Name:</b> ${customerName}</p>
      <p><b>Phone:</b> ${phone}</p>
      <p><b>Address:</b> ${address}</p>

      <br/>

      <a href="${verificationLink}"
         style="padding:10px 18px;background:#28a745;color:#fff;
                text-decoration:none;border-radius:6px;">
        Verify Delivery OTP
      </a>

      <p style="margin-top:15px;">
        Open this link after delivering the parcel to verify OTP.
      </p>
      ${
        isCOD && codPaymentLink
          ? `
              <p><b>After collecting cash from customer:</b></p>
              <a href="${codPaymentLink}"
                style="display:inline-block;padding:10px 18px;background:#16a34a;color:#fff;
                text-decoration:none;border-radius:6px;font-weight:bold;margin-top:10px;">
                Confirm COD Payment
              </a>
            `
          : ""
      }

    `,
  });
};
