const nodemailer = require('nodemailer');
const fs = require('fs');

async function sendPDFMail(to, subject, text, pdfPath) {
  // 這裡以 Gmail SMTP 為例
  const transporter = nodemailer.createTransport({
    service: process.env.MAIL_SERVICE,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
  });

  let mailOptions = {
    from: process.env.MAIL_USER,
    to: to, // 收件人
    subject: subject,
    text: text,
    attachments: [
      {
        filename: 'contract.pdf',
        path: pdfPath
      }
    ]
  };

  await transporter.sendMail(mailOptions);
}
