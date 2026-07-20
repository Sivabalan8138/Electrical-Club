'use client';

import React, { useState } from 'react';
import { Lightbulb, Wrench, RefreshCw, Layers } from 'lucide-react';
import { motion } from 'framer-motion';

interface Project {
  title: string;
  objective: string;
  components: string[];
  difficulty: 'Easy' | 'Medium' | 'Hard' | string;
}

export default function ProjectRecommender() {
  const [category, setCategory] = useState('IoT');
  const [difficulty, setDifficulty] = useState('All');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  const categories = [
    'IoT',
    'Embedded Systems',
    'Robotics',
    'Renewable Energy',
    'Artificial Intelligence',
    'EV Technology',
    'Smart Grid',
    'Power Electronics',
  ];

  const difficulties = ['All', 'Easy', 'Medium', 'Hard'];

  const getRecommendations = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/ai/project-recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, difficulty }),
      });

      const data = await response.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getDiffColor = (diff: string) => {
    switch (diff.toLowerCase()) {
      case 'easy':
        return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'medium':
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'hard':
        return 'text-red-400 bg-red-400/10 border-red-400/20';
      default:
        return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20';
    }
  };

  return (
    <div className="rounded-2xl border border-[#00D4FF]/30 bg-[#081B33]/60 p-6 md:p-8 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,212,255,0.1)]">
      <div className="flex items-center space-x-3 mb-6">
        <Lightbulb className="h-7 w-7 text-[#00FFFF] animate-bounce" />
        <h2 className="text-2xl font-bold text-white tracking-wide">AI Project Recommendation System</h2>
      </div>

      <p className="text-gray-300 text-sm mb-6 leading-relaxed">
        Stuck on project ideas? Select your desired electrical engineering domain and target difficulty level to generate high-quality project suggestions powered by AI.
      </p>

      {/* Selectors Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Category / Domain</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-[#081B33] text-gray-200 border border-[#00D4FF]/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00FFFF]"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Complexity Level</label>
          <div className="flex bg-[#081B33] rounded-xl p-1 border border-[#00D4FF]/20">
            {difficulties.map((diff) => (
              <button
                key={diff}
                type="button"
                onClick={() => setDifficulty(diff)}
                className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  difficulty === diff
                    ? 'bg-gradient-to-r from-[#00D4FF] to-[#00FFFF] text-[#081B33]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={getRecommendations}
        disabled={loading}
        className="w-full py-3.5 bg-gradient-to-r from-[#00D4FF] to-[#00FFFF] rounded-xl text-[#081B33] font-bold text-sm hover:opacity-95 transition-all shadow-[0_0_15px_rgba(0,212,255,0.4)] flex items-center justify-center space-x-2 cursor-pointer"
      >
        {loading ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Generating Project Ideas...</span>
          </>
        ) : (
          <>
            <Lightbulb className="h-4 w-4" />
            <span>Generate Project Recommendations</span>
          </>
        )}
      </button>

      {/* Recommended Projects List */}
      {projects.length > 0 && (
        <div className="mt-8 space-y-6">
          <h3 className="text-lg font-bold text-white border-b border-[#00D4FF]/20 pb-2">Generated Project Suggestions</h3>
          <div className="grid grid-cols-1 gap-6">
            {projects.map((proj, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="bg-[#081B33]/80 border border-[#00D4FF]/10 rounded-xl p-5 hover:border-[#00FFFF]/30 hover:shadow-[0_0_15px_rgba(0,255,255,0.05)] transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <h4 className="font-bold text-white text-base tracking-wide text-[#00FFFF]">{proj.title}</h4>
                  <span className={`text-[10px] font-bold border px-2.5 py-0.5 rounded-full uppercase tracking-wider self-start sm:self-center ${getDiffColor(proj.difficulty)}`}>
                    {proj.difficulty}
                  </span>
                </div>

                <p className="text-gray-300 text-sm leading-relaxed mb-4">{proj.objective}</p>

                <div>
                  <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center space-x-1.5 mb-2">
                    <Wrench className="h-3.5 w-3.5" />
                    <span>Required Components</span>
                  </h5>
                  <div className="flex flex-wrap gap-1.5">
                    {proj.components.map((comp, cIdx) => (
                      <span key={cIdx} className="text-xs bg-[#081B33] text-gray-300 border border-[#00D4FF]/10 px-2.5 py-1 rounded-lg">
                        {comp}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
