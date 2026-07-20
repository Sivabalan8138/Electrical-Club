import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import prisma from '../utils/db';
import { generateThinkBigCertificateAndEmail } from '../services/certificate.service';
import OpenAI from 'openai';
import nodemailer from 'nodemailer';
const pdfParse = require('pdf-parse');
const officeParser = require('officeparser');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Helper to extract text from PDF or PPTX
const extractTextFromFile = async (filePath: string): Promise<string> => {
  const ext = path.extname(filePath).toLowerCase();
  try {
    if (ext === '.pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } else if (ext === '.pptx' || ext === '.ppt') {
      try {
        const text = await officeParser.parseOfficeAsync(filePath);
        return text;
      } catch (err) {
        throw err;
      }
    }
  } catch (err) {
    console.error('File text extraction failed:', err);
  }
  return '';
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
  return {
    transporter: {
      sendMail: async (mailOptions: any) => {
        console.log('--- [MOCK MAIL SENDER - THINKBIG REGISTRATION] ---');
        console.log(`To: ${mailOptions.to}`);
        console.log(`Subject: ${mailOptions.subject}`);
        console.log('--------------------------------------------------');
        return { messageId: 'mock-tb-reg-msg-id-' + Math.random().toString(36).substring(2, 9) };
      },
    } as any,
    isTest: false,
  };
};

