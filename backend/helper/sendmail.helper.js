const nodemailer = require("nodemailer");

module.exports.send = (to, subject, content) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_NAME,
      pass: process.env.EMAIL_PASS,
    },
  });

  const htmlContent = `
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f9f9f9;
            margin: 0;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: auto;
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          }
          h1 {
            color: #4CAF50;
          }
          p {
            font-size: 16px;
            line-height: 1.5;
            color: #555;
          }
          .button {
            display: inline-block;
            padding: 10px 20px;
            background-color: #4CAF50;
            color: white;
            text-decoration: none;
            border-radius: 5px;
          }
          .footer {
            margin-top: 20px;
            font-size: 12px;
            color: #888;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${subject}</h1>
          <p>${content}</p>
       
          <div class="footer">
            <p>Đây là email tự động, vui lòng không trả lời.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.EMAIL_NAME,
    to: to,
    subject: subject,
    html: htmlContent,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
      // do something useful
    }
  });
};
