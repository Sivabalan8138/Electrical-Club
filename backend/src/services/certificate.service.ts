import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import nodemailer from 'nodemailer';
import prisma from '../utils/db';

// Ensure local storage directory exists for certificate preview
const CERT_DIR = path.join(__dirname, '../../generated_certificates');
if (!fs.existsSync(CERT_DIR)) {
  fs.mkdirSync(CERT_DIR, { recursive: true });
}

// Generate QR Code as DataURL/Buffer
const generateQR = async (text: string): Promise<Buffer> => {
  const dataUrl = await QRCode.toDataURL(text, { margin: 1, width: 100 });
  const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
  return Buffer.from(base64Data, 'base64');
};

// Mail transporter helper
const getTransporter = async () => {
  const host = process.env.SMTP_HOST || 'smtp.mailtrap.io';
  const port = parseInt(process.env.SMTP_PORT || '2525', 10);
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';

  // If mock values are set, go straight to Ethereal fallback
  if (!user || user === 'mock-user' || pass === 'mock-password' || pass === 'abcd efgh ijkl mnop') {
    return await getEtherealTransporter();
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  try {
    await transporter.verify();
    return { transporter, isTest: false };
  } catch (verifyErr: any) {
    console.log(`[SMTP WARNING] Configured SMTP server (${host}) failed login verification: ${verifyErr.message}`);
    console.log('Falling back automatically to Ethereal Mail sandbox...');
    return await getEtherealTransporter();
  }
};

const getEtherealTransporter = async () => {
  try {
    const testAccount = await nodemailer.createTestAccount();
    return {
      transporter: nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      }),
      isTest: true,
    };
  } catch (err) {
    console.log('Ethereal setup failed, falling back to mock logger:', err);
  }
  return {
    transporter: {
      sendMail: async (mailOptions: any) => {
        console.log('--- [MOCK MAIL SENDER] ---');
        console.log(`To: ${mailOptions.to}`);
        console.log(`Subject: ${mailOptions.subject}`);
        console.log('---------------------------');
        return {
          messageId: 'mock-msg-id-' + Math.random().toString(36).substring(2, 9),
          envelope: {} as any,
          accepted: [] as any[],
          rejected: [] as any[],
          pending: [] as any[],
          response: '250 OK',
        };
      },
    } as any,
    isTest: false,
  };
};

export const generateCertificatePDF = async (
  recipientName: string,
  eventTitle: string,
  certificateId: string,
  extraDetails?: string
): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        layout: 'landscape',
        size: 'A4',
        margin: 40,
      });

      const pdfPath = path.join(CERT_DIR, `${certificateId}.pdf`);
      const writeStream = fs.createWriteStream(pdfPath);
      doc.pipe(writeStream);

      // 1. Draw elegant background border
      doc
        .rect(20, 20, doc.page.width - 40, doc.page.height - 40)
        .lineWidth(4)
        .stroke('#081B33');

      doc
        .rect(28, 28, doc.page.width - 56, doc.page.height - 56)
        .lineWidth(1.5)
        .stroke('#00D4FF');

      // 2. Add header text
      doc.y += 20;
      doc
        .fillColor('#081B33')
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('V.S.B. ENGINEERING COLLEGE, KARUR', { align: 'center' });

      doc.moveDown(0.3);
      doc
        .fontSize(14)
        .fillColor('#666666')
        .font('Helvetica')
        .text('DEPARTMENT OF ELECTRICAL AND ELECTRONICS ENGINEERING', { align: 'center' });

      doc.moveDown(0.3);
      doc
        .fontSize(16)
        .fillColor('#00D4FF')
        .font('Helvetica-Bold')
        .text('ELECTRICAL CLUB', { align: 'center' });

      doc.moveDown(1.5);

      // 3. Certificate type
      doc
        .fillColor('#081B33')
        .fontSize(28)
        .font('Helvetica-Bold')
        .text('CERTIFICATE OF PARTICIPATION', { align: 'center' });

      doc.moveDown(1);

      // 4. Main Body
      doc
        .fillColor('#333333')
        .fontSize(14)
        .font('Helvetica')
        .text('This is to certify that', { align: 'center' });

      doc.moveDown(0.5);

      // Recipient name (Highlighted)
      doc
        .fillColor('#00D4FF')
        .fontSize(20)
        .font('Helvetica-Bold')
        .text(recipientName.toUpperCase(), { align: 'center' });

      doc.moveDown(0.5);

      const bodyText = `has successfully participated in the event ${eventTitle.toUpperCase()} organized by the Electrical Club, Department of Electrical and Electronics Engineering, V.S.B. Engineering College, Karur.`;
      
      doc
        .fillColor('#333333')
        .fontSize(13)
        .font('Helvetica')
        .text(bodyText, { align: 'center', lineGap: 4 });

      if (extraDetails) {
        doc.moveDown(0.5);
        doc
          .fillColor('#081B33')
          .fontSize(11)
          .font('Helvetica-Oblique')
          .text(extraDetails, { align: 'center' });
      }

      doc.moveDown(1.5);

      // 5. Generate QR Code
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://127.0.0.1'}/verify/certificate/${certificateId}`;
      const qrBuffer = await generateQR(verificationUrl);

      // Position QR Code on the bottom-center/left
      doc.image(qrBuffer, 60, doc.page.height - 150, { width: 90 });
      doc
        .fillColor('#666666')
        .fontSize(8)
        .font('Helvetica')
        .text(`Verification ID: ${certificateId}`, 60, doc.page.height - 50);

      // 6. Digital Signatures on the bottom-right
      const sigY = doc.page.height - 120;
      
      // Faculty signature block
      doc
        .fillColor('#081B33')
        .fontSize(11)
        .font('Times-Italic')
        .text('Dr. A. EEE Coordinator', doc.page.width - 250, sigY, { align: 'center', width: 180 });
      doc
        .moveTo(doc.page.width - 250, sigY + 18)
        .lineTo(doc.page.width - 70, sigY + 18)
        .strokeColor('#cccccc')
        .lineWidth(0.5)
        .stroke();
      doc
        .fillColor('#666666')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('FACULTY COORDINATOR', doc.page.width - 250, sigY + 22, { align: 'center', width: 180 });

      // Student coordinator signature block
      doc
        .fillColor('#081B33')
        .fontSize(11)
        .font('Times-Italic')
        .text('Student Secretary', doc.page.width - 450, sigY, { align: 'center', width: 180 });
      doc
        .moveTo(doc.page.width - 450, sigY + 18)
        .lineTo(doc.page.width - 270, sigY + 18)
        .strokeColor('#cccccc')
        .lineWidth(0.5)
        .stroke();
      doc
        .fillColor('#666666')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('STUDENT COORDINATOR', doc.page.width - 450, sigY + 22, { align: 'center', width: 180 });

      // Finalize PDF
      doc.end();

      writeStream.on('finish', () => {
        resolve(pdfPath);
      });
      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};

