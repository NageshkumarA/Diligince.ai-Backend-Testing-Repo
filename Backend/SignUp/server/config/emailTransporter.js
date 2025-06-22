import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'Thinkvatesolutions1@gmail.com',
    pass: 'dkhfzhwovjcaoogx',
  },
});

export default transporter;
