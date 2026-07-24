import { Request, Response } from 'express';
import prisma from '../utils/db';
import nodemailer from 'nodemailer';

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

  const cleanHost = host.trim();
  const cleanUser = user.trim();
  const cleanPass = pass.trim();

  const transporter = nodemailer.createTransport({
    host: cleanHost,
    port,
    secure: port === 465,
    auth: { user: cleanUser, pass: cleanPass },
    connectionTimeout: 10000,
    tls: { rejectUnauthorized: false }
  });

  // Skip verification to improve response time
  return { transporter, isTest: false };
};

const getEtherealTransporter = async () => {
  const testAccount = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: testAccount.user, // generated ethereal user
      pass: testAccount.pass, // generated ethereal password
    },
  });
  return { transporter, isTest: true };
};

export const registerElectroQuest = async (req: Request, res: Response): Promise<void> => {
  const status = process.env.REGISTRATION_ELECTROQUEST || 'OPEN';
  if (status === 'CLOSED') {
    res.status(400).json({ error: 'Registrations for ElectroQuest are currently closed.' });
    return;
  }

  const {
    teamName,
    member1Name,
    member1RegisterNumber,
    member1Department,
    member1Year,
    member1Email,
    member1MobileNumber,
    member2Name,
    member2RegisterNumber,
    member2Department,
    member2Year,
    member2Email,
    member2MobileNumber,
  } = req.body;

  try {
    if (
      !teamName ||
      !member1Name ||
      !member1RegisterNumber ||
      !member1Department ||
      !member1Year ||
      !member1Email ||
      !member1MobileNumber
    ) {
      res.status(400).json({ error: 'Primary team name and Member 1 fields are required' });
      return;
    }

    // Check if team name already exists
    const existingTeamName = await prisma.electroQuestRegistration.findFirst({
      where: { teamName },
    });
    if (existingTeamName) {
      res.status(400).json({ error: `Team name "${teamName}" is already registered.` });
      return;
    }

    // Check if member 1 is already registered
    const existingMember1 = await prisma.electroQuestRegistration.findFirst({
      where: {
        OR: [
          { member1RegisterNumber },
          { member2RegisterNumber: member1RegisterNumber },
        ],
      },
    });
    if (existingMember1) {
      res.status(400).json({ error: `Register Number "${member1RegisterNumber}" is already registered.` });
      return;
    }

    // Check if member 2 is already registered (if provided)
    if (member2RegisterNumber) {
      const existingMember2 = await prisma.electroQuestRegistration.findFirst({
        where: {
          OR: [
            { member1RegisterNumber: member2RegisterNumber },
            { member2RegisterNumber },
          ],
        },
      });
      if (existingMember2) {
        res.status(400).json({ error: `Register Number "${member2RegisterNumber}" is already registered.` });
        return;
      }
    }

    // Generate Candidate ID (EQ2026-0001 sequence) and create entry with retry logic
    let candidateId = '';
    let registration;
    let attempts = 0;
    const maxAttempts = 5;

    const lastRegistration = await prisma.electroQuestRegistration.findFirst({
      orderBy: { candidateId: 'desc' },
    });

    let baseNum = 1;
    if (lastRegistration && lastRegistration.candidateId) {
      const match = lastRegistration.candidateId.match(/EQ2026-(\d+)/);
      if (match && match[1]) {
        baseNum = parseInt(match[1], 10) + 1;
      } else {
        const count = await prisma.electroQuestRegistration.count();
        baseNum = count + 1;
      }
    }

    while (attempts < maxAttempts) {
      try {
        const currentNum = baseNum + attempts;
        const padNum = String(currentNum).padStart(4, '0');
        candidateId = `EQ2026-${padNum}`;

        registration = await prisma.electroQuestRegistration.create({
          data: {
            teamName,
            candidateId,
            member1Name,
            member1RegisterNumber,
            member1Department,
            member1Year,
            member1Email,
            member1MobileNumber,
            member2Name,
            member2RegisterNumber,
            member2Department,
            member2Year,
            member2Email,
            member2MobileNumber,
          },
        });
        break; // Success
      } catch (error: any) {
        if (error.code === 'P2002' && error.meta?.target?.includes('candidateId')) {
          attempts++;
          if (attempts >= maxAttempts) {
            throw new Error('System is busy registering another team. Please try submitting again.');
          }
        } else {
          throw error;
        }
      }
    }

    if (!registration) {
      throw new Error('Failed to create registration.');
    }

    // Send successful response immediately
    res.status(201).json({
      message: 'Registration successful! Candidate ID has been sent to your email address.',
      candidateId,
    });

    // Send email with Candidate ID in the background (fire and forget)
    const emails = [member1Email];
    if (member2Email) {
      emails.push(member2Email);
    }

    getTransporter().then(async ({ transporter, isTest }) => {
      try {
        const mailOptions = {
          from: process.env.SMTP_FROM || 'electricalclubvsb@gmail.com',
          to: emails.join(', '),
          subject: `ElectroQuest Quiz Registration - Candidate ID: ${candidateId}`,
          text: `Dear Participants,\n\nYour registration for the ElectroQuest Technical Quiz organized by the Electrical Club, EEE Department, V.S.B. Engineering College, Karur, has been successfully processed.\n\nHere are your login credentials:\n\nTeam Name: ${teamName}\nCandidate ID: ${candidateId}\n\nYou can use this Candidate ID to log in and take the quiz on the portal. Good luck!\n\nBest Regards,\nElectrical Club Organizing Committee`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
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
          `,
        };

        const info = await transporter.sendMail(mailOptions);
        if (isTest) {
          console.log(`[ETHEREAL REGISTRATION PREVIEW URL]: ${nodemailer.getTestMessageUrl(info)}`);
        }
        
        // Mark email as sent
        await prisma.electroQuestRegistration.update({
          where: { id: registration.id },
          data: { isEmailSent: true },
        });
      } catch (mailError: any) {
        console.error(`[BACKGROUND MAIL ERROR] Failed to send registration email to ${emails.join(', ')}:`, mailError);
      }
    }).catch(err => {
      console.error(`[BACKGROUND MAIL ERROR] Failed to initialize SMTP transporter:`, err);
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
};
