import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // 1. Seed Default Admin
  const adminUsername = 'ELECTRICALCLUB-105';
  const passwordHash = await bcrypt.hash('vsb105club', 10);
  
  await prisma.admin.upsert({
    where: { username: adminUsername },
    update: { passwordHash },
    create: {
      username: adminUsername,
      passwordHash,
      isFirstLogin: false,
    },
  });
  console.log('Seeded default admin account: ELECTRICALCLUB-105 / vsb105club');

  // 2. Seed Sample Questions
  const existingQuestionsCount = await prisma.question.count();
  if (existingQuestionsCount === 0) {
    const sampleQuestions = [
      {
        category: 'Electrical Engineering',
        text: 'What is the unit of electrical conductivity?',
        optionA: 'Ohm',
        optionB: 'Siemens',
        optionC: 'Farad',
        optionD: 'Henry',
        correctAnswer: 'B',
      },
      {
        category: 'Electrical Engineering',
        text: 'Which law states that the total current entering a junction equals the total current leaving it?',
        optionA: "Ohm's Law",
        optionB: "Kirchhoff's Current Law (KCL)",
        optionC: "Kirchhoff's Voltage Law (KVL)",
        optionD: "Lenz's Law",
        correctAnswer: 'B',
      },
      {
        category: 'Electronics Engineering',
        text: 'Which semiconductor device is primarily used as a voltage regulator?',
        optionA: 'Zener Diode',
        optionB: 'LED',
        optionC: 'Tunnel Diode',
        optionD: 'Schottky Diode',
        correctAnswer: 'A',
      },
      {
        category: 'Electronics Engineering',
        text: 'In an NPN transistor, what constitutes the majority carriers in the emitter?',
        optionA: 'Holes',
        optionB: 'Electrons',
        optionC: 'Protons',
        optionD: 'Positrons',
        correctAnswer: 'B',
      },
      {
        category: 'Aptitude',
        text: 'A train 120 meters long passes a telegraph post in 6 seconds. What is the speed of the train in km/h?',
        optionA: '60 km/h',
        optionB: '72 km/h',
        optionC: '80 km/h',
        optionD: '90 km/h',
        correctAnswer: 'B',
      },
      {
        category: 'Aptitude',
        text: 'If 15 men can complete a project in 6 days, how many days will it take 10 men to complete the same work?',
        optionA: '8 days',
        optionB: '9 days',
        optionC: '10 days',
        optionD: '12 days',
        correctAnswer: 'B',
      },
      {
        category: 'Logical Reasoning',
        text: 'Which word does NOT belong with the others? (Tyre, Steering Wheel, Engine, Car)',
        optionA: 'Tyre',
        optionB: 'Steering Wheel',
        optionC: 'Car',
        optionD: 'Engine',
        correctAnswer: 'C', // Car represents the whole, others are parts
      },
      {
        category: 'Logical Reasoning',
        text: 'Look at this series: 2, 1, (1/2), (1/4), ... What number should come next?',
        optionA: '(1/3)',
        optionB: '(1/8)',
        optionC: '(2/8)',
        optionD: '(1/16)',
        correctAnswer: 'B',
      },
      {
        category: 'Current Technology',
        text: 'Which protocol is commonly used to transfer data securely over the web?',
        optionA: 'HTTP',
        optionB: 'FTP',
        optionC: 'HTTPS',
        optionD: 'SMTP',
        correctAnswer: 'C',
      },
      {
        category: 'Current Technology',
        text: 'What type of battery technology is most commonly used in modern electric vehicles?',
        optionA: 'Lead-Acid',
        optionB: 'Nickel-Cadmium',
        optionC: 'Lithium-Ion',
        optionD: 'Solid-State Zinc',
        correctAnswer: 'C',
      },
      {
        category: 'AI and Emerging Technologies',
        text: 'What does LLM stand for in the context of Artificial Intelligence?',
        optionA: 'Logical Learning Model',
        optionB: 'Large Language Model',
        optionC: 'Linear Machine Learning',
        optionD: 'Latency Logic Module',
        correctAnswer: 'B',
      },
      {
        category: 'AI and Emerging Technologies',
        text: 'Which AI concept refers to training models on large sets of unlabeled data to find hidden patterns?',
        optionA: 'Supervised Learning',
        optionB: 'Unsupervised Learning',
        optionC: 'Reinforcement Learning',
        optionD: 'Linear Regression',
        correctAnswer: 'B',
      },
    ];

    await prisma.question.createMany({
      data: sampleQuestions,
    });
    console.log(`Seeded ${sampleQuestions.length} sample quiz questions.`);
  } else {
    console.log('Question bank is already seeded.');
  }

  // 3. Seed Sample Certificates
  const sampleCertIdEQ = 'EQ-CERT-SAMPLE-105';

  const existingCertEQ = await prisma.quizAttempt.findFirst({
    where: { certificateId: sampleCertIdEQ },
  });

  if (!existingCertEQ) {
    // Create ElectroQuest sample registration
    await prisma.electroQuestRegistration.create({
      data: {
        teamName: 'Tesla Innovators',
        candidateId: 'EQ2026-9999',
        member1Name: 'John Doe',
        member1RegisterNumber: 'VSB-EQ-9999',
        member1Department: 'EEE',
        member1Year: 'Third Year',
        member1Email: 'john.doe@vsb.edu.in',
        member1MobileNumber: '9876543210',
        isEmailSent: true,
        quizAttempt: {
          create: {
            score: 65,
            percentage: 86.67,
            timeTaken: 45.5,
            status: 'COMPLETED',
            isCertSent: true,
            certificateId: sampleCertIdEQ,
            submittedAt: new Date(),
          },
        },
      },
    });
    console.log(`Seeded ElectroQuest sample certificate: ${sampleCertIdEQ}`);
  }


  console.log('Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
