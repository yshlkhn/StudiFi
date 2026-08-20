import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { askGrok } from "@/services/aiService";
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  BookOpen,
  Send,
} from "lucide-react";

// Client-side PDF Real Text Extractor using PDF.js
async function extractTextFromPdfBlob(blob) {
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
  let extractedText = "";

  // Extract up to 25 pages of text
  const maxPages = Math.min(pdf.numPages, 25);
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item) => item.str).join(" ");
    if (strings.trim()) {
      extractedText += `\n[Page ${i}]\n${strings}\n`;
    }
  }

  return extractedText.trim();
}

export default function FileViewer() {
  const { fileId } = useParams();
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [blobUrl, setBlobUrl] = useState("");
  const [publicUrl, setPublicUrl] = useState("");
  const [docText, setDocText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [question, setQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    let activeObjectUrl = null;

    async function loadDocumentFromSupabase() {
      try {
        setLoading(true);
        setError("");
        setBlobUrl("");
        setPublicUrl("");

        // 1. Fetch file record from database
        const { data: fileData, error: dbError } = await supabase
          .from("files")
          .select("*")
          .eq("id", fileId)
          .single();

        if (dbError || !fileData) {
          throw new Error("Database record not found.");
        }

        setFile(fileData);

        const bucket = fileData.bucket || "documents";
        const storagePath = fileData.file_path || fileData.storage_path;

        if (!storagePath) {
          throw new Error("File path is missing.");
        }

        // 2. Generate Supabase Public URL
        const { data: pubData } = supabase.storage
          .from(bucket)
          .getPublicUrl(storagePath);

        const liveUrl = fileData.url || pubData?.publicUrl || "";
        setPublicUrl(liveUrl);

        // 3. Fetch storage blob
        const { data: blob, error: dlErr } = await supabase.storage
          .from(bucket)
          .download(storagePath);

        if (!dlErr && blob && blob.size > 0) {
          const isPdfFile = (fileData.file_name || "").toLowerCase().endsWith(".pdf");
          const mimeType = isPdfFile ? "application/pdf" : blob.type || "application/octet-stream";

          activeObjectUrl = URL.createObjectURL(new Blob([blob], { type: mimeType }));
          setBlobUrl(activeObjectUrl);

          // Extract text from PDF
          if (isPdfFile) {
            try {
              const cleanText = await extractTextFromPdfBlob(blob);
              if (cleanText && cleanText.length > 50) {
                setDocText(cleanText);
                // Cache extracted text in database
                supabase
                  .from("files")
                  .update({ extracted_text: cleanText.slice(0, 20000) })
                  .eq("id", fileData.id)
                  .then();
              }
            } catch (err) {
              console.warn("PDF.js text parse fallback:", err);
            }
          }
        } else if (liveUrl) {
          setBlobUrl(liveUrl);
        } else {
          throw new Error("Cannot find physical file.");
        }
      } catch (err) {
        console.error("Document load error:", err);
        setError(err.message || "Failed to load document.");
      } finally {
        setLoading(false);
      }
    }

    if (fileId) loadDocumentFromSupabase();

    return () => {
      if (activeObjectUrl) URL.revokeObjectURL(activeObjectUrl);
    };
  }, [fileId]);

  // Instant Native Download
  const handleDownload = () => {
    const downloadTarget = blobUrl || publicUrl;
    if (!downloadTarget || !file) return;

    const a = document.createElement("a");
    a.href = downloadTarget;
    a.download = file.file_name || file.name || "document";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 1. One-Click Document Summary Generator
  const handleGenerateSummary = async () => {
    if (summaryLoading || aiLoading) return;

    setSummaryLoading(true);
    setAiAnswer("");

    const displayName = file?.file_name || file?.name || "Academic Document";
    const contextContent =
      file?.extracted_text ||
      docText ||
      `Topic: ${displayName}. Digital Logic Design, Gates, Signals, ADC/DAC Conversions.`;

    const systemPrompt = `You are StudiFi's University Professor. Provide a comprehensive, structured, high-yield academic summary of the provided text.
Format with clean markdown:
- **📌 Core Overview**: 2-3 sentences summarizing the topic.
- **⚡ Key Concepts & Definitions**: Clear explanation of principles, technical components, and logic in the notes.
- **📐 Important Rules, Formulas & Conversions**: Detailed breakdown of equations, conversions, and laws.
- **🎯 Exam Highlights & Test Traps**: Crucial points to review before exams.`;

    const userPrompt = `Document: ${displayName}
Content / Extracted Notes:
"""
${contextContent.slice(0, 9000)}
"""

Generate the complete study summary:`;

    try {
      const response = await askGrok(
        [{ role: "user", content: userPrompt }],
        systemPrompt
      );
      setAiAnswer(response);
    } catch (err) {
      setAiAnswer("Error generating summary: " + (err.message || "AI service unreachable."));
    } finally {
      setSummaryLoading(false);
    }
  };

  // 2. Custom AI Q&A
  const handleAskAI = async (e) => {
    e.preventDefault();
    if (!question.trim() || aiLoading || summaryLoading) return;

    setAiLoading(true);
    setAiAnswer("");

    const displayName = file?.file_name || file?.name || "Uploaded Document";
    const contextContent =
      file?.extracted_text ||
      docText ||
      `Document: ${displayName}. Digital Logic Design notes.`;

    try {
      const response = await askGrok(
        [{ role: "user", content: question }],
        `You are StudiFi AI Assistant. Answer questions regarding "${displayName}" based on this material:\n${contextContent.slice(0, 9000)}`
      );
      setAiAnswer(response);
    } catch (err) {
      setAiAnswer("Error: " + (err.message || "Failed to reach AI."));
    } finally {
      setAiLoading(false);
    }
  };

  const displayName = file?.file_name || file?.name || "document";
  const fileExt = displayName.split(".").pop().toLowerCase();

  const isPdf = fileExt === "pdf";
  const isDocx = ["docx", "doc", "dotx", "ppt", "pptx"].includes(fileExt);
  const isImage = ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(fileExt);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto text-white space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs text-white/60 hover:text-brand-secondary transition font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>

        <div className="flex items-center gap-2">
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
              className="flex items-center gap-1.5 text-xs bg-brand-secondary text-brand-primary font-bold px-3.5 py-2 rounded-xl transition hover:bg-amber-400"
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
        {/* Document Viewer Container */}
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
                <span className="text-sm">Loading document preview...</span>
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
            ) : isDocx && publicUrl ? (
              <iframe
                src={`https://docs.google.com/gview?url=${encodeURIComponent(publicUrl)}&embedded=true`}
                title={displayName}
                className="w-full h-[680px] border-none bg-white rounded-b-xl"
              />
            ) : isImage && (blobUrl || publicUrl) ? (
              <div className="p-6 max-h-[650px] flex items-center justify-center">
                <img
                  src={blobUrl || publicUrl}
                  alt={displayName}
                  className="max-h-[620px] max-w-full object-contain rounded-xl shadow-2xl"
                />
              </div>
            ) : null}
          </div>
        </div>

        {/* AI Assistant & Summary Box */}
        <div className="bg-[#0f1e35] rounded-2xl border border-white/10 p-5 space-y-4 shadow-xl">
          <div className="flex items-start justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brand-secondary/10 border border-brand-secondary/20">
                <Sparkles className="w-5 h-5 text-brand-secondary" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">StudiFi AI Assistant</h2>
                <p className="text-xs text-white/40">Summaries & interactive Q&A</p>
              </div>
            </div>
          </div>

          {/* Generate Summary Button */}
          <button
            onClick={handleGenerateSummary}
            disabled={summaryLoading || aiLoading}
            className="w-full bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-brand-primary font-extrabold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 text-xs shadow-lg shadow-amber-500/10 disabled:opacity-50"
          >
            {summaryLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Generating Full Summary...
              </>
            ) : (
              <>
                <BookOpen className="w-4 h-4" /> Generate Summary
              </>
            )}
          </button>

          {/* Ask AI Form */}
          <form onSubmit={handleAskAI} className="space-y-3 pt-1">
            <textarea
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={`Ask a question about ${displayName}...`}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-brand-secondary transition resize-none"
            />
            <button
              type="submit"
              disabled={aiLoading || summaryLoading || !question.trim()}
              className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Answering...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" /> Ask Question
                </>
              )}
            </button>
          </form>

          {/* AI Response Window */}
          {aiAnswer && (
            <div className="mt-4 p-4 rounded-xl bg-black/40 border border-brand-secondary/20 text-xs text-white/90 space-y-2 max-h-96 overflow-y-auto">
              <p className="font-semibold text-brand-secondary flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand-secondary" /> AI Response:
              </p>
              <div className="whitespace-pre-wrap leading-relaxed pr-1 text-white/80 space-y-2">
                {aiAnswer}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}