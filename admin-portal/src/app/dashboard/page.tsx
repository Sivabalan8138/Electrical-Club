'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  Cpu, LayoutDashboard, Users, UploadCloud, ShieldAlert,
  GraduationCap, Download, Mail, Bell, LogOut, CheckCircle, RefreshCw
} from 'lucide-react';

interface AnalyticsData {
  totalRegistrations: number;
  eventWise: { electroQuest: number; thinkBig: number };
  quizStats: {
    completed: number;
    disqualified: number;
    averageScore: number;
    highestScore: number;
  };
  domainStats: Record<string, number>;
  deptStats: Record<string, number>;
  yearStats: Record<string, number>;
  certificateCount: number;
}

interface EQRegistration {
  id: string;
  teamName: string;
  candidateId: string;
  member1Name: string;
  member1RegisterNumber: string;
  member1Department: string;
  member1Email: string;
  quizAttempt?: {
    score: number;
    percentage: number;
    violationsCount: number;
    status: string;
  };
}

interface TBRegistration {
  id: string;
  teamName: string;
  domain: string;
  member1Name: string;
  member2Name: string;
  pptUrl?: string;
  pptName?: string;
  aiScore?: number;
  aiFeedback?: string; // JSON String
  presentationScore?: number;
  finalScore?: number;
  approvalStatus: string;
}

interface ProctorLog {
  id: string;
  candidateId: string;
  teamName: string;
  type: string;
  warningNumber: number;
  detail: string;
  timestamp: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [activeTab, setActiveTab] = useState<'ANALYTICS' | 'REGISTRATIONS' | 'QUESTIONS' | 'PROCTOR' | 'AI_GRADING' | 'SETTINGS'>('ANALYTICS');

  // Datasets
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [eqRegs, setEqRegs] = useState<EQRegistration[]>([]);
  const [tbRegs, setTbRegs] = useState<TBRegistration[]>([]);
  const [proctorLogs, setProctorLogs] = useState<ProctorLog[]>([]);
  
  // Forms loading/status
  const [qFile, setQFile] = useState<File | null>(null);
  const [qUploadStatus, setQUploadStatus] = useState('');
  
