import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const testSMTP = async () => {
  const host = process.env.SMTP_HOST || 'smtp.mailtrap.io';
  const port = parseInt(process.env.SMTP_PORT || '2525', 10);
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';

  console.log(`Testing SMTP connection to ${host}:${port} as ${user}`);

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 10000,
    tls: { rejectUnauthorized: false }
  });

  try {
    await transporter.verify();
    console.log('Verification successful!');
  } catch (error: any) {
    console.error('Verification failed:', error.message);
  }
};

testSMTP();
