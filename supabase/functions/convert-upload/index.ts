import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "http://localhost:5173",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type CloudConvertTask = {
  name: string;
  status?: string;
  result?: {
    form?: {
      url: string;
      parameters: Record<string, string>;
    };
    files?: Array<{
      url: string;
      filename?: string;
      size?: number;
    }>;
  };
};

type CloudConvertJob = {
  id: string;
  status: string;
  tasks: CloudConvertTask[];
};

const allowedExtensions = [
  "pdf",
  "doc",
  "docx",
  "ppt",
  "pptx",
];

const MAX_SIZE = 10 * 1024 * 1024;

Deno.serve(async (req) => {
  // ==========================================
  // CORS
  // ==========================================

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // ==========================================
    // 1. Check Authorization
    // ==========================================

    const authorization = req.headers.get("Authorization");

    if (!authorization) {
      return new Response(
        JSON.stringify({
          error: "Missing authorization header",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    // ==========================================
    // 2. User Supabase client
    // ==========================================

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: {
            Authorization: authorization,
          },
        },
      },
    );

    // ==========================================
    // 3. Get authenticated user
    // ==========================================

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Auth error:", userError);

      return new Response(
        JSON.stringify({
          error: "Unauthorized",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    console.log("Authenticated user:", user.id);

    // ==========================================
    // 4. Read FormData
    // ==========================================

    const formData = await req.formData();

    const file = formData.get("file");
    const folderId = formData.get("folderId");

    if (!(file instanceof File)) {
      return new Response(
        JSON.stringify({
          error: "File is required",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    if (
      typeof folderId !== "string" ||
      !folderId
    ) {
      return new Response(
        JSON.stringify({
          error: "folderId is required",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    // ==========================================
    // 5. Check file size
    // ==========================================

    if (file.size > MAX_SIZE) {
      return new Response(
        JSON.stringify({
          error: `${file.name} exceeds 10MB limit`,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    // ==========================================
    // 6. Check extension
    // ==========================================

    const originalName = file.name;

    const extension = originalName
      .split(".")
      .pop()
      ?.toLowerCase() || "";

    if (!allowedExtensions.includes(extension)) {
      return new Response(
        JSON.stringify({
          error: "Only PDF, DOC, DOCX, PPT and PPTX files are supported.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    // ==========================================
    // 7. Verify folder belongs to user
    // ==========================================

    const { data: folder, error: folderError } = await supabase
      .from("folders")
      .select("id")
      .eq("id", folderId)
      .eq("user_id", user.id)
      .single();

    if (folderError || !folder) {
      console.error(
        "Folder verification failed:",
        folderError,
      );

      return new Response(
        JSON.stringify({
          error: "Folder not found or unauthorized",
        }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    // ==========================================
    // 8. Create PDF path
    // ==========================================

    const uuid = crypto.randomUUID();

    const pdfFileName = `${uuid}.pdf`;

    const pdfPath = `${user.id}/${folderId}/${pdfFileName}`;

    let pdfBuffer;

    // ==========================================
    // 9. PDF
    // ==========================================

    if (extension === "pdf") {
      console.log("PDF detected. No conversion.");

      pdfBuffer = await file.arrayBuffer();
    } // ==========================================
    // 10. Office → PDF using CloudConvert
    // ==========================================

    else {
      console.log(
        `Converting ${originalName} to PDF`,
      );

      const cloudConvertKey = Deno.env.get(
        "CLOUDCONVERT_API_KEY",
      );

      if (!cloudConvertKey) {
        throw new Error(
          "CLOUDCONVERT_API_KEY is not configured",
        );
      }

      // ----------------------------------------
      // Create CloudConvert job
      // ----------------------------------------

      const jobResponse = await fetch(
        "https://api.cloudconvert.com/v2/jobs",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cloudConvertKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tasks: {
              "import-file": {
                operation: "import/upload",
              },

              "convert-file": {
                operation: "convert",
                input: [
                  "import-file",
                ],
                output_format: "pdf",
              },

              "export-file": {
                operation: "export/url",
                input: [
                  "convert-file",
                ],
              },
            },
          }),
        },
      );

      if (!jobResponse.ok) {
        const errorText = await jobResponse.text();

        console.error(
          "CloudConvert create job error:",
          errorText,
        );

        throw new Error(
          "Failed to create CloudConvert job",
        );
      }

      const jobData = await jobResponse.json();

      const tasks = jobData.data.tasks as CloudConvertTask[];

      const uploadTask = tasks.find(
        (task: CloudConvertTask) => task.name === "import-file",
      );

      if (!uploadTask) {
        throw new Error(
          "CloudConvert upload task not found",
        );
      }

      // ----------------------------------------
      // Upload original file
      // ----------------------------------------

      const uploadUrl = uploadTask.result?.form?.url;

      const parameters = uploadTask.result?.form?.parameters;

      if (
        !uploadUrl ||
        !parameters
      ) {
        throw new Error(
          "CloudConvert upload form not available",
        );
      }

      const cloudConvertForm = new FormData();

      for (
        const [key, value] of Object.entries(parameters)
      ) {
        cloudConvertForm.append(
          key,
          String(value),
        );
      }

      cloudConvertForm.append(
        "file",
        file,
        file.name,
      );

      const uploadResponse = await fetch(
        uploadUrl,
        {
          method: "POST",
          body: cloudConvertForm,
        },
      );

      if (!uploadResponse.ok) {
        const uploadError = await uploadResponse.text();

        console.error(
          "CloudConvert upload error:",
          uploadError,
        );

        throw new Error(
          "Failed to upload file to CloudConvert",
        );
      }

      // ----------------------------------------
      // Wait for conversion
      // ----------------------------------------

      let completedJob: CloudConvertJob | undefined;

      for (let i = 0; i < 60; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const statusResponse = await fetch(
          `https://api.cloudconvert.com/v2/jobs/${jobData.data.id}`,
          {
            headers: {
              Authorization: `Bearer ${cloudConvertKey}`,
            },
          },
        );

        const statusData = await statusResponse.json();

        completedJob = statusData.data as CloudConvertJob;

        if (completedJob.status === "finished") {
          break;
        }

        if (completedJob.status === "error") {
          throw new Error(
            "CloudConvert conversion failed",
          );
        }
      }

      if (
        !completedJob ||
        completedJob.status !== "finished"
      ) {
        throw new Error(
          "Conversion timed out",
        );
      }

      const exportTask = completedJob.tasks.find(
        (task: CloudConvertTask) => task.name === "export-file",
      );

      const outputFile = exportTask?.result?.files?.[0];

      if (!outputFile?.url) {
        throw new Error(
          "Converted PDF URL not found",
        );
      }

      // ----------------------------------------
      // Download converted PDF
      // ----------------------------------------

      const pdfResponse = await fetch(
        outputFile.url,
      );

      if (!pdfResponse.ok) {
        throw new Error(
          "Failed to download converted PDF",
        );
      }

      pdfBuffer = await pdfResponse.arrayBuffer();
    }

    // ==========================================
    // 11. Admin Supabase client
    // ==========================================

    const adminSupabase = createClient(
      Deno.env.get(
        "SUPABASE_URL",
      )!,
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY",
      )!,
    );

    // ==========================================
    // 12. Upload PDF to Storage
    // ==========================================

    console.log(
      "Uploading PDF:",
      pdfPath,
    );

    const {
      error: storageError,
    } = await adminSupabase.storage
      .from("study-files")
      .upload(
        pdfPath,
        pdfBuffer,
        {
          contentType: "application/pdf",
          upsert: false,
        },
      );

    if (storageError) {
      console.error(
        "Storage error:",
        storageError,
      );

      throw storageError;
    }

    // ==========================================
    // 13. Insert database record
    // ==========================================

    const {
      error: dbError,
    } = await adminSupabase
      .from("files")
      .insert({
        folder_id: folderId,

        user_id: user.id,

        name: originalName,

        file_path: pdfPath,

        file_type: "application/pdf",

        original_name: originalName,

        original_type: file.type,

        status: "completed",
      });

    // ==========================================
    // 14. Cleanup if DB fails
    // ==========================================

    if (dbError) {
      console.error(
        "Database error:",
        dbError,
      );

      await adminSupabase
        .storage
        .from("study-files")
        .remove([
          pdfPath,
        ]);

      throw dbError;
    }

    // ==========================================
    // 15. Success
    // ==========================================

    console.log(
      "Upload completed:",
      originalName,
    );

    return new Response(
      JSON.stringify({
        success: true,

        file: {
          name: originalName,

          path: pdfPath,

          type: "application/pdf",

          originalType: file.type,
        },
      }),
      {
        status: 200,

        headers: {
          ...corsHeaders,

          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error(
      "Function error:",
      error,
    );

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Upload failed",
      }),
      {
        status: 500,

        headers: {
          ...corsHeaders,

          "Content-Type": "application/json",
        },
      },
    );
  }
});
