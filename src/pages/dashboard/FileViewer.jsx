import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { askGrok, retrieveRelevantChunks } from "@/services/aiService";
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  XCircle,
  BookOpen,
  Send,
  Brain,
  X,
  RotateCcw,
  HelpCircle,
  Bot,
  Trash2,
  AlertTriangle,
} from "lucide-react";

// 1. Client-Side Universal Script Loader
async function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// 2. Client-Side PDF Text Extractor
async function extractTextFromPdfBlob(blob) {
  if (!window.pdfjsLib) {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  const arrayBuffer = await blob.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let extracted = "";

  const maxPages = Math.min(pdf.numPages, 35);
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const str = textContent.items.map((item) => item.str).join(" ");
    if (str.trim()) {
      extracted += `\n[Page ${i}]\n${str}\n`;
    }
  }

  return extracted.trim();
}

// 3. Client-Side PPTX & DOCX Slide/Doc Text Extractor (using JSZip)
async function extractTextFromOfficeBlob(blob, extension) {
  if (!window.JSZip) {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js");
  }

  const zip = await window.JSZip.loadAsync(blob);
  let extracted = "";

  if (extension.startsWith("ppt")) {
    // Extract text from all PowerPoint slides (ppt/slides/slide*.xml)
    const slideFiles = Object.keys(zip.files)
      .filter((filename) => /^ppt\/slides\/slide\d+\.xml$/i.test(filename))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)[0], 10);
        const numB = parseInt(b.match(/\d+/)[0], 10);
        return numA - numB;
      });

    for (let i = 0; i < slideFiles.length; i++) {
      const xmlStr = await zip.file(slideFiles[i]).async("text");
      // Extract text content within <a:t>...</a:t> tags
      const matches = xmlStr.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/gi) || [];
      const slideText = matches
        .map((m) => m.replace(/<[^>]+>/g, "").trim())
        .filter(Boolean)
        .join(" ");

      if (slideText) {
        extracted += `\n[Slide ${i + 1}]\n${slideText}\n`;
      }
    }
  } else if (extension.startsWith("doc")) {
    // Extract text from Word Document (word/document.xml)
    const docFile = zip.file("word/document.xml");
    if (docFile) {
      const xmlStr = await docFile.async("text");
      const matches = xmlStr.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/gi) || [];
      extracted = matches
        .map((m) => m.replace(/<[^>]+>/g, "").trim())
        .filter(Boolean)
        .join(" ");
    }
  }

  return extracted.trim();
}

