'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ShieldCheck, ShieldAlert, Award, Calendar, Bookmark, Cpu } from 'lucide-react';
import Link from 'next/link';

interface CertVerificationDetails {
  valid: boolean;
  participantName?: string;
  eventName?: string;
  certificateNumber?: string;
  verificationStatus: string;
  eventDate?: string;
  details?: string;
}

export default function CertificateVerificationPage() {
  const { certId } = useParams();
  const [details, setDetails] = useState<CertVerificationDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (certId) {
      const verify = async () => {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/verify/certificate/${certId}`);
          const data = await res.json();
          setDetails(data);
        } catch (err) {
          console.error(err);
          setDetails({
            valid: false,
            verificationStatus: 'Error checking database. Please try again later.',
          });
        } finally {
          setLoading(false);
        }
      };
      verify();
    }
  }, [certId]);

  return (
    <div className="max-w-md mx-auto px-4 py-20">
      {loading ? (
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-[#00FFFF] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 text-xs">Querying V.S.B. Electrical Club Register...</p>
        </div>
      ) : details && details.valid ? (
        <div className="glass-panel border-2 border-green-500/30 rounded-2xl p-6 text-center space-y-6 shadow-[0_0_25px_rgba(34,197,94,0.15)] animate-in zoom-in-95 duration-500">
          <div className="p-4 bg-green-500/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto border border-green-500/30">
            <ShieldCheck className="h-10 w-10 text-green-400" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white tracking-wide">Certificate Verified</h2>
            <span className="text-xs bg-green-500/25 border border-green-500/40 text-green-300 font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider">
              {details.verificationStatus}
            </span>
          </div>

          <div className="border-t border-[#00D4FF]/10 pt-4 text-left space-y-4">
            <div className="flex items-start space-x-3">
              <Award className="h-5 w-5 text-[#00FFFF] mt-0.5" />
              <div>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold block">Recipient / Team</span>
                <span className="text-sm font-bold text-white uppercase">{details.participantName}</span>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Cpu className="h-5 w-5 text-[#00FFFF] mt-0.5" />
              <div>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold block">Competed In</span>
                <span className="text-sm font-bold text-gray-200">{details.eventName}</span>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Calendar className="h-5 w-5 text-[#00FFFF] mt-0.5" />
              <div>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold block">Date Issued</span>
                <span className="text-sm font-bold text-gray-200">{details.eventDate}</span>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Bookmark className="h-5 w-5 text-[#00FFFF] mt-0.5" />
              <div>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold block">Verification ID</span>
                <span className="text-xs font-mono font-bold text-[#00D4FF]">{details.certificateNumber}</span>
              </div>
            </div>

            {details.details && (
              <div className="bg-[#081B33]/80 border border-[#00D4FF]/10 rounded-xl p-3 text-xs text-gray-300 leading-relaxed font-mono">
                {details.details}
              </div>
            )}
          </div>

          <div className="text-[10px] text-gray-400 border-t border-[#00D4FF]/10 pt-4 leading-relaxed">
            This verification is powered by the Department of Electrical and Electronics Engineering, V.S.B. Engineering College, Karur.
          </div>
        </div>
      ) : (
        <div className="glass-panel border-2 border-red-500/30 rounded-2xl p-6 text-center space-y-6 shadow-[0_0_25px_rgba(239,68,68,0.15)] animate-in zoom-in-95 duration-500">
          <div className="p-4 bg-red-500/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto border border-red-500/30">
            <ShieldAlert className="h-10 w-10 text-red-500" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white tracking-wide">Invalid Certificate</h2>
            <span className="text-xs bg-red-500/20 border border-red-500/35 text-red-400 font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider">
              {details?.verificationStatus || 'Unissued or Suspended'}
            </span>
          </div>

          <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
            The Certificate Number <strong className="text-[#00D4FF] font-mono">{certId}</strong> does not match any valid records in our registration log. Please contact the Electrical Club if you think this is a mistake.
          </p>

          <Link
            href="/"
            className="block text-center w-full py-2.5 bg-[#00D4FF]/10 hover:bg-[#00D4FF]/20 text-[#00FFFF] border border-[#00FFFF]/20 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Go to Homepage
          </Link>
        </div>
      )}
    </div>
  );
}
