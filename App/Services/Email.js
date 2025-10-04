const nodemailer = require("nodemailer");

class Email {
<<<<<<< HEAD
  send(mailOption) {
    return new Promise((resolve, reject) => {
      (async () => {
        let smtpTransport = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465, 
            secure: true, 
            auth: {
                user: 'Thinkvatesolutions1@gmail.com',
                pass: 'dkhfzhwovjcaoogx', 
            },
            pool: true,
            debug: true,
        });
        mailOption.from = "Thinkvatesolutions1@gmail.com";
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
=======
  async send(mailOption) {
    const smtpTransport = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      pool: true,
      debug: true,
    });

    mailOption.from = process.env.EMAIL_USER;

    return new Promise((resolve, reject) => {
      smtpTransport.sendMail(mailOption, (err, info) => {
        if (err) {
          console.log("Email send error:", err);
          return reject(err);
        }
        resolve(info);
      });
    });
  }
}

module.exports = Email;
>>>>>>> 30ed529 (Initial commit)
