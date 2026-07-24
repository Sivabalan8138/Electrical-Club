import dotenv from 'dotenv';
dotenv.config();

console.log("Current SMTP Settings:");
console.log("HOST:", process.env.SMTP_HOST);
console.log("PORT:", process.env.SMTP_PORT);
console.log("USER:", process.env.SMTP_USER);
console.log("PASS:", process.env.SMTP_PASS);
