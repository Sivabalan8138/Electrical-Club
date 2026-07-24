import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import multer from 'multer';
import fs from 'fs';

// Load environment variables
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend requests
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://127.0.0.1',
  'http://127.0.0.2',
  'http://student.electricalclub.local',
  'http://admin.electricalclub.local',
  'http://electricalclub-student.com',
  'http://electricalclub-admin.com',
  'http://electrical-club-student-portal',
  'http://electrical-club-student-portal:3000',
  'http://electrical-club-admin-portal',
  'http://electrical-club-admin-portal:3001',
  'http://electrical-club-Admin-portal',
  'http://electrical-club-Admin-portal:3001',
  'https://electrical-club.vercel.app',
  'https://electrical-club-admin.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow all origins to prevent connection issues with dynamically generated Vercel URLs
    callback(null, true);
  },
  credentials: true,
}));

app.use(express.json());

// Ensure directories exist
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const certDir = path.join(__dirname, '../generated_certificates');
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir, { recursive: true });
}

// Serve uploaded PPT/PDF files and generated certificates static routes
app.use('/uploads', express.static(uploadDir));
app.use('/generated_certificates', express.static(certDir));

// Multer Config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limits
});

// Import Middlewares
import { verifyToken, requireAdmin, requireCandidate } from './middlewares/auth.middleware';

// Import Controllers
import { adminLogin, adminResetPassword, candidateLogin } from './controllers/auth.controller';
import { registerElectroQuest } from './controllers/register.controller';
import { getQuizQuestions, submitQuiz, getLeaderboard } from './controllers/quiz.controller';
import { logViolation, getProctoringReports } from './controllers/proctor.controller';

import { verifyCertificate } from './controllers/verification.controller';
import { handleAIChat, getProjectRecommendations } from './controllers/ai.controller';
import {
  getAnalytics,
  uploadQuestionBank,
  getElectroQuestRegistrations,
  exportAttendancePDFFile,
  exportAttendanceExcelFile,
  createAnnouncement,
  getAnnouncements,
  sendBulkEmail,
  handleSendTestCertificate,
  deleteElectroQuestRegistration,
  getSMTPSettings,
  updateSMTPSettings,
  getRegistrationStatus,
  updateRegistrationStatus,
} from './controllers/admin.controller';

// --- ROUTING SYSTEM ---

// 1. Auth routes
app.post('/api/auth/admin/login', adminLogin);
app.post('/api/auth/admin/reset-password', verifyToken, adminResetPassword);
app.post('/api/auth/candidate/login', candidateLogin);

// 2. ElectroQuest Event routes
app.post('/api/electroquest/register', registerElectroQuest);
app.get('/api/quiz/questions', verifyToken, requireCandidate, getQuizQuestions);
app.post('/api/quiz/submit', verifyToken, requireCandidate, submitQuiz);
app.get('/api/quiz/leaderboard', getLeaderboard);

// 3. Quiz Proctoring routes
app.post('/api/quiz/proctor/violation', verifyToken, requireCandidate, logViolation);


// 5. Public Certificate verification route
app.get('/api/verify/certificate/:certId', verifyCertificate);

// 6. AI Features routes
app.post('/api/ai/chat', handleAIChat);
app.post('/api/ai/project-recommendations', getProjectRecommendations);

// 7. Admin Panel & Management routes
app.get('/api/admin/analytics', verifyToken, requireAdmin, getAnalytics);
app.get('/api/admin/registrations/electroquest', verifyToken, requireAdmin, getElectroQuestRegistrations);
app.get('/api/admin/proctor/reports', verifyToken, requireAdmin, getProctoringReports);

app.get('/api/admin/attendance/pdf/:event', verifyToken, requireAdmin, exportAttendancePDFFile);
app.get('/api/admin/attendance/excel/:event', verifyToken, requireAdmin, exportAttendanceExcelFile);
app.post('/api/admin/announcement', verifyToken, requireAdmin, createAnnouncement);
app.get('/api/admin/announcements', getAnnouncements); // Public for Landing Page Announcements
app.post('/api/admin/bulk-email', verifyToken, requireAdmin, sendBulkEmail);
app.post('/api/admin/test-certificate', verifyToken, requireAdmin, handleSendTestCertificate);
app.post('/api/question-bank/upload', verifyToken, requireAdmin, upload.single('file'), uploadQuestionBank);
app.delete('/api/admin/registrations/electroquest/:id', verifyToken, requireAdmin, deleteElectroQuestRegistration);

app.get('/api/admin/smtp-settings', verifyToken, requireAdmin, getSMTPSettings);
app.post('/api/admin/smtp-settings', verifyToken, requireAdmin, updateSMTPSettings);
app.get('/api/registration-status', getRegistrationStatus);
app.post('/api/admin/registration-status', verifyToken, requireAdmin, updateRegistrationStatus);

// 8. Health check & Root
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});
app.get('/', (req, res) => {
  res.send('<h1>Electrical Club API is running! ⚡</h1><p>The backend is successfully connected and listening for requests.</p>');
});

// Start Server
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server is running in development mode on http://localhost:${PORT}`);
});
