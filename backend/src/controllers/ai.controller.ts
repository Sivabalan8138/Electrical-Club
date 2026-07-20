import { Request, Response } from 'express';
import OpenAI from 'openai';

// Seeding knowledge base for regex-based fallback bot
const CLUB_FAQ = [
  {
    keywords: ['register', 'how to register', 'join'],
    answer: 'To register, click the "Register Now" button on the Hero Section of the homepage. Select either "ElectroQuest" (online technical quiz) or "Think Big" (idea presentation) and fill out your team details.',
  },
  {
    keywords: ['electroquest', 'quiz', 'rules', 'mark', 'duration'],
    answer: 'ElectroQuest is an online technical quiz. It consists of 75 randomized questions spanning electrical, electronics, aptitude, logical reasoning, current technology, and AI. The duration is 75 minutes, with 1 mark per question (no negative marks). Complete camera, microphone, and browser proctoring are active.',
  },
  {
    keywords: ['think big', 'idea', 'presentation', 'domain'],
    answer: 'Think Big is an innovation and idea presentation competition. The domains are Healthcare Technology, Renewable Energy, Agriculture Technology, and Artificial Intelligence (AI). Teams of 2 to 4 members submit a PPT/PDF (max 50MB) which is evaluated by AI (70 marks) and an Admin panel (30 marks).',
  },
  {
    keywords: ['proctor', 'camera', 'microphone', 'warning', 'tab'],
    answer: 'Our AI proctoring monitors camera input (detecting face count, looking away) and microphone levels (detecting voice and noise). It also blocks right-click, copy-paste, and tab switches. A 3rd warning will trigger an auto-submit of your quiz.',
  },
  {
    keywords: ['certificate', 'download', 'qr'],
    answer: 'Certificates of participation are automatically generated and emailed to all registered team members upon completing the quiz (for ElectroQuest) or receiving admin approval (for Think Big). Each certificate contains a verification QR code.',
  },
  {
    keywords: ['contact', 'college', 'where', 'phone', 'email'],
    answer: 'Department of Electrical and Electronics Engineering, V.S.B. Engineering College, Karur - 639111, Tamil Nadu. Email: electricalclubvsb@gmail.com. Faculty Coordinator: Dr. A. EEE, Student Secretary: Student Secretary.',
  },
];

