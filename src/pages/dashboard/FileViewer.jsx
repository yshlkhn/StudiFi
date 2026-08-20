import { useEffect, useState, useRef } from "react";
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
} from "lucide-react";

export default function FileViewer() {
  const { fileId } = useParams();
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [question, setQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    let activeObjectUrl = null;

    async function loadDocumentFromSupabase() {
      try {
        setLoading(true);
        setError("");
        setFileUrl("");

        // 1. Fetch file row from database
        const { data: fileData, error: dbError } = await supabase
          .from("files")
          .select("*")
          .eq("id", fileId)
          .single();

        if (dbError || !fileData) {
          throw new Error("File record database me nahi mila.");
        }

        setFile(fileData);

        const bucket = "documents";
        const candidatePaths = [
          fileData.file_path,
          fileData.storage_path,
          fileData.path,
          fileData.file_name,
          fileData.name,
        ].filter(Boolean);

        let foundBlob = null;

        // 2. Download raw blob stream from Supabase Storage
        for (const testPath of candidatePaths) {
          try {
            const { data: blob, error: dlErr } = await supabase.storage
              .from(bucket)
              .download(testPath);

            if (!dlErr && blob && blob.size > 0 && blob.type !== "application/json") {
              foundBlob = blob;
              break;
            }
          } catch {
            // try next path
          }
        }

        // 3. Fallback: fetch via public URL
        if (!foundBlob && (fileData.url || fileData.file_path)) {
          const publicUrl =
            fileData.url ||
            supabase.storage.from(bucket).getPublicUrl(fileData.file_path).data?.publicUrl;

          if (publicUrl) {
            try {
              const res = await fetch(publicUrl);
              if (res.ok) {
                const resBlob = await res.blob();
                if (resBlob.type !== "application/json" && resBlob.size > 0) {
                  foundBlob = resBlob;
                }
              }
            } catch (fetchErr) {
              console.warn("Public URL fetch skipped:", fetchErr);
            }
          }
        }

        if (foundBlob) {
          const typedBlob = new Blob([foundBlob], { type: "application/pdf" });
          activeObjectUrl = URL.createObjectURL(typedBlob);
          setFileUrl(activeObjectUrl);
        } else {
          throw new Error("Physical PDF file Supabase Storage me nahi mili.");
        }
      } catch (err) {
        console.error("Document load error:", err);
        setError(err.message || "Failed to load document preview.");
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
    if (!fileUrl || !file) return;
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = file.file_name || file.name || "document.pdf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleAskAI = async (e) => {
    e.preventDefault();
    if (!question.trim() || aiLoading) return;

    setAiLoading(true);
    setAiAnswer("");

    try {
      const docName = file?.file_name || file?.name || "Uploaded Document";
      const response = await askGrok(
        [{ role: "user", content: question }],
        `You are StudiFi AI Assistant. Answer questions regarding "${docName}" clearly and technically.`
      );
      setAiAnswer(response);
    } catch (err) {
      setAiAnswer("Error: " + (err.message || "Failed to reach AI."));
    } finally {
      setAiLoading(false);
    }
  };

  const displayName = file?.file_name || file?.name || "document.pdf";

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto text-white space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs text-white/60 hover:text-brand-secondary transition font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>

        {fileUrl && (
          <div className="flex items-center gap-2">
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-xl font-medium transition"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Fullscreen
            </a>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 text-xs bg-brand-secondary text-brand-primary font-bold px-3.5 py-2 rounded-xl transition hover:bg-amber-400"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </button>
          </div>
        )}
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-white/90 truncate">
        {displayName}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* PDF Viewer Container */}
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-[#0f1e35] overflow-hidden min-h-[680px] flex flex-col shadow-2xl">
          <div className="px-5 py-3.5 border-b border-white/10 bg-white/2 flex items-center justify-between text-xs font-semibold text-white/70">
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-secondary" /> {displayName}
            </span>
            {file?.file_size && (
              <span className="text-white/40">{Math.round(file.file_size / 1024)} KB</span>
            )}
          </div>

          <div className="flex-1 flex items-center justify-center relative bg-[#12233d]">
            {loading ? (
              <div className="flex flex-col items-center gap-3 text-white/50 py-24">
                <Loader2 className="w-8 h-8 animate-spin text-brand-secondary" />
                <span className="text-sm">Fetching document from Supabase Storage...</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-3 text-red-400 p-8 text-center max-w-md">
                <AlertCircle className="w-10 h-10" />
                <p className="text-sm font-semibold">{error}</p>
                <p className="text-xs text-white/40">
                  Yeh puraana broken record hai. Barah-e-karam folder me wapis ja kar fresh PDF upload karein.
                </p>
                <button
                  onClick={() => navigate(-1)}
                  className="mt-2 text-xs bg-brand-secondary text-brand-primary font-bold px-4 py-2 rounded-xl transition"
                >
                  Back to Folder
                </button>
              </div>
            ) : fileUrl ? (
              <iframe
                src={`${fileUrl}#toolbar=1`}
                title={displayName}
                className="w-full h-[680px] border-none bg-white rounded-b-xl"
              />
            ) : null}
          </div>
        </div>

        {/* AI Chat Box */}
        <div className="bg-[#0f1e35] rounded-2xl border border-white/10 p-5 space-y-4 shadow-xl">
          <div className="flex items-start gap-3 border-b border-white/10 pb-4">
            <div className="p-2.5 rounded-xl bg-brand-secondary/10 border border-brand-secondary/20">
              <Sparkles className="w-5 h-5 text-brand-secondary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Ask AI about this file</h2>
              <p className="text-xs text-white/40">Get instant answers & summaries</p>
            </div>
          </div>

          <form onSubmit={handleAskAI} className="space-y-3">
            <textarea
              rows={4}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={`Ask anything about ${displayName}...`}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-brand-secondary transition resize-none"
            />
            <button
              type="submit"
              disabled={aiLoading || !question.trim()}
              className="w-full bg-brand-secondary hover:bg-amber-400 text-brand-primary font-bold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" /> Ask AI
                </>
              )}
            </button>
          </form>

          {aiAnswer && (
            <div className="mt-4 p-4 rounded-xl bg-black/30 border border-brand-secondary/20 text-xs text-white/90 space-y-2">
              <p className="font-semibold text-brand-secondary flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Answer:
              </p>
              <div className="whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto pr-1 text-white/80">
                {aiAnswer}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}