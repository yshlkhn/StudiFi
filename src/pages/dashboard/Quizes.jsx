import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { generateQuizFromText } from '../../services/aiService';

export default function Quizes() {
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [quiz, setQuiz] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadFolders() {
      const { data } = await supabase.from('folders').select('id, name');
      if (data) setFolders(data);
    }
    loadFolders();
  }, []);

 // handleGenerate function ko update karein:
const handleGenerate = async () => {
  if (!selectedFolder) return;
  setLoading(true);
  setQuiz([]);
  setAnswers({});
  setSubmitted(false);

  try {
    // 1. Fetch files safely (sirf exist hone wale columns mangwaye)
    const { data: files, error: filesErr } = await supabase
      .from('files')
      .select('*')
      .eq('folder_id', selectedFolder);

    if (filesErr) throw filesErr;

    // Text extract karein ya fallback description use karein
    let fullText = files
      ?.map(f => f.extracted_text || f.content || f.file_name || '')
      .filter(Boolean)
      .join('\n\n');

    if (!fullText || fullText.trim().length === 0) {
      const selectedFolderName = folders.find(f => f.id === selectedFolder)?.name || 'General Subject';
      fullText = `Subject: ${selectedFolderName}. Key topics and foundational concepts for revision and exam prep.`;
    }

    // 2. Grok Call
    const generated = await generateQuizFromText(fullText, 'Exam Preparation', 5);
    setQuiz(generated);
  } catch (err) {
    console.error('Quiz Generation Error:', err);
    alert(err.message || 'Error generating quiz. Please verify API credentials.');
  } finally {
    setLoading(false);
  }
};

  const handleSelectOption = (qIdx, optIdx) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
  };

  const handleSubmitQuiz = async () => {
    let score = 0;
    quiz.forEach((q, i) => {
      if (answers[i] === q.correctAnswer) score += 1;
    });

    setSubmitted(true);

    // Save result to Supabase for Analytics tracking
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      await supabase.from('quiz_attempts').insert({
        user_id: userData.user.id,
        folder_id: selectedFolder,
        score,
        total_questions: quiz.length,
        created_at: new Date().toISOString(),
      });
    }
  };

  return (
    <div className="p-6 text-white max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Dynamic Quiz Generator</h1>

      <div className="flex gap-4 mb-6">
        <select
          value={selectedFolder}
          onChange={(e) => setSelectedFolder(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg p-2 flex-1"
        >
          <option value="">Select Folder Material</option>
          {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <button
          onClick={handleGenerate}
          disabled={!selectedFolder || loading}
          className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg font-semibold disabled:opacity-50"
        >
          {loading ? 'Generating with Grok...' : 'Generate Quiz'}
        </button>
      </div>

      {quiz.length > 0 && (
        <div className="space-y-6">
          {quiz.map((q, qIdx) => (
            <div key={qIdx} className="bg-gray-800/80 p-5 rounded-xl border border-gray-700">
              <p className="font-medium text-base mb-3">{qIdx + 1}. {q.question}</p>
              <div className="space-y-2">
                {q.options.map((opt, optIdx) => {
                  const isSelected = answers[qIdx] === optIdx;
                  const isCorrect = submitted && optIdx === q.correctAnswer;
                  const isWrong = submitted && isSelected && optIdx !== q.correctAnswer;

                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleSelectOption(qIdx, optIdx)}
                      className={`w-full text-left p-3 rounded-lg border text-sm transition-all ${
                        isCorrect
                          ? 'bg-green-600/30 border-green-500 text-green-200'
                          : isWrong
                          ? 'bg-red-600/30 border-red-500 text-red-200'
                          : isSelected
                          ? 'bg-blue-600/30 border-blue-500'
                          : 'bg-gray-700/50 border-gray-600 hover:bg-gray-700'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {!submitted ? (
            <button
              onClick={handleSubmitQuiz}
              className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-lg font-bold"
            >
              Submit Quiz & Record Analytics
            </button>
          ) : (
            <div className="p-4 bg-gray-800 rounded-lg text-center font-bold text-lg text-green-400">
              Quiz Completed! Score: {Object.keys(answers).filter(k => answers[k] === quiz[k].correctAnswer).length} / {quiz.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}