// Rich set of EEE/ECE projects for mock recommendation fallback
const PROJECT_BANK: Record<string, Array<{ title: string; objective: string; components: string[]; difficulty: string }>> = {
  IoT: [
    {
      title: 'IoT-Based Smart Energy Meter with Remote Bill Calculator',
      objective: 'Monitor power consumption in real-time and upload usage telemetry to the cloud for automatic billing and load cut-off on threshold violation.',
      components: ['ESP32 Wi-Fi module', 'PZEM-004T AC sensor', 'Solid-state relay', 'OLED Display', 'Blynk/ThingsSpeak cloud'],
      difficulty: 'Medium',
    },
    {
      title: 'Industrial Machine Health Checker using Vibration and Temperature Telemetry',
      objective: 'Track motor vibrations and operating temperatures to predict mechanical failure before breakdown happens.',
      components: ['Arduino Nano IoT', 'ADXL345 Accelerometer', 'MAX6675 Thermocouple', 'Wi-Fi gateway', 'AWS IoT Core'],
      difficulty: 'Hard',
    },
  ],
  'Embedded Systems': [
    {
      title: 'Microcontroller-Based Smart Grid Load Management System',
      objective: 'Distribute loads automatically among grids to prevent transformer overload during peak hours using smart relays.',
      components: ['PIC16F877A Microcontroller', 'Current Sensors (ACS712)', '16x2 LCD', '5V Relays', 'GSM module'],
      difficulty: 'Hard',
    },
    {
      title: 'Automatic Railway Gate Controller with Track Detection Sensors',
      objective: 'A safety system that detects oncoming trains using ultrasonic sensors and automatically closes the gate, warning drivers.',
      components: ['ATmega328P', 'HC-SR04 Ultrasonic sensors', 'Servo Motors', 'Buzzer', 'LED Indicators'],
      difficulty: 'Easy',
    },
  ],
  Robotics: [
    {
      title: 'Autonomous Solar Panel Cleaning Robot',
      objective: 'Travel along solar arrays automatically to scrub off dust and debris, maximizing light absorption efficiency.',
      components: ['Arduino Mega', 'Ultrasonic sensors', 'Geared DC Motors', 'Water spray pump', 'Microfiber rollers', 'LiPo Battery'],
      difficulty: 'Hard',
    },
    {
      title: 'Hand Gesture Controlled Robotic Arm for Hazardous Environments',
      objective: 'Mimic human hand movements captured by an MPU6050 sensor to control an industrial manipulator arm.',
      components: ['MPU6050 Gyro/Accelerometer', 'Arduino Uno (x2)', 'NRF24L01 RF module', 'MG996R Servos', 'Acrylic Arm Chassis'],
      difficulty: 'Medium',
    },
  ],
  'Renewable Energy': [
    {
      title: 'Hybrid Wind-Solar Power Management System with Battery Control',
      objective: 'Integrate a small wind turbine and solar panels with a charge controller that switches source dynamically to optimize battery life.',
      components: ['12V Solar panel', 'DIY Wind turbine alternator', 'MPPT Charge Controller', '12V Lead Acid battery', 'Arduino current logger'],
      difficulty: 'Hard',
    },
    {
      title: 'Dual-Axis Solar Tracker with LDR Sensors',
      objective: 'Rotate a solar panel in both horizontal and vertical directions tracking the sun to increase solar yield by 35%.',
      components: ['LDR Sensors (x4)', 'SG90 Servo motors (x2)', 'Arduino Uno', 'Mini Solar panel', '3D printed tracker bracket'],
      difficulty: 'Easy',
    },
  ],
  'Artificial Intelligence': [
    {
      title: 'AI-Powered Thermal Camera for Power Substation Fire Detection',
      objective: 'Analyze thermal imagery of transformer blocks using Edge AI to trigger warning alerts for abnormal hot spots.',
      components: ['Raspberry Pi 4', 'AMG8833 Thermal Camera Grid', 'TensorFlow Lite', 'Buzzer', 'HDMI display'],
      difficulty: 'Hard',
    },
    {
      title: 'Predictive Battery Health (SOH) Logger using Machine Learning',
      objective: 'Train a regression model to estimate battery state-of-health based on voltage discharge rates and cycles.',
      components: ['Arduino Uno', 'INA219 Current sensor', 'SD card module', 'Python Scikit-Learn script'],
      difficulty: 'Medium',
    },
  ],
  'EV Technology': [
    {
      title: 'Smart EV Battery Management System (BMS) with Temperature Cut-off',
      objective: 'Monitor cell balance, voltage, and thermal runaway thresholds in lithium-ion battery packs to ensure EV safety.',
      components: ['Arduino Mega', 'NTC 10K Thermistors (x4)', 'ACS712 Current sensor', 'Relay logic', '128x64 GLCD'],
      difficulty: 'Hard',
    },
    {
      title: 'Wireless Dynamic EV Charger Prototype',
      objective: 'Demonstrate inductive power transfer (wireless charging) from a primary copper coil underneath a track to a secondary coil inside the vehicle.',
      components: ['Inductive transmitter coil', 'Receiver coil & rectifier', 'Buck converter', 'DC Motor vehicle chassis'],
      difficulty: 'Hard',
    },
  ],
  'Smart Grid': [
    {
      title: 'Net Metering Controller for Grid-Tied Solar System',
      objective: 'Measure power fed to the grid versus power consumed from the grid, logging import/export statistics.',
      components: ['ESP8266', 'SCT-013 Current transformer', 'AC voltage transformer', '16x2 LCD display', 'ThingsSpeak Cloud'],
      difficulty: 'Medium',
    },
  ],
  'Power Electronics': [
    {
      title: 'Pure Sine Wave Inverter for Emergency Backups',
      objective: 'Convert 12V DC power from a battery to 230V AC using high-frequency SPWM gate drivers.',
      components: ['IRF3205 MOSFETs', 'EGS002 SPWM Driver board', 'Step-up Transformer', '12V Battery', 'LC filter circuit'],
      difficulty: 'Hard',
    },
  ],
};