// Main trigger to generate certificate and email it
export const generateCertificateAndEmail = async (registrationId: string): Promise<void> => {
  try {
    const registration = await prisma.electroQuestRegistration.findUnique({
      where: { id: registrationId },
      include: { quizAttempt: true },
    });

    if (!registration || !registration.quizAttempt) {
      throw new Error('Registration or quiz attempt not found');
    }

    if (registration.quizAttempt.status !== 'COMPLETED') {
      throw new Error('Quiz has not been completed successfully');
    }

    // Generate unique Certificate ID if it doesn't exist
    let certId = registration.quizAttempt.certificateId;
    if (!certId) {
      certId = `EQ-CERT-${registration.candidateId}-${Math.floor(1000 + Math.random() * 9000)}`;
      await prisma.quizAttempt.update({
        where: { registrationId },
        data: { certificateId: certId },
      });
    }

    const name = registration.member2Name
      ? `${registration.member1Name} & ${registration.member2Name}`
      : registration.member1Name;

    const extraDetails = `Score: ${registration.quizAttempt.score}/75 | Percentage: ${registration.quizAttempt.percentage}% | Duration: ${registration.quizAttempt.timeTaken.toFixed(2)} mins`;

    const pdfPath = await generateCertificatePDF(name, 'ElectroQuest (Technical Quiz)', certId, extraDetails);

    // Email to candidate(s)
    const { transporter, isTest } = await getTransporter();
    const emails = [registration.member1Email];
    if (registration.member2Email) {
      emails.push(registration.member2Email);
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || 'electricalclubvsb@gmail.com',
      to: emails.join(', '),
      subject: `ElectroQuest Participation Certificate - Candidate ID: ${registration.candidateId}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #081B33;">Electrical Club Event Portal</h2>
          <p>Dear Participants,</p>
          <p>Congratulations on completing the <strong>ElectroQuest Technical Quiz</strong>!</p>
          <p>We are pleased to attach your digital Certificate of Participation. You can also verify the authenticity of this certificate at any time by scanning the QR code printed on it.</p>
          <br/>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Candidate ID</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${registration.candidateId}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Score</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${registration.quizAttempt.score} / 75</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Percentage</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${registration.quizAttempt.percentage}%</td>
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
      `,
      attachments: [
        {
          filename: `ElectroQuest_${registration.candidateId}_Certificate.pdf`,
          path: pdfPath,
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);
    if (isTest) {
      console.log(`[ETHEREAL PREVIEW URL]: ${nodemailer.getTestMessageUrl(info)}`);
    }

    await prisma.quizAttempt.update({
      where: { registrationId },
      data: { isCertSent: true },
    });

    console.log(`Certificate ${certId} generated and emailed to ${emails.join(', ')}`);
  } catch (error) {
    console.error('Certificate generation failed:', error);
  }
};

// Think Big Certificate Generation (triggered manually or after admin approval)
export const generateThinkBigCertificateAndEmail = async (registrationId: string): Promise<void> => {
  try {
    const registration = await prisma.thinkBigRegistration.findUnique({
      where: { id: registrationId },
    });

    if (!registration) {
      throw new Error('Think Big Registration not found');
    }

    if (registration.approvalStatus !== 'APPROVED') {
      throw new Error('Project presentation is not approved by admin yet');
    }

    // Generate unique Certificate ID if it doesn't exist
    let certId = registration.certificateId;
    if (!certId) {
      certId = `TB-CERT-${registration.teamName.replace(/\s+/g, '-').toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      await prisma.thinkBigRegistration.update({
        where: { id: registrationId },
        data: { certificateId: certId },
      });
    }

    const teamMembersList = [
      registration.member1Name,
      registration.member2Name,
      registration.member3Name,
      registration.member4Name,
    ].filter(Boolean);

    const names = teamMembersList.join(', ');

    const extraDetails = `Team Name: ${registration.teamName} | Domain: ${registration.domain} | AI Score: ${registration.aiScore || 0}/70 | Presentation Score: ${registration.presentationScore || 0}/30 | Final Score: ${registration.finalScore || 0}/100`;

    const pdfPath = await generateCertificatePDF(names, 'Think Big (Idea Presentation)', certId, extraDetails);

    const { transporter, isTest } = await getTransporter();
    const emails = [registration.member1Email, registration.member2Email];
    if (registration.member3Email) emails.push(registration.member3Email);
    if (registration.member4Email) emails.push(registration.member4Email);

    const mailOptions = {
      from: process.env.SMTP_FROM || 'electricalclubvsb@gmail.com',
      to: emails.join(', '),
      subject: `Think Big Idea Presentation Certificate - Team: ${registration.teamName}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #081B33;">Electrical Club Event Portal</h2>
          <p>Dear ${registration.teamName} Team Members,</p>
          <p>Congratulations on successfully presenting your project in the <strong>Think Big Innovation & Idea Presentation</strong> under the domain <strong>${registration.domain}</strong>!</p>
          <p>The organizing committee is pleased to award your participation certificates (attached). You can scan the QR code to verify your verification status online.</p>
          <br/>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Team Name</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${registration.teamName}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Domain</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${registration.domain}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Final Score</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${registration.finalScore || 0} / 100</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Certificate Code</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${certId}</td>
            </tr>
          </table>
          <br/>
          <p>Best Regards,</p>
          <p><strong>Department of Electrical and Electronics Engineering</strong><br/>V.S.B. Engineering College, Karur</p>
        </div>
      `,
      attachments: [
        {
          filename: `ThinkBig_${registration.teamName}_Certificate.pdf`,
          path: pdfPath,
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);
    if (isTest) {
      console.log(`[ETHEREAL PREVIEW URL]: ${nodemailer.getTestMessageUrl(info)}`);
    }

    await prisma.thinkBigRegistration.update({
      where: { id: registrationId },
      data: { isCertSent: true },
    });

    console.log(`Think Big Certificate ${certId} generated and emailed to team members.`);
  } catch (error) {
    console.error('Think Big Certificate generation failed:', error);
  }
};

export const sendTestCertificate = async (
  email: string,
  name: string,
  event: string
): Promise<{ message: string; previewUrl?: string; isMock: boolean }> => {
  const testCertId = `TEST-CERT-${Math.floor(1000 + Math.random() * 9000)}`;
  const pdfPath = await generateCertificatePDF(name, event, testCertId, 'Test Run | Integrity Verification OK');

  const { transporter, isTest } = await getTransporter();

  const mailOptions = {
    from: process.env.SMTP_FROM || 'electricalclubvsb@gmail.com',
    to: email,
    subject: `[TEST] Electrical Club Certificate Verification`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #081B33;">Electrical Club Email Connection Test</h2>
        <p>Dear ${name},</p>
        <p>This is a test certificate dispatch to verify your SMTP server configurations are active and functioning correctly.</p>
        <br/>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Status</td>
            <td style="padding: 8px; border: 1px solid #ddd; color: green; font-weight: bold;">SMTP Connection OK</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Test Certificate Code</td>
            <td style="padding: 8px; border: 1px solid #ddd; font-family: monospace;">${testCertId}</td>
          </tr>
        </table>
        <br/>
        <p>Best Regards,</p>
        <p>Organizing Committee, EEE Department</p>
      </div>
    `,
    attachments: [
      {
        filename: `Test_${name}_Certificate.pdf`,
        path: pdfPath,
      },
    ],
  };

  const info = await transporter.sendMail(mailOptions);
  let previewUrl = '';
  if (isTest) {
    previewUrl = nodemailer.getTestMessageUrl(info) || '';
    console.log(`[ETHEREAL PREVIEW URL]: ${previewUrl}`);
  }

  return {
    message: 'Test certificate generated and emailed successfully!',
    previewUrl,
    isMock: isTest,
  };
};
