import { Request, Response } from 'express';
import prisma from '../utils/db';
import { generateCertificateAndEmail } from '../services/certificate.service';

// Hash a string to a numeric seed
function getSeedFromString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

// Seeded PRNG shuffler
function shuffleWithSeed<T>(array: T[], seed: number): T[] {
  const copy = [...array];
  let currentSeed = seed;
  for (let i = copy.length - 1; i > 0; i--) {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    const j = Math.floor((currentSeed / 233280) * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

// Start/Resume Quiz and get questions
export const getQuizQuestions = async (req: Request, res: Response): Promise<void> => {
  const { registrationId, candidateId } = (req as any).user;

  try {
    // 1. Get or create quiz attempt
    let attempt = await prisma.quizAttempt.findUnique({
      where: { registrationId },
    });

    if (!attempt) {
      attempt = await prisma.quizAttempt.create({
        data: {
          registrationId,
          status: 'STARTED',
          startedAt: new Date(),
        },
      });
    } else if (attempt.status === 'COMPLETED' || attempt.status === 'DISQUALIFIED') {
      res.status(403).json({ error: 'Quiz has already been completed.' });
      return;
    }

    // Check time remaining
    const startTime = new Date(attempt.startedAt).getTime();
    const elapsedMinutes = (Date.now() - startTime) / (60 * 1000);
    if (elapsedMinutes >= 70) {
      // Auto-submit
      await prisma.quizAttempt.update({
        where: { registrationId },
        data: { status: 'COMPLETED', submittedAt: new Date() },
      });
      res.status(403).json({ error: 'Quiz time (70 minutes) has expired.' });
      return;
    }

    // 2. Fetch all questions from the database
    const questions = await prisma.question.findMany();

    if (questions.length === 0) {
      res.status(400).json({ error: 'Question bank is empty. Please contact admin.' });
      return;
    }

    // 3. Shuffle using seeded RNG based on candidate ID
    const seed = getSeedFromString(candidateId);
    const shuffledQuestions = shuffleWithSeed(questions, seed);

    // Limit to 50 questions
    const finalQuestions = shuffledQuestions.slice(0, 50);

    // 4. Map questions to hide correct answer and shuffle options
    const formattedQuestions = finalQuestions.map((q, idx) => {
      // Shuffle option order deterministic for this candidate ID + question index
      const optSeed = seed + idx;
      const options = [
        { label: 'A', text: q.optionA },
        { label: 'B', text: q.optionB },
        { label: 'C', text: q.optionC },
        { label: 'D', text: q.optionD },
      ];
      const shuffledOpts = shuffleWithSeed(options, optSeed);

      return {
        id: q.id,
        category: q.category,
        text: q.text,
        options: shuffledOpts.map((o) => ({ originalLabel: o.label, text: o.text })),
      };
    });

    res.status(200).json({
      timeRemaining: Math.max(0, 70 - elapsedMinutes), // in minutes
      questions: formattedQuestions,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch questions' });
  }
};

// Submit Quiz Answers
export const submitQuiz = async (req: Request, res: Response): Promise<void> => {
  const { registrationId } = (req as any).user;
  const { answers } = req.body; // Array of { questionId: string, selectedLabel: string }

  try {
    const attempt = await prisma.quizAttempt.findUnique({
      where: { registrationId },
      include: { registration: true },
    });

    if (!attempt) {
      res.status(404).json({ error: 'Quiz attempt not found.' });
      return;
    }

    if (attempt.status === 'COMPLETED' || attempt.status === 'DISQUALIFIED') {
      res.status(403).json({ error: 'Quiz already submitted.' });
      return;
    }

    const endTime = new Date();
    const startTime = new Date(attempt.startedAt);
    const timeTaken = Math.min(70, (endTime.getTime() - startTime.getTime()) / (60 * 1000));

    // Calculate score
    const questions = await prisma.question.findMany({
      where: { id: { in: answers.map((a: any) => a.questionId) } },
    });

    let score = 0;
    const answerMap = new Map(answers.map((a: any) => [a.questionId, a.selectedLabel]));

    questions.forEach((q) => {
      const selected = answerMap.get(q.id);
      if (selected === q.correctAnswer) {
        score += 1;
      }
    });

    const totalQuestionsAsked = Math.min(50, questions.length || 50);
    const percentage = parseFloat(((score / totalQuestionsAsked) * 100).toFixed(2));

    // Save attempt
    const updatedAttempt = await prisma.quizAttempt.update({
      where: { registrationId },
      data: {
        score,
        percentage,
        timeTaken,
        submittedAt: endTime,
        status: 'COMPLETED',
      },
    });

    // Fire-and-forget: Generate certificate PDF & email it to the candidate
    // Wrap in try-catch so it doesn't crash the submit route if mail/pdf fails
    try {
      generateCertificateAndEmail(attempt.registration.id).catch((err) => {
        console.error('Failed to generate/email certificate on submit:', err);
      });
    } catch (certErr) {
      console.error(certErr);
    }

    res.status(200).json({
      message: 'Quiz submitted successfully',
      score,
      percentage,
      timeTaken,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to submit quiz' });
  }
};

// Get Top Leaderboard
export const getLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const attempts = await prisma.quizAttempt.findMany({
      where: { status: 'COMPLETED' },
      include: { registration: true },
      orderBy: [
        { score: 'desc' },
        { timeTaken: 'asc' }, // faster completion wins tie
      ],
      take: 50,
    });

    const leaderboard = attempts.map((a, idx) => ({
      rank: idx + 1,
      teamName: a.registration.teamName,
      candidateId: a.registration.candidateId,
      department: a.registration.member1Department,
      score: a.score,
      percentage: a.percentage,
      timeTaken: parseFloat(a.timeTaken.toFixed(2)),
    }));

    res.status(200).json(leaderboard);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load leaderboard' });
  }
};
