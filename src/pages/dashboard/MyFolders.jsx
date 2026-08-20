import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { fetchFolders } from "@/services/folders";

const BUCKET_NAME = "documents";

export default function MyFolders() {
  const [newFolderName, setNewFolderName] = useState("");
  const [folderFiles, setFolderFiles] = useState({});
  const [message, setMessage] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [uploadingFolderId, setUploadingFolderId] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: folders = [],
    isLoading: loading,
    isError,
  } = useQuery({
    queryKey: ["folders", user?.id],
    queryFn: () => fetchFolders(user.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const createFolder = async () => {
    if (!newFolderName.trim()) {
      setMessage({ type: "error", text: "Folder name is required" });
      return;
    }

    const { data, error } = await supabase
      .from("folders")
      .insert({
        name: newFolderName.trim(),
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      queryClient.setQueryData(
        ["folders", user.id],
        (old = []) => [data, ...old]
      );
      queryClient.invalidateQueries({
        queryKey: ["recentFolders", user.id],
      });
      setNewFolderName("");
      setMessage({ type: "success", text: "Folder created successfully!" });
    }
  };

  const deleteFolder = async (folderId) => {
    try {
      // 1. Get files inside folder
      const { data: files, error: filesError } = await supabase
        .from("files")
        .select("*")
        .eq("folder_id", folderId);

      if (filesError) {
        setMessage({ type: "error", text: filesError.message });
        return;
      }

      // 2. Delete physical files from 'documents' storage[cite: 1]
      if (files?.length) {
        const paths = files.map((f) => f.file_path || f.storage_path).filter(Boolean);
        if (paths.length) {
          await supabase.storage.from(BUCKET_NAME).remove(paths);
        }
      }

      // 3. Delete file rows from DB[cite: 1]
      await supabase.from("files").delete().eq("folder_id", folderId);

      // 4. Delete folder[cite: 1]
      const { error } = await supabase
        .from("folders")
        .delete()
        .eq("id", folderId)
        .eq("user_id", user.id);

      if (error) {
        setMessage({ type: "error", text: error.message });
        return;
      }

      queryClient.setQueryData(
        ["folders", user.id],
        (old = []) => old.filter((f) => f.id !== folderId)
      );
      queryClient.invalidateQueries({
        queryKey: ["recentFolders", user.id],
      });
      setMessage({ type: "success", text: "Folder deleted successfully" });
    } catch (err) {
      console.error("Delete error:", err);
      setMessage({ type: "error", text: "Failed to delete folder" });
    }
  };

  // Direct Supabase Storage Upload (Bypasses failing Edge Function)[cite: 1]
 const uploadFiles = async (folderId) => {
  setUploadingFolderId(folderId);

  const filesArray = Array.from(folderFiles[folderId] || []);

  if (!filesArray.length) {
    setMessage({ type: "error", text: "No files selected" });
    setUploadingFolderId(null);
    return;
  }

  let hasError = false;

  for (const file of filesArray) {
    if (file.size > 25 * 1024 * 1024) {
      setMessage({ type: "error", text: `${file.name} exceeds 25MB limit` });
      hasError = true;
      continue;
    }

    try {
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const uniqueId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now();
      const storagePath = `${user.id}/${folderId}/${uniqueId}_${cleanName}`;

      // 1. Upload to Supabase Storage Bucket
      const { error: storageError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, file, {
          contentType: file.type || "application/octet-stream",
          upsert: true,
        });

      if (storageError) {
        throw new Error(storageError.message);
      }

      // 2. Get Public URL
      const { data: pubData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath);

      // 3. Database row insert
      const { error: dbError } = await supabase
        .from("files")
        .insert([
          {
            user_id: user.id,
            folder_id: folderId,
            file_name: file.name,
            name: file.name,
            file_path: storagePath,
            storage_path: storagePath,
            file_size: file.size || 0,
            mime_type: file.type || "application/octet-stream",
            url: pubData?.publicUrl || "",
            created_at: new Date().toISOString(),
          },
        ]);

      if (dbError) {
        throw new Error(dbError.message);
      }
    } catch (err) {
      console.error(`Upload error for ${file.name}:`, err);
      setMessage({
        type: "error",
        text: `Failed to upload ${file.name}: ${err.message}`,
      });
      hasError = true;
    }
  }

  if (!hasError) {
    setMessage({
      type: "success",
      text: "Files uploaded successfully!",
    });
    queryClient.invalidateQueries({
      queryKey: ["recentFolders", user.id],
    });
  }

  setFolderFiles((prev) => ({
    ...prev,
    [folderId]: [],
  }));

  const input = document.getElementById(`file-${folderId}`);
  if (input) input.value = "";

  setUploadingFolderId(null);
};

  return (
    <div className="relative min-h-full bg-brand-primary">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,#22375c,#12233d_60%)]" />
        <div className="absolute -top-24 right-[-10%] w-130 h-130 rounded-full bg-[#efa943]/8 blur-[130px]" />
        <div className="absolute bottom-[-15%] left-[10%] w-105 h-105 rounded-full bg-[#c23c3a]/6 blur-[130px]" />
      </div>

      <main className="relative z-10 px-5 py-6 lg:px-12 lg:py-10 max-w-340 mx-auto w-full">
        <button
          onClick={() => navigate(-1)}
          className="group flex items-center gap-2 text-sm text-brand-secondary hover:text-[#f5ba65] mb-2 transition"
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

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">My Folders</h1>
          <p className="text-white/40 text-sm">
            Organize and manage your study materials
          </p>
        </div>

        {/* Message Alert */}
        {message && (
          <div
            className={`mb-4 px-4 py-2.5 rounded-xl text-sm border ${
              message.type === "error"
                ? "bg-red-500/10 border-red-500/20 text-red-400"
                : "bg-green-500/10 border-green-500/20 text-green-400"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Create Folder */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-linear-to-r from-white/5 to-white/2 p-5 flex flex-col sm:flex-row gap-3 backdrop-blur-sm">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Enter folder name..."
            name="folderName"
            autoComplete="off"
            className="flex-1 px-4 py-2.5 bg-[#0f1e35] border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#f5ba65] focus:ring-1 focus:ring-[#f5ba65]/20 transition"
          />
          <button
            onClick={createFolder}
            className="flex gap-2 text-sm items-center justify-center cursor-pointer px-5 py-2.5 bg-brand-secondary text-[#12233d] font-semibold rounded-xl hover:bg-[#f5ba65] hover:shadow-lg hover:shadow-[#f5ba65]/20 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Folder
          </button>
        </div>

        {/* Loading / Empty States */}
        {loading ? (
          <div className="flex items-center justify-center h-60">
            <p className="text-white/40 text-sm animate-pulse">Loading folders...</p>
          </div>
        ) : folders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 rounded-2xl border border-dashed border-white/10 bg-white/5">
            <svg className="w-14 h-14 text-white/20 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <p className="text-white/60 text-sm text-center">
              No folders yet <br />
              <span className="text-white/40">Create your first folder to get started</span>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
            {folders.map((folder) => (
              <div
                key={folder.id}
                className="group relative flex flex-col justify-between rounded-xl border border-white/10 bg-white/5 p-4 hover:border-white/20 transition shadow-lg"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-lg bg-[#0f1e35] border border-white/10">
                      <svg className="w-5 h-5 text-[#f5ba65]" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-sm truncate">
                        {folder.name}
                      </h3>
                      <p className="text-xs text-white/40">
                        {new Date(folder.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigate(`/myfolders/${folder.id}`)}
                      className="p-1.5 rounded-md text-white/40 hover:text-brand-secondary hover:bg-white/10 transition"
                      title="Open Folder"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </button>

                    <button
                      onClick={() => {
                        setFolderToDelete(folder.id);
                        setShowConfirm(true);
                      }}
                      className="p-1.5 rounded-md text-white/40 hover:text-red-400 hover:bg-red-500/10 transition"
                      title="Delete Folder"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-1 12a2 2 0 01-2 2H8a2 2 0 01-2-2L5 7m5 4v6m4-6v6M9 7h6m-7 0l1-2h4l1 2" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="h-px bg-white/10 mb-3" />

                {/* File Input */}
                <input
                  id={`file-${folder.id}`}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.ppt,.pptx"
                  className="hidden"
                  onChange={(e) =>
                    setFolderFiles({
                      ...folderFiles,
                      [folder.id]: e.target.files,
                    })
                  }
                />

                <label
                  htmlFor={`file-${folder.id}`}
                  className="flex items-center justify-center gap-2 w-full cursor-pointer py-2 px-3 bg-[#0f1e35] border border-white/10 text-white/80 rounded-lg hover:bg-[#162845] text-xs transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Choose Files
                </label>

                <div className="mt-2 text-center">
                  <p className="text-xs text-[#f5ba65] h-4">
                    {folderFiles[folder.id]?.length
                      ? `${folderFiles[folder.id].length} file(s) selected`
                      : "No file selected"}
                  </p>
                  <p className="text-[10px] text-white/60 mt-1">
                    Supported: PDF, DOC, DOCX, PPT, PPTX
                  </p>
                </div>

                {folderFiles[folder.id]?.length > 0 && (
                  <button
                    onClick={() => uploadFiles(folder.id)}
                    disabled={uploadingFolderId === folder.id}
                    className="mt-3 w-full py-2 bg-brand-secondary text-[#12233d] cursor-pointer font-semibold rounded-lg hover:bg-[#f5ba65] text-xs disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-1.5"
                  >
                    {uploadingFolderId === folder.id ? (
                      <>
                        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                          <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Uploading...
                      </>
                    ) : (
                      "Upload Files"
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#0f1e35] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <h2 className="text-white font-semibold mb-2">Delete Folder?</h2>
              <p className="text-white/50 text-sm mb-5">
                This will delete the folder and all its files permanently[cite: 1].
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowConfirm(false);
                    setFolderToDelete(null);
                  }}
                  className="px-4 py-2 text-white/60 hover:text-white text-sm"
                >
                  Cancel
                </button>

                <button
                  onClick={async () => {
                    setDeleting(true);
                    await deleteFolder(folderToDelete);
                    setDeleting(false);
                    setShowConfirm(false);
                    setFolderToDelete(null);
                  }}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 cursor-pointer text-white font-semibold rounded-lg text-sm transition"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}