  // Announcements
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annType, setAnnType] = useState('General');
  const [annStatus, setAnnStatus] = useState('');

  // Bulk Email
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailTarget, setEmailTarget] = useState('ALL');
  const [emailStatus, setEmailStatus] = useState('');
  
  // Presentation Grading values
  const [selectedTbId, setSelectedTbId] = useState('');
  const [presScore, setPresScore] = useState('');
  const [gradingStatus, setGradingStatus] = useState('');

  // Test Certificate states
  const [testEmail, setTestEmail] = useState('');
  const [testName, setTestName] = useState('');
  const [testEvent, setTestEvent] = useState('ElectroQuest');
  const [testStatus, setTestStatus] = useState('');
  const [testPreviewUrl, setTestPreviewUrl] = useState('');
  const [testLoading, setTestLoading] = useState(false);

  // SMTP Configuration states
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [smtpStatus, setSmtpStatus] = useState('');
  const [smtpLoading, setSmtpLoading] = useState(false);

  // Registration Control states
  const [eqRegStatus, setEqRegStatus] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const [tbRegStatus, setTbRegStatus] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const [quizLoginStatus, setQuizLoginStatus] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const [regStatusMessage, setRegStatusMessage] = useState('');
  const [regStatusLoading, setRegStatusLoading] = useState(false);

  const handleSendTestCert = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestLoading(true);
    setTestStatus('Generating and dispatching test email...');
    setTestPreviewUrl('');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/test-certificate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: testEmail, name: testName, event: testEvent }),
      });

      const data = await res.json();
      if (res.ok) {
        setTestStatus('Test certificate dispatched successfully!');
        if (data.previewUrl) {
          setTestPreviewUrl(data.previewUrl);
        }
        setTestEmail('');
        setTestName('');
      } else {
        setTestStatus(`Error: ${data.error}`);
      }
    } catch (err) {
      setTestStatus('SMTP Connection Test failed.');
    } finally {
      setTestLoading(false);
    }
  };

  // Recharts custom colors
  const CYAN_COLORS = ['#00D4FF', '#00FFFF', '#0099FF', '#33CCFF'];

  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken');
    if (!savedToken) {
      router.push('/');
    } else {
      setToken(savedToken);
    }
  }, [router]);

  useEffect(() => {
    if (token) {
      fetchAnalytics();
      fetchRegistrations();
      fetchProctorLogs();
      fetchSmtpSettings();
      fetchRegistrationStatus();
    }
  }, [token]);

  const fetchRegistrationStatus = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/registration-status`);
      if (res.ok) {
        const data = await res.json();
        setEqRegStatus(data.electroQuest || 'OPEN');
        setTbRegStatus(data.thinkBig || 'OPEN');
        setQuizLoginStatus(data.quizLogin || 'OPEN');
      }
    } catch (err) {
      console.error('Failed to load registration status:', err);
    }
  };

  const handleUpdateRegStatus = async (eqStatus: 'OPEN' | 'CLOSED', tbStatus: 'OPEN' | 'CLOSED', qlStatus: 'OPEN' | 'CLOSED') => {
    setRegStatusLoading(true);
    setRegStatusMessage('Updating registration status...');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/registration-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ electroQuest: eqStatus, thinkBig: tbStatus, quizLogin: qlStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setEqRegStatus(eqStatus);
        setTbRegStatus(tbStatus);
        setQuizLoginStatus(qlStatus);
        setRegStatusMessage('Registration control updated successfully!');
      } else {
        setRegStatusMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setRegStatusMessage('Failed to update registration settings.');
    } finally {
      setRegStatusLoading(false);
    }
  };

  const fetchSmtpSettings = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/smtp-settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSmtpHost(data.host || '');
        setSmtpPort(data.port ? data.port.toString() : '');
        setSmtpUser(data.user || '');
        setSmtpFrom(data.from || '');
        if (data.hasPassword) {
          setSmtpPass('••••••••');
        }
      }
    } catch (err) {
      console.error('Failed to load SMTP settings:', err);
    }
  };

  const handleSmtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSmtpLoading(true);
    setSmtpStatus('Updating SMTP configuration...');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/smtp-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          host: smtpHost,
          port: parseInt(smtpPort, 10),
          user: smtpUser,
          pass: smtpPass,
          from: smtpFrom,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSmtpStatus(data.message || 'SMTP settings saved successfully!');
        fetchSmtpSettings();
      } else {
        setSmtpStatus(`Error: ${data.error}`);
      }
    } catch (err) {
      setSmtpStatus('Connection issue. Failed to save settings.');
    } finally {
      setSmtpLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setAnalytics(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRegistrations = async () => {
    try {
      // ElectroQuest
      const resEq = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/registrations/electroquest`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dataEq = await resEq.json();
      if (resEq.ok) setEqRegs(dataEq);

      // Think Big
      const resTb = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/thinkbig/registrations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dataTb = await resTb.json();
      if (resTb.ok) setTbRegs(dataTb);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteRegistration = async (id: string, event: 'electroquest' | 'thinkbig') => {
    if (!window.confirm(`Are you sure you want to delete this ${event} registration? This action is permanent.`)) {
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/registrations/${event}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        alert('Registration deleted successfully.');
        fetchRegistrations();
        fetchAnalytics();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error || 'Failed to delete registration.'}`);
      }
    } catch (err) {
      alert('Network error. Failed to delete registration.');
    }
  };

  const fetchProctorLogs = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/proctor/reports`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setProctorLogs(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Upload Question Bank
  const handleQBankUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qFile) return;

    setQUploadStatus('Uploading question bank file...');
    const formData = new FormData();
    formData.append('file', qFile);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/question-bank/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setQUploadStatus(`Success: ${data.message}`);
        setQFile(null);
      } else {
        setQUploadStatus(`Error: ${data.error}`);
      }
    } catch (err) {
      setQUploadStatus('Upload failed.');
    }
  };

  // Submit Presentation Grading (Think Big)
  const handleGradingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTbId || !presScore) return;

    setGradingStatus('Submitting final scores...');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/thinkbig/score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          registrationId: selectedTbId,
          presentationScore: parseFloat(presScore),
        }),
      });

      if (res.ok) {
        setGradingStatus('Grades finalized and certificate emailed!');
        setPresScore('');
        setSelectedTbId('');
        fetchRegistrations();
        fetchAnalytics();
      } else {
        const data = await res.json();
        setGradingStatus(`Error: ${data.error}`);
      }
    } catch (err) {
      setGradingStatus('Submitting scores failed.');
    }
  };

  // Attendance Sheet Downloader
  const downloadAttendance = async (event: 'ELECTROQUEST' | 'THINKBIG', type: 'pdf' | 'excel') => {
    const endpoint = `/api/admin/attendance/${type}/${event}`;
    try {
      window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${endpoint}?token=${token}`, '_blank');
      // Direct browser download
      const link = document.createElement('a');
      link.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${endpoint}`;
      link.setAttribute('download', `${event}_Attendance.${type}`);
      document.body.appendChild(link);
      // Wait, since endpoint requires auth header, direct window opening with authorization isn't standard via window.open.
      // So instead, we fetch it with headers, convert to blob, and trigger download!
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${event}_Attendance_Sheet.${type === 'pdf' ? 'pdf' : 'xlsx'}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        alert('Failed to download file.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create Announcement
  const handleAnnounce = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnnStatus('Publishing...');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/announcement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: annTitle, content: annContent, eventType: annType }),
      });

      if (res.ok) {
        setAnnStatus('Announcement published to portal!');
        setAnnTitle('');
        setAnnContent('');
      } else {
        const data = await res.json();
        setAnnStatus(`Error: ${data.error}`);
      }
    } catch (err) {
      setAnnStatus('Failed to publish.');
    }
  };

  // Bulk Email
  const handleBulkEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailStatus('Queuing bulk emails to participants...');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/bulk-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subject: emailSubject, htmlBody: emailBody, targetEvent: emailTarget }),
      });

      const data = await res.json();
      if (res.ok) {
        setEmailStatus(`Success: ${data.message}`);
        setEmailSubject('');
        setEmailBody('');
      } else {
        setEmailStatus(`Error: ${data.error}`);
      }
    } catch (err) {
      setEmailStatus('Bulk email delivery failed.');
    }
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    router.push('/');
  };

  // Format Recharts data structures
  const getDomainChartData = () => {
    if (!analytics) return [];
    return Object.keys(analytics.domainStats).map((key) => ({
      name: key.replace(' Technology', '').replace(' (AI)', ''),
      value: analytics.domainStats[key],
    }));
  };

  const getDeptChartData = () => {
    if (!analytics) return [];
    return Object.keys(analytics.deptStats).map((key) => ({
      name: key,
      value: analytics.deptStats[key],
    }));
  };

  return (
    <div className="min-h-[90vh] flex flex-col md:flex-row border-t border-[#00D4FF]/20">
      {/* SIDEBAR NAVIGATION */}
      <div className="w-full md:w-64 bg-[#081B33] border-r border-[#00D4FF]/10 p-4 space-y-6">
        <div className="flex items-center space-x-2 border-b border-[#00D4FF]/10 pb-4">
          <Cpu className="h-6 w-6 text-[#00FFFF]" />
          <span className="font-bold text-white text-sm tracking-widest uppercase">Admin Panel</span>
        </div>

        <div className="flex flex-col space-y-1">
          {[
            { id: 'ANALYTICS', label: 'Analytics Dashboard', icon: LayoutDashboard },
            { id: 'REGISTRATIONS', label: 'Registrations', icon: Users },
            { id: 'QUESTIONS', label: 'Question Bank', icon: UploadCloud },
            { id: 'PROCTOR', label: 'Proctor Logs', icon: ShieldAlert },
            { id: 'AI_GRADING', label: 'AI Project Evaluation', icon: GraduationCap },
            { id: 'SETTINGS', label: 'Alerts & Mailer', icon: Bell },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-3 px-4 py-3 text-xs font-semibold rounded-xl transition-all text-left cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[#00D4FF] to-[#00FFFF] text-[#081B33]'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={logout}
          className="flex items-center space-x-3 w-full px-4 py-3 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/5 border border-red-500/10 rounded-xl transition-all cursor-pointer"
        >
          <LogOut className="h-4.5 w-4.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* DASHBOARD CONTENT BODY */}
      <div className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto">
        {/* TABS CONTAINER */}

        {/* 1. ANALYTICS TABS */}
        {activeTab === 'ANALYTICS' && analytics && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white tracking-wide">Live Portal Analytics</h2>
              <button onClick={fetchAnalytics} className="p-2 border border-[#00D4FF]/20 rounded-lg hover:bg-white/5 cursor-pointer">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {/* Micro analytics stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-panel rounded-xl p-4 space-y-1">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block">Total Registrations</span>
                <p className="text-2xl font-bold text-[#00FFFF]">{analytics.totalRegistrations}</p>
                <span className="text-[9px] text-gray-400">{analytics.eventWise.electroQuest} EQ | {analytics.eventWise.thinkBig} TB</span>
              </div>
              <div className="glass-panel rounded-xl p-4 space-y-1">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block">Quiz Average Score</span>
                <p className="text-2xl font-bold text-[#00D4FF]">{analytics.quizStats.averageScore} / 75</p>
                <span className="text-[9px] text-gray-400">Highest: {analytics.quizStats.highestScore}</span>
              </div>
              <div className="glass-panel rounded-xl p-4 space-y-1">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block">Completed Quizzes</span>
                <p className="text-2xl font-bold text-white">{analytics.quizStats.completed}</p>
                <span className="text-[9px] text-red-400 font-semibold">{analytics.quizStats.disqualified} Disqualified</span>
              </div>
              <div className="glass-panel rounded-xl p-4 space-y-1">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block">Certificates Issued</span>
                <p className="text-2xl font-bold text-white">{analytics.certificateCount}</p>
                <span className="text-[9px] text-gray-400">Emailed Automatically</span>
              </div>
            </div>

            {/* Graphs Charts grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
              <div className="glass-panel rounded-2xl p-5 h-80 flex flex-col justify-between">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Department-wise EEE Participation</h3>
                <ResponsiveContainer width="100%" height="80%">
                  <BarChart data={getDeptChartData()}>
                    <XAxis dataKey="name" stroke="#666" fontSize={10} />
                    <YAxis stroke="#666" fontSize={10} />
                    <Tooltip cursor={{ fill: 'rgba(0, 212, 255, 0.05)' }} contentStyle={{ background: '#081B33', borderColor: '#00D4FF' }} />
                    <Bar dataKey="value" fill="#00D4FF" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="glass-panel rounded-2xl p-5 h-80 flex flex-col justify-between">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Think Big Domain Distribution</h3>
                <ResponsiveContainer width="100%" height="80%">
                  <PieChart>
                    <Pie
                      data={getDomainChartData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {getDomainChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CYAN_COLORS[index % CYAN_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#081B33', borderColor: '#00D4FF' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* 2. REGISTRATIONS LIST TABS */}
        {activeTab === 'REGISTRATIONS' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-[#00D4FF]/25 pb-4">
              <h2 className="text-lg font-bold">Registered Teams & Users</h2>
              <button onClick={fetchRegistrations} className="p-2 border border-[#00D4FF]/20 rounded-lg hover:bg-white/5 cursor-pointer">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
 
            {/* ElectroQuest Registrations Table */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-[#00FFFF] uppercase tracking-wider">ElectroQuest Quiz (Total: {eqRegs.length})</h3>
              <div className="glass-panel rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#081B33] text-gray-400 border-b border-[#00D4FF]/10">
                      <th className="p-3">Team Name</th>
                      <th className="p-3">Candidate ID</th>
                      <th className="p-3">Leader details</th>
                      <th className="p-3 text-center">Score</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {eqRegs.length > 0 ? (
                      eqRegs.map((reg) => (
                        <tr key={reg.id} className="hover:bg-white/5">
                          <td className="p-3 font-bold text-white">{reg.teamName}</td>
                          <td className="p-3 font-mono text-gray-400">{reg.candidateId}</td>
                          <td className="p-3 text-gray-300">
                            {reg.member1Name} ({reg.member1Department}) - {reg.member1Email}
                          </td>
                          <td className="p-3 text-center font-bold text-white">
                            {reg.quizAttempt ? `${reg.quizAttempt.score}/75` : 'N/A'}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              reg.quizAttempt?.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                              reg.quizAttempt?.status === 'DISQUALIFIED' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                              'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                            }`}>
                              {reg.quizAttempt?.status || 'NOT STARTED'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => deleteRegistration(reg.id, 'electroquest')}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2.5 py-1 rounded transition-all cursor-pointer font-semibold"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-gray-500">No teams registered.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Think Big Registrations Table */}
            <div className="space-y-3 pt-6">
              <h3 className="font-bold text-sm text-[#00FFFF] uppercase tracking-wider">Think Big Presentation (Total: {tbRegs.length})</h3>
              <div className="glass-panel rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#081B33] text-gray-400 border-b border-[#00D4FF]/10">
                      <th className="p-3">Team Name</th>
                      <th className="p-3">Domain</th>
                      <th className="p-3">Members</th>
                      <th className="p-3 text-center">AI Score (70)</th>
                      <th className="p-3 text-center">Final Score</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {tbRegs.length > 0 ? (
                      tbRegs.map((reg) => {
                        const membersList = [
                          reg.member1Name,
                          reg.member2Name,
                        ].filter(Boolean);
                        return (
                          <tr key={reg.id} className="hover:bg-white/5">
                            <td className="p-3 font-bold text-white">{reg.teamName}</td>
                            <td className="p-3 text-gray-300">{reg.domain}</td>
                            <td className="p-3 text-gray-400">{membersList.join(', ')}</td>
                            <td className="p-3 text-center font-bold text-white">{reg.aiScore ?? 'N/A'}</td>
                            <td className="p-3 text-center font-bold text-[#00FFFF]">{reg.finalScore ?? 'N/A'}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                reg.approvalStatus === 'APPROVED' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                reg.approvalStatus === 'REJECTED' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                              }`}>
                                {reg.approvalStatus}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => deleteRegistration(reg.id, 'thinkbig')}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2.5 py-1 rounded transition-all cursor-pointer font-semibold"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-gray-500">No teams registered.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 3. UPLOAD QUESTION BANK TABS */}
        {activeTab === 'QUESTIONS' && (
          <div className="max-w-md glass-panel rounded-2xl border border-[#00D4FF]/25 p-6 md:p-8 space-y-6">
            <h2 className="text-lg font-bold flex items-center space-x-2">
              <UploadCloud className="h-5 w-5 text-[#00FFFF]" />
              <span>Import Question Bank</span>
            </h2>

            <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
              Upload a `.xlsx`, `.csv`, or `.json` file containing question bank columns:
              <br />
              <strong>Col 1: Category | Col 2: Text | Col 3-6: Option A-D | Col 7: Correct Answer (A, B, C, D)</strong>
            </p>

            <form onSubmit={handleQBankUpload} className="space-y-4">
              <input
                type="file"
                accept=".xlsx,.csv,.json"
                onChange={(e) => setQFile(e.target.files ? e.target.files[0] : null)}
                className="w-full bg-[#081B33] border border-[#00D4FF]/20 rounded-xl p-3 text-xs focus:outline-none"
              />

              {qUploadStatus && <div className="p-3 bg-[#081B33] border border-[#00D4FF]/20 rounded-xl text-xs text-gray-300 font-semibold">{qUploadStatus}</div>}

              <button
                type="submit"
                disabled={!qFile}
                className="w-full py-2.5 bg-gradient-to-r from-[#00D4FF] to-[#00FFFF] text-[#081B33] font-bold text-xs rounded-xl hover:opacity-95 shadow-md disabled:opacity-50 cursor-pointer"
              >
                Upload & Process Questions
              </button>
            </form>
          </div>
        )}

        {/* 4. PROCTOR LOG REPORTS */}
        {activeTab === 'PROCTOR' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-[#00D4FF]/25 pb-4">
              <h2 className="text-lg font-bold flex items-center space-x-2">
                <ShieldAlert className="h-5 w-5 text-red-400" />
                <span>Live Proctoring Violations Log</span>
              </h2>
              <button onClick={fetchProctorLogs} className="p-2 border border-[#00D4FF]/20 rounded-lg hover:bg-white/5 cursor-pointer">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            <div className="glass-panel rounded-xl overflow-hidden shadow-md">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#081B33] text-gray-400 border-b border-[#00D4FF]/10">
                    <th className="p-3">Candidate ID</th>
                    <th className="p-3">Team Name</th>
                    <th className="p-3 text-center">Warning Number</th>
                    <th className="p-3">Violation Event</th>
                    <th className="p-3">Detail</th>
                    <th className="p-3 text-center">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {proctorLogs.length > 0 ? (
                    proctorLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/5">
                        <td className="p-3 font-mono text-gray-400">{log.candidateId}</td>
                        <td className="p-3 font-bold text-white">{log.teamName}</td>
                        <td className="p-3 text-center font-bold text-yellow-500">
                          {log.warningNumber} / 3
                        </td>
                        <td className="p-3 font-semibold text-red-400">{log.type}</td>
                        <td className="p-3 text-gray-300">{log.detail}</td>
                        <td className="p-3 text-center text-gray-500 font-mono">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-gray-500">No proctoring warning triggers recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. AI PROJECT SLIDE GRADER PANEL (Think Big) */}
        {activeTab === 'AI_GRADING' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Registrations list */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-bold flex items-center space-x-2">
                <GraduationCap className="h-5 w-5 text-[#00FFFF]" />
                <span>Think Big Idea Assessment</span>
              </h2>

              <div className="glass-panel rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#081B33] text-gray-400 border-b border-[#00D4FF]/10">
                      <th className="p-3">Team Name</th>
                      <th className="p-3">Domain</th>
                      <th className="p-3">Presentation File</th>
                      <th className="p-3 text-center">AI Score (70)</th>
                      <th className="p-3 text-center">Final Score</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {tbRegs.length > 0 ? (
                      tbRegs.map((reg) => (
                        <tr key={reg.id} className="hover:bg-white/5">
                          <td className="p-3 font-bold text-white">{reg.teamName}</td>
                          <td className="p-3 text-gray-300">{reg.domain}</td>
                          <td className="p-3">
                            {reg.pptUrl ? (
                              <a
                                href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${reg.pptUrl}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#00FFFF] underline hover:text-[#00D4FF]"
                              >
                                View Slides
                              </a>
                            ) : (
                              <span className="text-gray-500">Pending upload</span>
                            )}
                          </td>
                          <td className="p-3 text-center font-bold text-white">{reg.aiScore ?? 'N/A'}</td>
                          <td className="p-3 text-center font-bold text-[#00FFFF]">{reg.finalScore ?? 'N/A'}</td>
                          <td className="p-3 text-center">
                            {reg.pptUrl && reg.approvalStatus !== 'APPROVED' ? (
                              <button
                                onClick={() => {
                                  setSelectedTbId(reg.id);
                                  setPresScore('');
                                }}
                                className="bg-[#00D4FF]/10 border border-[#00FFFF]/20 text-[#00FFFF] font-bold px-3 py-1 rounded hover:bg-[#00D4FF] hover:text-[#081B33] transition-all cursor-pointer"
                              >
                                Score Team
                              </button>
                            ) : reg.approvalStatus === 'APPROVED' ? (
                              <span className="text-green-400 font-bold uppercase tracking-wider text-[10px]">Graded</span>
                            ) : (
                              <span className="text-gray-500">No slides</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-gray-500">No teams registered.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Grading Sidebar panel */}
            <div className="lg:col-span-1">
              {selectedTbId ? (
                <div className="glass-panel border-2 border-yellow-500/30 rounded-xl p-5 space-y-4 animate-in slide-in-from-right duration-300">
                  <h3 className="font-bold text-sm text-white">Input Presentation Grade</h3>
                  
                  {/* Detailed AI report output view */}
                  {(() => {
                    const selectedTeam = tbRegs.find((r) => r.id === selectedTbId);
                    if (!selectedTeam || !selectedTeam.aiFeedback) return null;
                    const feedback = JSON.parse(selectedTeam.aiFeedback);
                    return (
                      <div className="space-y-3 bg-[#081B33] border border-white/5 p-3 rounded-lg text-xs leading-relaxed max-h-60 overflow-y-auto">
                        <p className="font-bold text-[#00FFFF] border-b border-white/5 pb-1">AI Feedback Report</p>
                        <p><strong>Problem Identification:</strong> {feedback.scores?.problemIdentification}/20</p>
                        <p><strong>Innovation:</strong> {feedback.scores?.innovation}/20</p>
                        <p><strong>Technical Feasibility:</strong> {feedback.scores?.technicalFeasibility}/10</p>
                        <p><strong>Practical Implementation:</strong> {feedback.scores?.practicalImplementation}/10</p>
                        <p><strong>Presentation Quality:</strong> {feedback.scores?.presentationQuality}/10</p>
                        <p className="text-[#00D4FF] font-bold">Total AI Score: {selectedTeam.aiScore}/70</p>
                        
                        <p className="font-bold mt-2 text-white">Strengths:</p>
                        <ul className="list-disc list-inside">
                          {feedback.strengths?.map((s: string, idx: number) => <li key={idx}>{s}</li>)}
                        </ul>
                        <p className="font-bold mt-2 text-white">Weaknesses:</p>
                        <ul className="list-disc list-inside">
                          {feedback.weaknesses?.map((w: string, idx: number) => <li key={idx}>{w}</li>)}
                        </ul>
                      </div>
                    );
                  })()}

                  <form onSubmit={handleGradingSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] text-gray-400 font-semibold uppercase mb-1">Presentation Score (Max: 30)</label>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        step="0.5"
                        required
                        value={presScore}
                        onChange={(e) => setPresScore(e.target.value)}
                        placeholder="e.g. 25"
                        className="w-full bg-[#081B33] border border-[#00D4FF]/25 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#00FFFF]"
                      />
                    </div>

                    {gradingStatus && <div className="p-3 bg-[#081B33] border border-[#00D4FF]/10 rounded-xl text-[10px] text-gray-300 font-semibold">{gradingStatus}</div>}

                    <div className="flex space-x-2">
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                      >
                        Submit Score
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedTbId('')}
                        className="px-4 py-2 border border-gray-500 text-gray-400 text-xs rounded-xl cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="glass-panel border border-[#00D4FF]/10 rounded-xl p-5 text-center text-xs text-gray-500 font-semibold">
                  Select a team on the table to check AI reports and enter presentation scores.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 6. SETTINGS TABS: ATTENDANCE, BULK EMAIL, ANNOUNCEMENT */}
        {activeTab === 'SETTINGS' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left side: Attendance sheet downloads & Announcements */}
            <div className="space-y-8">
              {/* Attendance Sheet Card */}
              <div className="glass-panel border border-[#00D4FF]/25 rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-sm text-white flex items-center space-x-1.5 uppercase tracking-wider">
                  <Download className="h-4.5 w-4.5 text-[#00FFFF]" />
                  <span>Attendance Management</span>
                </h3>
                <p className="text-gray-300 text-xs leading-relaxed">
                  Download print-ready student attendance sheets complete with college/department signatures.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 border border-[#00D4FF]/10 p-3.5 rounded-xl bg-[#081B33]/50">
                    <span className="text-[10px] text-gray-400 font-bold block">ElectroQuest Quiz</span>
                    <div className="flex flex-col space-y-1.5">
                      <button
                        onClick={() => downloadAttendance('ELECTROQUEST', 'pdf')}
                        className="w-full py-1.5 bg-[#00D4FF]/10 text-[#00FFFF] border border-[#00FFFF]/20 rounded text-[10px] font-bold hover:bg-[#00D4FF]/20 cursor-pointer"
                      >
                        Download PDF
                      </button>
                      <button
                        onClick={() => downloadAttendance('ELECTROQUEST', 'excel')}
                        className="w-full py-1.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded text-[10px] font-bold hover:bg-green-500/20 cursor-pointer"
                      >
                        Download Excel
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 border border-[#00D4FF]/10 p-3.5 rounded-xl bg-[#081B33]/50">
                    <span className="text-[10px] text-gray-400 font-bold block">Think Big Event</span>
                    <div className="flex flex-col space-y-1.5">
                      <button
                        onClick={() => downloadAttendance('THINKBIG', 'pdf')}
                        className="w-full py-1.5 bg-[#00D4FF]/10 text-[#00FFFF] border border-[#00FFFF]/20 rounded text-[10px] font-bold hover:bg-[#00D4FF]/20 cursor-pointer"
                      >
                        Download PDF
                      </button>
                      <button
                        onClick={() => downloadAttendance('THINKBIG', 'excel')}
                        className="w-full py-1.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded text-[10px] font-bold hover:bg-green-500/20 cursor-pointer"
                      >
                        Download Excel
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Test Certificate Card */}
              <div className="glass-panel border border-[#00D4FF]/25 rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-sm text-white flex items-center space-x-1.5 uppercase tracking-wider">
                  <Mail className="h-4.5 w-4.5 text-[#00FFFF]" />
                  <span>Send Test Certificate</span>
                </h3>
                <p className="text-gray-300 text-xs leading-relaxed">
                  Verify SMTP connection by sending a sample PDF certificate to a custom test email address.
                </p>

                <form onSubmit={handleSendTestCert} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Recipient Name</label>
                      <input
                        type="text"
                        required
                        value={testName}
                        onChange={(e) => setTestName(e.target.value)}
                        placeholder="Dr. John Doe"
                        className="w-full bg-[#081B33] border border-[#00D4FF]/20 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#00FFFF]"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Event Name</label>
                      <input
                        type="text"
                        required
                        value={testEvent}
                        onChange={(e) => setTestEvent(e.target.value)}
                        placeholder="ElectroQuest"
                        className="w-full bg-[#081B33] border border-[#00D4FF]/20 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#00FFFF]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Test Email Address</label>
                    <input
                      type="email"
                      required
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="test@example.com"
                      className="w-full bg-[#081B33] border border-[#00D4FF]/20 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#00FFFF]"
                    />
                  </div>

                  {testStatus && (
                    <div className="p-3 bg-[#081B33] border border-[#00D4FF]/10 rounded-xl text-[10px] text-gray-300 font-semibold leading-relaxed">
                      <div>{testStatus}</div>
                      {testPreviewUrl && (
                        <a
                          href={testPreviewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block text-[#00FFFF] underline hover:text-[#00D4FF]"
                        >
                          👉 View Sent Email in Ethereal Sandbox
                        </a>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={testLoading}
                    className="w-full py-2 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                  >
                    {testLoading ? 'Sending...' : 'Send Test Certificate'}
                  </button>
                </form>
              </div>

              {/* Announcement Posting Card */}
              <div className="glass-panel border border-[#00D4FF]/25 rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-sm text-white flex items-center space-x-1.5 uppercase tracking-wider">
                  <Bell className="h-4.5 w-4.5 text-[#00FFFF]" />
                  <span>Publish Announcements</span>
                </h3>

                <form onSubmit={handleAnnounce} className="space-y-3">
                  <div>
                    <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Target Event</label>
                    <select
                      value={annType}
                      onChange={(e) => setAnnType(e.target.value)}
                      className="w-full bg-[#081B33] border border-[#00D4FF]/20 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#00FFFF]"
                    >
                      <option value="General">General / All Events</option>
                      <option value="ElectroQuest">ElectroQuest Quiz</option>
                      <option value="ThinkBig">Think Big presentation</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Title</label>
                    <input
                      type="text"
                      required
                      value={annTitle}
                      onChange={(e) => setAnnTitle(e.target.value)}
                      placeholder="e.g. PPT Submission Deadline Extended"
                      className="w-full bg-[#081B33] border border-[#00D4FF]/20 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#00FFFF]"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Content Details</label>
                    <textarea
                      required
                      rows={3}
                      value={annContent}
                      onChange={(e) => setAnnContent(e.target.value)}
                      placeholder="Write alert content..."
                      className="w-full bg-[#081B33] border border-[#00D4FF]/20 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#00FFFF]"
                    />
                  </div>

                  {annStatus && <div className="p-3 bg-[#081B33] border border-[#00D4FF]/10 rounded-xl text-[10px] text-gray-300 font-semibold">{annStatus}</div>}

                  <button
                    type="submit"
                    className="w-full py-2 bg-gradient-to-r from-[#00D4FF] to-[#00FFFF] text-[#081B33] font-bold text-xs rounded-xl shadow-md cursor-pointer"
                  >
                    Post Announcement
                  </button>
                </form>
              </div>
            </div>

            {/* Right side: Bulk Email system */}
            <div className="glass-panel border border-[#00D4FF]/25 rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-sm text-white flex items-center space-x-1.5 uppercase tracking-wider">
                <Mail className="h-4.5 w-4.5 text-[#00FFFF]" />
                <span>Bulk Email Delivery</span>
              </h3>

              <form onSubmit={handleBulkEmail} className="space-y-4">
                <div>
                  <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Target Audience</label>
                  <select
                    value={emailTarget}
                    onChange={(e) => setEmailTarget(e.target.value)}
                    className="w-full bg-[#081B33] border border-[#00D4FF]/20 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#00FFFF]"
                  >
                    <option value="ALL">All Registered Participants</option>
                    <option value="ELECTROQUEST">ElectroQuest participants only</option>
                    <option value="THINKBIG">Think Big participants only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="e.g. Schedule Update - Electrical Club"
                    className="w-full bg-[#081B33] border border-[#00D4FF]/20 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#00FFFF]"
                  />
                </div>

                <div>
                  <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Email Body (HTML Supported)</label>
                  <textarea
                    required
                    rows={8}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    placeholder="Write body content here..."
                    className="w-full bg-[#081B33] border border-[#00D4FF]/20 rounded-xl p-3 text-xs focus:outline-none focus:border-[#00FFFF]"
                  />
                </div>

                {emailStatus && <div className="p-3 bg-[#081B33] border border-[#00D4FF]/10 rounded-xl text-xs text-gray-300 font-semibold">{emailStatus}</div>}

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-[#00D4FF] to-[#00FFFF] text-[#081B33] font-bold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  Send Bulk Email
                </button>
              </form>
            </div>

            {/* SMTP Configuration Card */}
            <div className="glass-panel border border-[#00D4FF]/25 rounded-2xl p-6 space-y-4 mt-8">
              <h3 className="font-bold text-sm text-white flex items-center space-x-1.5 uppercase tracking-wider">
                <Cpu className="h-4.5 w-4.5 text-[#00FFFF]" />
                <span>SMTP Automated Mail Setup</span>
              </h3>
              <p className="text-gray-300 text-xs leading-relaxed">
                Connect your real SMTP host (e.g. Gmail) to automatically email registration details and completion certificates to participants.
              </p>

              <form onSubmit={handleSmtpSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">SMTP Host</label>
                    <input
                      type="text"
                      required
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="smtp.gmail.com"
                      className="w-full bg-[#081B33] border border-[#00D4FF]/20 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#00FFFF]"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">SMTP Port</label>
                    <input
                      type="number"
                      required
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(e.target.value)}
                      placeholder="465"
                      className="w-full bg-[#081B33] border border-[#00D4FF]/20 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#00FFFF]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">SMTP Username</label>
                  <input
                    type="text"
                    required
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    placeholder="electricalclubvsb@gmail.com"
                    className="w-full bg-[#081B33] border border-[#00D4FF]/20 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#00FFFF]"
                  />
                </div>

                <div>
                  <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">SMTP Password</label>
                  <input
                    type="password"
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    placeholder="Enter Gmail App Password or SMTP password"
                    className="w-full bg-[#081B33] border border-[#00D4FF]/20 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#00FFFF]"
                  />
                </div>

                <div>
                  <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Default Sender Email</label>
                  <input
                    type="email"
                    required
                    value={smtpFrom}
                    onChange={(e) => setSmtpFrom(e.target.value)}
                    placeholder="electricalclubvsb@gmail.com"
                    className="w-full bg-[#081B33] border border-[#00D4FF]/20 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#00FFFF]"
                  />
                </div>

                {smtpStatus && (
                  <div className="p-3 bg-[#081B33] border border-[#00D4FF]/10 rounded-xl text-[10px] text-gray-300 font-semibold leading-relaxed">
                    {smtpStatus}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={smtpLoading}
                  className="w-full py-2 bg-gradient-to-r from-blue-500 to-[#00D4FF] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  {smtpLoading ? 'Saving Settings...' : 'Save & Activate SMTP'}
                </button>
              </form>
            </div>

            {/* Registration Control Card */}
            <div className="glass-panel border border-[#00D4FF]/25 rounded-2xl p-6 space-y-4 mt-8">
              <h3 className="font-bold text-sm text-white flex items-center space-x-1.5 uppercase tracking-wider">
                <RefreshCw className="h-4.5 w-4.5 text-[#00FFFF]" />
                <span>Registration Open/Close Control</span>
              </h3>
              <p className="text-gray-300 text-xs leading-relaxed">
                Control registration accessibility for the signature technical events. When closed, students will see a friendly "Registrations Closed" notice instead of the forms.
              </p>

              <div className="space-y-4">
                {/* ElectroQuest Control */}
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div>
                    <span className="text-xs font-bold text-white block">ELECTROQUEST</span>
                    <span className="text-[10px] text-gray-400">Technical Online Quiz</span>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      type="button"
                      disabled={regStatusLoading}
                      onClick={() => handleUpdateRegStatus('OPEN', tbRegStatus, quizLoginStatus)}
                      className={`px-3 py-1 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer ${
                        eqRegStatus === 'OPEN'
                          ? 'bg-emerald-500 text-[#081B33]'
                          : 'bg-[#081B33] text-gray-400 border border-white/5 hover:border-gray-500'
                      }`}
                    >
                      OPEN
                    </button>
                    <button
                      type="button"
                      disabled={regStatusLoading}
                      onClick={() => handleUpdateRegStatus('CLOSED', tbRegStatus, quizLoginStatus)}
                      className={`px-3 py-1 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer ${
                        eqRegStatus === 'CLOSED'
                          ? 'bg-rose-500 text-white'
                          : 'bg-[#081B33] text-gray-400 border border-white/5 hover:border-gray-500'
                      }`}
                    >
                      CLOSE
                    </button>
                  </div>
                </div>

                {/* Think Big Control */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">THINK BIG</span>
                    <span className="text-[10px] text-gray-400">Idea Presentation</span>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      type="button"
                      disabled={regStatusLoading}
                      onClick={() => handleUpdateRegStatus(eqRegStatus, 'OPEN', quizLoginStatus)}
                      className={`px-3 py-1 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer ${
                        tbRegStatus === 'OPEN'
                          ? 'bg-emerald-500 text-[#081B33]'
                          : 'bg-[#081B33] text-gray-400 border border-white/5 hover:border-gray-500'
                      }`}
                    >
                      OPEN
                    </button>
                    <button
                      type="button"
                      disabled={regStatusLoading}
                      onClick={() => handleUpdateRegStatus(eqRegStatus, 'CLOSED', quizLoginStatus)}
                      className={`px-3 py-1 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer ${
                        tbRegStatus === 'CLOSED'
                          ? 'bg-rose-500 text-white'
                          : 'bg-[#081B33] text-gray-400 border border-white/5 hover:border-gray-500'
                      }`}
                    >
                      CLOSE
                    </button>
                  </div>
                </div>

                {/* Quiz Login Control */}
                <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-3">
                  <div>
                    <span className="text-xs font-bold text-white block">QUIZ PORTAL (CANDIDATE ID)</span>
                    <span className="text-[10px] text-gray-400">Allow students to login to the quiz</span>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      type="button"
                      disabled={regStatusLoading}
                      onClick={() => handleUpdateRegStatus(eqRegStatus, tbRegStatus, 'OPEN')}
                      className={`px-3 py-1 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer ${
                        quizLoginStatus === 'OPEN'
                          ? 'bg-emerald-500 text-[#081B33]'
                          : 'bg-[#081B33] text-gray-400 border border-white/5 hover:border-gray-500'
                      }`}
                    >
                      OPEN
                    </button>
                    <button
                      type="button"
                      disabled={regStatusLoading}
                      onClick={() => handleUpdateRegStatus(eqRegStatus, tbRegStatus, 'CLOSED')}
                      className={`px-3 py-1 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer ${
                        quizLoginStatus === 'CLOSED'
                          ? 'bg-rose-500 text-white'
                          : 'bg-[#081B33] text-gray-400 border border-white/5 hover:border-gray-500'
                      }`}
                    >
                      CLOSE
                    </button>
                  </div>
                </div>

                {regStatusMessage && (
                  <div className="p-3 bg-[#081B33] border border-[#00D4FF]/10 rounded-xl text-[10px] text-gray-300 font-semibold leading-relaxed">
                    {regStatusMessage}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
