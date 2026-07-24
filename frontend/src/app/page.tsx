'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShieldCheck, Cpu, Lightbulb, Calendar, Trophy, Image, Phone, Zap, Bell, CheckCircle } from 'lucide-react';
import ProjectRecommender from '@/components/ProjectRecommender';

interface Announcement {
  id: string;
  title: string;
  content: string;
  eventType: string;
  createdAt: string;
}

export default function LandingPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    // Fetch announcements
    const fetchAnnouncements = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/announcements`);
        const data = await res.json();
        setAnnouncements(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load announcements:', err);
      }
    };
    fetchAnnouncements();
  }, []);

  const timelineSteps = [
    { date: 'July 20, 2026', title: 'Registrations Open', desc: 'Secure your team spot for ElectroQuest.' },
    { date: 'July 25, 2026 (1:30 PM - 4:30 PM)', title: 'ElectroQuest Quiz Live', desc: 'Log in with Candidate ID for the 70-minute online proctored quiz.' },
    { date: 'July 25, 2026 (After 4:00 PM)', title: 'Award & Certificate Distribution', desc: 'Receive digital certificates and cash awards directly in your email.' },
  ];

  return (
    <div className="space-y-24 pb-24 overflow-x-hidden">
      {/* 1. HERO SECTION */}
      <section className="relative min-h-[90vh] flex flex-col justify-center items-center text-center px-4 md:px-8 mt-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 space-y-6 max-w-4xl"
        >
          {/* Neon Logo Glow */}
          <div className="inline-flex items-center space-x-2 bg-[#00D4FF]/10 border border-[#00FFFF]/30 px-4 py-2 rounded-full text-[#00FFFF] text-xs font-bold tracking-widest uppercase animate-pulse">
            <Zap className="h-4 w-4 fill-[#00FFFF]" />
            <span>Powering Future Innovations</span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white select-none">
            ELECTRICAL CLUB
          </h1>

          <div className="space-y-2">
            <p className="text-lg sm:text-xl font-medium tracking-wide text-gray-300">
              Department of Electrical and Electronics Engineering
            </p>
            <p className="text-sm font-semibold tracking-wider text-[#00D4FF] uppercase">
              V.S.B. Engineering College, Karur
            </p>
          </div>

          <p className="text-gray-400 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Welcome to the official events portal of the Electrical Club. Explore premium technical contests, test your core electrical competencies, and pitch game-changing innovations.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
            <Link
              href="#events"
              className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-[#00D4FF] to-[#00FFFF] text-[#081B33] font-extrabold text-sm rounded-xl hover:opacity-95 shadow-[0_0_20px_rgba(0,212,255,0.5)] transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>Register Now</span>
            </Link>
            <Link
              href="#about"
              className="w-full sm:w-auto px-8 py-3.5 bg-transparent border border-[#00D4FF]/30 text-white hover:bg-[#00D4FF]/10 font-bold text-sm rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>Explore Events</span>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* 2. ANNOUNCEMENTS SECTION */}
      {announcements.length > 0 && (
        <section className="max-w-6xl mx-auto px-4">
          <div className="border border-[#00D4FF]/20 bg-[#081B33]/40 rounded-2xl p-6 backdrop-blur-md">
            <div className="flex items-center space-x-2.5 mb-4 text-[#00FFFF]">
              <Bell className="h-5 w-5 animate-swing" />
              <h2 className="text-lg font-bold tracking-wide text-white">Live Announcements & Alerts</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {announcements.slice(0, 4).map((ann) => (
                <div key={ann.id} className="bg-[#081B33] border border-[#00D4FF]/10 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs bg-[#00D4FF]/10 text-[#00FFFF] px-2 py-0.5 rounded-full font-bold">
                      {ann.eventType}
                    </span>
                    <span className="text-[10px] text-gray-500">{new Date(ann.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className="font-bold text-white text-sm mb-1">{ann.title}</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">{ann.content}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 3. ABOUT CLUB */}
      <section id="about" className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center space-x-2 text-[#00D4FF] text-xs font-bold uppercase tracking-wider">
            <Cpu className="h-4 w-4" />
            <span>About The Club</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            Cultivating Excellence in Modern Engineering
          </h2>
          <p className="text-gray-300 text-sm leading-relaxed">
            The Electrical Club of the EEE Department at V.S.B. Engineering College serves as an active platform for student development. Our goal is to bridge academic theories with cutting-edge industry practices. We organize technical symposiums, quiz leagues, and hackathons covering IoT, Embedded Controls, Smart Grids, Electric Vehicles (EV), and Power Systems.
          </p>
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-5 w-5 text-[#00FFFF] mt-0.5" />
              <div>
                <h4 className="font-bold text-white text-sm">Industrial Skillsets</h4>
                <p className="text-gray-400 text-xs">Hands-on microcontrollers, IoT, & power electronics design.</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-5 w-5 text-[#00FFFF] mt-0.5" />
              <div>
                <h4 className="font-bold text-white text-sm">AI Innovation</h4>
                <p className="text-gray-400 text-xs">Leveraging Edge AI and IoT integrations in core electricals.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative border border-[#00D4FF]/30 rounded-2xl bg-[#081B33]/40 p-8 overflow-hidden backdrop-blur-sm">
          {/* Circuit visual matrix */}
          <div className="absolute inset-0 opacity-10 flex flex-wrap justify-between items-center pointer-events-none">
            {Array.from({ length: 48 }).map((_, i) => (
              <span key={i} className="w-1.5 h-1.5 bg-[#00FFFF] rounded-full" />
            ))}
          </div>
          <div className="relative z-10 space-y-6">
            <h3 className="font-bold text-xl text-white">Why Join Our Events?</h3>
            <ul className="space-y-4">
              <li className="flex items-start space-x-3">
                <div className="p-1.5 bg-[#00D4FF]/10 rounded-lg text-[#00D4FF] mt-0.5">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Secure Proctoring Platform</h4>
                  <p className="text-xs text-gray-400">Our quiz uses browser security & dynamic proctor logs for fair results.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 4. EVENTS CONTAINER */}
      <section id="events" className="max-w-6xl mx-auto px-4 space-y-12">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center space-x-2 text-[#00D4FF] text-xs font-bold uppercase tracking-wider">
            <Zap className="h-4 w-4" />
            <span>Event Registration</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">ELECTRICAL CLUB EVENT</h2>
          <p className="text-gray-400 text-xs sm:text-sm max-w-xl mx-auto">
            Join the signature technical events organized by the Department of Electrical and Electronics Engineering. Form your team, showcase your skills, and compete for exciting awards and recognition.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* EVENT 1 CARD */}
          <div className="rounded-2xl border border-[#00D4FF]/20 bg-[#081B33]/40 p-6 md:p-8 flex flex-col justify-between backdrop-blur-sm relative overflow-hidden group hover:border-[#00FFFF]/45 transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Cpu className="h-10 w-10 text-[#00FFFF] filter drop-shadow-[0_0_8px_#00FFFF]" />
                <span className="text-[10px] font-bold text-gray-400 border border-gray-400/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Technical Online Quiz
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white tracking-wide">ELECTROQUEST</h3>
              <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
                Test your expertise in Electrical, Electronics, Logical reasoning, Aptitude, Current Technology, and Emerging AI fields. Auto-graded, randomized delivery, with robust digital proctor logs.
              </p>
              <div className="space-y-2 pt-2 border-t border-white/5 text-xs text-gray-400">
                <div className="flex justify-between">
                  <span>Team Size:</span>
                  <span className="text-white font-semibold">1 - 2 Members</span>
                </div>
                <div className="flex justify-between">
                  <span>Questions:</span>
                  <span className="text-white font-semibold">50 Random (70 mins)</span>
                </div>
                <div className="flex justify-between">
                  <span>Access Mode:</span>
                  <span className="text-white font-semibold">Unique Candidate ID</span>
                </div>
              </div>
            </div>
            <div className="pt-6">
              <Link
                href="/electroquest"
                className="block text-center w-full py-3 bg-[#00D4FF]/10 text-[#00FFFF] hover:bg-[#00D4FF] hover:text-[#081B33] border border-[#00FFFF]/30 font-extrabold text-sm rounded-xl transition-all cursor-pointer"
              >
                Enter Contest / Register
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. DYNAMIC SCHEDULE TIMELINE */}
      <section className="max-w-4xl mx-auto px-4 space-y-12">
        <div className="text-center space-y-3">
          <Calendar className="h-8 w-8 text-[#00D4FF] mx-auto animate-pulse" />
          <h2 className="text-3xl font-bold tracking-wide text-white">Event Timeline & Roadmap</h2>
          <p className="text-gray-400 text-xs sm:text-sm">Stay on track. Review important calendar dates and activities.</p>
        </div>

        <div className="relative border-l border-[#00D4FF]/25 ml-4 md:ml-32 pl-6 md:pl-8 space-y-10">
          {timelineSteps.map((step, idx) => (
            <div key={idx} className="relative group">
              {/* Dot indicator */}
              <div className="absolute -left-[31px] md:-left-[39px] top-1.5 bg-[#081B33] border-2 border-[#00FFFF] w-4 h-4 rounded-full group-hover:scale-125 transition-transform" />
              <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-8">
                <span className="text-xs text-[#00D4FF] font-bold uppercase tracking-widest md:w-28 text-left md:text-right md:absolute md:-left-40">
                  {step.date}
                </span>
                <div className="space-y-1 bg-[#081B33]/30 border border-[#00D4FF]/5 rounded-xl p-4 flex-1">
                  <h3 className="font-bold text-white text-base tracking-wide">{step.title}</h3>
                  <p className="text-gray-400 text-xs sm:text-sm">{step.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. AI PROJECT RECOMMENDATIONS INTEGRATION */}
      <section className="max-w-6xl mx-auto px-4">
        <ProjectRecommender />
      </section>

      {/* 7. PAST WINNERS */}
      <section className="max-w-6xl mx-auto px-4 space-y-12">
        <div className="text-center space-y-3">
          <Trophy className="h-8 w-8 text-[#00FFFF] mx-auto animate-bounce" />
          <h2 className="text-3xl font-bold tracking-wide text-white">Past Events & Innovation Gallery</h2>
          <p className="text-gray-400 text-xs sm:text-sm">Honoring previous contest participants, project teams, and winners.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="border border-[#00D4FF]/10 bg-[#081B33]/40 rounded-2xl overflow-hidden hover:border-[#00FFFF]/30 transition-all">
            <div className="h-44 bg-gradient-to-br from-[#081B33] to-[#00D4FF]/20 flex items-center justify-center border-b border-white/5 relative">
              <Cpu className="h-16 w-16 text-[#00D4FF]/40 animate-pulse" />
              <div className="absolute bottom-3 left-3 bg-[#081B33] border border-[#00FFFF]/20 rounded-lg px-2.5 py-0.5 text-[10px] text-[#00FFFF] font-bold">Smart Grids</div>
            </div>
            <div className="p-4 space-y-2">
              <h3 className="font-bold text-white text-sm">Adaptive Micro-Grid Load Regulator</h3>
              <p className="text-gray-400 text-xs leading-relaxed">
                Presented by EEE Finalists (2025). Successfully automated voltage regulation across smart grids during peak hours.
              </p>
            </div>
          </div>

          <div className="border border-[#00D4FF]/10 bg-[#081B33]/40 rounded-2xl overflow-hidden hover:border-[#00FFFF]/30 transition-all">
            <div className="h-44 bg-gradient-to-br from-[#081B33] to-[#00FFFF]/10 flex items-center justify-center border-b border-white/5 relative">
              <Zap className="h-16 w-16 text-[#00FFFF]/30 animate-pulse" />
              <div className="absolute bottom-3 left-3 bg-[#081B33] border border-[#00FFFF]/20 rounded-lg px-2.5 py-0.5 text-[10px] text-[#00FFFF] font-bold">EV Tech</div>
            </div>
            <div className="p-4 space-y-2">
              <h3 className="font-bold text-white text-sm">Inductive Dynamic Highway EV Charging</h3>
              <p className="text-gray-400 text-xs leading-relaxed">
                Pitched under Renewable energy domain. Wireless charging coils embedded in asphalt charging models.
              </p>
            </div>
          </div>

          <div className="border border-[#00D4FF]/10 bg-[#081B33]/40 rounded-2xl overflow-hidden hover:border-[#00FFFF]/30 transition-all">
            <div className="h-44 bg-gradient-to-br from-[#081B33] to-[#00D4FF]/15 flex items-center justify-center border-b border-white/5 relative">
              <Lightbulb className="h-16 w-16 text-[#00D4FF]/30" />
              <div className="absolute bottom-3 left-3 bg-[#081B33] border border-[#00FFFF]/20 rounded-lg px-2.5 py-0.5 text-[10px] text-[#00FFFF] font-bold">AgriTech</div>
            </div>
            <div className="p-4 space-y-2">
              <h3 className="font-bold text-white text-sm">Automated Soil Mineral Sensor Network</h3>
              <p className="text-gray-400 text-xs leading-relaxed">
                Smart telemetry nodes analyzing soil moisture, Nitrogen, Phosphorus, and Potassium levels utilizing solar power.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. CONTACT INFORMATION */}
      <section className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-[#00D4FF]/10 pt-16">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold tracking-wide text-white">Contact Organizing Committee</h2>
          <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
            Have questions regarding eligibility, registration forms, ppt templates, or certificates? Contact our EEE coordinators or write us an email. We are happy to assist.
          </p>
          <div className="flex items-center space-x-3 text-gray-300">
            <Phone className="h-5 w-5 text-[#00D4FF]" />
            <span className="text-sm">+91 4324 297099 / +91 94433 39399</span>
          </div>
          <div className="flex items-center space-x-3 text-gray-300">
            <Zap className="h-5 w-5 text-[#00D4FF]" />
            <span className="text-sm">electricalclubvsb@gmail.com</span>
          </div>
        </div>

        <div className="bg-[#081B33]/50 border border-[#00D4FF]/10 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-white text-base">Campus Venue Details</h3>
          <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
            Department of Electrical and Electronics Engineering,<br />
            V.S.B. Engineering College,<br />
            NH-67 Covai Road, Karudayampalayam,<br />
            Karur - 639111, Tamil Nadu, India.
          </p>
        </div>
      </section>
    </div>
  );
}
