import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function FolderDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [signedUrls, setSignedUrls] = useState({});

    useEffect(() => {
        fetchFiles();
    }, [id]);

    const fetchFiles = async () => {
        setLoading(true);

        const { data, error } = await supabase
            .from("files")
            .select("*")
            .eq("folder_id", id)
            .order("created_at", { ascending: false });

        if (!error && data) {
            setFiles(data);

            const urls = {};

            for (const file of data) {
                const { data: signed } = await supabase
                    .storage
                    .from("study-files")
                    .createSignedUrl(file.file_path, 60 * 60);

                urls[file.id] = signed?.signedUrl;
            }

            setSignedUrls(urls);
        }

        setLoading(false);
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

            <div className="relative px-5 py-6 lg:px-12">

                {/* Header */}
                <div className="mb-6">

                    {/* Back Button Row */}
                    <button
                        onClick={() => navigate(-1)}
                        className="group flex items-center cursor-pointer gap-2 text-sm text-brand-secondary transition mb-4"
                    >
                        {/* Arrow */}
                        <svg
                            className="w-4 h-4 transition-transform group-hover:-translate-x-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>

                        <span className="group-hover:underline">Go Back</span>
                    </button>

                    {/* Title */}
                    <h1 className="text-xl font-bold text-white">
                        Folder Files
                    </h1>

                </div>

                {/* Content */}
                {loading ? (
                    <p className="text-white/50">Loading files...</p>
                ) : files.length === 0 ? (
                    <p className="text-white/50 h-60 flex items-center justify-center">No files in this folder</p>
                ) : (
                    <div className="grid gap-4">
                        {files.map((file) => (
                            <div
                                key={file.id}
                                className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between hover:border-[#f5ba65]/40 hover:bg-white/10 transition-all duration-200"
                            >
                                {/* Left Side */}
                                <div>
                                    <p className="text-white text-sm font-medium truncate max-w-50">
                                        {file.name}
                                    </p>
                                    <p className="text-white/40 text-xs mt-0.5">
                                        {new Date(file.created_at).toLocaleDateString()}
                                    </p>
                                </div>

                                {/* View Button */}
                                <a
                                    href={signedUrls[file.id]}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1 text-brand-secondary text-sm transition"
                                >
                                    <span className="hover:underline cursor-pointer">View Document</span>

                                    {/* Arrow */}
                                    <svg
                                        className="w-4 h-4 "
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </a>
                            </div>
                        ))}
                    </div>
                )
                }
            </div >
        </div>
    );
}