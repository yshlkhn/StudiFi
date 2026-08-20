import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { fetchFolders } from "@/services/folders";

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
            }, 2000);

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
                name: newFolderName,
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
            setMessage({ type: "success", text: "Folder created Successfully!" });
        }
    };

    const deleteFolder = async (folderId) => {
        try {
            console.log("Deleting folder:", folderId);

            // 1. Get files inside folder
            const { data: files, error: filesError } = await supabase
                .from("files")
                .select("*")
                .eq("folder_id", folderId);

            if (filesError) {
                console.error("Fetch files error:", filesError);
                setMessage({ type: "error", text: filesError.message });
                return;
            }

            // 2. Delete from storage
            if (files?.length) {
                const paths = files.map((f) => f.file_path);

                const { error: storageError } = await supabase
                    .storage
                    .from("study-files")
                    .remove(paths);

                if (storageError) {
                    console.error("Storage delete error:", storageError);
                    setMessage({ type: "error", text: storageError.message });
                    return;
                }
            }

            // 3. Delete files from DB
            const { error: deleteFilesError } = await supabase
                .from("files")
                .delete()
                .eq("folder_id", folderId);

            if (deleteFilesError) {
                console.error("Delete files error:", deleteFilesError);
                setMessage({ type: "error", text: deleteFilesError.message });
                return;
            }

            // 4. Delete folder (IMPORTANT FIXES HERE)
            const { data, error } = await supabase
                .from("folders")
                .delete()
                .eq("id", folderId)
                .eq("user_id", user.id)
                .select(); // 👈 VERY IMPORTANT

            console.log("Delete result:", data);

            if (error) {
                console.error("Delete folder error:", error);
                setMessage({ type: "error", text: error.message });
                return;
            }

            // 🔴 If nothing deleted
            if (!data || data.length === 0) {
                console.warn("No folder deleted (maybe RLS or wrong ID)");
                setMessage({ type: "error", text: "Folder not deleted (no match)" });
                return;
            }

            // ✅ Success
            queryClient.setQueryData(
                ["folders", user.id],
                (old = []) => old.filter((f) => f.id !== folderId)
            );
            queryClient.invalidateQueries({
                queryKey: ["recentFolders", user.id],
            });
            setMessage({ type: "success", text: "Folder deleted" });

        } catch (err) {
            console.error("Unexpected error:", err);
            setMessage({ type: "error", text: "Something went wrong" });
        }
    };

    const uploadFiles = async (folderId) => {
        setUploadingFolderId(folderId);

        const filesArray = Array.from(
            folderFiles[folderId] || []
        );

        if (!filesArray.length) {
            setMessage({
                type: "error",
                text: "No files selected",
            });

            setUploadingFolderId(null);
            return;
        }

        const allowedTypes = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ];

        let hasError = false;

        for (const file of filesArray) {

            if (!allowedTypes.includes(file.type)) {
                setMessage({
                    type: "error",
                    text: `"${file.name}" is not supported. Please upload PDF, DOC, DOCX, PPT, or PPTX files only.`,
                });

                hasError = true;
                continue;
            }

            if (
                file.size >
                10 * 1024 * 1024
            ) {
                setMessage({
                    type: "error",
                    text: `${file.name} exceeds 10MB limit`,
                });

                hasError = true;
                continue;
            }

            try {
                const formData = new FormData();
                formData.append("file", file);

                formData.append(
                    "folderId",
                    folderId
                );

                const { data, error, } = await supabase.functions.invoke(
                    "convert-upload",
                    {
                        body:
                            formData,
                    }
                );

                if (error) {
                    console.error("Edge Function error:", error);

                    throw new Error(error.message || "Upload failed");
                }

                if (!data?.success) {
                    throw new Error(data?.error || "Upload failed");
                }

                console.log("Uploaded:", data);

            } catch (error) {

                console.error(`Failed to upload ${file.name}:`, error);

                setMessage({
                    type: "error", text:
                        error.message || `Failed to upload ${file.name}`,
                });

                hasError = true;
            }
        }
        if (!hasError) {
            setMessage({
                type: "success",
                text: "Files uploaded and converted to PDF successfully!",
            });

            queryClient.invalidateQueries({
                queryKey: [
                    "recentFolders",
                    user.id,
                ],
            });
        }

        setFolderFiles((prev) => ({
            ...prev,
            [folderId]: [],
        }));

        const input =
            document.getElementById(
                `file-${folderId}`
            );

        if (input) {
            input.value = "";
        }

        setUploadingFolderId(null);
    };

    return (
        <div className="relative min-h-full bg-brand-primary">
            {/* layered background: base gradient + soft brand glows + faint ruled texture */}
            <div className="pointer-events-none fixed inset-0 z-0">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,#22375c,#12233d_60%)]" />
                <div className="absolute -top-24 right-[-10%] w-130 h-130 rounded-full bg-[#efa943]/8 blur-[130px]" />
                <div className="absolute bottom-[-15%] left-[10%] w-105 h-105 rounded-full bg-[#c23c3a]/6 blur-[130px]" />
                <div
                    className="absolute inset-0 opacity-[0.05]"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
                        backgroundSize: "42px 42px",
                        maskImage: "radial-gradient(ellipse at top, black, transparent 75%)",
                        WebkitMaskImage: "radial-gradient(ellipse at top, black, transparent 75%)",
                    }}
                />
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

                {/* Message */}
                {message && (
                    <div
                        className={`mb-4 px-4 py-2 rounded-lg text-sm ${message.type === "error"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-green-500/10 text-green-400"
                            }`}
                    >
                        {message.text}
                    </div>
                )}

                {/* Create Folder */}
                <div className="mb-8 rounded-2xl border-white/10 bg-linear-to-r from-white/5 to-white/2 p-5 flex flex-col sm:flex-row gap-3 backdrop-blur-sm">
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

                {/* Loading */}
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
                                className="group relative flex flex-col justify-between rounded-xl border border-white/10 bg-white/5 p-4 hover:border-white/20 transition"
                            >
                                {/* Header with Delete + Open inline */}
                                <div className="flex items-start justify-between gap-2 mb-3">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="p-2 rounded-lg bg-[#0f1e35] border-white/10">
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

                                    {/* Actions: Open + Delete */}
                                    <div className="flex items-center gap-1">
                                        {/* Open btn */}
                                        <button
                                            onClick={() => navigate(`/myfolders/${folder.id}`)}
                                            className="p-1.5 rounded-md text-white/40 hover:text-brand-secondary hover:bg-white/10 transition"
                                            title="Open Folder"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                        </button>

                                        {/* Delete btn */}
                                        <button
                                            onClick={() => {
                                                setFolderToDelete(folder.id);
                                                setShowConfirm(true);
                                            }}
                                            className="p-1.5 rounded-md text-white/40 hover:text-red-400 hover:bg-red-500/10 transition"
                                            title="Delete Folder"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                    d="M19 7l-1 12a2 2 0 01-2 2H8a2 2 0 01-2-2L5 7m5 4v6m4-6v6M9 7h6m-7 0l1-2h4l1 2" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Divider */}
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

                                {/* Choose Button - always visible */}
                                <label
                                    htmlFor={`file-${folder.id}`}
                                    className="flex items-center justify-center gap-2 w-full cursor-pointer py-2 px-3 bg-[#0f1e35] border border-white/10 text-white/80 rounded-lg hover:bg-[#162845] text-xs transition"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Choose Files
                                </label>

                                {/* File status + Supported files text */}
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

                                {/* Upload Button - only show when files selected */}
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
                {showConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="bg-[#0f1e35] border border-white/10 rounded-xl p-6 w-full max-w-sm">
                            <h2 className="text-white font-semibold mb-2">
                                Delete Folder?
                            </h2>
                            <p className="text-white/50 text-sm mb-5">
                                This will delete the folder and all its files permanently.
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
                                    className="px-4 py-2 bg-red-500 cursor-pointer text-white rounded-lg text-sm hover:bg-red-600"
                                >
                                    {deleting ? (
                                        <div className="flex items-center gap-2">
                                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Deleting...
                                        </div>
                                    ) : (
                                        "Delete"
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}