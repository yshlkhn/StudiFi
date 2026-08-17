import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchFiles } from "@/services/files";
import { supabase } from "@/lib/supabaseClient";

export default function FolderDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [signedUrls, setSignedUrls] = useState({});
    const [deletingId, setDeletingId] = useState(null);
    const [message, setMessage] = useState(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [fileToDelete, setFileToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [headerFiles, setHeaderFiles] = useState([]);
    const [uploading, setUploading] = useState(false);

    const {
        data: files = [],
        isLoading: loading,
    } = useQuery({
        queryKey: ["files", id],
        queryFn: () => fetchFiles(id),
        enabled: !!id,
        staleTime: 1000 * 60 * 5,
    });

    useEffect(() => {
        const generateUrls = async () => {
            const urlEntries = await Promise.all(
                files.map(async (file) => {
                    const { data: signed } = await supabase
                        .storage
                        .from("study-files")
                        .createSignedUrl(file.file_path, 3600);

                    if (!signed) return null;

                    return [file.id, signed.signedUrl];
                })
            );

            setSignedUrls(
                Object.fromEntries(urlEntries.filter(Boolean))
            );
        };

        if (files.length) {
            generateUrls();
        }

    }, [files]);
    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                navigate("/login");
            }
        };

        checkUser();
    }, []);

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 2000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const deleteFile = async (file) => {
        setDeletingId(file.id);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            // 1. Delete from storage
            const { error: storageError } = await supabase.storage
                .from("study-files")
                .remove([file.file_path]);

            if (storageError) {
                setMessage({ type: "error", text: storageError.message });
                return;
            }

            // 2. Delete from DB (IMPORTANT)
            const { data, error } = await supabase
                .from("files")
                .delete()
                .eq("id", file.id)
                .eq("user_id", user.id)
                .select();

            if (error) {
                setMessage({ type: "error", text: error.message });
                return;
            }

            if (!data || data.length === 0) {
                setMessage({ type: "error", text: "File not deleted (no match)" });
                return;
            }

            // 3. Update UI
            setMessage({
                type: "success",
                text: "File deleted successfully!"
            });

            queryClient.invalidateQueries({
                queryKey: ["files", id],
            });

            queryClient.invalidateQueries({
                queryKey: ["recentFolders"],
            });

            setSignedUrls(prev => {
                const updated = { ...prev };
                delete updated[file.id];
                return updated;
            });

            setMessage({ type: "success", text: "File deleted successfully!" });

        } catch (err) {
            setMessage({ type: "error", text: "Something went wrong" });
        }
        finally {
            setDeletingId(null);
        }
    };

    const uploadHeaderFiles = async () => {
        const filesArray = Array.from(headerFiles || []);

        if (!filesArray.length) {
            setMessage({ type: "error", text: "No files selected" });
            return;
        }

        setUploading(true);

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            setMessage({ type: "error", text: "User not authenticated" });
            setUploading(false);
            return;
        }
        const MAX_SIZE = 10 * 1024 * 1024;

        const allowedTypes = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ];

        let hasError = false;

        for (let file of filesArray) {

            if (file.size > MAX_SIZE) {
                setMessage({
                    type: "error",
                    text: `${file.name} is too large (max 10MB)`,
                });
                hasError = true;
                continue;
            }

            if (!allowedTypes.includes(file.type)) {
                setMessage({
                    type: "error",
                    text: `"${file.name}" not supported`,
                });
                hasError = true;
                continue;
            }

            const safeName = file.name.replace(/[^\w.-]/g, "_");
            const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2)}-${safeName}`;
            const filePath = `${user.id}/${id}/${uniqueName}`;

            const { error: uploadError } = await supabase.storage
                .from("study-files")
                .upload(filePath, file);

            if (uploadError) {
                setMessage({ type: "error", text: uploadError.message });
                hasError = true;
                continue;
            }

            const { error: dbError } = await supabase.from("files").insert({
                folder_id: id,
                user_id: user.id,
                name: file.name,
                file_path: filePath,
                file_type: file.type,
            });

            if (dbError) {
                setMessage({ type: "error", text: dbError.message });
                hasError = true;
            }
        }

        if (!hasError) {
            setMessage({ type: "success", text: "Files uploaded!" });

            queryClient.invalidateQueries({
                queryKey: ["files", id],
            });

            queryClient.invalidateQueries({
                queryKey: ["recentFolders"],
            });
        }

        setHeaderFiles([]);
        const input = document.getElementById("header-upload");
        if (input) input.value = "";

        setUploading(false);
    };

    return (
        <div className="relative min-h-full bg-brand-primary">

            {/* Background */}
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
                    }}
                />
            </div>

            <main className="relative z-10 px-5 py-6 lg:px-12 lg:py-10 max-w-340 mx-auto w-full">

                {/* Header */}
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

                    {/* LEFT SIDE */}
                    <div>
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

                        <h1 className="text-2xl font-bold text-white">
                            Folder Files
                        </h1>
                    </div>

                    {/* RIGHT SIDE (UPLOAD) */}
                    <div className="text-xs flex flex-col sm:items-end gap-2">
                        <div className="flex items-center gap-3">
                            {/* Hidden Input */}
                            <input
                                id="header-upload"
                                type="file"
                                multiple
                                accept=".pdf,.doc,.docx,.ppt,.pptx"
                                className="hidden"
                                onChange={(e) => setHeaderFiles(e.target.files)}
                            />

                            {/* Choose Files */}
                            <label
                                htmlFor="header-upload"
                                className="group flex items-center gap-2 cursor-pointer px-4 py-2.5 bg-[#0f1e35] border border-white/10 text-white/80 rounded-lg hover:bg-[#162845] hover:border-[#f5ba65]/30 text-sm transition"
                            >
                                <svg className="w-4 h-4 group-hover:text-[#f5ba65] transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Choose Files
                            </label>

                            {/* Upload Button */}
                            <button
                                onClick={uploadHeaderFiles}
                                disabled={!headerFiles?.length || uploading}
                                className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-brand-secondary cursor-pointer text-[#12233d] font-semibold rounded-lg text-sm hover:bg-[#f5ba65] disabled:opacity-40 disabled:cursor-not-allowed transition"
                            >
                                {uploading ? (
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
                        </div>
                        {headerFiles?.length > 0 && (
                            <p className="text-xs text-brand-secondary ml-1.5 sm:ml-0">
                                {headerFiles.length} file(s) selected
                            </p>
                        )}
                    </div>
                </div>

                {message && (
                    <div
                        className={`mb-6 px-4 py-3 rounded-lg text-sm border ${message.type === "error"
                            ? "bg-red-500/10 text-red-400 border-red-500/20"
                            : "bg-green-500/10 text-green-400 border-green-500/20"
                            }`}
                    >
                        {message.text}
                    </div>
                )}

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center h-60">
                        <p className="text-white/50">Loading files...</p>
                    </div>
                ) : files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-60 rounded-xl border-dashed border-white/10 bg-white/5">
                        <svg className="w-12 h-12 text-white/20 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                        </svg>
                        <p className="text-white/40">No files in this folder</p>
                    </div>
                ) : (
                    // CHANGED: 1 col mobile, 2 col lg, 3 col xl
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">

                        {files.map((file) => (
                            <div
                                key={file.id}
                                className="group flex items-center justify-between p-4 rounded-xl bg-linear-to-br from-white/5 to-white/2 border-white/10 hover:border-[#f5ba65]/40 hover:bg-white/10 transition-all duration-300"
                            >

                                {/* Left */}
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="p-2.5 rounded-lg bg-[#0f1e35] border border-white/10 group-hover:border-[#f5ba65]/30 transition">
                                        <svg className="w-5 h-5 text-[#f5ba65]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>

                                    <div className="min-w-0">
                                        <p className="text-white text-sm font-medium truncate">
                                            {file.name}
                                        </p>
                                        <p className="text-white/40 text-xs">
                                            {new Date(file.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </p>
                                    </div>
                                </div>

                                {/* Right Actions */}
                                <div className="flex items-center gap-1 transition">

                                    <button
                                        onClick={() => navigate(`/myfolders/file/${file.id}`)}
                                        className="p-2 rounded-lg text-white/50 hover:text-brand-secondary hover:bg-white/10 transition"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </button>

                                    {/* Delete */}
                                    <button
                                        onClick={() => {
                                            setFileToDelete(file);
                                            setShowConfirm(true);
                                        }}
                                        disabled={deletingId === file.id}
                                        className="group/del p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
                                    >
                                        {deletingId === file.id ? (
                                            <span className="text-xs">...</span>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeWidth={2} d="M19 7l-1 12a2 2 0 01-2 2H8a2 2 0 01-2-2L5 7m5 4v6m4-6v6M9 7h6m-7 0l1-2h4l1 2" />
                                            </svg>
                                        )}
                                    </button>

                                </div>
                            </div>
                        ))}

                    </div>
                )}

                {/* Confirm Modal */}
                {showConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="bg-[#0f1e35] border-white/10 rounded-2xl p-6 w-full max-w-sm">
                            <h2 className="text-white font-semibold mb-2">
                                Delete File?
                            </h2>
                            <p className="text-white/50 text-sm mb-5">
                                This file will be permanently deleted.
                            </p>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setShowConfirm(false);
                                        setFileToDelete(null);
                                    }}
                                    className="px-4 py-2 text-white/60 hover:text-white text-sm transition"
                                >
                                    Cancel
                                </button>

                                <button
                                    onClick={async () => {
                                        setDeleting(true);
                                        await deleteFile(fileToDelete);
                                        setDeleting(false);
                                        setShowConfirm(false);
                                        setFileToDelete(null);
                                    }}
                                    className="px-4 py-2 bg-red-500 text-white cursor-pointer rounded-lg text-sm hover:bg-red-600 transition flex items-center gap-2"
                                >
                                    {deleting ? (
                                        <>
                                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                                                <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Deleting...
                                        </>
                                    ) : (
                                        "Delete"
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div >
    );
}