import { sendTestCertificate } from './src/services/certificate.service';

sendTestCertificate('test@example.com', 'Test User', 'Test Event')
  .then(res => {
    console.log('Result:', res);
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
