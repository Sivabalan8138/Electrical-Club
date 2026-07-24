import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import prisma from '../utils/db';
import nodemailer from 'nodemailer';
import { generateAttendancePDF, generateAttendanceExcel, generateAttendanceWord } from '../services/attendance.service';
import { sendTestCertificate } from '../services/certificate.service';
import { getCertificateSettings, saveCertificateSettings } from '../services/certificate.settings';

// Get Admin Analytics Dashboard Data
export const getAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalEQ = await prisma.electroQuestRegistration.count();

    const quizAttempts = await prisma.quizAttempt.findMany();
    const quizCompleted = quizAttempts.filter((a) => a.status === 'COMPLETED');
    const quizDisqualified = quizAttempts.filter((a) => a.status === 'DISQUALIFIED');

    const totalCertificates = 
      await prisma.quizAttempt.count({ where: { isCertSent: true } });

    // Calculate highest and average scores
    let highestScore = 0;
    let avgScore = 0;
    if (quizCompleted.length > 0) {
      highestScore = Math.max(...quizCompleted.map((a) => a.score));
      const sum = quizCompleted.reduce((acc, a) => acc + a.score, 0);
      avgScore = parseFloat((sum / quizCompleted.length).toFixed(2));
    }


    // Department-wise stats for ElectroQuest
    const eqRegistrations = await prisma.electroQuestRegistration.findMany();
    const deptStats: Record<string, number> = {};
    eqRegistrations.forEach((r) => {
      const dept = r.member1Department.toUpperCase();
      deptStats[dept] = (deptStats[dept] || 0) + 1;
      if (r.member2Department) {
        const dept2 = r.member2Department.toUpperCase();
        deptStats[dept2] = (deptStats[dept2] || 0) + 1;
      }
    });

    // Year-wise stats for ElectroQuest
    const yearStats: Record<string, number> = {};
    eqRegistrations.forEach((r) => {
      const yr = r.member1Year;
      yearStats[yr] = (yearStats[yr] || 0) + 1;
      if (r.member2Year) {
        const yr2 = r.member2Year;
        yearStats[yr2] = (yearStats[yr2] || 0) + 1;
      }
    });

    res.status(200).json({
      totalRegistrations: totalEQ,
      eventWise: { electroQuest: totalEQ },
      quizStats: {
        completed: quizCompleted.length,
        disqualified: quizDisqualified.length,
        averageScore: avgScore,
        highestScore,
      },

      deptStats,
      yearStats,
      certificateCount: totalCertificates,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch analytics' });
  }
};

// Upload Question Bank (Excel / CSV / JSON)
export const uploadQuestionBank = async (req: Request, res: Response): Promise<void> => {
  const file = req.file;

  try {
    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const filePath = file.path;
    const ext = path.extname(file.originalname).toLowerCase();
    const parsedQuestions: Array<{
      category: string;
      text: string;
      optionA: string;
      optionB: string;
      optionC: string;
      optionD: string;
      correctAnswer: string;
    }> = [];

    if (ext === '.xlsx') {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      const worksheet = workbook.worksheets[0];

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row
        const category = row.getCell(1).text.trim();
        const text = row.getCell(2).text.trim();
        const optionA = row.getCell(3).text.trim();
        const optionB = row.getCell(4).text.trim();
        const optionC = row.getCell(5).text.trim();
        const optionD = row.getCell(6).text.trim();
        const correctAnswer = row.getCell(7).text.trim().toUpperCase();

        if (category && text && optionA && optionB && optionC && optionD && correctAnswer) {
          parsedQuestions.push({ category, text, optionA, optionB, optionC, optionD, correctAnswer });
        }
      });
    } else if (ext === '.csv') {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Simple comma splitter (ignores commas inside quotes for production robustness)
        const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((p) => p.replace(/^"|"$/g, '').trim());
        if (parts.length >= 7) {
          parsedQuestions.push({
            category: parts[0],
            text: parts[1],
            optionA: parts[2],
            optionB: parts[3],
            optionC: parts[4],
            optionD: parts[5],
            correctAnswer: parts[6].toUpperCase(),
          });
        }
      }
    } else if (ext === '.json') {
      const content = fs.readFileSync(filePath, 'utf-8');
      const list = JSON.parse(content);
      if (Array.isArray(list)) {
        list.forEach((q: any) => {
          if (q.category && q.text && q.optionA && q.optionB && q.optionC && q.optionD && q.correctAnswer) {
            parsedQuestions.push({
              category: String(q.category),
              text: String(q.text),
              optionA: String(q.optionA),
              optionB: String(q.optionB),
              optionC: String(q.optionC),
              optionD: String(q.optionD),
              correctAnswer: String(q.correctAnswer).toUpperCase(),
            });
          }
        });
      }
    } else {
      res.status(400).json({ error: 'Unsupported file format. Please upload .xlsx, .csv, or .json' });
      return;
    }

    // Remove temp file
    fs.unlinkSync(filePath);

    if (parsedQuestions.length === 0) {
      res.status(400).json({ error: 'No valid questions found in file' });
      return;
    }

    // Insert questions in database
    await prisma.question.createMany({
      data: parsedQuestions,
    });

    res.status(200).json({
      message: `${parsedQuestions.length} questions successfully imported into the database!`,
    });
  } catch (error: any) {
    if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    res.status(500).json({ error: error.message || 'Failed to parse file' });
  }
};

