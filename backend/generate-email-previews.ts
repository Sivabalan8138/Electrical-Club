import fs from 'fs';
import path from 'path';

const previewDir = path.join(__dirname, 'previews');
if (!fs.existsSync(previewDir)) {
  fs.mkdirSync(previewDir);
}

const teamName = "Example Team Name";
const candidateId = "EQ2026-1234";

const registrationHtml = `
  <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #081B33;">ElectroQuest Registration Confirmed!</h2>
    <p>Dear Participants,</p>
    <p>Your registration for the <strong>ElectroQuest Technical Quiz</strong> has been successfully processed.</p>
    <p>Here are your access credentials for the competition:</p>
    <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f9f9f9; width: 150px;">Team Name</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${teamName}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f9f9f9;">Candidate ID</td>
        <td style="padding: 8px; border: 1px solid #ddd; color: #00D4FF; font-weight: bold; font-size: 16px;">${candidateId}</td>
      </tr>
    </table>
    <p style="color: #666; font-size: 13px;"><em>Note: Keep this Candidate ID secure. It is required to log in and begin the proctored quiz.</em></p>
    <br/>
    <p>Best Regards,</p>
    <p><strong>Electrical Club</strong><br/>Department of Electrical and Electronics Engineering<br/>V.S.B. Engineering College, Karur</p>
  </div>
`;

const certId = "EQ-CERT-1234-5678";
const score = 45;
const percentage = 90;

const certificateHtml = `
  <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #081B33;">Electrical Club Event Portal</h2>
    <p>Dear Participants,</p>
    <p>Congratulations on completing the <strong>ElectroQuest Technical Quiz</strong>!</p>
    <p>We are pleased to attach your digital Certificate of Participation. You can also verify the authenticity of this certificate at any time by scanning the QR code printed on it.</p>
    <br/>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 250px;">Candidate ID</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${candidateId}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Score</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${score} / 50</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Percentage</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${percentage}%</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Certificate Verification Code</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${certId}</td>
      </tr>
    </table>
    <br/>
    <p>Best Regards,</p>
    <p><strong>Department of Electrical and Electronics Engineering</strong><br/>V.S.B. Engineering College, Karur</p>
  </div>
`;

fs.writeFileSync(path.join(previewDir, 'registration-email.html'), registrationHtml);
fs.writeFileSync(path.join(previewDir, 'certificate-email.html'), certificateHtml);

console.log('Preview files generated successfully in the backend/previews folder.');
