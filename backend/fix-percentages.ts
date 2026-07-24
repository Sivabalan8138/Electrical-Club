import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixPercentages() {
  const attempts = await prisma.quizAttempt.findMany();
  for (const attempt of attempts) {
    if (attempt.score !== null) {
      const correctPercentage = parseFloat(((attempt.score / 50) * 100).toFixed(2));
      if (attempt.percentage !== correctPercentage) {
        await prisma.quizAttempt.update({
          where: { id: attempt.id },
          data: { percentage: correctPercentage }
        });
        console.log(`Updated attempt ${attempt.id} from ${attempt.percentage}% to ${correctPercentage}%`);
      }
    }
  }
  console.log("All quiz percentages fixed.");
}

fixPercentages().catch(console.error).finally(() => prisma.$disconnect());
