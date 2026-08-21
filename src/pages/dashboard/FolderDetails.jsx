import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { uploadDocument, fetchFolderFiles, deleteDocument } from "@/services/files";
import {
  ArrowLeft,
  UploadCloud,
  FileText,
  Trash2,
  Loader2,
  ChevronRight,
  AlertCircle,
  Brain,
} from "lucide-react";

export default function FolderDetails() {
  const { id: folderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [folder, setFolder] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [folderRes, filesData] = await Promise.all([
        supabase.from("folders").select("*").eq("id", folderId).single(),
        fetchFolderFiles(folderId),
      ]);

      if (folderRes.error) throw folderRes.error;
      setFolder(folderRes.data);
      setFiles(filesData || []);
    } catch (err) {
      console.error("Folder details load error:", err);
      setError(err.message || "Failed to load folder.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (folderId) loadData();
  }, [folderId]);

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile || !user?.id || !folderId) return;

    setUploading(true);
    setError("");

    try {
      await uploadDocument(selectedFile, folderId, user.id);
      await loadData();
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.message || "Failed to upload document.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (e, fileItem) => {
    e.stopPropagation();
    const displayName = fileItem.file_name || fileItem.name || "document.pdf";
    if (!window.confirm(`Delete "${displayName}"?`)) return;

    try {
      await deleteDocument(
        fileItem.id,
        fileItem.file_path || fileItem.storage_path,
        "documents"
      );
      setFiles((prev) => prev.filter((f) => f.id !== fileItem.id));
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto text-white space-y-6">
      <button
        onClick={() => navigate("/myfolders")}
        className="flex items-center gap-2 text-xs font-semibold text-white/50 hover:text-brand-secondary transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to My Folders
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            {folder?.name || "Subject Folder"}
          </h1>
          <p className="text-xs text-white/40 mt-1">
            {files.length} {files.length === 1 ? "document" : "documents"} uploaded
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/quizes")}
            className="bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-2.5 rounded-xl transition flex items-center gap-2 text-xs"
          >
            <Brain className="w-4 h-4 text-brand-secondary" /> Practice Quiz
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.docx,.doc,.txt"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-brand-secondary hover:bg-amber-400 text-brand-primary font-bold px-5 py-2.5 rounded-xl transition flex items-center gap-2 text-xs shadow-lg disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Uploading PDF...
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" /> Upload Document
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/50 flex items-center gap-3 text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/40">
          <Loader2 className="w-8 h-8 animate-spin text-brand-secondary mb-2" />
          <span className="text-xs">Loading documents...</span>
        </div>
      ) : files.length === 0 ? (
        <div className="bg-[#0f1e35] border border-dashed border-white/15 rounded-2xl p-12 text-center space-y-3">
          <FileText className="w-10 h-10 text-white/20 mx-auto" />
          <p className="text-sm font-semibold text-white/70">No documents in this folder yet</p>
          <p className="text-xs text-white/35 max-w-sm mx-auto">
            Upload course notes, slides, or syllabus PDFs to start AI summaries and quizzes.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-2 text-xs bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-white transition font-medium"
          >
            Select a PDF file
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {files.map((fileItem) => {
            const fileNameDisplay = fileItem.file_name || fileItem.name || "document.pdf";
            return (
            // FolderDetails.jsx ke action buttons me navigate directly to file viewer:
<div
  key={fileItem.id}
  onClick={() => navigate(`/myfolders/file/${fileItem.id}`)}
  className="bg-[#0f1e35] hover:bg-[#152744] border border-white/10 hover:border-brand-secondary/40 p-4 rounded-xl transition cursor-pointer flex items-center justify-between group shadow-md"
>
  <div className="flex items-center gap-3.5 min-w-0">
    <div className="p-2.5 rounded-lg bg-white/5 group-hover:bg-brand-secondary/20 transition">
      <FileText className="w-5 h-5 text-brand-secondary shrink-0" />
    </div>
    <div className="min-w-0">
      <p className="text-sm font-semibold text-white/90 truncate">
        {fileItem.file_name || fileItem.name}
      </p>
      <p className="text-[11px] text-white/40">
        {fileItem.file_size ? `${Math.round(fileItem.file_size / 1024)} KB` : "Document"}
      </p>
    </div>
  </div>

  <div className="flex items-center gap-2">
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/myfolders/file/${fileItem.id}`);
      }}
      className="p-1.5 px-2.5 bg-brand-secondary/10 hover:bg-brand-secondary/20 text-brand-secondary rounded-lg text-xs font-semibold flex items-center gap-1 transition"
      title="Quiz & AI Chat"
    >
      <Brain className="w-3.5 h-3.5" /> Quiz
    </button>
    <button
      onClick={(e) => handleDeleteFile(e, fileItem)}
      className="p-2 text-white/30 hover:text-red-400 hover:bg-white/5 rounded-lg transition"
      title="Delete file"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  </div>
</div>
            );
          })}
        </div>
      )}
    </div>
  );
}