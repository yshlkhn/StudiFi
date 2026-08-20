import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Sparkles } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

export default function FileViewer() {
  const { fileId } = useParams();
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [url, setUrl] = useState(null);
  const [question, setQuestion] = useState("");

  const [numPages, setNumPages] = useState(null);

  const onPDFLoad = ({ numPages }) => {
    setNumPages(numPages);
  };

  // 🔹 Fetch file ONCE (DB call)
  useEffect(() => {
    fetchFile();
  }, [fileId]);

  const fetchFile = async () => {
    const { data, error } = await supabase
      .from("files")
      .select("*")
      .eq("id", fileId)
      .single();

    if (error) {
      console.error(error);
      return;
    }

    setFile(data);

    // generate signed URL
    const { data: signed } = await supabase.storage
      .from("study-files")
      .createSignedUrl(data.file_path, 60 * 60);

    setUrl(signed?.signedUrl);
  };

  useEffect(() => {
    if (!file) return;

    const refreshUrl = async () => {
      const { data: signed } = await supabase.storage
        .from("study-files")
        .createSignedUrl(file.file_path, 60 * 60);

      setUrl(signed?.signedUrl);
    };

    const interval = setInterval(refreshUrl, 50 * 60 * 1000);

    return () => clearInterval(interval);
  }, [file]);

  // 🔹 Safe file type detection
  const fileName = file?.name?.toLowerCase() || "";

  const isPDF =
    file?.file_type === "application/pdf" ||
    fileName.endsWith(".pdf");

  const isPPT =
    file?.file_type?.includes("presentation") ||
    fileName.endsWith(".ppt") ||
    fileName.endsWith(".pptx");

  const isDOC =
    file?.file_type?.includes("word") ||
    fileName.endsWith(".doc") ||
    fileName.endsWith(".docx");

  return (
    <div className="min-h-screen bg-brand-primary px-5 py-6 lg:px-12">

      {/* Header */}
      <div className="mb-4">
        <button
          onClick={() => navigate(-1)}
          className="group flex items-center gap-2 text-sm text-brand-secondary hover:text-[#f5ba65] transition"
        >
          <svg
            className="w-4 h-4 group-hover:-translate-x-1 transition"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="group-hover:underline">Go Back</span>
        </button>
      </div>

      <div className="text-left mb-2">
        <h1 className="text-white font-semibold text-xs sm:text-lg">
          {file?.name || "Loading..."}
        </h1>
      </div>

      {/* Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* FILE VIEWER */}
        <div className="lg:col-span-2 bg-linear-to-b from-white/5 to-white/2 rounded-md sm:rounded-lg md:rounded-xl lg:rounded-2xl border border-white/10 overflow-hidden flex flex-col">

          {/* Viewer toolbar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0f1e35]/50">
            <div className="flex items-center gap-2 text-xs text-white/60">
              <svg className="w-4 h-4 text-[#f5ba65]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              File Preview
            </div>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-secondary hover:text-[#f5ba65] hover:underline transition"
              >
                Download
              </a>
            )}
          </div>

          {/* Viewer content */}
          <div className="flex-1">
            {url ? (
              isPDF ? (
                <div className="bg-[#e5e7eb] max-h-[80vh] overflow-y-auto py-8">

                  <Document
                    file={url}
                    onLoadSuccess={onPDFLoad}
                    loading={
                      <div className="flex items-center justify-center h-[80vh] text-gray-500">
                        Loading PDF...
                      </div>
                    }
                    error={
                      <div className="flex items-center justify-center h-[80vh] text-red-500">
                        Failed to load PDF
                      </div>
                    }
                  >

                    <div className="flex flex-col items-center gap-6">

                      {Array.from({ length: numPages || 0 }, (_, index) => (
                        <div
                          key={`page_${index + 1}`}
                          className="bg-whiteshadow-xl rounded-sm overflow-hidden w-full max-w-200"
                        >
                          <Page
                            pageNumber={index + 1}
                            width={675}
                            className="mx-auto"
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                          />
                        </div>
                      ))}

                    </div>
                  </Document>
                </div>
              ) : isPPT ? (
                <iframe
                  src={`https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`}
                  className="w-full h-[80vh]"
                  title="PowerPoint Viewer"
                />
              ) : isDOC ? (
                <iframe
                  src={`https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`}
                  className="w-full h-[80vh]"
                  title="Word Viewer"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-[80vh] p-6 text-center">
                  <svg className="w-16 h-16 text-white/20 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <p className="text-white/50 mb-3">Preview not supported</p>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-brand-secondary text-[#12233d] font-semibold rounded-lg text-sm hover:bg-[#f5ba65] transition"
                  >
                    Open File
                  </a>
                </div>
              )
            ) : (
              <div className="flex items-center justify-center h-[80vh]">
                <p className="text-white/40 animate-pulse">Loading preview...</p>
              </div>
            )}
          </div>
        </div>

        {/* AI PANEL */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-md bg-brand-secondary/20">
              <svg className="w-5 h-5 text-brand-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h2 className="text-white text-sm font-semibold">
                Ask AI about this file
              </h2>
              <p className="text-white/40 text-xs">Get summaries, answers, notes</p>
            </div>
          </div>

          {/* Input */}
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask anything about this file..."
            className="flex-1 resize-none bg-[#0f1e35] border-white/10 rounded-lg p-3 text-white text-sm outline-none focus:border-white/20 transition placeholder:text-white/30"
          />

          {/* Ask Button */}
          <button
            className="flex items-center gap-1 justify-center cursor-pointer mt-3 w-full px-4 py-2.5 bg-brand-secondary text-[#12233d] font-semibold rounded-lg text-sm hover:bg-[#f5ba65] disabled:opacity-40 disabled:cursor-not-allowed transition"
            onClick={() => {
              console.log("QUESTION:", question);
            }}
            disabled={!question.trim()}
          >
            Ask <span> <Sparkles size={12} /></span>
          </button>
        </div>

      </div>
    </div>
  );
}