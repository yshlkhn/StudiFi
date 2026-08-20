import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { generateQuizFromText } from "@/services/aiService";
import { Brain, CheckCircle2, XCircle, RotateCcw, Loader2, Sparkles, AlertCircle, FileText } from "lucide-react";

export default function Quizes() {
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [folderFiles, setFolderFiles] = useState([]);
  const [quiz, setQuiz] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingFiles, setFetchingFiles] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function loadFolders() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("folders")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (data) setFolders(data);
    }
    loadFolders();
  }, []);

  useEffect(() => {
    async function fetchFilesForFolder() {
      if (!selectedFolder) {
        setFolderFiles([]);
        return;
      }
      setFetchingFiles(true);
      setErrorMsg("");

      const { data, error } = await supabase
        .from("files")
        .select("*")
        .eq("folder_id", selectedFolder);

      if (error) {
        console.error("Error loading files:", error);
      } else {
        setFolderFiles(data || []);
      }
      setFetchingFiles(false);
    }

    fetchFilesForFolder();
  }, [selectedFolder]);

  const readDocumentContent = async (fileRecord) => {
    if (fileRecord.extracted_text && fileRecord.extracted_text.trim().length > 50) {
      return fileRecord.extracted_text;
    }

    try {
      const bucket = fileRecord.bucket || "documents";
      const filePath = fileRecord.file_path || fileRecord.storage_path;

      if (filePath) {
        const { data: blob, error } = await supabase.storage.from(bucket).download(filePath);
        if (!error && blob) {
          const rawText = await blob.text();
          const cleanText = rawText
            .replace(/[^\x20-\x7E\t\n\r]/g, " ")
            .replace(/\s+/g, " ")
            .trim();

          if (cleanText.length > 50) {
            supabase
              .from("files")
              .update({ extracted_text: cleanText.slice(0, 15000) })
              .eq("id", fileRecord.id)
              .then();
            return cleanText.slice(0, 8000);
          }
        }
      }
    } catch (e) {
      console.warn("Storage extract fallback:", e);
    }

    return `Document: ${fileRecord.file_name}`;
  };

  const handleGenerate = async () => {
    if (!selectedFolder) return;
    setErrorMsg("");

    if (folderFiles.length === 0) {
      setErrorMsg("Is folder me koi file mojood nahi hai. Pehle 'My Folders' me ja kar documents upload karein.");
      return;
    }

    setLoading(true);
    setQuiz([]);
    setAnswers({});
    setSubmitted(false);
    setStatusText("Reading uploaded documents from storage...");

    try {
      const selectedFolderName = folders.find((f) => f.id === selectedFolder)?.name || "Academic Subject";

      const textList = await Promise.all(folderFiles.map((f) => readDocumentContent(f)));
      const combinedText = textList.filter(Boolean).join("\n\n---\n\n");

      setStatusText("Generating conceptual quiz questions with AI...");
      const generated = await generateQuizFromText(combinedText, selectedFolderName, 5);

      if (!generated || !Array.isArray(generated) || generated.length === 0) {
        throw new Error("Could not extract enough concepts from the files.");
      }

      setQuiz(generated);
      setStatusText("");
    } catch (err) {
      console.error("Quiz Error:", err);
      setErrorMsg(err.message || "Failed to generate quiz from document content.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (qIdx, optIdx) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  const handleSubmitQuiz = async () => {
    if (Object.keys(answers).length === 0) return;

    let calculatedScore = 0;
    quiz.forEach((q, i) => {
      if (answers[i] === q.correctAnswer) calculatedScore += 1;
    });

    setSubmitted(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("quiz_attempts").insert({
          user_id: user.id,
          folder_id: selectedFolder,
          score: calculatedScore,
          total_questions: quiz.length,
        });
      }
    } catch (dbErr) {
      console.error("Error logging attempt:", dbErr);
    }
  };

  const scoreCount = Object.keys(answers).filter((k) => answers[k] === quiz[k]?.correctAnswer).length;

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto text-white space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Brain className="w-7 h-7 text-brand-secondary" /> Dynamic Document Quiz
        </h1>
        <p className="text-sm text-white/50 mt-1">
          Select a subject folder to read uploaded notes and generate technical MCQs[cite: 3].
        </p>
      </div>

      <div className="bg-[#0f1e35] p-5 rounded-2xl border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <select
            value={selectedFolder}
            onChange={(e) => {
              setSelectedFolder(e.target.value);
              setQuiz([]);
              setSubmitted(false);
            }}
            className="w-full sm:flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-secondary transition"
          >
            <option value="" className="bg-[#0f1e35] text-white/60">-- Select a Subject Folder --</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id} className="bg-[#0f1e35] text-white">
                {f.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleGenerate}
            disabled={!selectedFolder || loading || fetchingFiles}
            className="w-full sm:w-auto bg-brand-secondary text-brand-primary font-bold px-6 py-3 rounded-xl hover:bg-amber-400 disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> {statusText || "Processing..."}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Generate Quiz From Files
              </>
            )}
          </button>
        </div>

        {selectedFolder && (
          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-white/50">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-brand-secondary" />
              Source Material: {fetchingFiles ? "Loading files..." : `${folderFiles.length} files attached`}
            </span>
            {folderFiles.length > 0 && (
              <span className="text-emerald-400 font-medium">Ready to extract</span>
            )}
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/50 flex items-center gap-3 text-red-300 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {quiz.length > 0 && (
        <div className="space-y-6 pt-2">
          {quiz.map((q, qIdx) => (
            <div
              key={q.id || qIdx}
              className="bg-[#0f1e35] p-6 rounded-2xl border border-white/10 shadow-lg space-y-4"
            >
              <p className="font-semibold text-base text-white/90">
                {qIdx + 1}. {q.question}
              </p>

              <div className="space-y-2.5">
                {q.options.map((opt, optIdx) => {
                  const isSelected = answers[qIdx] === optIdx;
                  const isCorrect = submitted && optIdx === q.correctAnswer;
                  const isWrong = submitted && isSelected && optIdx !== q.correctAnswer;

                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleSelectOption(qIdx, optIdx)}
                      className={`w-full text-left p-3.5 rounded-xl border text-sm font-medium transition-all flex items-center justify-between ${
                        isCorrect
                          ? "bg-emerald-950/60 border-emerald-500 text-emerald-200"
                          : isWrong
                          ? "bg-rose-950/60 border-rose-500 text-rose-200"
                          : isSelected
                          ? "bg-brand-secondary/20 border-brand-secondary text-white"
                          : "bg-white/5 border-white/5 hover:bg-white/10 text-white/80"
                      }`}
                    >
                      <span>{opt}</span>
                      {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />}
                      {isWrong && <XCircle className="w-4 h-4 text-rose-400 shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>

              {submitted && q.explanation && (
                <div className="mt-3 p-3 rounded-lg bg-black/40 border border-white/5 text-xs text-white/70">
                  <span className="font-semibold text-brand-secondary">Concept Explanation:</span> {q.explanation}
                </div>
              )}
            </div>
          ))}

          {!submitted ? (
            <button
              onClick={handleSubmitQuiz}
              disabled={Object.keys(answers).length === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition shadow-lg disabled:opacity-50"
            >
              Submit Quiz Answers
            </button>
          ) : (
            <div className="bg-[#0f1e35] border border-brand-secondary/30 rounded-2xl p-6 text-center space-y-3">
              <h3 className="text-xl font-bold text-brand-secondary">
                Quiz Score: {scoreCount} / {quiz.length} ({Math.round((scoreCount / quiz.length) * 100)}%)
              </h3>
              <p className="text-xs text-white/50">Performance updated in Analytics[cite: 3].</p>
              <button
                onClick={handleGenerate}
                className="inline-flex items-center gap-2 text-xs bg-white/10 hover:bg-white/20 px-4 py-2.5 rounded-xl font-semibold transition"
              >
                <RotateCcw className="w-4 h-4" /> Re-generate Questions
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}