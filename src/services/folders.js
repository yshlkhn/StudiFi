import { supabase } from "@/lib/supabaseClient";


export const fetchFolders = async (userId) => {
    const { data, error } = await supabase
        .from("folders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (error) {
        throw error;
    }

    return data || [];
};

export const fetchRecentFolders = async (userId) => {
    const { data, error } = await supabase
        .from("folders")
        .select(`
            id,
            name,
            created_at,
            files(count)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(3);

    if (error) {
        throw error;
    }


    return (data || []).map((folder) => ({
        id: folder.id,
        name: folder.name,
        docs: folder.files?.[0]?.count || 0,
        created_at: folder.created_at,
    }));
};