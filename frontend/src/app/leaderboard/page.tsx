'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, Award, Search, RefreshCw } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  teamName: string;
  candidateId: string;
  department: string;
  score: number;
  percentage: number;
  timeTaken: number;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/quiz/leaderboard`);
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const filteredEntries = entries.filter(
    (e) =>
      e.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.candidateId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider uppercase">1st Place</span>;
      case 2:
        return <span className="bg-slate-300/20 text-slate-300 border border-slate-300/30 px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider uppercase">2nd Place</span>;
      case 3:
        return <span className="bg-amber-600/20 text-amber-500 border border-amber-600/30 px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider uppercase">3rd Place</span>;
      default:
        return <span className="text-gray-400 font-bold">#{rank}</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <Trophy className="h-10 w-10 text-[#00FFFF] mx-auto filter drop-shadow-[0_0_12px_#00FFFF] animate-bounce" />
        <h1 className="text-3xl font-extrabold tracking-tight">ElectroQuest Quiz Leaderboard</h1>
        <p className="text-gray-400 text-xs sm:text-sm max-w-xl mx-auto">
          Displaying the Top 50 teams based on score and completion velocity. Certificates and awards are issued to top ranks.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#081B33]/60 border border-[#00D4FF]/25 rounded-2xl p-4 backdrop-blur-md">
        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            placeholder="Search team or candidate ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#081B33] text-gray-200 border border-[#00D4FF]/20 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-[#00FFFF]"
          />
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-500" />
        </div>

        <button
          onClick={fetchLeaderboard}
          disabled={loading}
          className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-[#00D4FF] to-[#00FFFF] text-[#081B33] font-bold text-xs rounded-xl hover:opacity-95 transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-md"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Scores</span>
        </button>
      </div>

      {/* Table */}
      <div className="glass-panel border border-[#00D4FF]/20 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#081B33]/80 border-b border-[#00D4FF]/10 text-xs font-bold text-gray-400 uppercase tracking-widest">
                <th className="p-4 w-28 text-center">Rank</th>
                <th className="p-4">Team Name</th>
                <th className="p-4">Candidate ID</th>
                <th className="p-4">Department</th>
                <th className="p-4 text-center">Score</th>
                <th className="p-4 text-center">Percentage</th>
                <th className="p-4 text-center">Time Taken</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs sm:text-sm">
              {filteredEntries.length > 0 ? (
                filteredEntries.map((entry) => (
                  <tr
                    key={entry.candidateId}
                    className="hover:bg-[#00D4FF]/5 transition-colors group"
                  >
                    <td className="p-4 text-center">{getRankBadge(entry.rank)}</td>
                    <td className="p-4 font-bold text-white tracking-wide group-hover:text-[#00FFFF]">{entry.teamName}</td>
                    <td className="p-4 font-mono text-xs text-gray-400">{entry.candidateId}</td>
                    <td className="p-4 text-gray-300">{entry.department}</td>
                    <td className="p-4 text-center font-bold text-white">{entry.score} / 75</td>
                    <td className="p-4 text-center font-bold text-[#00FFFF]">{entry.percentage}%</td>
                    <td className="p-4 text-center font-mono text-xs text-gray-400">{entry.timeTaken} mins</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-gray-500 font-semibold">
                    {loading ? 'Fetching live leaderboard stats...' : 'No quiz records found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
