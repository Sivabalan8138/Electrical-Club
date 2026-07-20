'use client';

import React, { useState, useEffect } from 'react';
import { Lightbulb, CheckSquare, Upload, ArrowLeft, Cpu, CloudLightning, ShieldCheck, HeartPulse, Sprout, Sparkles, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ThinkBigPage() {
  const [viewState, setViewState] = useState<'INITIAL' | 'REGISTER' | 'UPLOAD' | 'SUCCESS'>('INITIAL');
  const [tbRegOpen, setTbRegOpen] = useState(true);

  useEffect(() => {
    const fetchRegStatus = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/registration-status`);
        if (res.ok) {
          const data = await res.json();
          setTbRegOpen(data.thinkBig === 'OPEN');
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchRegStatus();
  }, []);

  // Registration form
  const [teamName, setTeamName] = useState('');
  const [domain, setDomain] = useState('Healthcare Technology');
  
  const [m1Name, setM1Name] = useState('');
  const [m1Reg, setM1Reg] = useState('');
  const [m1Dept, setM1Dept] = useState('');
  const [m1Email, setM1Email] = useState('');
  const [m1Mobile, setM1Mobile] = useState('');

  const [m2Name, setM2Name] = useState('');
  const [m2Reg, setM2Reg] = useState('');
  const [m2Dept, setM2Dept] = useState('');
  const [m2Email, setM2Email] = useState('');
  const [m2Mobile, setM2Mobile] = useState('');

  // Optional members
  const [membersCount, setMembersCount] = useState<2 | 3 | 4>(2);
  
  const [m3Name, setM3Name] = useState('');
  const [m3Reg, setM3Reg] = useState('');
  const [m3Dept, setM3Dept] = useState('');
  const [m3Email, setM3Email] = useState('');
  const [m3Mobile, setM3Mobile] = useState('');

  const [m4Name, setM4Name] = useState('');
  const [m4Reg, setM4Reg] = useState('');
  const [m4Dept, setM4Dept] = useState('');
  const [m4Email, setM4Email] = useState('');
  const [m4Mobile, setM4Mobile] = useState('');

  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [registeredId, setRegisteredId] = useState('');

  // Upload form
  const [uploadId, setUploadId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const domainsList = [
    { name: 'Healthcare Technology', icon: HeartPulse },
    { name: 'Renewable Energy', icon: CloudLightning },
    { name: 'Agriculture Technology', icon: Sprout },
    { name: 'Artificial Intelligence (AI)', icon: Sparkles },
  ];

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError('');

    const body: any = {
      teamName,
      domain,
      member1Name: m1Name,
      member1RegisterNumber: m1Reg,
      member1Department: m1Dept,
      member1Email: m1Email,
      member1MobileNumber: m1Mobile,
      member2Name: m2Name,
      member2RegisterNumber: m2Reg,
      member2Department: m2Dept,
      member2Email: m2Email,
      member2MobileNumber: m2Mobile,
    };

    if (membersCount >= 3) {
      body.member3Name = m3Name;
      body.member3RegisterNumber = m3Reg;
      body.member3Department = m3Dept;
      body.member3Email = m3Email;
      body.member3MobileNumber = m3Mobile;
    }

    if (membersCount === 4) {
      body.member4Name = m4Name;
      body.member4RegisterNumber = m4Reg;
      body.member4Department = m4Dept;
      body.member4Email = m4Email;
      body.member4MobileNumber = m4Mobile;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/thinkbig/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        setRegisteredId(data.registrationId);
        setUploadId(data.registrationId); // Pre-fill upload ID
        setViewState('UPLOAD');
      } else {
        setRegError(data.error || 'Failed to register team.');
      }
    } catch (err) {
      setRegError('Connection issue. Please retry.');
    } finally {
      setRegLoading(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select a presentation file.');
      return;
    }

    setUploadLoading(true);
    setUploadError('');

    const formData = new FormData();
    formData.append('registrationId', uploadId.trim());
    formData.append('file', selectedFile);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/thinkbig/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setViewState('SUCCESS');
      } else {
        setUploadError(data.error || 'Failed to upload presentation.');
      }
    } catch (err) {
      setUploadError('Failed to upload. Try checking the file dimensions (max 50MB).');
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* 1. INITIAL SELECTION */}
      {viewState === 'INITIAL' && (
        <div className="text-center space-y-12 py-16">
          <div className="space-y-4">
            <Lightbulb className="h-16 w-16 text-[#00FFFF] mx-auto filter drop-shadow-[0_0_12px_#00FFFF]" />
            <h1 className="text-4xl font-extrabold tracking-tight">Think Big Innovation Workspace</h1>
            <p className="text-gray-300 max-w-xl mx-auto text-sm">
              An idea presentation league. Submit project pitch slides under EEE domains. Submissions undergo automatic AI feasibility checks and coordinator grades.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <button
              onClick={() => setViewState('REGISTER')}
              className="glass-panel p-8 rounded-2xl border border-[#00D4FF]/20 text-left hover:border-[#00FFFF]/40 transition-all flex flex-col justify-between items-start space-y-4 cursor-pointer"
            >
              <div className="p-3 bg-[#00D4FF]/10 rounded-xl text-[#00D4FF]">
                <Cpu className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Team Registration</h3>
                <p className="text-gray-400 text-xs mt-1">Assemble a team of 2 to 4 members, choose your domain, and submit registration details.</p>
              </div>
            </button>

            <button
              onClick={() => setViewState('UPLOAD')}
              className="glass-panel p-8 rounded-2xl border border-[#00D4FF]/20 text-left hover:border-[#00FFFF]/40 transition-all flex flex-col justify-between items-start space-y-4 cursor-pointer"
            >
              <div className="p-3 bg-[#00FFFF]/10 rounded-xl text-[#00FFFF]">
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Upload Presentation</h3>
                <p className="text-gray-400 text-xs mt-1">Already registered? Input your team code and upload your final PPT / PDF slides.</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* 2. REGISTRATION FORM */}
      {viewState === 'REGISTER' && (
        <div className="glass-panel rounded-2xl border border-[#00D4FF]/20 p-6 md:p-8 space-y-6">
          <div className="flex justify-between items-center border-b border-[#00D4FF]/20 pb-4">
            <div>
              <h2 className="text-2xl font-bold">Think Big Registration</h2>
              <p className="text-xs text-gray-400">Department of Electrical & Electronics Engineering</p>
            </div>
            <button onClick={() => setViewState('INITIAL')} className="flex items-center space-x-1 text-xs text-[#00FFFF] hover:underline cursor-pointer">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>
          </div>

          {!tbRegOpen ? (
            <div className="text-center py-12 space-y-4">
              <div className="inline-flex p-4 bg-rose-500/10 text-rose-400 rounded-full border border-rose-500/20">
                <AlertTriangle className="h-8 w-8 filter drop-shadow-[0_0_8px_rgba(244,63,94,0.3)]" />
              </div>
              <h3 className="text-xl font-bold text-white">Registrations Closed</h3>
              <p className="text-gray-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
                The registration period for the Think Big Idea Presentation has ended or been closed by the administrator. If you already registered, you can still upload your final presentation slides.
              </p>
              <button
                onClick={() => setViewState('UPLOAD')}
                className="mt-4 px-6 py-2 bg-[#00D4FF]/10 text-[#00FFFF] hover:bg-[#00D4FF] hover:text-[#081B33] border border-[#00FFFF]/30 font-extrabold text-sm rounded-xl transition-all cursor-pointer"
              >
                Go to Presentation Upload
              </button>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Team Name</label>
                  <input
                    type="text"
                    required
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. AgriBot Creators"
                    className="w-full bg-[#081B33] border border-[#00D4FF]/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00FFFF]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Project Domain</label>
                  <select
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="w-full bg-[#081B33] border border-[#00D4FF]/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00FFFF]"
                  >
                    {domainsList.map((d) => (
                      <option key={d.name} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* MEMBER 1 DETAILS */}
              <div className="border-t border-[#00D4FF]/10 pt-4 space-y-4">
                <h3 className="font-bold text-white text-sm">Member 1 Details (Leader)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder="Full Name"
                    required
                    value={m1Name}
                    onChange={(e) => setM1Name(e.target.value)}
                    className="bg-[#081B33] border border-[#00D4FF]/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#00FFFF]"
                  />
                  <input
                    type="text"
                    placeholder="Register Number"
                    required
                    value={m1Reg}
                    onChange={(e) => setM1Reg(e.target.value)}
                    className="bg-[#081B33] border border-[#00D4FF]/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#00FFFF]"
                  />
                  <input
                    type="text"
                    placeholder="Department (e.g. EEE)"
                    required
                    value={m1Dept}
                    onChange={(e) => setM1Dept(e.target.value)}
                    className="bg-[#081B33] border border-[#00D4FF]/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#00FFFF]"
                  />
                  <input
                    type="email"
                    placeholder="Email Address"
                    required
                    value={m1Email}
                    onChange={(e) => setM1Email(e.target.value)}
                    className="md:col-span-2 bg-[#081B33] border border-[#00D4FF]/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#00FFFF]"
                  />
                  <input
                    type="tel"
                    placeholder="Mobile Number"
                    required
                    value={m1Mobile}
                    onChange={(e) => setM1Mobile(e.target.value)}
                    className="bg-[#081B33] border border-[#00D4FF]/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#00FFFF]"
                  />
                </div>
              </div>

              {/* MEMBER 2 DETAILS */}
              <div className="border-t border-[#00D4FF]/10 pt-4 space-y-4">
                <h3 className="font-bold text-white text-sm">Member 2 Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder="Full Name"
                    required
                    value={m2Name}
                    onChange={(e) => setM2Name(e.target.value)}
                    className="bg-[#081B33] border border-[#00D4FF]/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#00FFFF]"
                  />
                  <input
                    type="text"
                    placeholder="Register Number"
                    required
                    value={m2Reg}
                    onChange={(e) => setM2Reg(e.target.value)}
                    className="bg-[#081B33] border border-[#00D4FF]/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#00FFFF]"
                  />
                  <input
                    type="text"
                    placeholder="Department (e.g. EEE)"
                    required
                    value={m2Dept}
                    onChange={(e) => setM2Dept(e.target.value)}
                    className="bg-[#081B33] border border-[#00D4FF]/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#00FFFF]"
                  />
                  <input
                    type="email"
                    placeholder="Email Address"
                    required
                    value={m2Email}
                    onChange={(e) => setM2Email(e.target.value)}
                    className="md:col-span-2 bg-[#081B33] border border-[#00D4FF]/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#00FFFF]"
                  />
                  <input
                    type="tel"
                    placeholder="Mobile Number"
                    required
                    value={m2Mobile}
                    onChange={(e) => setM2Mobile(e.target.value)}
                    className="bg-[#081B33] border border-[#00D4FF]/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#00FFFF]"
                  />
                </div>
              </div>

              {/* OPTIONAL MEMBERS TOGGLE */}
              <div className="border-t border-[#00D4FF]/10 pt-4 space-y-3">
                <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Number of Team Members</span>
                <div className="flex space-x-2">
                  {([2, 3, 4] as const).map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setMembersCount(num)}
                      className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        membersCount === num
                          ? 'bg-[#00D4FF]/10 text-[#00FFFF] border-[#00FFFF]/45 shadow-[0_0_8px_rgba(0,212,255,0.15)]'
                          : 'bg-[#081B33]/50 text-gray-400 border-white/5 hover:border-gray-500'
                      }`}
                    >
                      {num === 2 ? '2 Members (Default)' : `${num} Members`}
                    </button>
                  ))}
                </div>
              </div>

              {/* MEMBER 3 DETAILS */}
              {membersCount >= 3 && (
                <div className="border-t border-[#00D4FF]/10 pt-4 space-y-4">
                  <h3 className="font-bold text-white text-sm">Member 3 Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      type="text"
                      placeholder="Full Name"
                      required
                      value={m3Name}
                      onChange={(e) => setM3Name(e.target.value)}
                      className="bg-[#081B33] border border-[#00D4FF]/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#00FFFF]"
                    />
                    <input
                      type="text"
                      placeholder="Register Number"
                      required
                      value={m3Reg}
                      onChange={(e) => setM3Reg(e.target.value)}
                      className="bg-[#081B33] border border-[#00D4FF]/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#00FFFF]"
                    />
                    <input
                      type="text"
                      placeholder="Department (e.g. EEE)"
                      required
                      value={m3Dept}
                      onChange={(e) => setM3Dept(e.target.value)}
                      className="bg-[#081B33] border border-[#00D4FF]/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#00FFFF]"
                    />
                    <input
                      type="email"
                      placeholder="Email Address"
                      required
                      value={m3Email}
                      onChange={(e) => setM3Email(e.target.value)}
                      className="md:col-span-2 bg-[#081B33] border border-[#00D4FF]/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#00FFFF]"
                    />
                    <input
                      type="tel"
                      placeholder="Mobile Number"
                      required
                      value={m3Mobile}
                      onChange={(e) => setM3Mobile(e.target.value)}
                      className="bg-[#081B33] border border-[#00D4FF]/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#00FFFF]"
                    />
                  </div>
                </div>
              )}

              {/* MEMBER 4 DETAILS */}
              {membersCount === 4 && (
                <div className="border-t border-[#00D4FF]/10 pt-4 space-y-4">
                  <h3 className="font-bold text-white text-sm">Member 4 Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      type="text"
                      placeholder="Full Name"
                      required
                      value={m4Name}
                      onChange={(e) => setM4Name(e.target.value)}
                      className="bg-[#081B33] border border-[#00D4FF]/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#00FFFF]"
                    />
                    <input
                      type="text"
                      placeholder="Register Number"
                      required
                      value={m4Reg}
                      onChange={(e) => setM4Reg(e.target.value)}
                      className="bg-[#081B33] border border-[#00D4FF]/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#00FFFF]"
                    />
                    <input
                      type="text"
                      placeholder="Department (e.g. EEE)"
                      required
                      value={m4Dept}
                      onChange={(e) => setM4Dept(e.target.value)}
                      className="bg-[#081B33] border border-[#00D4FF]/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#00FFFF]"
                    />
                    <input
                      type="email"
                      placeholder="Email Address"
                      required
                      value={m4Email}
                      onChange={(e) => setM4Email(e.target.value)}
                      className="md:col-span-2 bg-[#081B33] border border-[#00D4FF]/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#00FFFF]"
                    />
                    <input
                      type="tel"
                      placeholder="Mobile Number"
                      required
                      value={m4Mobile}
                      onChange={(e) => setM4Mobile(e.target.value)}
                      className="bg-[#081B33] border border-[#00D4FF]/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#00FFFF]"
                    />
                  </div>
                </div>
              )}

              {regError && <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-xs font-semibold">{regError}</div>}

              <button
                type="submit"
                disabled={regLoading}
                className="w-full py-3.5 bg-gradient-to-r from-[#00D4FF] to-[#00FFFF] text-[#081B33] font-bold rounded-xl text-sm hover:opacity-95 shadow-[0_0_12px_rgba(0,212,255,0.3)] transition-all cursor-pointer"
              >
                {regLoading ? 'Registering Team...' : 'Register Team & Continue'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* 3. UPLOAD FILE FORM */}
      {viewState === 'UPLOAD' && (
        <div className="max-w-md mx-auto glass-panel rounded-2xl border border-[#00D4FF]/20 p-6 md:p-8 space-y-6">
          <div className="flex justify-between items-center border-b border-[#00D4FF]/20 pb-4">
            <h2 className="text-xl font-bold">Upload Presentation</h2>
            <button onClick={() => setViewState('INITIAL')} className="text-xs text-gray-400 hover:text-white cursor-pointer">
              Cancel
            </button>
          </div>

          <form onSubmit={handleFileUpload} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Team Reference ID</label>
              <input
                type="text"
                required
                value={uploadId}
                onChange={(e) => setUploadId(e.target.value)}
                placeholder="Paste your Team Registration ID"
                className="w-full bg-[#081B33] border border-[#00D4FF]/25 rounded-xl px-4 py-3 text-sm text-center text-white placeholder-gray-500 font-mono focus:outline-none focus:border-[#00FFFF]"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Slide File (PPTX, PPT, PDF)</label>
              <div className="border-2 border-dashed border-[#00D4FF]/20 rounded-xl p-6 text-center cursor-pointer hover:border-[#00FFFF]/40 relative bg-[#081B33]/50">
                <input
                  type="file"
                  required
                  accept=".pptx,.ppt,.pdf"
                  onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="h-8 w-8 text-[#00D4FF] mx-auto mb-2 animate-bounce" />
                <span className="text-xs text-gray-300 block font-semibold">
                  {selectedFile ? selectedFile.name : 'Select or drag presentation slides'}
                </span>
                <span className="text-[9px] text-gray-500 block mt-1">Maximum file size: 50MB</span>
              </div>
            </div>

            {uploadError && <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-xs font-semibold text-center">{uploadError}</div>}

            <button
              type="submit"
              disabled={uploadLoading}
              className="w-full py-3.5 bg-gradient-to-r from-[#00D4FF] to-[#00FFFF] text-[#081B33] font-bold rounded-xl text-sm hover:opacity-95 shadow-[0_0_12px_rgba(0,212,255,0.3)] transition-all cursor-pointer"
            >
              {uploadLoading ? 'Uploading & AI Grading slides...' : 'Submit Presentation File'}
            </button>
          </form>
        </div>
      )}

      {/* 4. SUCCESS SCREEN */}
      {viewState === 'SUCCESS' && (
        <div className="max-w-md mx-auto glass-panel rounded-2xl border border-[#00D4FF]/20 p-6 md:p-8 text-center space-y-6">
          <div className="p-4 bg-[#00FFFF]/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto border border-[#00FFFF]/30">
            <ShieldCheck className="h-10 w-10 text-[#00FFFF]" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Submission Received!</h2>
            <p className="text-xs text-green-400">Presentation uploaded and saved securely.</p>
          </div>

          <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
            Thank you! Your presentation file has been queued for evaluation. Our EEE expert panel and AI evaluator will review the project slides. Participation certificates will be emailed post-approval.
          </p>

          <button
            onClick={() => setViewState('INITIAL')}
            className="w-full py-3 bg-[#00D4FF]/10 border border-[#00FFFF]/20 text-[#00FFFF] hover:bg-[#00D4FF]/20 font-bold text-sm rounded-xl transition-all cursor-pointer"
          >
            Back to Event Screen
          </button>
        </div>
      )}
    </div>
  );
}
