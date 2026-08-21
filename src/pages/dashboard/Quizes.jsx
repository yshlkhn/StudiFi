import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { askGrok } from "@/services/aiService";
import {
  Brain,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  BookOpen,
} from "lucide-react";

// PDF.js Client-Side Text Extractor
async function extractPdfText(blob) {
  if (!window.pdfjsLib) {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  const arrayBuffer = await blob.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  const maxPages = Math.min(pdf.numPages, 15);
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageString = textContent.items.map((item) => item.str).join(" ");
    if (pageString.trim()) {
      fullText += `\n[Page ${i}]\n${pageString}\n`;
    }
  }

  return fullText.trim();
}

export default function Quizes() {
  const { user } = useAuth();

  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [folderFiles, setFolderFiles] = useState([]);
  const [loadingFolders, setLoadingFolders] = useState(true);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const [quizQuestions, setQuizQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submittingScore, setSubmittingScore] = useState(false);

  useEffect(() => {
    async function loadFolders() {
      if (!user?.id) return;
      try {
        setLoadingFolders(true);
        const { data, error } = await supabase
          .from("folders")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setFolders(data || []);
        if (data?.length > 0) {
          setSelectedFolderId(data[0].id);
        }
      } catch (err) {
        console.error("Load folders error:", err);
      } finally {
        setLoadingFolders(false);
      }
    }
    loadFolders();
  }, [user]);

  useEffect(() => {
    async function loadFiles() {
      if (!selectedFolderId) return;
      try {
        const { data, error } = await supabase
          .from("files")
          .select("*")
          .eq("folder_id", selectedFolderId);

        if (!error && data) {
          setFolderFiles(data);
        }
      } catch (err) {
        console.error("Load files error:", err);
      }
    }
    loadFiles();
  }, [selectedFolderId]);

  const handleGenerateQuiz = async () => {
    if (!selectedFolderId || generating) return;

    setGenerating(true);
    setError("");
    setQuizQuestions([]);
    setUserAnswers({});
    setSubmitted(false);

    try {
      const selectedFolder = folders.find((f) => f.id === selectedFolderId);
      const folderName = selectedFolder?.name || "Subject Material";

      let combinedText = "";

      for (const file of folderFiles) {
        if (file.extracted_text && file.extracted_text.length > 50) {
          combinedText += `\nDocument (${file.file_name || file.name}):\n` + file.extracted_text;
          continue;
        }

        const path = file.file_path || file.storage_path;
        if (path) {
          try {
            const { data: blob } = await supabase.storage.from("documents").download(path);
            if (blob && blob.size > 0 && blob.type !== "application/json") {
              const extracted = await extractPdfText(blob);
              if (extracted) {
                combinedText += `\nDocument (${file.file_name || file.name}):\n` + extracted;
              }
            }
          } catch (e) {
            console.warn("Storage extraction skipped:", e);
          }
        }
      }

      const finalContext =
        combinedText.trim().length > 50
          ? combinedText.slice(0, 10000)
          : `Subject Topic: "${folderName}". File names: ${folderFiles.map((f) => f.file_name || f.name).join(", ") || folderName}. Generate standard university-level questions on core concepts of this subject.`;

      const systemPrompt = `You are a university exam creator. Create exactly 5 multiple choice questions (MCQs) based on the provided material.
You must return ONLY a raw JSON array without any markdown fences, backticks, or extra conversational text.
Format example:
[
  {
    "id": 1,
    "question": "What is the primary function of an ADC?",
    "options": ["Convert analog signals to digital values", "Convert digital signals to analog", "Amplify frequency", "Store binary words"],
    "correctAnswer": 0,
    "explanation": "An Analog-to-Digital Converter (ADC) transforms continuous analog physical signals into discrete binary numbers."
  }
]`;

      const userPrompt = `Material Context:\n"""\n${finalContext}\n"""\n\nGenerate 5 MCQs in JSON format:`;

      const aiResponse = await askGrok(
        [{ role: "user", content: userPrompt }],
        systemPrompt
      );

      let cleanedJson = aiResponse.trim();
      if (cleanedJson.startsWith("```")) {
        cleanedJson = cleanedJson.replace(/^```(json)?\n?/, "").replace(/\n?```$/, "").trim();
      }

      const parsedQuestions = JSON.parse(cleanedJson);

      if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
        throw new Error("Invalid question format received from AI.");
      }

      setQuizQuestions(parsedQuestions);
    } catch (err) {
      console.error("Quiz generation failed:", err);
      setError("Quiz could not be generated: " + (err.message || "Please try again."));
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectOption = (questionId, optionIndex) => {
    if (submitted) return;
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const calculateScore = () => {
    let score = 0;
    quizQuestions.forEach((q) => {
      if (userAnswers[q.id] === q.correctAnswer) {
        score += 1;
      }
    });
    return score;
  };

  // Submit Quiz & Save Attempt to Supabase
  const handleSubmitQuiz = async () => {
    if (submitted || submittingScore) return;

    setSubmittingScore(true);
    const finalScore = calculateScore();
    const totalCount = quizQuestions.length || 5;
    const calcPercentage = Math.round((finalScore / totalCount) * 100);

    const selectedFolder = folders.find((f) => f.id === selectedFolderId);
    const folderTitle = selectedFolder?.name || "Subject Quiz";

    try {
      if (user?.id) {
        await supabase.from("quiz_attempts").insert([
          {
            user_id: user.id,
            folder_id: selectedFolderId || null,
            quiz_title: folderTitle,
            score: finalScore,
            total_questions: totalCount,
            percentage: calcPercentage,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      console.error("Failed to save quiz attempt:", err);
    } finally {
      setSubmitted(true);
      setSubmittingScore(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto text-white space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2.5">
          <Brain className="w-7 h-7 text-brand-secondary" /> Dynamic Document Quiz
        </h1>
        <p className="text-xs text-white/40 mt-1">
          Select a subject folder to read uploaded notes and generate technical MCQs.
        </p>
      </div>

      {/* Control Bar */}
      <div className="bg-[#0f1e35] border border-white/10 p-5 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex-1 max-w-md">
          <label className="text-[11px] font-semibold text-white/50 mb-1.5 block">
            Select Subject Folder
          </label>
          <select
            value={selectedFolderId}
            onChange={(e) => {
              setSelectedFolderId(e.target.value);
              setQuizQuestions([]);
              setSubmitted(false);
            }}
            disabled={loadingFolders || generating}
            className="w-full bg-[#12233d] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-secondary transition"
          >
            {folders.length === 0 ? (
              <option value="">No folders found</option>
            ) : (
              folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))
            )}
          </select>
          <p className="text-[11px] text-white/40 mt-1.5 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-brand-secondary" />
            {folderFiles.length} file(s) linked to this folder
          </p>
        </div>

        <button
          onClick={handleGenerateQuiz}
          disabled={generating || !selectedFolderId}
          className="bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-brand-primary font-extrabold px-6 py-3 rounded-xl transition flex items-center justify-center gap-2 text-xs shadow-lg shadow-amber-500/10 disabled:opacity-50 sm:self-end"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Generating MCQs with AI...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> Generate Quiz From Files
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/50 flex items-center gap-3 text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Quiz Area */}
      {quizQuestions.length > 0 && (
        <div className="space-y-6">
          {submitted && (
            <div className="p-5 rounded-2xl bg-brand-secondary/10 border border-brand-secondary/30 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-brand-secondary">Quiz Saved to Analytics</p>
                <h2 className="text-xl font-bold text-white mt-0.5">
                  Your Score: {calculateScore()} / {quizQuestions.length} (
                  {Math.round((calculateScore() / quizQuestions.length) * 100)}%)
                </h2>
              </div>
              <button
                onClick={handleGenerateQuiz}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-medium transition flex items-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Retake Quiz
              </button>
            </div>
          )}

          <div className="space-y-4">
            {quizQuestions.map((q, idx) => {
              const isSelected = userAnswers[q.id] !== undefined;
              const isRightOption = q.correctAnswer === userAnswers[q.id];

              return (
                <div
                  key={q.id || idx}
                  className="bg-[#0f1e35] border border-white/10 p-5 rounded-2xl space-y-4 shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-bold text-white/90 leading-relaxed">
                      <span className="text-brand-secondary mr-2">Q{idx + 1}.</span>
                      {q.question}
                    </h3>
                    {submitted && (
                      <div>
                        {isRightOption ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-green-400 bg-green-500/10 px-2.5 py-1 rounded-lg">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-500/10 px-2.5 py-1 rounded-lg">
                            <XCircle className="w-3.5 h-3.5" /> Incorrect
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {q.options.map((opt, optIdx) => {
                      const selectedThis = userAnswers[q.id] === optIdx;
                      const isCorrectAnswer = q.correctAnswer === optIdx;

                      let btnStyle =
                        "bg-[#12233d] border-white/10 text-white/80 hover:bg-white/5 hover:border-brand-secondary/40";

                      if (submitted) {
                        if (isCorrectAnswer) {
                          btnStyle = "bg-green-950/60 border-green-500/70 text-green-300 font-semibold";
                        } else if (selectedThis && !isCorrectAnswer) {
                          btnStyle = "bg-red-950/60 border-red-500/70 text-red-300";
                        } else {
                          btnStyle = "bg-[#12233d]/50 border-white/5 text-white/40";
                        }
                      } else if (selectedThis) {
                        btnStyle =
                          "bg-brand-secondary/15 border-brand-secondary text-brand-secondary font-semibold";
                      }

                      return (
                        <button
                          key={optIdx}
                          onClick={() => handleSelectOption(q.id, optIdx)}
                          disabled={submitted}
                          className={`p-3 rounded-xl border text-xs text-left transition flex items-center justify-between ${btnStyle}`}
                        >
                          <span>{opt}</span>
                          {submitted && isCorrectAnswer && (
                            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 ml-2" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {submitted && q.explanation && (
                    <div className="p-3.5 rounded-xl bg-black/30 border border-white/5 text-[11px] text-white/70 space-y-1">
                      <span className="font-bold text-brand-secondary flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5" /> Explanation:
                      </span>
                      <p>{q.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!submitted && (
            <div className="flex justify-end pt-2">
              <button
                onClick={handleSubmitQuiz}
                disabled={Object.keys(userAnswers).length === 0 || submittingScore}
                className="bg-brand-secondary hover:bg-amber-400 text-brand-primary font-bold px-8 py-3 rounded-xl transition text-xs shadow-lg disabled:opacity-40 flex items-center gap-2"
              >
                {submittingScore && <Loader2 className="w-4 h-4 animate-spin" />}
                Submit Quiz ({Object.keys(userAnswers).length}/{quizQuestions.length} answered)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}