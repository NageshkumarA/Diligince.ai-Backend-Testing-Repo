const nodemailer = require("nodemailer");

class Email {
  send(mailOption) {
    return new Promise((resolve, reject) => {
      (async () => {
        let smtpTransport = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465, 
            secure: true, 
            auth: {
                user: 'your-email@gmail.com',
                pass: 'your-app-password', 
            },
            pool: true,
            debug: true,
        });
        mailOption.from = "noreply@deligence.online";
        smtpTransport.sendMail(mailOption, (err, result) => {
          if (err) {
            console.log("er =", err);
            reject({ status: 0, message: err });
          }
          return resolve({ status: 1, message: result });
        });
      })();
    });
  }
/*
            const mailOptions = {
              from: `no reply <no-reply@test.com>`,
              to: emailId,
              subject,
              html: dynamicHTML,
            };
            // Send the email
            const sendEmail = await this.send(mailOptions);
*/

}

module.exports = Email;