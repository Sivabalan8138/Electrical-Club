'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Cpu, ShieldAlert, Award, UserPlus, LogIn, Camera, Mic, CheckSquare, Clock, AlertTriangle, AlertOctagon } from 'lucide-react';
import confetti from 'canvas-confetti';
import Link from 'next/link';

interface Question {
  id: string;
  category: string;
  text: string;
  options: Array<{ originalLabel: string; text: string }>;
}

export default function ElectroQuestPage() {
  const [viewState, setViewState] = useState<'INITIAL' | 'REGISTER' | 'LOGIN' | 'INSTRUCTIONS' | 'QUIZ' | 'COMPLETED'>('INITIAL');
  const [eqRegOpen, setEqRegOpen] = useState(true);

  useEffect(() => {
    const fetchRegStatus = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/registration-status`);
        if (res.ok) {
          const data = await res.json();
          setEqRegOpen(data.electroQuest === 'OPEN');
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchRegStatus();
  }, []);
  
  // Registration state
  const [teamName, setTeamName] = useState('');
  const [member1Name, setMember1Name] = useState('');
  const [member1Reg, setMember1Reg] = useState('');
  const [member1Dept, setMember1Dept] = useState('');
  const [member1Year, setMember1Year] = useState('First Year');
  const [member1Email, setMember1Email] = useState('');
  const [member1Mobile, setMember1Mobile] = useState('');
  
  const [hasMember2, setHasMember2] = useState(false);
  const [member2Name, setMember2Name] = useState('');
  const [member2Reg, setMember2Reg] = useState('');
  const [member2Dept, setMember2Dept] = useState('');
  const [member2Year, setMember2Year] = useState('First Year');
  const [member2Email, setMember2Email] = useState('');
  const [member2Mobile, setMember2Mobile] = useState('');

  const [regLoading, setRegLoading] = useState(false);
  const [regSuccessMessage, setRegSuccessMessage] = useState('');
  const [regErrorMessage, setRegErrorMessage] = useState('');

  // Login & Session state
  const [candidateIdInput, setCandidateIdInput] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginErrorMessage, setLoginErrorMessage] = useState('');
  const [token, setToken] = useState('');
  
  // Quiz state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(70); // in minutes
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({}); // questionId -> selectedLabel
  const [warningsCount, setWarningsCount] = useState(0);
  const [showWarningAlert, setShowWarningAlert] = useState(false);
  const [warningText, setWarningText] = useState('');
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  // Result state
  const [quizScore, setQuizScore] = useState(0);
  const [quizPercentage, setQuizPercentage] = useState(0);
  const [quizTimeTaken, setQuizTimeTaken] = useState(0);
  const [isDisqualified, setIsDisqualified] = useState(false);

  // Audio & video stream elements for proctoring
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Web Speech API / Noise tracker interval
  useEffect(() => {
    if (viewState === 'QUIZ') {
      // 1. Hook up browser events proctor listeners
      const handleVisibilityChange = () => {
        if (document.hidden) {
          triggerProctorWarning('TAB_SWITCH', 'Switched browser tabs or minimized window');
        }
      };

      const handleBlur = () => {
        triggerProctorWarning('WINDOW_BLUR', 'Clicked outside the active exam window');
      };

      const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        triggerProctorWarning('RIGHT_CLICK', 'Attempted to right-click');
      };

      const handleCopyPaste = (e: ClipboardEvent) => {
        e.preventDefault();
        triggerProctorWarning('COPY_PASTE', 'Attempted copy/paste action');
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        // Devtools shortcuts block: F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
        if (
          e.key === 'F12' ||
          (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c'))
        ) {
          e.preventDefault();
          triggerProctorWarning('DEV_TOOLS', 'Attempted to open Developer Tools');
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('blur', handleBlur);
      document.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('copy', handleCopyPaste);
      document.addEventListener('paste', handleCopyPaste);
      document.addEventListener('keydown', handleKeyDown);

      // 2. Set up Web Audio sound amplitude monitoring
      setupAudioMonitoring();

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('blur', handleBlur);
        document.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('copy', handleCopyPaste);
        document.removeEventListener('paste', handleCopyPaste);
        document.removeEventListener('keydown', handleKeyDown);

        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      };
    }
  }, [viewState, token, warningsCount]);

  // Audio level analyser threshold checks
  const setupAudioMonitoring = async () => {
    try {
      if (!streamRef.current) return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioCtx();
      const source = audioContext.createMediaStreamSource(streamRef.current);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let speakingCounter = 0;

      const checkVolume = () => {
        if (viewState !== 'QUIZ') return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        // Threshold of 35 indicates significant noise/speech
        if (average > 35) {
          speakingCounter++;
          // Trigger voice warning if volume is high continuously for 4 checks (~4 seconds)
          if (speakingCounter >= 4) {
            triggerProctorWarning('NOISE', 'Detected loud background noise or voice conversation');
            speakingCounter = 0;
          }
        } else {
          speakingCounter = Math.max(0, speakingCounter - 1);
        }

        setTimeout(checkVolume, 1000);
      };

      checkVolume();
    } catch (err) {
      console.error('Audio monitoring failed:', err);
    }
  };

  const triggerProctorWarning = async (type: string, detail: string) => {
    // Prevent double warnings if submitting/done
    if (viewState !== 'QUIZ' || submittingQuiz) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/quiz/proctor/violation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type, detail }),
      });
      const data = await res.json();
      
      const newWarningCount = data.warningNumber;
      setWarningsCount(newWarningCount);

      if (data.autoSubmitted) {
        // Disqualified
        setIsDisqualified(true);
        cleanupStreams();
        setViewState('COMPLETED');
      } else {
        setWarningText(detail);
        setShowWarningAlert(true);
      }
    } catch (err) {
      console.error('Failed to log violation:', err);
    }
  };

  // Timer countdown
  useEffect(() => {
    if (viewState === 'QUIZ') {
      const interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 0.02) {
            clearInterval(interval);
            autoSubmitQuiz();
            return 0;
          }
          return prev - 0.0167; // decrement ~1 second
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [viewState]);

  const cleanupStreams = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // Check hardware permissions
  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setViewState('QUIZ');
      fetchQuestions();
    } catch (err) {
      alert('Camera and Microphone access are mandatory to launch the exam.');
    }
  };

  const fetchQuestions = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/quiz/questions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        setViewState('LOGIN');
        cleanupStreams();
      } else {
        setQuestions(data.questions);
        setTimeRemaining(data.timeRemaining);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegLoading(true);
    setRegSuccessMessage('');
    setRegErrorMessage('');

    const body: any = {
      teamName,
      member1Name,
      member1RegisterNumber: member1Reg,
      member1Department: member1Dept,
      member1Year: member1Year,
      member1Email: member1Email,
      member1MobileNumber: member1Mobile,
    };

    if (hasMember2) {
      body.member2Name = member2Name;
      body.member2RegisterNumber = member2Reg;
      body.member2Department = member2Dept;
      body.member2Year = member2Year;
      body.member2Email = member2Email;
      body.member2MobileNumber = member2Mobile;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/electroquest/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        setRegSuccessMessage(`Registration successful! Candidate ID is ${data.candidateId}. Check your email.`);
        // Clean fields
        setTeamName('');
        setMember1Name('');
        setMember1Reg('');
        setMember1Dept('');
        setMember1Email('');
        setMember1Mobile('');
        setHasMember2(false);
      } else {
        setRegErrorMessage(data.error || 'Registration failed');
      }
    } catch (err) {
      setRegErrorMessage('Failed to connect to the server.');
    } finally {
      setRegLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginErrorMessage('');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/candidate/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: candidateIdInput.trim() }),
      });
      const data = await res.json();

      if (res.ok) {
        setToken(data.token);
        setViewState('INSTRUCTIONS');
      } else {
        setLoginErrorMessage(data.error || 'Authentication failed');
      }
    } catch (err) {
      setLoginErrorMessage('Failed to connect to backend.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleOptionSelect = (qId: string, label: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [qId]: label }));
  };

  const submitQuizAnswers = async () => {
    setSubmittingQuiz(true);
    cleanupStreams();

    const answersArray = Object.keys(selectedAnswers).map((qId) => ({
      questionId: qId,
      selectedLabel: selectedAnswers[qId],
    }));

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/quiz/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answers: answersArray }),
      });
      const data = await res.json();

      if (res.ok) {
        setQuizScore(data.score);
        setQuizPercentage(data.percentage);
        setQuizTimeTaken(data.timeTaken);
        setViewState('COMPLETED');
        confetti({ particleCount: 150, spread: 80 });
      } else {
        alert('Submission failed: ' + data.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const autoSubmitQuiz = () => {
    submitQuizAnswers();
    alert('Time limit expired! Your answers have been automatically saved.');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* 1. INITIAL LANDING OPTIONS */}
      {viewState === 'INITIAL' && (
        <div className="text-center space-y-12 py-16">
          <div className="space-y-4">
            <Cpu className="h-16 w-16 text-[#00FFFF] mx-auto filter drop-shadow-[0_0_12px_#00FFFF]" />
            <h1 className="text-4xl font-extrabold tracking-tight">ElectroQuest Quiz Portal</h1>
            <p className="text-gray-300 max-w-xl mx-auto text-sm">
              An online proctored technical quiz for EEE and ECE departments. Verify your candidate credentials or register a new team of up to 2 members.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <button
              onClick={() => setViewState('REGISTER')}
              className="glass-panel p-8 rounded-2xl border border-[#00D4FF]/20 text-left hover:border-[#00FFFF]/40 group transition-all flex flex-col justify-between items-start space-y-4 cursor-pointer"
            >
              <div className="p-3 bg-[#00D4FF]/10 rounded-xl text-[#00D4FF]">
                <UserPlus className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Team Registration</h3>
                <p className="text-gray-400 text-xs mt-1">Register your details to receive a unique Candidate access ID via email.</p>
              </div>
            </button>

            <button
              onClick={() => setViewState('LOGIN')}
              className="glass-panel p-8 rounded-2xl border border-[#00D4FF]/20 text-left hover:border-[#00FFFF]/40 group transition-all flex flex-col justify-between items-start space-y-4 cursor-pointer"
            >
              <div className="p-3 bg-[#00FFFF]/10 rounded-xl text-[#00FFFF]">
                <LogIn className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Candidate Sign In</h3>
                <p className="text-gray-400 text-xs mt-1">Already registered? Log in with your unique Candidate ID code to begin.</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* 2. REGISTRATION FORM */}
      {viewState === 'REGISTER' && (
        <div className="glass-panel rounded-2xl border border-[#00D4FF]/20 p-6 md:p-8 space-y-6">
          <div className="border-b border-[#00D4FF]/20 pb-4 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">ElectroQuest Registration</h2>
              <p className="text-xs text-gray-400">Department of Electrical and Electronics Engineering</p>
            </div>
            <button onClick={() => setViewState('INITIAL')} className="text-xs text-[#00FFFF] hover:underline cursor-pointer">
              Go Back
            </button>
          </div>

          {!eqRegOpen ? (
            <div className="text-center py-12 space-y-4">
              <div className="inline-flex p-4 bg-rose-500/10 text-rose-400 rounded-full border border-rose-500/20">
                <AlertTriangle className="h-8 w-8 filter drop-shadow-[0_0_8px_rgba(244,63,94,0.3)]" />
              </div>
              <h3 className="text-xl font-bold text-white">Registrations Closed</h3>
              <p className="text-gray-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
                The registration period for the ElectroQuest Technical Quiz has ended or been closed by the administrator. If you already registered, you can still sign in using your Candidate ID.
              </p>
              <button
                onClick={() => setViewState('LOGIN')}
                className="mt-4 px-6 py-2 bg-[#00D4FF]/10 text-[#00FFFF] hover:bg-[#00D4FF] hover:text-[#081B33] border border-[#00FFFF]/30 font-extrabold text-sm rounded-xl transition-all cursor-pointer"
              >
                Go to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Team Name</label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Tesla Innovators"
                  className="w-full bg-[#081B33] border border-[#00D4FF]/20 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00FFFF]"
                />
              </div>

              {/* MEMBER 1 DETAILS */}
              <div className="border-t border-[#00D4FF]/10 pt-4 space-y-4">
                <h3 className="font-bold text-white text-sm">Member 1 Details (Leader)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={member1Name}
                      onChange={(e) => setMember1Name(e.target.value)}
                      placeholder="Student 1 Name"
                      className="w-full bg-[#081B33] border border-[#00D4FF]/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#00FFFF]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Register Number</label>
                    <input
                      type="text"
                      required
                      value={member1Reg}
                      onChange={(e) => setMember1Reg(e.target.value)}
                      placeholder="e.g. 927620105001"
                      className="w-full bg-[#081B33] border border-[#00D4FF]/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#00FFFF]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Department</label>
                    <input
                      type="text"
                      required
                      value={member1Dept}
                      onChange={(e) => setMember1Dept(e.target.value)}
                      placeholder="e.g. EEE"
                      className="w-full bg-[#081B33] border border-[#00D4FF]/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#00FFFF]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Year of Study</label>
                    <select
                      value={member1Year}
                      onChange={(e) => setMember1Year(e.target.value)}
                      className="w-full bg-[#081B33] border border-[#00D4FF]/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#00FFFF]"
                    >
                      <option value="First Year">First Year</option>
                      <option value="Second Year">Second Year</option>
                      <option value="Third Year">Third Year</option>
                      <option value="Final Year">Final Year</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Mobile Number</label>
                    <input
                      type="tel"
                      required
                      value={member1Mobile}
                      onChange={(e) => setMember1Mobile(e.target.value)}
                      placeholder="10-digit number"
                      className="w-full bg-[#081B33] border border-[#00D4FF]/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#00FFFF]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={member1Email}
                    onChange={(e) => setMember1Email(e.target.value)}
                    placeholder="student1@vsb.edu.in"
                    className="w-full bg-[#081B33] border border-[#00D4FF]/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#00FFFF]"
                  />
                </div>
              </div>

              {/* MEMBER 2 OPTION */}
              <div className="border-t border-[#00D4FF]/10 pt-4 space-y-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="hasMember2"
                    checked={hasMember2}
                    onChange={(e) => setHasMember2(e.target.checked)}
                    className="h-4 w-4 bg-[#081B33] border border-[#00D4FF]/15 text-[#00FFFF] focus:ring-0 rounded cursor-pointer"
                  />
                  <label htmlFor="hasMember2" className="text-xs font-bold text-gray-300 uppercase tracking-wide cursor-pointer select-none">
                    Add Team Member 2 (Optional)
                  </label>
                </div>
              </div>

              {/* MEMBER 2 DETAILS */}
              {hasMember2 && (
                <div className="border-t border-[#00D4FF]/10 pt-4 space-y-4">
                  <h3 className="font-bold text-white text-sm">Member 2 Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        value={member2Name}
                        onChange={(e) => setMember2Name(e.target.value)}
                        className="w-full bg-[#081B33] border border-[#00D4FF]/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#00FFFF]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Register Number</label>
                      <input
                        type="text"
                        required
                        value={member2Reg}
                        onChange={(e) => setMember2Reg(e.target.value)}
                        className="w-full bg-[#081B33] border border-[#00D4FF]/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#00FFFF]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Department</label>
                      <input
                        type="text"
                        required
                        value={member2Dept}
                        onChange={(e) => setMember2Dept(e.target.value)}
                        className="w-full bg-[#081B33] border border-[#00D4FF]/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#00FFFF]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Year of Study</label>
                      <select
                        value={member2Year}
                        onChange={(e) => setMember2Year(e.target.value)}
                        className="w-full bg-[#081B33] border border-[#00D4FF]/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#00FFFF]"
                      >
                        <option value="First Year">First Year</option>
                        <option value="Second Year">Second Year</option>
                        <option value="Third Year">Third Year</option>
                        <option value="Final Year">Final Year</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Mobile Number</label>
                      <input
                        type="tel"
                        required
                        value={member2Mobile}
                        onChange={(e) => setMember2Mobile(e.target.value)}
                        className="w-full bg-[#081B33] border border-[#00D4FF]/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#00FFFF]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={member2Email}
                      onChange={(e) => setMember2Email(e.target.value)}
                      className="w-full bg-[#081B33] border border-[#00D4FF]/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#00FFFF]"
                    />
                  </div>
                </div>
              )}

              {regSuccessMessage && <div className="p-3 bg-green-500/10 border border-green-500/25 rounded-xl text-green-400 text-xs font-semibold">{regSuccessMessage}</div>}
              {regErrorMessage && <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-xs font-semibold">{regErrorMessage}</div>}

              <button
                type="submit"
                disabled={regLoading}
                className="w-full py-3 bg-gradient-to-r from-[#00D4FF] to-[#00FFFF] text-[#081B33] font-bold rounded-xl text-sm hover:opacity-95 shadow-[0_0_12px_rgba(0,212,255,0.3)] transition-all cursor-pointer"
              >
                {regLoading ? 'Registering Team...' : 'Submit Registration'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* 3. LOGIN PAGE */}
      {viewState === 'LOGIN' && (
        <div className="max-w-md mx-auto glass-panel rounded-2xl border border-[#00D4FF]/20 p-6 md:p-8 space-y-6">
          <div className="text-center space-y-2">
            <Cpu className="h-10 w-10 text-[#00FFFF] mx-auto filter drop-shadow-[0_0_8px_#00FFFF]" />
            <h2 className="text-xl font-bold">Candidate Sign In</h2>
            <p className="text-xs text-gray-400">Enter your unique Candidate ID (e.g., EQ2026-0001)</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="text"
              required
              value={candidateIdInput}
              onChange={(e) => setCandidateIdInput(e.target.value)}
              placeholder="Candidate ID (EQ2026-xxxx)"
              className="w-full bg-[#081B33] border border-[#00D4FF]/20 rounded-xl px-4 py-3 text-sm text-center text-white placeholder-gray-500 font-bold focus:outline-none focus:border-[#00FFFF]"
            />

            {loginErrorMessage && <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-xs font-semibold text-center">{loginErrorMessage}</div>}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 bg-gradient-to-r from-[#00D4FF] to-[#00FFFF] text-[#081B33] font-bold rounded-xl text-sm hover:opacity-95 shadow-[0_0_12px_rgba(0,212,255,0.3)] transition-all cursor-pointer"
            >
              {loginLoading ? 'Verifying ID...' : 'Log In & Access Exam'}
            </button>
          </form>

          <button onClick={() => setViewState('INITIAL')} className="block text-center text-xs text-gray-400 hover:text-white mx-auto cursor-pointer">
            Go Back
          </button>
        </div>
      )}

      {/* 4. PRE-EXAM INSTRUCTIONS & PERMISSIONS */}
      {viewState === 'INSTRUCTIONS' && (
        <div className="glass-panel rounded-2xl border border-[#00D4FF]/20 p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <ShieldAlert className="h-8 w-8 text-yellow-400" />
            <h2 className="text-xl font-bold">AI Proctoring & Quiz Guidelines</h2>
          </div>

          <div className="text-sm text-gray-300 space-y-3 leading-relaxed">
            <p>To ensure fairness and integrity, the ElectroQuest league employs active proctoring protocols:</p>
            <ul className="list-disc list-inside space-y-2 text-xs">
              <li><strong>Hardware access:</strong> Camera and microphone permissions must be active.</li>
              <li><strong>Focus tracking:</strong> Minimizing the window or switching browser tabs triggers immediate logs.</li>
              <li><strong>Restriction lock:</strong> Mouse right-click, copy-pasting, and standard Developer keys (F12) are blocked.</li>
              <li><strong>Voice detection:</strong> Sustained background conversation or speaking triggers automatic proctor logs.</li>
              <li><strong>Auto-Submit threshold:</strong> Issuing the 3rd proctor warning will terminate the quiz and record disqualification.</li>
            </ul>
          </div>

          <div className="flex bg-[#081B33] border border-[#00D4FF]/10 rounded-xl p-4 items-center space-x-4">
            <div className="flex space-x-2">
              <Camera className="h-5 w-5 text-[#00FFFF]" />
              <Mic className="h-5 w-5 text-[#00FFFF]" />
            </div>
            <p className="text-xs text-gray-400">Click the button below to grant permission and initiate calibration.</p>
          </div>

          <button
            onClick={requestPermissions}
            className="w-full py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-bold rounded-xl text-sm hover:opacity-95 shadow-[0_0_12px_rgba(234,179,8,0.2)] transition-all cursor-pointer"
          >
            Grant Permissions & Start Quiz
          </button>
        </div>
      )}

      {/* 5. ACTIVE QUIZ FRAME */}
      {viewState === 'QUIZ' && questions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Proctoring camera panel */}
          <div className="lg:col-span-1 space-y-4">
            <div className="glass-panel border border-[#00D4FF]/20 rounded-xl overflow-hidden shadow-lg p-4 space-y-4">
              <h3 className="font-bold text-sm text-white flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                <span>Active Proctor Feed</span>
              </h3>
              <div className="relative aspect-video w-full bg-black rounded-lg overflow-hidden border border-white/5">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400 border-t border-white/5 pt-3">
                <span className="flex items-center space-x-1">
                  <Clock className="h-4.5 w-4.5 text-[#00FFFF]" />
                  <span>Time Left:</span>
                </span>
                <span className="font-mono text-white font-bold text-sm">
                  {Math.floor(timeRemaining)}m {Math.floor((timeRemaining % 1) * 60)}s
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Warnings issued:</span>
                <span className={`font-bold px-2 py-0.5 rounded-full ${warningsCount >= 2 ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'}`}>
                  {warningsCount} / 3
                </span>
              </div>
            </div>
          </div>

          {/* Quiz dashboard */}
          <div className="lg:col-span-2 space-y-6">
            {/* Question card */}
            <div className="glass-panel border border-[#00D4FF]/20 rounded-xl p-6 shadow-lg space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <span className="text-xs bg-[#00D4FF]/10 text-[#00FFFF] border border-[#00FFFF]/20 px-3 py-1 rounded-full font-semibold">
                  Category: {questions[currentQuestionIdx].category}
                </span>
                <span className="text-xs text-gray-400">
                  Question {currentQuestionIdx + 1} of {questions.length}
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-semibold leading-relaxed text-white">
                {questions[currentQuestionIdx].text}
              </h3>

              <div className="grid grid-cols-1 gap-3">
                {questions[currentQuestionIdx].options.map((opt) => {
                  const isSelected = selectedAnswers[questions[currentQuestionIdx].id] === opt.originalLabel;
                  return (
                    <button
                      key={opt.originalLabel}
                      onClick={() => handleOptionSelect(questions[currentQuestionIdx].id, opt.originalLabel)}
                      className={`text-left p-4 rounded-xl border text-xs sm:text-sm font-medium transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'border-[#00FFFF] bg-[#00FFFF]/10 text-white shadow-[0_0_12px_rgba(0,255,255,0.08)]'
                          : 'border-white/10 bg-[#081B33]/85 text-gray-300 hover:border-[#00D4FF]/30 hover:bg-[#00D4FF]/5'
                      }`}
                    >
                      <span>{opt.text}</span>
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-[#00FFFF] bg-[#00FFFF]' : 'border-gray-500'}`}>
                        {isSelected && <span className="w-1.5 h-1.5 bg-[#081B33] rounded-full" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between">
              <button
                disabled={currentQuestionIdx === 0}
                onClick={() => setCurrentQuestionIdx((p) => p - 1)}
                className="px-5 py-2.5 border border-[#00D4FF]/20 text-[#00D4FF] hover:bg-[#00D4FF]/10 text-xs font-semibold rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
              >
                Previous
              </button>

              {currentQuestionIdx < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQuestionIdx((p) => p + 1)}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#00D4FF] to-[#00FFFF] text-[#081B33] font-bold text-xs rounded-lg hover:opacity-95 shadow-md transition-all cursor-pointer"
                >
                  Next Question
                </button>
              ) : (
                <button
                  onClick={submitQuizAnswers}
                  disabled={submittingQuiz}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-lg shadow-md transition-all cursor-pointer animate-pulse"
                >
                  {submittingQuiz ? 'Saving...' : 'Finish & Submit Quiz'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. COMPLETED SCREEN */}
      {viewState === 'COMPLETED' && (
        <div className="max-w-md mx-auto glass-panel rounded-2xl border border-[#00D4FF]/20 p-6 md:p-8 text-center space-y-6">
          {isDisqualified ? (
            <>
              <AlertTriangle className="h-16 w-16 text-red-500 mx-auto filter drop-shadow-[0_0_12px_rgba(239,68,68,0.4)]" />
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-red-500">Quiz Auto-Submitted</h2>
                <p className="text-xs text-gray-400">Exam suspended due to multiple proctoring violations.</p>
              </div>
              <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
                You have reached the maximum allowed warnings (3 warnings). The proctoring system has closed your session and logged your current entries.
              </p>
            </>
          ) : (
            <>
              <Award className="h-16 w-16 text-yellow-400 mx-auto filter drop-shadow-[0_0_12px_rgba(234,179,8,0.4)]" />
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">ElectroQuest Finished!</h2>
                <p className="text-xs text-green-400">Your answers have been graded successfully.</p>
              </div>
              <div className="bg-[#081B33] border border-[#00D4FF]/10 rounded-2xl p-4 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Total Score</span>
                  <p className="text-2xl font-bold text-white">{quizScore} / 50</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Percentage</span>
                  <p className="text-2xl font-bold text-[#00FFFF]">{quizPercentage}%</p>
                </div>
              </div>
              <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
                Thank you for participating! Your participation certificate has been automatically generated and emailed to your registered team emails.
              </p>
            </>
          )}

          <Link
            href="/"
            className="block text-center w-full py-3 bg-[#00D4FF]/10 border border-[#00FFFF]/25 hover:bg-[#00D4FF]/20 text-[#00FFFF] font-bold text-sm rounded-xl transition-all cursor-pointer"
          >
            Return to Homepage
          </Link>
        </div>
      )}

      {/* PROCTORING WARNING MODAL ALERT */}
      {showWarningAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm glass-panel border-2 border-yellow-500/50 rounded-2xl p-6 text-center space-y-4"
          >
            <AlertOctagon className="h-12 w-12 text-yellow-500 mx-auto animate-bounce" />
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-yellow-500">Proctoring Warning Alert</h3>
              <p className="text-xs text-gray-400">Warning {warningsCount} of 3</p>
            </div>
            <p className="text-xs text-gray-200 leading-relaxed bg-[#081B33] border border-white/5 p-3 rounded-lg">
              {warningText}
            </p>
            <p className="text-[10px] text-red-400 font-semibold">
              IMPORTANT: Issue of 3 warnings will result in automated disqualification and submit.
            </p>
            <button
              onClick={() => setShowWarningAlert(false)}
              className="w-full py-2 bg-yellow-500 text-[#081B33] font-bold text-xs rounded-xl hover:brightness-95 cursor-pointer"
            >
              I Understand, Resume Test
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