// Get ElectroQuest Registrations
export const getElectroQuestRegistrations = async (req: Request, res: Response): Promise<void> => {
  try {
    const list = await prisma.electroQuestRegistration.findMany({
      include: { quizAttempt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load registrations' });
  }
};

// Export Attendance PDF
export const exportAttendancePDFFile = async (req: Request, res: Response): Promise<void> => {
  const { event } = req.params; // "ELECTROQUEST"
  try {
    if (event !== 'ELECTROQUEST') {
      res.status(400).json({ error: 'Invalid event type' });
      return;
    }
    const pdfPath = await generateAttendancePDF(event);
    res.download(pdfPath);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate attendance sheet' });
  }
};

// Export Attendance Excel
export const exportAttendanceExcelFile = async (req: Request, res: Response): Promise<void> => {
  const { event } = req.params; // "ELECTROQUEST"
  try {
    if (event !== 'ELECTROQUEST') {
      res.status(400).json({ error: 'Invalid event type' });
      return;
    }
    const excelPath = await generateAttendanceExcel(event);
    res.download(excelPath);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate attendance sheet' });
  }
};

// Export Attendance Word
export const exportAttendanceWordFile = async (req: Request, res: Response): Promise<void> => {
  const { event } = req.params; // "ELECTROQUEST"
  try {
    if (event !== 'ELECTROQUEST') {
      res.status(400).json({ error: 'Invalid event type' });
      return;
    }
    const wordPath = await generateAttendanceWord(event);
    res.download(wordPath);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate attendance sheet' });
  }
};

// Announcements
export const createAnnouncement = async (req: Request, res: Response): Promise<void> => {
  const { title, content, eventType } = req.body;
  try {
    if (!title || !content || !eventType) {
      res.status(400).json({ error: 'Title, content, and eventType are required' });
      return;
    }
    const announcement = await prisma.announcement.create({
      data: { title, content, eventType },
    });
    res.status(201).json(announcement);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create announcement' });
  }
};

export const getAnnouncements = async (req: Request, res: Response): Promise<void> => {
  try {
    const list = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load announcements' });
  }
};

// Bulk Email Service
export const sendBulkEmail = async (req: Request, res: Response): Promise<void> => {
  const { subject, htmlBody, targetEvent } = req.body; // targetEvent: "ELECTROQUEST", "THINKBIG", or "ALL"

  try {
    if (!subject || !htmlBody || !targetEvent) {
      res.status(400).json({ error: 'Subject, htmlBody, and targetEvent are required' });
      return;
    }

    const emails: string[] = [];

    if (targetEvent === 'ELECTROQUEST' || targetEvent === 'ALL') {
      const eq = await prisma.electroQuestRegistration.findMany();
      eq.forEach((r) => {
        emails.push(r.member1Email);
        if (r.member2Email) emails.push(r.member2Email);
      });
    }

    const uniqueEmails = Array.from(new Set(emails));

    if (uniqueEmails.length === 0) {
      res.status(400).json({ error: 'No recipients found for the selected event category' });
      return;
    }

    // Configure Mail Sender
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '465', 10);
    const user = process.env.SMTP_USER || 'electricalclubvsb@gmail.com';
    const pass = process.env.SMTP_PASS || 'yuiolashfehuyoow';

    let mailer: any;
    if (!user || user === 'mock-user' || pass === 'mock-password') {
      mailer = {
        sendMail: async (opts: any) => {
          console.log(`[MOCK BULK EMAIL] To: ${opts.to}, Subject: ${opts.subject}`);
          return {};
        },
      };
    } else {
      mailer = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
    }

    // Send emails in chunks to avoid rate limiting
    const chunkSize = 25;
    for (let i = 0; i < uniqueEmails.length; i += chunkSize) {
      const chunk = uniqueEmails.slice(i, i + chunkSize);
      await mailer.sendMail({
        from: process.env.SMTP_FROM || 'electricalclubvsb@gmail.com',
        bcc: chunk.join(', '), // Send via BCC to protect privacy
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #081B33; border-bottom: 2px solid #00D4FF; padding-bottom: 8px;">Electrical Club News</h2>
            ${htmlBody}
            <br/>
            <hr style="border: 0; border-top: 1px solid #eee;" />
            <p style="font-size: 11px; color: #888;">Department of Electrical and Electronics Engineering, V.S.B. Engineering College, Karur.</p>
          </div>
        `,
      });
    }

    res.status(200).json({ message: `Successfully emailed ${uniqueEmails.length} participants!` });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to send bulk email' });
  }
};

export const handleSendTestCertificate = async (req: Request, res: Response): Promise<void> => {
  const { email, name, event } = req.body;
  try {
    const result = await sendTestCertificate(email, name, event);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to dispatch test certificate.' });
  }
};

// Delete ElectroQuest Registration
export const deleteElectroQuestRegistration = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const existing = await prisma.electroQuestRegistration.findUnique({
      where: { id },
    });
    if (!existing) {
      res.status(404).json({ error: 'Registration not found' });
      return;
    }
    await prisma.electroQuestRegistration.delete({
      where: { id },
    });
    res.status(200).json({ message: 'Registration deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete registration' });
  }
};


// Get SMTP settings
export const getSMTPSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const host = process.env.SMTP_HOST || '';
    const port = process.env.SMTP_PORT || '';
    const user = process.env.SMTP_USER || '';
    const pass = process.env.SMTP_PASS || '';
    const from = process.env.SMTP_FROM || '';

    res.status(200).json({
      host,
      port,
      user,
      from,
      hasPassword: !!pass && pass !== 'mock-password'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch SMTP settings' });
  }
};

// Update SMTP settings
export const updateSMTPSettings = async (req: Request, res: Response): Promise<void> => {
  const { host, port, user, pass, from } = req.body;
  try {
    if (!host || !port || !user || !from) {
      res.status(400).json({ error: 'All fields except password are required' });
      return;
    }

    const testPass = pass && pass !== '••••••••' ? pass : (process.env.SMTP_PASS || '');

    const cleanHost = host.trim();
    const cleanPort = parseInt(port, 10);
    const cleanUser = user.trim();
    const cleanPass = testPass.trim();

    // Verify SMTP settings before saving
    const testTransporter = nodemailer.createTransport({
      host: cleanHost,
      port: cleanPort,
      secure: cleanPort === 465,
      auth: { user: cleanUser, pass: cleanPass },
      connectionTimeout: 10000,
      tls: { rejectUnauthorized: false }
    });

    let verified = true;
    let verifyError = '';

    try {
      await testTransporter.verify();
    } catch (verifyErr: any) {
      verified = false;
      verifyError = verifyErr.message;
    }

    // Save the values anyway
    process.env.SMTP_HOST = host;
    process.env.SMTP_PORT = port;
    process.env.SMTP_USER = user;
    process.env.SMTP_FROM = from;
    if (pass && pass !== '••••••••') {
      process.env.SMTP_PASS = pass;
    }

    // Persist to .env file
    const envPath = path.join(__dirname, '../../.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    const variables: Record<string, string> = {
      SMTP_HOST: host,
      SMTP_PORT: port.toString(),
      SMTP_USER: user,
      SMTP_FROM: from
    };
    if (pass && pass !== '••••••••') {
      variables.SMTP_PASS = pass;
    }

    let lines = envContent.split('\n');
    for (const [key, val] of Object.entries(variables)) {
      const index = lines.findIndex(line => line.startsWith(`${key}=`));
      if (index !== -1) {
        lines[index] = `${key}=${val}`;
      } else {
        lines.push(`${key}=${val}`);
      }
    }

    fs.writeFileSync(envPath, lines.join('\n'), 'utf8');

    if (verified) {
      res.status(200).json({
        verified: true,
        message: 'SMTP settings verified and saved successfully! Automated emails are active.'
      });
    } else {
      res.status(200).json({
        verified: false,
        message: `SMTP settings saved, but login verification failed: ${verifyError}. The system has automatically activated the Ethereal sandbox fallback for testing.`
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update SMTP settings' });
  }
};

// Get Registration Status (Public)
export const getRegistrationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const electroQuest = process.env.REGISTRATION_ELECTROQUEST || 'OPEN';
    const quizLogin = process.env.QUIZ_LOGIN_STATUS || 'OPEN';
    res.status(200).json({ electroQuest, quizLogin });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch registration status' });
  }
};

// Update Registration Status (Admin)
export const updateRegistrationStatus = async (req: Request, res: Response): Promise<void> => {
  const { electroQuest, quizLogin } = req.body;
  try {
    if (!electroQuest) {
      res.status(400).json({ error: 'electroQuest status is required' });
      return;
    }

    process.env.REGISTRATION_ELECTROQUEST = electroQuest;
    
    if (quizLogin) {
      process.env.QUIZ_LOGIN_STATUS = quizLogin;
    }

    // Persist to .env file
    const envPath = path.join(__dirname, '../../.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    const variables: Record<string, string> = {
      REGISTRATION_ELECTROQUEST: electroQuest
    };
    if (quizLogin) {
      variables['QUIZ_LOGIN_STATUS'] = quizLogin;
    }

    let lines = envContent.split('\n');
    for (const [key, val] of Object.entries(variables)) {
      const index = lines.findIndex(line => line.startsWith(`${key}=`));
      if (index !== -1) {
        lines[index] = `${key}=${val}`;
      } else {
        lines.push(`${key}=${val}`);
      }
    }

    fs.writeFileSync(envPath, lines.join('\n'), 'utf8');

    res.status(200).json({
      message: 'Registration statuses updated successfully!'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update registration status' });
  }
};

export const uploadCertificateTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No template file uploaded' });
      return;
    }
    const targetPath = path.join(__dirname, '../../uploads/certificate_template.png');
    fs.copyFileSync(file.path, targetPath);
    fs.unlinkSync(file.path); // clean up the original multer file
    res.status(200).json({ message: 'Certificate template uploaded successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to upload certificate template' });
  }
};

export const getCertSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const settings = getCertificateSettings();
    res.status(200).json(settings);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch certificate settings' });
  }
};

export const updateCertSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const settings = req.body;
    saveCertificateSettings(settings);
    res.status(200).json({ message: 'Certificate settings updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update certificate settings' });
  }
};

// Resend Candidate ID Email
export const resendRegistrationEmail = async (req: Request, res: Response): Promise<void> => {
  const { event, id } = req.params;

  if (event !== 'electroquest') {
    res.status(400).json({ error: 'Only electroquest event is supported for email resend.' });
    return;
  }

  try {
    const registration = await prisma.electroQuestRegistration.findUnique({
      where: { id },
    });

    if (!registration) {
      res.status(404).json({ error: 'Registration not found' });
      return;
    }

    const emails = [registration.member1Email];
    if (registration.member2Email) {
      emails.push(registration.member2Email);
    }

    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '465', 10);
    const user = process.env.SMTP_USER || 'electricalclubvsb@gmail.com';
    const pass = process.env.SMTP_PASS || 'yuiolashfehuyoow';
    const from = process.env.SMTP_FROM || 'electricalclubvsb@gmail.com';

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
    } catch (verifyErr: any) {
      res.status(400).json({ error: `SMTP Configuration failed: ${verifyErr.message}. Ensure you are using a Google App Password, not your standard Gmail password.` });
      return;
    }

    const mailOptions = {
      from,
      to: emails.join(', '),
      subject: `ElectroQuest Quiz Registration - Candidate ID: ${registration.candidateId}`,
      text: `Dear Participants,\n\nYour registration for the ElectroQuest Technical Quiz organized by the Electrical Club, EEE Department, V.S.B. Engineering College, Karur, has been successfully processed.\n\nHere are your login credentials:\n\nTeam Name: ${registration.teamName}\nCandidate ID: ${registration.candidateId}\n\nYou can use this Candidate ID to log in and take the quiz on the portal. Good luck!\n\nBest Regards,\nElectrical Club Organizing Committee`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #081B33;">ElectroQuest Registration Confirmed!</h2>
          <p>Dear Participants,</p>
          <p>Your registration for the <strong>ElectroQuest Technical Quiz</strong> has been successfully processed.</p>
          <p>Here are your access credentials for the competition:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f9f9f9; width: 150px;">Team Name</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${registration.teamName}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f9f9f9;">Candidate ID</td>
              <td style="padding: 8px; border: 1px solid #ddd; color: #00D4FF; font-weight: bold; font-size: 16px;">${registration.candidateId}</td>
            </tr>
          </table>
          <p style="color: #666; font-size: 13px;"><em>Note: Keep this Candidate ID secure. It is required to log in and begin the proctored quiz.</em></p>
          <br/>
          <p>Best Regards,</p>
          <p><strong>Electrical Club</strong><br/>Department of Electrical and Electronics Engineering<br/>V.S.B. Engineering College, Karur</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    await prisma.electroQuestRegistration.update({
      where: { id: registration.id },
      data: { isEmailSent: true },
    });

    res.status(200).json({ message: 'Email successfully resent!' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to resend email' });
  }
};
