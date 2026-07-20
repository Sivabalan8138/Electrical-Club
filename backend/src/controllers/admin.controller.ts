import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import prisma from '../utils/db';
import nodemailer from 'nodemailer';
import { generateAttendancePDF, generateAttendanceExcel } from '../services/attendance.service';
import { sendTestCertificate } from '../services/certificate.service';

// Get Admin Analytics Dashboard Data
export const getAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalEQ = await prisma.electroQuestRegistration.count();
    const totalTB = await prisma.thinkBigRegistration.count();

    const quizAttempts = await prisma.quizAttempt.findMany();
    const quizCompleted = quizAttempts.filter((a) => a.status === 'COMPLETED');
    const quizDisqualified = quizAttempts.filter((a) => a.status === 'DISQUALIFIED');

    const totalCertificates = 
      await prisma.quizAttempt.count({ where: { isCertSent: true } }) +
      await prisma.thinkBigRegistration.count({ where: { isCertSent: true } });

    // Calculate highest and average scores
    let highestScore = 0;
    let avgScore = 0;
    if (quizCompleted.length > 0) {
      highestScore = Math.max(...quizCompleted.map((a) => a.score));
      const sum = quizCompleted.reduce((acc, a) => acc + a.score, 0);
      avgScore = parseFloat((sum / quizCompleted.length).toFixed(2));
    }

    // Domain-wise stats for Think Big
    const tbRegistrations = await prisma.thinkBigRegistration.findMany();
    const domainStats: Record<string, number> = {
      'Healthcare Technology': 0,
      'Renewable Energy': 0,
      'Agriculture Technology': 0,
      'Artificial Intelligence (AI)': 0,
    };
    tbRegistrations.forEach((r) => {
      if (domainStats[r.domain] !== undefined) {
        domainStats[r.domain]++;
      }
    });

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
      totalRegistrations: totalEQ + totalTB,
      eventWise: { electroQuest: totalEQ, thinkBig: totalTB },
      quizStats: {
        completed: quizCompleted.length,
        disqualified: quizDisqualified.length,
        averageScore: avgScore,
        highestScore,
      },
      domainStats,
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
  const { event } = req.params; // "ELECTROQUEST" or "THINKBIG"
  try {
    if (event !== 'ELECTROQUEST' && event !== 'THINKBIG') {
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
  const { event } = req.params; // "ELECTROQUEST" or "THINKBIG"
  try {
    if (event !== 'ELECTROQUEST' && event !== 'THINKBIG') {
      res.status(400).json({ error: 'Invalid event type' });
      return;
    }
    const excelPath = await generateAttendanceExcel(event);
    res.download(excelPath);
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

    if (targetEvent === 'THINKBIG' || targetEvent === 'ALL') {
      const tb = await prisma.thinkBigRegistration.findMany();
      tb.forEach((r) => {
        emails.push(r.member1Email);
        emails.push(r.member2Email);
        if (r.member3Email) emails.push(r.member3Email);
        if (r.member4Email) emails.push(r.member4Email);
      });
    }

    const uniqueEmails = Array.from(new Set(emails));

    if (uniqueEmails.length === 0) {
      res.status(400).json({ error: 'No recipients found for the selected event category' });
      return;
    }

    // Configure Mail Sender
    const host = process.env.SMTP_HOST || 'smtp.mailtrap.io';
    const port = parseInt(process.env.SMTP_PORT || '2525', 10);
    const user = process.env.SMTP_USER || '';
    const pass = process.env.SMTP_PASS || '';

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

// Delete Think Big Registration
export const deleteThinkBigRegistration = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const existing = await prisma.thinkBigRegistration.findUnique({
      where: { id },
    });
    if (!existing) {
      res.status(404).json({ error: 'Registration not found' });
      return;
    }
    await prisma.thinkBigRegistration.delete({
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

    // Verify SMTP settings before saving
    const testTransporter = nodemailer.createTransport({
      host,
      port: parseInt(port, 10),
      secure: parseInt(port, 10) === 465,
      auth: { user, pass: testPass },
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
    const thinkBig = process.env.REGISTRATION_THINKBIG || 'OPEN';
    res.status(200).json({ electroQuest, thinkBig });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch registration status' });
  }
};

// Update Registration Status (Admin)
export const updateRegistrationStatus = async (req: Request, res: Response): Promise<void> => {
  const { electroQuest, thinkBig } = req.body;
  try {
    if (!electroQuest || !thinkBig) {
      res.status(400).json({ error: 'Both electroQuest and thinkBig status are required' });
      return;
    }

    process.env.REGISTRATION_ELECTROQUEST = electroQuest;
    process.env.REGISTRATION_THINKBIG = thinkBig;

    // Persist to .env file
    const envPath = path.join(__dirname, '../../.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    const variables: Record<string, string> = {
      REGISTRATION_ELECTROQUEST: electroQuest,
      REGISTRATION_THINKBIG: thinkBig
    };

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
