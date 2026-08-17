import { supabase } from "@/lib/supabaseClient";

export const fetchFiles = async (folderId) => {
    const { data, error } = await supabase
        .from("files")
        .select("*")
        .eq("folder_id", folderId)
        .order("created_at", { ascending: false });

    if (error) {
        throw error;
    }

    return data || [];
};