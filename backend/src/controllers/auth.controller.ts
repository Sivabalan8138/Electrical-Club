import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../utils/db';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key-12345';

// Admin login
export const adminLogin = async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    let admin = await prisma.admin.findUnique({
      where: { username },
    });

    // Seed default admin on-the-fly if not found
    if (!admin && username === 'ELECTRICALCLUB-105') {
      const passwordHash = await bcrypt.hash('vsb105club', 10);
      admin = await prisma.admin.create({
        data: {
          username: 'ELECTRICALCLUB-105',
          passwordHash,
          isFirstLogin: true,
        },
      });
    }

    if (!admin) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, admin.passwordHash);
    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    const token = jwt.sign(
      { userId: admin.id, role: 'admin', username: admin.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      isFirstLogin: admin.isFirstLogin,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Login failed' });
  }
};

// Admin reset password (forced on first login)
export const adminResetPassword = async (req: Request, res: Response): Promise<void> => {
  const { newPassword } = req.body;
  const adminId = (req as any).user?.userId;

  try {
    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.admin.update({
      where: { id: adminId },
      data: {
        passwordHash,
        isFirstLogin: false,
      },
    });

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Password update failed' });
  }
};

// Candidate login using Candidate ID (e.g. EQ2026-0001)
export const candidateLogin = async (req: Request, res: Response): Promise<void> => {
  const { candidateId } = req.body;

  try {
    if (!candidateId) {
      res.status(400).json({ error: 'Candidate ID is required' });
      return;
    }

    const registration = await prisma.electroQuestRegistration.findUnique({
      where: { candidateId },
    });

    if (!registration) {
      res.status(404).json({ error: 'Candidate ID not found. Please register first.' });
      return;
    }

    // Check if they already completed the quiz
    const attempt = await prisma.quizAttempt.findUnique({
      where: { registrationId: registration.id },
    });

    if (attempt && (attempt.status === 'COMPLETED' || attempt.status === 'DISQUALIFIED')) {
      res.status(403).json({
        error: 'Quiz already submitted.',
        status: attempt.status,
        score: attempt.score,
      });
      return;
    }

    // Create token for the candidate
    const token = jwt.sign(
      {
        registrationId: registration.id,
        candidateId: registration.candidateId,
        teamName: registration.teamName,
        role: 'candidate',
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      teamName: registration.teamName,
      candidateId: registration.candidateId,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Authentication failed' });
  }
};
