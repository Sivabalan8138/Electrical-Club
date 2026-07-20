import { Request, Response } from 'express';
import prisma from '../utils/db';

export const verifyCertificate = async (req: Request, res: Response): Promise<void> => {
  const { certId } = req.params;

  try {
    if (!certId) {
      res.status(400).json({ error: 'Certificate ID is required' });
      return;
    }

    // 1. Search in ElectroQuest
    const eqAttempt = await prisma.quizAttempt.findFirst({
      where: { certificateId: certId, isCertSent: true },
      include: { registration: true },
    });

    if (eqAttempt) {
      const name = eqAttempt.registration.member2Name
        ? `${eqAttempt.registration.member1Name} & ${eqAttempt.registration.member2Name}`
        : eqAttempt.registration.member1Name;

      res.status(200).json({
        valid: true,
        participantName: name,
        eventName: 'ElectroQuest (Technical Quiz)',
        certificateNumber: certId,
        verificationStatus: 'Verified & Authentic',
        eventDate: eqAttempt.submittedAt ? new Date(eqAttempt.submittedAt).toLocaleDateString() : 'N/A',
        details: `Score: ${eqAttempt.score}/75 | Percentage: ${eqAttempt.percentage}%`,
      });
      return;
    }

    // 2. Search in Think Big
    const tbReg = await prisma.thinkBigRegistration.findFirst({
      where: { certificateId: certId, isCertSent: true },
    });

    if (tbReg) {
      const teamMembersList = [
        tbReg.member1Name,
        tbReg.member2Name,
        tbReg.member3Name,
        tbReg.member4Name,
      ].filter(Boolean);

      res.status(200).json({
        valid: true,
        participantName: teamMembersList.join(', '),
        eventName: `Think Big Idea Presentation (${tbReg.domain})`,
        certificateNumber: certId,
        verificationStatus: 'Verified & Authentic',
        eventDate: new Date(tbReg.createdAt).toLocaleDateString(),
        details: `Team Name: ${tbReg.teamName} | Final Score: ${tbReg.finalScore}/100`,
      });
      return;
    }

    res.status(404).json({
      valid: false,
      verificationStatus: 'Invalid or Unissued Certificate',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Verification failed' });
  }
};