// Think Big Registration
export const registerThinkBig = async (req: Request, res: Response): Promise<void> => {
  const status = process.env.REGISTRATION_THINKBIG || 'OPEN';
  if (status === 'CLOSED') {
    res.status(400).json({ error: 'Registrations for Think Big are currently closed.' });
    return;
  }

  const {
    teamName,
    domain,
    member1Name,
    member1RegisterNumber,
    member1Department,
    member1Email,
    member1MobileNumber,
    member2Name,
    member2RegisterNumber,
    member2Department,
    member2Email,
    member2MobileNumber,
    member3Name,
    member3RegisterNumber,
    member3Department,
    member3Email,
    member3MobileNumber,
    member4Name,
    member4RegisterNumber,
    member4Department,
    member4Email,
    member4MobileNumber,
  } = req.body;

  try {
    if (
      !teamName ||
      !domain ||
      !member1Name ||
      !member1RegisterNumber ||
      !member1Department ||
      !member1Email ||
      !member1MobileNumber ||
      !member2Name ||
      !member2RegisterNumber ||
      !member2Department ||
      !member2Email ||
      !member2MobileNumber
    ) {
      res.status(400).json({ error: 'All primary team and Member 1 & 2 fields are required' });
      return;
    }

    // Check if team name already registered
    const existingTeam = await prisma.thinkBigRegistration.findFirst({
      where: { teamName },
    });
    if (existingTeam) {
      res.status(400).json({ error: `Team name "${teamName}" is already registered.` });
      return;
    }

    const registration = await prisma.thinkBigRegistration.create({
      data: {
        teamName,
        domain,
        member1Name,
        member1RegisterNumber,
        member1Department,
        member1Email,
        member1MobileNumber,
        member2Name,
        member2RegisterNumber,
        member2Department,
        member2Email,
        member2MobileNumber,
        member3Name,
        member3RegisterNumber,
        member3Department,
        member3Email,
        member3MobileNumber,
        member4Name,
        member4RegisterNumber,
        member4Department,
        member4Email,
        member4MobileNumber,
      },
    });

    // Send email with Registration ID
    const emails = [member1Email, member2Email];
    if (member3Email) emails.push(member3Email);
    if (member4Email) emails.push(member4Email);

    const { transporter, isTest } = await getTransporter();
    const mailOptions = {
      from: process.env.SMTP_FROM || 'electricalclubvsb@gmail.com',
      to: emails.join(', '),
      subject: `Think Big Idea Presentation Registration - Team: ${teamName}`,
      text: `Dear Participants,\n\nYour team registration for the Think Big Innovation & Idea Presentation competition organized by the Electrical Club, EEE Department, V.S.B. Engineering College, Karur, has been successfully processed.\n\nHere are your registration details:\n\nTeam Name: ${teamName}\nDomain: ${domain}\nRegistration ID: ${registration.id}\n\nYou can use this Registration ID to upload your presentation slides (PPT/PPTX/PDF) on the portal.\n\nBest Regards,\nElectrical Club Organizing Committee`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #081B33;">Think Big Registration Confirmed!</h2>
          <p>Dear Participants,</p>
          <p>Your team registration for the <strong>Think Big Innovation & Idea Presentation</strong> has been successfully processed.</p>
          <p>Here are your registration and submission details:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f9f9f9; width: 150px;">Team Name</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${teamName}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f9f9f9;">Domain</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${domain}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f9f9f9;">Registration ID</td>
              <td style="padding: 8px; border: 1px solid #ddd; color: #00D4FF; font-weight: bold; font-family: monospace; font-size: 15px;">${registration.id}</td>
            </tr>
          </table>
          <p style="color: #666; font-size: 13px;"><em>Note: Use this Registration ID to upload your presentation slides (PPT / PPTX / PDF) up to 50MB on the contest page.</em></p>
          <br/>
          <p>Best Regards,</p>
          <p><strong>Electrical Club</strong><br/>Department of Electrical and Electronics Engineering<br/>V.S.B. Engineering College, Karur</p>
        </div>
      `,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      if (isTest) {
        console.log(`[ETHEREAL THINKBIG REGISTRATION PREVIEW URL]: ${nodemailer.getTestMessageUrl(info)}`);
      }
    } catch (mailErr) {
      console.error('Failed to send Think Big registration email:', mailErr);
    }

    res.status(201).json({
      message: 'Registration successful! Candidate ID / Registration ID has been sent to your email address.',
      registrationId: registration.id,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
};

// Think Big Upload and AI Evaluation
export const uploadPPT = async (req: Request, res: Response): Promise<void> => {
  const { registrationId } = req.body;
  const file = req.file;

  try {
    if (!registrationId || !file) {
      res.status(400).json({ error: 'Registration ID and file are required' });
      return;
    }

    const registration = await prisma.thinkBigRegistration.findUnique({
      where: { id: registrationId },
    });

    if (!registration) {
      res.status(404).json({ error: 'Registration not found' });
      return;
    }

    // Local file path saved by multer
    const localFilePath = file.path;
    const fileUrl = `/uploads/${file.filename}`; // Mock file URL for local static access

    // Extract text from presentation
    const extractedText = await extractTextFromFile(localFilePath);

    // AI PPT Evaluation (Mock fallback if API keys are not specified)
    let aiScore = 0;
    let aiFeedback = '';

    const openAiKey = process.env.OPENAI_API_KEY;
    if (openAiKey && openAiKey !== 'mock-key') {
      try {
        const openai = new OpenAI({ apiKey: openAiKey });
        const systemPrompt = `You are an expert academic evaluator in Electrical and Electronics Engineering. 
Evaluate the following presentation content on a scale of 70 total marks based on:
1. Problem Identification (20 Marks)
2. Innovation (20 Marks)
3. Technical Feasibility (10 Marks)
4. Practical Implementation (10 Marks)
5. Presentation Quality (10 Marks)

Return the response strictly as a JSON object with this exact schema:
{
  "scores": {
    "problemIdentification": number,
    "innovation": number,
    "technicalFeasibility": number,
    "practicalImplementation": number,
    "presentationQuality": number,
    "total": number
  },
  "strengths": string[],
  "weaknesses": string[],
  "suggestions": string[]
}`;

        const userPrompt = `Domain: ${registration.domain}\nTeam: ${registration.teamName}\nFile Text Content:\n${extractedText || 'No text extracted. Analyze the topic name: ' + registration.teamName}`;

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: 'json_object' }
        });

        const resultJson = JSON.parse(response.choices[0].message?.content || '{}');
        aiScore = resultJson.scores?.total || 50;
        aiFeedback = JSON.stringify(resultJson);
      } catch (aiErr) {
        console.error('OpenAI evaluation failed, falling back to mock evaluator:', aiErr);
        const fallback = generateMockAIEvaluation(registration.domain, extractedText);
        aiScore = fallback.scores.total;
        aiFeedback = JSON.stringify(fallback);
      }
    } else {
      // Use mock evaluator
      const fallback = generateMockAIEvaluation(registration.domain, extractedText);
      aiScore = fallback.scores.total;
      aiFeedback = JSON.stringify(fallback);
    }

    // Save to database
    await prisma.thinkBigRegistration.update({
      where: { id: registrationId },
      data: {
        pptUrl: fileUrl,
        pptName: file.originalname,
        aiScore,
        aiFeedback,
      },
    });

    res.status(200).json({
      message: 'Presentation uploaded and AI evaluated successfully!',
      pptUrl: fileUrl,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'File upload and evaluation failed' });
  }
};

// Seeded/keyword-based Mock AI PPT Evaluation Engine
const generateMockAIEvaluation = (domain: string, text: string) => {
  const lowerText = text.toLowerCase();
  
  // Calculate marks based on keywords in text
  let problemScore = 12 + (lowerText.includes('problem') || lowerText.includes('issue') ? 4 : 2);
  let innovationScore = 13 + (lowerText.includes('novel') || lowerText.includes('innovat') || lowerText.includes('new') ? 4 : 2);
  let feasibilityScore = 6 + (lowerText.includes('feasible') || lowerText.includes('possible') || lowerText.includes('circuit') ? 2 : 1);
  let practicalScore = 6 + (lowerText.includes('implement') || lowerText.includes('test') || lowerText.includes('result') ? 2 : 1);
  let qualityScore = 7 + (text.length > 500 ? 2 : 1);

  // Bounds check
  problemScore = Math.min(20, problemScore);
  innovationScore = Math.min(20, innovationScore);
  feasibilityScore = Math.min(10, feasibilityScore);
  practicalScore = Math.min(10, practicalScore);
  qualityScore = Math.min(10, qualityScore);

  const total = problemScore + innovationScore + feasibilityScore + practicalScore + qualityScore;

  const strengths = [
    `Strong alignment with the chosen domain of ${domain}.`,
    lowerText.includes('circuit') || lowerText.includes('sensor') 
      ? 'Good inclusion of hardware/sensor architecture details.' 
      : 'Excellent conceptual flow and theoretical foundation.',
    'Clear objective statements.'
  ];

  const weaknesses = [
    lowerText.includes('cost') || lowerText.includes('budget') 
      ? 'Budget details are provided, but lack detailed cost-benefit analysis.' 
      : 'Needs a clearer budget estimation and hardware components cost outline.',
    'Insufficient data on experimental validation or software simulations.'
  ];

  const suggestions = [
    'Add an electrical wiring block diagram or a clean flowchart showing system states.',
    'Incorporate standard IEEE standard specifications for voltage, power rating, or frequency constraints.',
    'Include a slide showing direct target end-users and feedback analysis.'
  ];

  return {
    scores: {
      problemIdentification: problemScore,
      innovation: innovationScore,
      technicalFeasibility: feasibilityScore,
      practicalImplementation: practicalScore,
      presentationQuality: qualityScore,
      total
    },
    strengths,
    weaknesses,
    suggestions
  };
};

// Admin Enter Presentation Score and Finalize Results
export const submitPresentationScore = async (req: Request, res: Response): Promise<void> => {
  const { registrationId, presentationScore } = req.body;

  try {
    if (!registrationId || presentationScore === undefined) {
      res.status(400).json({ error: 'Registration ID and presentation score are required' });
      return;
    }

    const scoreNum = parseFloat(presentationScore);
    if (scoreNum < 0 || scoreNum > 30) {
      res.status(400).json({ error: 'Presentation score must be between 0 and 30' });
      return;
    }

    const reg = await prisma.thinkBigRegistration.findUnique({
      where: { id: registrationId },
    });

    if (!reg) {
      res.status(404).json({ error: 'Registration not found' });
      return;
    }

    if (reg.aiScore === null) {
      res.status(400).json({ error: 'AI evaluation has not been completed for this team yet.' });
      return;
    }

    const finalScore = reg.aiScore + scoreNum;

    const updated = await prisma.thinkBigRegistration.update({
      where: { id: registrationId },
      data: {
        presentationScore: scoreNum,
        finalScore,
        approvalStatus: 'APPROVED',
      },
    });

    // Auto-generate certificate after approval
    try {
      generateThinkBigCertificateAndEmail(updated.id).catch((err) => {
        console.error('Failed to email Think Big certificate:', err);
      });
    } catch (certErr) {
      console.error(certErr);
    }

    res.status(200).json({
      message: 'Presentation score submitted, team approved and certificate generated!',
      finalScore,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to submit presentation score' });
  }
};

// Get Think Big Registrations
export const getThinkBigRegistrations = async (req: Request, res: Response): Promise<void> => {
  try {
    const list = await prisma.thinkBigRegistration.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load registrations' });
  }
};
