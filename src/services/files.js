import { supabase } from "@/lib/supabaseClient";

const BUCKET_NAME = "documents";

// Helper: Ensure bucket exists and is ready
async function ensureBucket() {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === BUCKET_NAME || b.id === BUCKET_NAME);
    if (!exists) {
      await supabase.storage.createBucket(BUCKET_NAME, { public: true });
    }
  } catch (e) {
    console.warn("Bucket check notice:", e);
  }
}

// 1. Upload Document to Supabase Storage & Database
export async function uploadDocument(file, folderId, userId) {
  if (!file || !folderId || !userId) {
    throw new Error("Missing file, folder ID, or user ID.");
  }

  await ensureBucket();

  const originalName = file.name || "document.pdf";
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniqueId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now();
  const storagePath = `${userId}/${folderId}/${uniqueId}_${sanitizedName}`;

  // Step A: Upload physical file binary to Supabase Storage
  const { error: storageError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type || "application/pdf",
    });

  if (storageError) {
    console.error("Storage upload failed:", storageError);
    throw new Error("Supabase Storage error: " + storageError.message);
  }

  // Step B: Get public URL
  const { data: pubData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  const publicUrl = pubData?.publicUrl || "";

  // Step C: Insert metadata into Database
  const { data: dbRecord, error: dbError } = await supabase
    .from("files")
    .insert([
      {
        user_id: userId,
        folder_id: folderId,
        file_name: originalName,
        name: originalName,
        file_path: storagePath,
        storage_path: storagePath,
        file_size: file.size || 0,
        mime_type: file.type || "application/pdf",
        url: publicUrl,
        created_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (dbError) {
    // Rollback storage upload if DB fails
    await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
    console.error("DB insert failed:", dbError);
    throw new Error("Database insert error: " + dbError.message);
  }

  return dbRecord;
}

// 2. Fetch all files for a folder
export async function fetchFolderFiles(folderId) {
  const { data, error } = await supabase
    .from("files")
    .select("*")
    .eq("folder_id", folderId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

// 3. Delete file from Storage & Database
export async function deleteDocument(fileId, filePath, bucket = BUCKET_NAME) {
  if (filePath) {
    try {
      await supabase.storage.from(bucket).remove([filePath]);
    } catch (e) {
      console.warn("Storage delete skipped:", e);
    }
  }
  const { error } = await supabase.from("files").delete().eq("id", fileId);
  if (error) throw error;
  return true;
}