// Chatbot API
export const handleAIChat = async (req: Request, res: Response): Promise<void> => {
  const { message } = req.body;

  try {
    if (!message) {
      res.status(400).json({ error: 'Message content is required' });
      return;
    }

    const openAiKey = process.env.OPENAI_API_KEY;
    if (openAiKey && openAiKey !== 'mock-key') {
      try {
        const openai = new OpenAI({ apiKey: openAiKey });
        const systemPrompt = `You are a helpful, enthusiastic AI Assistant representing the Electrical Club of the Department of Electrical and Electronics Engineering, V.S.B. Engineering College, Karur.
You answer questions about the events:
1. ElectroQuest (online technical quiz: 75 random questions, 75 mins, proctored).
2. Think Big (Idea Presentation: Healthcare, Renewable, Agri, AI domains, teams of 2-4, PPT upload).
Provide short, professional, and friendly answers. Include contact details if asked. Keep responses engaging and themed like modern electrical engineering.`;

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
          ],
        });

        res.status(200).json({ reply: response.choices[0].message?.content || 'I could not process your query.' });
        return;
      } catch (aiErr) {
        console.error('OpenAI chat failed, using local match:', aiErr);
      }
    }

    // Fallback logic
    const query = message.toLowerCase();
    let bestMatch = 'Thank you for reaching out to the Electrical Club! I can help you with registrations, event rules for ElectroQuest and Think Big, and proctoring. Could you specify your question?';

    for (const faq of CLUB_FAQ) {
      const match = faq.keywords.some((kw) => query.includes(kw));
      if (match) {
        bestMatch = faq.answer;
        break;
      }
    }

    res.status(200).json({ reply: bestMatch });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Chatbot request failed' });
  }
};

// Recommendation API
export const getProjectRecommendations = async (req: Request, res: Response): Promise<void> => {
  const { category, difficulty } = req.body; // category e.g. "IoT", "EV Technology" etc.

  try {
    const selectedCategory = category || 'IoT';
    const selectedDifficulty = difficulty || 'All';

    const openAiKey = process.env.OPENAI_API_KEY;
    if (openAiKey && openAiKey !== 'mock-key') {
      try {
        const openai = new OpenAI({ apiKey: openAiKey });
        const prompt = `Generate 3 innovative project ideas in the category of "${selectedCategory}" for EEE and ECE students. 
Difficulty level: ${selectedDifficulty}. 
Return the output strictly as a JSON array of objects with the fields:
[
  {
    "title": "Project Title",
    "objective": "Detailed objective of the project",
    "components": ["Component A", "Component B", "Component C"],
    "difficulty": "Easy/Medium/Hard"
  }
]`;

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        });

        const parsed = JSON.parse(response.choices[0].message?.content || '{}');
        const projects = Array.isArray(parsed) ? parsed : (parsed.projects || Object.values(parsed)[0]);

        if (Array.isArray(projects)) {
          res.status(200).json(projects);
          return;
        }
      } catch (aiErr) {
        console.error('OpenAI recommendation failed, using local bank:', aiErr);
      }
    }

    // Fallback logic
    const categoryProjects = PROJECT_BANK[selectedCategory] || PROJECT_BANK['IoT'];
    let filtered = categoryProjects;
    if (selectedDifficulty !== 'All') {
      filtered = categoryProjects.filter((p) => p.difficulty.toLowerCase() === selectedDifficulty.toLowerCase());
      if (filtered.length === 0) filtered = categoryProjects; // Default fallback to all if empty
    }

    res.status(200).json(filtered);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch recommendations' });
  }
};