export default function FileViewer() {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const chatBottomRef = useRef(null);

  const [file, setFile] = useState(null);
  const [blobUrl, setBlobUrl] = useState("");
  const [publicUrl, setPublicUrl] = useState("");
  const [docText, setDocText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Persistent RAG Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [inputQuestion, setInputQuestion] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearingChat, setClearingChat] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Single File Quiz State
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [savingScore, setSavingScore] = useState(false);

  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

  // Load Document & Extract Content (PDF, PPTX, DOCX)
  useEffect(() => {
    let activeUrl = null;

    async function loadDocumentAndChat() {
      try {
        setLoading(true);
        setError("");

        // 1. Fetch DB Record
        const { data: fileData, error: dbErr } = await supabase
          .from("files")
          .select("*")
          .eq("id", fileId)
          .single();

        if (dbErr || !fileData) {
          throw new Error("Document record not found.");
        }

        setFile(fileData);

        // 2. Fetch Chat History
        if (user?.id) {
          const { data: savedChats } = await supabase
            .from("chat_messages")
            .select("role, content")
            .eq("user_id", user.id)
            .eq("file_id", fileId)
            .order("created_at", { ascending: true });

          if (savedChats && savedChats.length > 0) {
            setChatMessages(savedChats);
          } else {
            setChatMessages([]);
          }
        }

        // 3. Storage Retrieval
        const bucketsToTry = [fileData.bucket, "documents", "study-files"].filter(Boolean);
        const storagePath = fileData.file_path || fileData.storage_path;

        let foundBlob = null;
        let activeBucket = "documents";

        for (const b of bucketsToTry) {
          try {
            const { data: bData, error: bErr } = await supabase.storage
              .from(b)
              .download(storagePath);
            if (!bErr && bData && bData.size > 0 && bData.type !== "application/json") {
              foundBlob = bData;
              activeBucket = b;
              break;
            }
          } catch {
            // try next
          }
        }

        const { data: pubData } = supabase.storage
          .from(activeBucket)
          .getPublicUrl(storagePath);
        const directUrl = fileData.url || pubData?.publicUrl || "";
        setPublicUrl(directUrl);

        if (foundBlob) {
          const name = (fileData.file_name || fileData.name || "").toLowerCase();
          const ext = name.split(".").pop();
          const isPdfFile = ext === "pdf";

          const mimeType = isPdfFile
            ? "application/pdf"
            : foundBlob.type || "application/octet-stream";

          activeUrl = URL.createObjectURL(new Blob([foundBlob], { type: mimeType }));
          setBlobUrl(activeUrl);

          // Real Text Extraction for PDF, PPTX & DOCX
          try {
            let extracted = "";
            if (isPdfFile) {
              extracted = await extractTextFromPdfBlob(foundBlob);
            } else if (["pptx", "ppt", "docx", "doc"].includes(ext)) {
              extracted = await extractTextFromOfficeBlob(foundBlob, ext);
            }

            if (extracted && extracted.length > 30) {
              setDocText(extracted);
              supabase
                .from("files")
                .update({ extracted_text: extracted.slice(0, 35000) })
                .eq("id", fileData.id)
                .then();
            }
          } catch (extractErr) {
            console.warn("Text extraction notice:", extractErr);
          }
        } else if (directUrl) {
          setBlobUrl(directUrl);
        } else {
          throw new Error("Physical storage file not found.");
        }
      } catch (err) {
        console.error("Document load error:", err);
        setError(err.message || "Failed to load document.");
      } finally {
        setLoading(false);
      }
    }

    if (fileId) loadDocumentAndChat();

    return () => {
      if (activeUrl) URL.revokeObjectURL(activeUrl);
    };
  }, [fileId, user]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, aiLoading]);

  const displayName = file?.file_name || file?.name || "document";
  const fileExt = displayName.split(".").pop().toLowerCase();
  const isPdf = fileExt === "pdf";
  const isOffice = ["docx", "doc", "ppt", "pptx"].includes(fileExt);

  // Send RAG Chat Message
  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!inputQuestion.trim() || aiLoading || !user?.id) return;

    const userQuery = inputQuestion.trim();
    setInputQuestion("");

    const newHistory = [...chatMessages, { role: "user", content: userQuery }];
    setChatMessages(newHistory);
    setAiLoading(true);

    try {
      await supabase.from("chat_messages").insert([
        {
          user_id: user.id,
          file_id: fileId,
          role: "user",
          content: userQuery,
          created_at: new Date().toISOString(),
        },
      ]);

      const fullContext = file?.extracted_text || docText || `Document Title: ${displayName}`;
      const relevantSnippets = retrieveRelevantChunks(fullContext, userQuery);

      const systemPrompt = `You are StudiFi's Intelligent Document Assistant.
You have real-time access to the user's uploaded presentation/document "${displayName}".

=== RETRIEVED RELEVANT SLIDES / DOCUMENT CONTEXT ===
${relevantSnippets}
===================================================

Instructions:
1. Answer strictly using the actual content and points from the slides/document above.
2. Maintain conversational memory and respond to follow-up questions accurately.
3. Be direct, clear, and structured with bold highlights and bullet points.`;

      const reply = await askGrok(newHistory, systemPrompt);

      await supabase.from("chat_messages").insert([
        {
          user_id: user.id,
          file_id: fileId,
          role: "assistant",
          content: reply,
          created_at: new Date().toISOString(),
        },
      ]);

      setChatMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error: " + (err.message || "Failed to retrieve response.") },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  // Clear Chat History
  const confirmClearChat = async () => {
    if (clearingChat || !user?.id) return;
    setClearingChat(true);

    try {
      await supabase
        .from("chat_messages")
        .delete()
        .eq("user_id", user.id)
        .eq("file_id", fileId);

      setChatMessages([]);
      setShowClearModal(false);
      setToastMessage("Document chat cleared successfully");
    } catch (err) {
      setToastMessage("Failed to clear chat: " + err.message);
    } finally {
      setClearingChat(false);
    }
  };

  // Generate Document / PPT Summary
  const handleGenerateSummary = async () => {
    if (summaryLoading || aiLoading || !user?.id) return;

    setSummaryLoading(true);

    let fullText = docText || file?.extracted_text || "";

    // Force extraction if not in memory
    if (!fullText) {
      const bucket = file?.bucket || "documents";
      const storagePath = file?.file_path || file?.storage_path;
      try {
        const { data: bData } = await supabase.storage.from(bucket).download(storagePath);
        if (bData) {
          if (fileExt.startsWith("ppt") || fileExt.startsWith("doc")) {
            fullText = await extractTextFromOfficeBlob(bData, fileExt);
          } else if (fileExt === "pdf") {
            fullText = await extractTextFromPdfBlob(bData);
          }
          if (fullText) setDocText(fullText);
        }
      } catch (e) {
        console.warn("Summary extraction check:", e);
      }
    }

    const cleanContext = (fullText || "")
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "")
      .trim();

    const systemPrompt = `You are StudiFi's Lead Academic Professor. Provide a comprehensive, high-yield summary strictly based on the extracted content from the slides/document.

Structure your response with clear Markdown:
- **📌 Executive Overview**: 2-3 sentences summarizing the purpose and key message.
- **⚡ Key Slide Points & Findings**: Core topics, bullet points, statistics, and findings extracted from the slides.
- **🎯 Major Takeaways & Future Scope**: Crucial insights and conclusions.

NEVER say you don't have the content if text is provided below.`;

    const userPrompt = `Read the following slides/document content and generate the full structured summary:
"""
${cleanContext.slice(0, 15000)}
"""`;

    try {
      const summary = await askGrok([{ role: "user", content: userPrompt }], systemPrompt);

      await supabase.from("chat_messages").insert([
        {
          user_id: user.id,
          file_id: fileId,
          role: "user",
          content: "Provide a comprehensive summary of this document.",
          created_at: new Date().toISOString(),
        },
        {
          user_id: user.id,
          file_id: fileId,
          role: "assistant",
          content: summary,
          created_at: new Date().toISOString(),
        },
      ]);

      setChatMessages((prev) => [
        ...prev,
        { role: "user", content: "Provide a comprehensive summary of this document." },
        { role: "assistant", content: summary },
      ]);
    } catch (err) {
      alert("Summary failed: " + err.message);
    } finally {
      setSummaryLoading(false);
    }
  };

  // Pure Conceptual Quiz Generator
  const handleOpenQuiz = async () => {
    setShowQuizModal(true);
    setQuizLoading(true);
    setQuizQuestions([]);
    setUserAnswers({});
    setQuizSubmitted(false);

    try {
      let contentText = docText || file?.extracted_text || "";

      if (!contentText) {
        const bucket = file?.bucket || "documents";
        const storagePath = file?.file_path || file?.storage_path;
        const { data: bData } = await supabase.storage.from(bucket).download(storagePath);
        if (bData) {
          if (fileExt.startsWith("ppt") || fileExt.startsWith("doc")) {
            contentText = await extractTextFromOfficeBlob(bData, fileExt);
          } else if (fileExt === "pdf") {
            contentText = await extractTextFromPdfBlob(bData);
          }
          if (contentText) setDocText(contentText);
        }
      }

      const cleanContext = (contentText || "")
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "")
        .replace(/\s+/g, " ")
        .trim();

      const systemPrompt = `You are a university examination creator.
Your task is to generate exactly 5 multiple choice questions (MCQs) strictly testing the actual subject theory, laws, definitions, medical, or engineering concepts present in the text.

CRITICAL RULES:
1. NEVER mention or use the file name, document title, author name, or extension in the questions.
2. Every question must test academic/subject concepts.
3. Return ONLY a valid JSON array of 5 questions with NO markdown backticks.

Format:
[
  {
    "id": 1,
    "question": "What is the key mechanism discussed?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Detailed explanation."
  }
]`;

      const response = await askGrok(
        [{ role: "user", content: `Context Material:\n"""\n${cleanContext.slice(0, 10000)}\n"""\n\nGenerate 5 MCQs in JSON:` }],
        systemPrompt
      );

      let cleaned = response.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      const parsed = JSON.parse(cleaned);

      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Invalid quiz format.");
      setQuizQuestions(parsed);
    } catch (err) {
      console.error("Quiz error:", err);
      alert("Quiz error: " + (err.message || "Failed to generate quiz"));
      setShowQuizModal(false);
    } finally {
      setQuizLoading(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (quizSubmitted || savingScore) return;
    setSavingScore(true);

    let score = 0;
    quizQuestions.forEach((q) => {
      if (userAnswers[q.id] === q.correctAnswer) score += 1;
    });

    const percentage = Math.round((score / quizQuestions.length) * 100);

    try {
      if (user?.id) {
        await supabase.from("quiz_attempts").insert([
          {
            user_id: user.id,
            folder_id: file?.folder_id || null,
            quiz_title: `${displayName} Quiz`,
            score,
            total_questions: quizQuestions.length,
            percentage,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch (e) {
      console.error("Failed to log score:", e);
    } finally {
      setQuizSubmitted(true);
      setSavingScore(false);
    }
  };

  const handleDownload = () => {
    const target = blobUrl || publicUrl;
    if (!target) return;
    const a = document.createElement("a");
    a.href = target;
    a.download = displayName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto text-white space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 flex items-center gap-2.5 bg-[#0f1e35] border border-brand-secondary/40 text-white px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md"
          >
            <CheckCircle2 className="w-4 h-4 text-brand-secondary shrink-0" />
            <span className="text-xs font-semibold">{toastMessage}</span>
            <button onClick={() => setToastMessage(null)} className="ml-2 text-white/40 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showClearModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              className="bg-[#0f1e35] border border-white/10 w-full max-w-sm rounded-2xl p-5 shadow-2xl text-white space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Clear Chat History?</h3>
                  <p className="text-[11px] text-white/40">This will delete messages for this document.</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearModal(false)}
                  disabled={clearingChat}
                  className="px-3.5 py-2 text-xs font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmClearChat}
                  disabled={clearingChat}
                  className="px-4 py-2 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition flex items-center gap-1.5 shadow-lg disabled:opacity-50"
                >
                  {clearingChat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Yes, Clear
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs text-white/60 hover:text-brand-secondary transition font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenQuiz}
            className="flex items-center gap-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-brand-primary font-bold px-3.5 py-2 rounded-xl transition shadow-lg"
          >
            <Brain className="w-3.5 h-3.5" /> Quiz This File
          </button>

          {publicUrl && (
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-xl font-medium transition"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Fullscreen
            </a>
          )}

          {(blobUrl || publicUrl) && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 text-white font-bold px-3.5 py-2 rounded-xl transition"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </button>
          )}
        </div>
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-white/90 truncate">
        {displayName}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Document Viewer Frame */}
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-[#0f1e35] overflow-hidden min-h-[680px] flex flex-col shadow-2xl">
          <div className="px-5 py-3.5 border-b border-white/10 bg-white/2 flex items-center justify-between text-xs font-semibold text-white/70">
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-secondary" /> {displayName}
            </span>
            <span className="uppercase text-[11px] bg-white/10 px-2 py-0.5 rounded text-brand-secondary font-mono">
              {fileExt}
            </span>
          </div>

          <div className="flex-1 flex items-center justify-center relative bg-[#12233d]">
            {loading ? (
              <div className="flex flex-col items-center gap-3 text-white/50 py-24">
                <Loader2 className="w-8 h-8 animate-spin text-brand-secondary" />
                <span className="text-sm">Loading presentation preview...</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-3 text-red-400 p-8 text-center max-w-md">
                <AlertCircle className="w-10 h-10" />
                <p className="text-sm font-semibold">{error}</p>
                <button
                  onClick={() => navigate(-1)}
                  className="mt-2 text-xs bg-brand-secondary text-brand-primary font-bold px-4 py-2 rounded-xl transition"
                >
                  Back to Folder
                </button>
              </div>
            ) : isPdf && blobUrl ? (
              <iframe
                src={`${blobUrl}#toolbar=1`}
                title={displayName}
                className="w-full h-[680px] border-none bg-white rounded-b-xl"
              />
            ) : isOffice && (publicUrl || blobUrl) ? (
              <iframe
                src={`https://docs.google.com/gview?url=${encodeURIComponent(publicUrl || blobUrl)}&embedded=true`}
                title={displayName}
                className="w-full h-[680px] border-none bg-white rounded-b-xl"
              />
            ) : (
              <div className="p-8 text-center">
                <FileText className="w-12 h-12 text-brand-secondary mx-auto mb-2 opacity-50" />
                <p className="text-sm text-white/80">{displayName}</p>
              </div>
            )}
          </div>
        </div>

        {/* Real-Time RAG Conversational Chatbot */}
        <div className="bg-[#0f1e35] rounded-2xl border border-white/10 flex flex-col h-[680px] shadow-xl overflow-hidden">
          {/* Top Bar with Clear Button */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#12233d]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-brand-secondary/10 border border-brand-secondary/20">
                <Bot className="w-4 h-4 text-brand-secondary" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-white">Document RAG Chatbot</h2>
                <p className="text-[10px] text-white/40">Real-time context & follow-ups</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {chatMessages.length > 0 && (
                <button
                  onClick={() => setShowClearModal(true)}
                  className="text-[11px] text-white/40 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5 transition"
                  title="Clear Chat History"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={handleGenerateSummary}
                disabled={summaryLoading || aiLoading}
                className="text-[11px] bg-white/10 hover:bg-white/20 text-brand-secondary px-2.5 py-1.5 rounded-lg transition font-medium flex items-center gap-1.5"
              >
                {summaryLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <BookOpen className="w-3 h-3" />}
                Summary
              </button>
            </div>
          </div>

          {/* Conversation Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-white/40 space-y-2 px-4">
                <Sparkles className="w-8 h-8 text-brand-secondary/40" />
                <p className="font-semibold text-white/70">Document RAG Active</p>
                <p className="text-[11px] leading-relaxed">
                  Ask specific questions about these slides. Follow-ups and continuous discussions are saved automatically.
                </p>
              </div>
            ) : (
              chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[90%] p-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-brand-secondary text-brand-primary font-medium rounded-tr-none"
                        : "bg-white/5 border border-white/10 text-white/90 rounded-tl-none"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {aiLoading && (
              <div className="flex items-center gap-2 text-white/50 text-xs py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-secondary" />
                <span>Reading slide contents & formulating answer...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Input Box */}
          <form onSubmit={handleSendChat} className="p-3 border-t border-white/10 bg-[#12233d]">
            <div className="flex items-center gap-2 bg-[#0f1e35] border border-white/10 rounded-xl px-3 py-2 focus-within:border-brand-secondary transition">
              <input
                type="text"
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                placeholder="Ask about these slides or follow up..."
                disabled={aiLoading}
                className="flex-1 bg-transparent text-xs text-white placeholder:text-white/30 focus:outline-none"
              />
              <button
                type="submit"
                disabled={aiLoading || !inputQuestion.trim()}
                className="p-1.5 bg-brand-secondary hover:bg-amber-400 text-brand-primary rounded-lg transition disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Per-File Quiz Modal */}
      {showQuizModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f1e35] border border-white/10 w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#12233d]">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-brand-secondary" />
                <div>
                  <h3 className="text-sm font-bold text-white">{displayName} — Quiz</h3>
                  <p className="text-[10px] text-white/40">5 MCQs generated from this presentation</p>
                </div>
              </div>
              <button
                onClick={() => setShowQuizModal(false)}
                className="p-1.5 text-white/40 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              {quizLoading ? (
                <div className="py-20 flex flex-col items-center justify-center text-white/50 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-secondary" />
                  <p className="text-xs">Generating 5 custom MCQs from presentation content...</p>
                </div>
              ) : quizQuestions.length > 0 ? (
                <>
                  {quizSubmitted && (
                    <div className="p-4 rounded-xl bg-brand-secondary/10 border border-brand-secondary/30 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-brand-secondary">Attempt Logged in Analytics</p>
                        <h4 className="text-base font-bold text-white mt-0.5">
                          Score: {quizQuestions.filter((q) => userAnswers[q.id] === q.correctAnswer).length} / {quizQuestions.length}
                        </h4>
                      </div>
                      <button
                        onClick={handleOpenQuiz}
                        className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 font-medium transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Retake
                      </button>
                    </div>
                  )}

                  <div className="space-y-4">
                    {quizQuestions.map((q, idx) => {
                      const isSelected = userAnswers[q.id] !== undefined;
                      const isCorrect = userAnswers[q.id] === q.correctAnswer;

                      return (
                        <div
                          key={q.id || idx}
                          className="bg-[#12233d] border border-white/10 p-4 rounded-xl space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-bold text-white leading-relaxed">
                              <span className="text-brand-secondary mr-1.5">Q{idx + 1}.</span>
                              {q.question}
                            </p>
                            {quizSubmitted && (
                              <span>
                                {isCorrect ? (
                                  <span className="text-[10px] font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Correct
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                                    <XCircle className="w-3 h-3" /> Incorrect
                                  </span>
                                )}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.options.map((opt, optIdx) => {
                              const selectedThis = userAnswers[q.id] === optIdx;
                              const isRightAnswer = q.correctAnswer === optIdx;

                              let btnClass = "bg-white/5 border-white/10 text-white/80 hover:bg-white/10";
                              if (quizSubmitted) {
                                if (isRightAnswer) btnClass = "bg-green-950/70 border-green-500 text-green-300 font-semibold";
                                else if (selectedThis && !isRightAnswer) btnClass = "bg-red-950/70 border-red-500 text-red-300";
                                else btnClass = "opacity-40 border-white/5";
                              } else if (selectedThis) {
                                btnClass = "bg-brand-secondary/20 border-brand-secondary text-brand-secondary font-semibold";
                              }

                              return (
                                <button
                                  key={optIdx}
                                  onClick={() => !quizSubmitted && setUserAnswers((prev) => ({ ...prev, [q.id]: optIdx }))}
                                  disabled={quizSubmitted}
                                  className={`p-2.5 rounded-lg border text-xs text-left transition ${btnClass}`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>

                          {quizSubmitted && q.explanation && (
                            <div className="p-2.5 rounded-lg bg-black/30 border border-white/5 text-[11px] text-white/70">
                              <span className="font-bold text-brand-secondary flex items-center gap-1 mb-1">
                                <HelpCircle className="w-3 h-3" /> Explanation:
                              </span>
                              {q.explanation}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </div>

            {!quizSubmitted && quizQuestions.length > 0 && (
              <div className="p-4 border-t border-white/10 bg-[#12233d] flex justify-end gap-2">
                <button
                  onClick={handleSubmitQuiz}
                  disabled={Object.keys(userAnswers).length === 0 || savingScore}
                  className="bg-brand-secondary hover:bg-amber-400 text-brand-primary font-bold px-6 py-2.5 rounded-xl transition text-xs flex items-center gap-2 shadow-lg disabled:opacity-50"
                >
                  {savingScore && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Submit Quiz ({Object.keys(userAnswers).length}/{quizQuestions.length})
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}