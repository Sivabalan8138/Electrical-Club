import { Request, Response } from 'express';
import prisma from '../utils/db';

export const logViolation = async (req: Request, res: Response): Promise<void> => {
  const { registrationId } = (req as any).user;
  const { type, detail } = req.body;

  try {
    if (!type) {
      res.status(400).json({ error: 'Violation type is required' });
      return;
    }

    const attempt = await prisma.quizAttempt.findUnique({
      where: { registrationId },
    });

    if (!attempt) {
      res.status(404).json({ error: 'Quiz attempt not found.' });
      return;
    }

    if (attempt.status !== 'STARTED') {
      res.status(400).json({ error: 'Quiz is not active.' });
      return;
    }

    const warningNumber = attempt.violationsCount + 1;

    // Log the violation
    await prisma.proctoringViolation.create({
      data: {
        quizAttemptId: attempt.id,
        type,
        warningNumber,
        detail: detail || `Proctoring alert: ${type}`,
      },
    });

    // Update violations count
    const updatedAttempt = await prisma.quizAttempt.update({
      where: { registrationId },
      data: {
        violationsCount: warningNumber,
      },
    });

    let autoSubmitted = false;
    // 3rd Warning triggers Auto-Submit
    if (warningNumber >= 3) {
      await prisma.quizAttempt.update({
        where: { registrationId },
        data: {
          status: 'DISQUALIFIED',
          submittedAt: new Date(),
        },
      });
      autoSubmitted = true;
    }

    res.status(200).json({
      message: 'Violation logged',
      warningNumber,
      autoSubmitted,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to log violation' });
  }
};

// Admin retrieve live proctoring violations
export const getProctoringReports = async (req: Request, res: Response): Promise<void> => {
  try {
    const reports = await prisma.proctoringViolation.findMany({
      include: {
        quizAttempt: {
          include: {
            registration: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    const formattedReports = reports.map((r) => ({
      id: r.id,
      candidateId: r.quizAttempt.registration.candidateId,
      teamName: r.quizAttempt.registration.teamName,
      type: r.type,
      warningNumber: r.warningNumber,
      detail: r.detail,
      timestamp: r.timestamp,
    }));

    res.status(200).json(formattedReports);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch proctoring reports' });
  }
};
