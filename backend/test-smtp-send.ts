import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const testSMTP = async () => {
  const host = process.env.SMTP_HOST || 'smtp.mailtrap.io';
  const port = parseInt(process.env.SMTP_PORT || '2525', 10);
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';

  console.log(`Testing SMTP sendMail to ${host}:${port} as ${user}`);

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
    
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'electricalclubvsb@gmail.com',
      to: 'sivabalan8138@gmail.com', // Using user's email based on the screenshot
      subject: 'Test Email from Backend',
      text: 'This is a test email.',
    });
    console.log('Mail sent successfully:', info.messageId);
  } catch (error: any) {
    console.error('Test failed:', error.message);
  }
};

testSMTP();
