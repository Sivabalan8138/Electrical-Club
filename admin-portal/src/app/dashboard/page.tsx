'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  Cpu, LayoutDashboard, Users, UploadCloud, ShieldAlert,
  GraduationCap, Download, Mail, Bell, LogOut, CheckCircle, RefreshCw, Edit
} from 'lucide-react';

interface AnalyticsData {
  totalRegistrations: number;
  eventWise: { electroQuest: number };
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
  isEmailSent: boolean;
  quizAttempt?: {
    score: number;
    percentage: number;
    violationsCount: number;
    status: string;
  };
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

  const [quizLoginStatus, setQuizLoginStatus] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const [regStatusMessage, setRegStatusMessage] = useState('');
  const [regStatusLoading, setRegStatusLoading] = useState(false);

  // Certificate Template states
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateUploadStatus, setTemplateUploadStatus] = useState('');
  const [templateUploadLoading, setTemplateUploadLoading] = useState(false);

  // Certificate Positioning states
  const [certSettings, setCertSettings] = useState<any>({
    name: { x: 420, y: 280, fontSize: 32, color: '#000000', fontFamily: 'Helvetica-Bold' },
    department: { x: 420, y: 340, fontSize: 16, color: '#333333', fontFamily: 'Helvetica' },
    qrCode: { x: 50, y: 450, size: 100 },
  });
  const [certSettingsStatus, setCertSettingsStatus] = useState('');
  const [certSettingsLoading, setCertSettingsLoading] = useState(false);

  const fetchCertSettings = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/certificate-settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCertSettings(data);
      } else if (res.status === 401) {
        localStorage.removeItem('adminToken');
        router.push('/');
      }
    } catch (err) {
      console.error('Failed to load certificate settings:', err);
    }
  };

  const handleSaveCertSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setCertSettingsLoading(true);
    setCertSettingsStatus('Saving settings...');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/certificate-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(certSettings),
      });

      const data = await res.json();
      if (res.ok) {
        setCertSettingsStatus('Certificate settings saved successfully!');
      } else {
        setCertSettingsStatus(`Error: ${data.error}`);
        if (res.status === 401) {
          localStorage.removeItem('adminToken');
          router.push('/');
        }
      }
    } catch (err) {
      setCertSettingsStatus('Failed to save certificate settings.');
    } finally {
      setCertSettingsLoading(false);
    }
  };

  const handleTemplateUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateFile) return;

    setTemplateUploadLoading(true);
    setTemplateUploadStatus('Uploading template...');

    const formData = new FormData();
    formData.append('template', templateFile);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/certificate-template`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setTemplateUploadStatus('Certificate template uploaded successfully!');
        setTemplateFile(null);
      } else {
        setTemplateUploadStatus(`Error: ${data.error}`);
        if (res.status === 401) {
          localStorage.removeItem('adminToken');
          router.push('/');
        }
      }
    } catch (err) {
      setTemplateUploadStatus('Failed to upload certificate template.');
    } finally {
      setTemplateUploadLoading(false);
    }
  };

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
      fetchCertSettings();
    }
  }, [token]);

  const fetchRegistrationStatus = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/registration-status`);
      if (res.ok) {
        const data = await res.json();
        setEqRegStatus(data.electroQuest || 'OPEN');

        setQuizLoginStatus(data.quizLogin || 'OPEN');
      } else if (res.status === 401) {
        localStorage.removeItem('adminToken');
        router.push('/');
      }
    } catch (err) {
      console.error('Failed to load registration status:', err);
    }
  };

  const handleUpdateRegStatus = async (eqStatus: 'OPEN' | 'CLOSED', qlStatus: 'OPEN' | 'CLOSED') => {
    setRegStatusLoading(true);
    setRegStatusMessage('Updating registration status...');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/registration-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ electroQuest: eqStatus, quizLogin: qlStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setEqRegStatus(eqStatus);

        setQuizLoginStatus(qlStatus);
        setRegStatusMessage('Registration control updated successfully!');
      } else {
        setRegStatusMessage(`Error: ${data.error}`);
        if (res.status === 401) {
          localStorage.removeItem('adminToken');
          router.push('/');
        }
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
      } else if (res.status === 401) {
        localStorage.removeItem('adminToken');
        router.push('/');
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
    } catch (err) {
      console.error(err);
    }
  };

  const deleteRegistration = async (id: string, event: 'electroquest') => {
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

  const resendRegistrationEmail = async (id: string, event: 'electroquest') => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/registrations/${event}/${id}/resend-email`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        alert('Email successfully resent!');
        fetchRegistrations(); // Refresh to show isEmailSent status
      } else {
        const data = await res.json();
        alert(`Failed: ${data.error || 'SMTP Error. Ensure Google App Password is used in Settings.'}`);
      }
    } catch (err) {
      alert('Network error. Failed to resend email.');
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

  // Attendance Sheet Downloader
  const downloadAttendance = async (event: 'ELECTROQUEST', type: 'pdf' | 'excel' | 'word') => {
    const endpoint = `/api/admin/attendance/${type}/${event}`;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        let ext = 'pdf';
        if (type === 'excel') ext = 'xlsx';
        if (type === 'word') ext = 'docx';
        
        a.download = `${event}_Attendance_Sheet.${ext}`;
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
                <span className="text-[9px] text-gray-400">{analytics.eventWise.electroQuest} EQ</span>
              </div>
              <div className="glass-panel rounded-xl p-4 space-y-1">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block">Quiz Average Score</span>
                <p className="text-2xl font-bold text-[#00D4FF]">{analytics.quizStats.averageScore} / 50</p>
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
            <div className="grid grid-cols-1 gap-6 pt-4">
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
                            <div>{reg.member1Name} ({reg.member1Department}) - {reg.member1Email}</div>
                            <div className="mt-1">
                              {reg.isEmailSent ? (
                                <span className="inline-flex items-center space-x-1 text-[10px] text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20"><Mail className="h-3 w-3" /> <span>Sent</span></span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 text-[10px] text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20"><Mail className="h-3 w-3" /> <span>Failed</span></span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center font-bold text-white">
                            {reg.quizAttempt ? `${reg.quizAttempt.score}/50` : 'N/A'}
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
                          <td className="p-3 text-center space-x-2 flex justify-center items-center">
                            <button
                              onClick={() => resendRegistrationEmail(reg.id, 'electroquest')}
                              className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-2.5 py-1 rounded transition-all cursor-pointer font-semibold flex items-center space-x-1"
                              title="Resend Candidate ID Email"
                            >
                              <RefreshCw className="h-3 w-3" /> <span>Resend</span>
                            </button>
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

                <div className="grid grid-cols-1 gap-4">
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
                      <button
                        onClick={() => downloadAttendance('ELECTROQUEST', 'word')}
                        className="w-full py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-[10px] font-bold hover:bg-blue-500/20 cursor-pointer"
                      >
                        Download Word
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
              <div className="bg-red-500/10 border border-red-500/20 rounded p-3 mt-2 mb-2">
                <p className="text-red-400 text-[11px] font-bold">⚠️ IMPORTANT FOR GMAIL USERS</p>
                <p className="text-gray-400 text-[10px] mt-1">
                  You MUST use a <strong>Google App Password</strong> instead of your standard Gmail password. 
                  Go to your Google Account Security settings, enable 2-Step Verification, and generate an App Password. 
                  If you use your standard password, background emails will silently fail!
                </p>
              </div>

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

            {/* Certificate Template Card */}
            <div className="glass-panel border border-[#00D4FF]/25 rounded-2xl p-6 space-y-4 mt-8">
              <h3 className="font-bold text-sm text-white flex items-center space-x-1.5 uppercase tracking-wider">
                <UploadCloud className="h-4.5 w-4.5 text-[#00FFFF]" />
                <span>Certificate Template Upload</span>
              </h3>
              <p className="text-gray-300 text-xs leading-relaxed">
                Upload a base background template (PNG/JPG) for generated certificates. Leave enough blank space in the center for candidate details.
              </p>
              <form onSubmit={handleTemplateUpload} className="space-y-4">
                <div>
                  <input
                    type="file"
                    accept="image/png, image/jpeg"
                    onChange={(e) => setTemplateFile(e.target.files ? e.target.files[0] : null)}
                    className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#00D4FF]/10 file:text-[#00FFFF] hover:file:bg-[#00D4FF]/20"
                  />
                </div>
                {templateUploadStatus && (
                  <div className={`p-2 rounded text-xs ${templateUploadStatus.includes('Error') || templateUploadStatus.includes('Failed') ? 'bg-red-500/20 text-red-200' : 'bg-emerald-500/20 text-emerald-200'}`}>
                    {templateUploadStatus}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={templateUploadLoading || !templateFile}
                  className="w-full py-2 bg-gradient-to-r from-blue-500 to-[#00D4FF] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {templateUploadLoading ? 'Uploading...' : 'Upload Template'}
                </button>
              </form>
            </div>

            {/* Certificate Text Positioning Card */}
            <div className="glass-panel border border-[#00D4FF]/25 rounded-2xl p-6 space-y-4 mt-8">
              <h3 className="font-bold text-sm text-white flex items-center space-x-1.5 uppercase tracking-wider">
                <Edit className="h-4.5 w-4.5 text-[#00FFFF]" />
                <span>Certificate Text Positioning</span>
              </h3>
              <p className="text-gray-300 text-xs leading-relaxed">
                Adjust the placement (X/Y coordinates), size, and style of the dynamic text overlay when using a custom template.
              </p>
              <form onSubmit={handleSaveCertSettings} className="space-y-6">
                
                {/* Candidate Name Settings */}
                <div className="bg-[#081B33]/50 p-4 rounded-xl border border-white/5 space-y-3">
                  <h4 className="text-[#00FFFF] font-bold text-xs uppercase">Candidate Name</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">X Position</label>
                      <input type="number" value={certSettings.name.x} onChange={(e) => setCertSettings({...certSettings, name: {...certSettings.name, x: Number(e.target.value)}})} className="w-full bg-[#081B33] border border-[#00D4FF]/20 text-white text-xs rounded-lg p-2 focus:ring-1 focus:ring-[#00FFFF] outline-none" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Y Position</label>
                      <input type="number" value={certSettings.name.y} onChange={(e) => setCertSettings({...certSettings, name: {...certSettings.name, y: Number(e.target.value)}})} className="w-full bg-[#081B33] border border-[#00D4FF]/20 text-white text-xs rounded-lg p-2 focus:ring-1 focus:ring-[#00FFFF] outline-none" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Font Size</label>
                      <input type="number" value={certSettings.name.fontSize} onChange={(e) => setCertSettings({...certSettings, name: {...certSettings.name, fontSize: Number(e.target.value)}})} className="w-full bg-[#081B33] border border-[#00D4FF]/20 text-white text-xs rounded-lg p-2 focus:ring-1 focus:ring-[#00FFFF] outline-none" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Color (Hex)</label>
                      <input type="text" value={certSettings.name.color} onChange={(e) => setCertSettings({...certSettings, name: {...certSettings.name, color: e.target.value}})} className="w-full bg-[#081B33] border border-[#00D4FF]/20 text-white text-xs rounded-lg p-2 focus:ring-1 focus:ring-[#00FFFF] outline-none" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Font Style</label>
                      <select value={certSettings.name.fontFamily} onChange={(e) => setCertSettings({...certSettings, name: {...certSettings.name, fontFamily: e.target.value}})} className="w-full bg-[#081B33] border border-[#00D4FF]/20 text-white text-xs rounded-lg p-2 focus:ring-1 focus:ring-[#00FFFF] outline-none">
                        <option value="Helvetica">Normal</option>
                        <option value="Helvetica-Bold">Bold</option>
                        <option value="Helvetica-Oblique">Italic</option>
                        <option value="Times-Roman">Times Normal</option>
                        <option value="Times-Bold">Times Bold</option>
                        <option value="Courier">Courier</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Department Settings */}
                <div className="bg-[#081B33]/50 p-4 rounded-xl border border-white/5 space-y-3">
                  <h4 className="text-[#00FFFF] font-bold text-xs uppercase">Department Name</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">X Position</label>
                      <input type="number" value={certSettings.department.x} onChange={(e) => setCertSettings({...certSettings, department: {...certSettings.department, x: Number(e.target.value)}})} className="w-full bg-[#081B33] border border-[#00D4FF]/20 text-white text-xs rounded-lg p-2 focus:ring-1 focus:ring-[#00FFFF] outline-none" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Y Position</label>
                      <input type="number" value={certSettings.department.y} onChange={(e) => setCertSettings({...certSettings, department: {...certSettings.department, y: Number(e.target.value)}})} className="w-full bg-[#081B33] border border-[#00D4FF]/20 text-white text-xs rounded-lg p-2 focus:ring-1 focus:ring-[#00FFFF] outline-none" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Font Size</label>
                      <input type="number" value={certSettings.department.fontSize} onChange={(e) => setCertSettings({...certSettings, department: {...certSettings.department, fontSize: Number(e.target.value)}})} className="w-full bg-[#081B33] border border-[#00D4FF]/20 text-white text-xs rounded-lg p-2 focus:ring-1 focus:ring-[#00FFFF] outline-none" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Color (Hex)</label>
                      <input type="text" value={certSettings.department.color} onChange={(e) => setCertSettings({...certSettings, department: {...certSettings.department, color: e.target.value}})} className="w-full bg-[#081B33] border border-[#00D4FF]/20 text-white text-xs rounded-lg p-2 focus:ring-1 focus:ring-[#00FFFF] outline-none" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Font Style</label>
                      <select value={certSettings.department.fontFamily} onChange={(e) => setCertSettings({...certSettings, department: {...certSettings.department, fontFamily: e.target.value}})} className="w-full bg-[#081B33] border border-[#00D4FF]/20 text-white text-xs rounded-lg p-2 focus:ring-1 focus:ring-[#00FFFF] outline-none">
                        <option value="Helvetica">Normal</option>
                        <option value="Helvetica-Bold">Bold</option>
                        <option value="Helvetica-Oblique">Italic</option>
                        <option value="Times-Roman">Times Normal</option>
                        <option value="Times-Bold">Times Bold</option>
                        <option value="Courier">Courier</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* QR Code Settings */}
                <div className="bg-[#081B33]/50 p-4 rounded-xl border border-white/5 space-y-3">
                  <h4 className="text-[#00FFFF] font-bold text-xs uppercase">QR Code (Bottom Left)</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">X Position</label>
                      <input type="number" value={certSettings.qrCode.x} onChange={(e) => setCertSettings({...certSettings, qrCode: {...certSettings.qrCode, x: Number(e.target.value)}})} className="w-full bg-[#081B33] border border-[#00D4FF]/20 text-white text-xs rounded-lg p-2 focus:ring-1 focus:ring-[#00FFFF] outline-none" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Y Position</label>
                      <input type="number" value={certSettings.qrCode.y} onChange={(e) => setCertSettings({...certSettings, qrCode: {...certSettings.qrCode, y: Number(e.target.value)}})} className="w-full bg-[#081B33] border border-[#00D4FF]/20 text-white text-xs rounded-lg p-2 focus:ring-1 focus:ring-[#00FFFF] outline-none" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Size (px)</label>
                      <input type="number" value={certSettings.qrCode.size} onChange={(e) => setCertSettings({...certSettings, qrCode: {...certSettings.qrCode, size: Number(e.target.value)}})} className="w-full bg-[#081B33] border border-[#00D4FF]/20 text-white text-xs rounded-lg p-2 focus:ring-1 focus:ring-[#00FFFF] outline-none" />
                    </div>
                  </div>
                </div>

                {certSettingsStatus && (
                  <div className={`p-2 rounded text-xs ${certSettingsStatus.includes('Error') || certSettingsStatus.includes('Failed') ? 'bg-red-500/20 text-red-200' : 'bg-emerald-500/20 text-emerald-200'}`}>
                    {certSettingsStatus}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={certSettingsLoading}
                  className="w-full py-2 bg-gradient-to-r from-blue-500 to-[#00D4FF] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {certSettingsLoading ? 'Saving...' : 'Save Settings'}
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
                      onClick={() => handleUpdateRegStatus('OPEN', quizLoginStatus)}
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
                      onClick={() => handleUpdateRegStatus('CLOSED', quizLoginStatus)}
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
                      onClick={() => handleUpdateRegStatus(eqRegStatus, 'OPEN')}
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
                      onClick={() => handleUpdateRegStatus(eqRegStatus, 'CLOSED')}
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
