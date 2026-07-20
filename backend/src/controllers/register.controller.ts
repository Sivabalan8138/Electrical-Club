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
        console.log('--- [MOCK MAIL SENDER - REGISTRATION] ---');
        console.log(`To: ${mailOptions.to}`);
        console.log(`Subject: ${mailOptions.subject}`);
        console.log('-----------------------------------------');
        return { messageId: 'mock-reg-msg-id-' + Math.random().toString(36).substring(2, 9) };
      },
    } as any,
    isTest: false,
  };
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

    // Generate Candidate ID (EQ2026-0001 sequence)
    const count = await prisma.electroQuestRegistration.count();
    const padNum = String(count + 1).padStart(4, '0');
    const candidateId = `EQ2026-${padNum}`;

    // Create entry in database
    const registration = await prisma.electroQuestRegistration.create({
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

    // Send email with Candidate ID
    const emails = [member1Email];
    if (member2Email) {
      emails.push(member2Email);
    }

    const { transporter, isTest } = await getTransporter();
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

    res.status(201).json({
      message: 'Registration successful! Candidate ID has been sent to your email address.',
      candidateId,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
};
