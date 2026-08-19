import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function Analytics() {
  const [attempts, setAttempts] = useState([]);
  const [folderStats, setFolderStats] = useState([]);

  useEffect(() => {
    async function loadAnalytics() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: quizData } = await supabase
        .from('quiz_attempts')
        .select('score, total_questions, created_at, folders(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (quizData) setAttempts(quizData);
    }
    loadAnalytics();
  }, []);

  return (
    <div className="p-6 text-white max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Comprehensive Study & Quiz Analytics</h1>

      <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">Quiz History & Score Tracking</h2>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-700 text-gray-400">
            <tr>
              <th className="pb-3">Subject / Folder</th>
              <th className="pb-3">Score</th>
              <th className="pb-3">Percentage</th>
              <th className="pb-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {attempts.map((a, i) => {
              const pct = Math.round((a.score / a.total_questions) * 100);
              return (
                <tr key={i} className="hover:bg-gray-800/40">
                  <td className="py-3 font-medium">{a.folders?.name || 'General'}</td>
                  <td className="py-3">{a.score} / {a.total_questions}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${pct >= 70 ? 'bg-green-600/30 text-green-300' : 'bg-amber-600/30 text-amber-300'}`}>
                      {pct}%
                    </span>
                  </td>
                  <td className="py-3 text-gray-400">{new Date(a.created_at).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}