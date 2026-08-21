🎓 StudiFi — AI-Powered Intelligent Study Suite
Transform your documents, presentations, and lecture notes into interactive AI tutors, conceptual quizzes, and performance analytics.

StudiFi is a production-ready EdTech SaaS platform designed to eliminate passive reading. Built on modern web architecture with Supabase and OpenRouter/xAI, StudiFi uses in-memory chunking and conversational Retrieval-Augmented Generation (RAG) to allow students to interact with their study materials in real time.

⚡ Key Highlights
Multi-Format In-Memory Extraction: Direct client-side parsing for .pdf, .pptx, .ppt, and .docx using PDF.js and JSZip without backend file-conversion latency.

Conversational Document RAG: Multi-turn contextual chat powered by advanced LLMs with semantic relevance filtering and persistent conversation history.

Isolated File-Level Quiz Engine: Generate conceptual 5-question Multiple Choice Quizzes (MCQs) directly from specific files with instant grading and reasoning explanations.

Comprehensive Study Analytics: Automated quiz attempt logging in Supabase to track average retention, score progressions, and study streaks over time.

Cross-Document Global Assistant: A centralized dashboard assistant capable of answering questions synthesized across multiple uploaded subject folders.

🛠️ Tech Stack
Frontend & UI
Framework: React 18 (Vite)

Styling: Tailwind CSS & Framer Motion

Routing: React Router DOM (v6)

Data Fetching & Cache Management: TanStack React Query (v5)

Data Visualization: Recharts (Responsive Area, Bar, and Gauge meters)

Icons: Lucide React

Backend, Storage & Database
Database & Authentication: Supabase PostgreSQL & Supabase Auth

File Storage: Supabase Storage Buckets (documents, study-files)

Security: PostgreSQL Row-Level Security (RLS) Policies

AI & Document Extraction
LLM Gateway: OpenRouter API (google/gemini-2.0-flash-exp:free, meta-llama/llama-3.3-70b-instruct) / xAI API

Document Extraction: PDF.js (PDF canvas/text streams) & JSZip (PowerPoint & Word XML parsing)

🌟 Core Features & Architecture
                                  ┌───────────────────────────┐
                                  │   StudiFi Client (React)   │
                                  └─────────────┬─────────────┘
                                                │
                 ┌──────────────────────────────┼──────────────────────────────┐
                 ▼                              ▼                              ▼
      ┌────────────────────┐         ┌────────────────────┐         ┌────────────────────┐
      │  Supabase Storage  │         │  Client Extraction │         │   OpenRouter / AI  │
      │ (PDF, PPTX, DOCX)  │         │  (PDF.js & JSZip)  │         │  (RAG & Quizzes)   │
      └──────────┬─────────┘         └──────────┬─────────┘         └──────────┬─────────┘
                 │                              │                              │
                 └──────────────────────────────┼──────────────────────────────┘
                                                ▼
                                  ┌───────────────────────────┐
                                  │    Supabase PostgreSQL    │
                                  │   (folders, files,        │
                                  │    quiz_attempts, chats)  │
                                  └───────────────────────────┘
                                  
1. Document Management & Extraction
Organize course notes into custom Subject Folders.

Client-side parsing reads raw text streams directly from storage blobs to feed structured knowledge into LLM prompts without storing plain-text redundancies.

2. Live Document RAG Chatbot
Multi-turn conversational chat that remembers past questions and context.

Relevant text chunks are dynamically scored and injected into system prompts for grounded, hallucination-free explanations.

Per-document chat persistence synced directly with Supabase.

3. Conceptual Quiz Generator
Converts slides and textbook notes into rigorous academic MCQs.

Zero metadata leakage: Prompts strictly enforce concept-testing (theorems, logic, circuit analysis) without referring to file names or formats.

Instant interactive evaluation with score tracking and rationales.

4. Student Analytics & Dashboard
Real-time 7-day performance tracking with animated score distribution curves.

Aggregated metrics for total documents, summaries created, quizzes taken, and retention accuracy.

🗄️ Database Schema & Supabase Setup
Run the following SQL script inside your Supabase SQL Editor:

SQL
-- 1. Subject Folders
create table if not exists public.folders (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Uploaded Files
create table if not exists public.files (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    folder_id uuid references public.folders(id) on delete cascade,
    file_name text not null,
    file_path text not null,
    file_size bigint default 0,
    mime_type text default 'application/pdf',
    url text,
    bucket text default 'documents',
    extracted_text text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Quiz Attempts & Performance Logging
create table if not exists public.quiz_attempts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    folder_id uuid references public.folders(id) on delete set null,
    quiz_title text not null default 'Document Quiz',
    score int not null default 0,
    total_questions int not null default 5,
    percentage numeric not null default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Persistent Chat Messages
create table if not exists public.chat_messages (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    file_id uuid references public.files(id) on delete cascade,
    role text not null check (role in ('user', 'assistant')),
    content text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Storage Buckets
insert into storage.buckets (id, name, public, file_size_limit)
values 
  ('documents', 'documents', true, 52428800),
  ('study-files', 'study-files', true, 52428800)
on conflict (id) do update set public = true;

-- 6. Enable RLS and Permissive Policies
alter table public.folders enable row level security;
alter table public.files enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.chat_messages enable row level security;

create policy "Allow user access" on public.folders for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Allow user access" on public.files for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Allow user access" on public.quiz_attempts for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Allow user access" on public.chat_messages for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Allow Public Storage Access" on storage.objects for all to public, anon, authenticated using (bucket_id in ('documents', 'study-files')) with check (bucket_id in ('documents', 'study-files'));

notify pgrst, 'reload schema';

🚀 Getting Started
Prerequisites
Node.js (v18.0.0 or higher)

A Supabase project

An OpenRouter API Key or xAI API Key

Installation
Clone the repository:


git clone https://github.com/your-username/studifi.git
cd studifi
Install dependencies:


npm install
Configure Environment Variables:
Create a .env file in the root directory:


VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# AI Integration (OpenRouter or xAI)
VITE_OPENROUTER_API_KEY=sk-or-v1-your-openrouter-key

# VITE_XAI_API_KEY=xai-your-key-here
Start Development Server:

Bash
npm run dev
Build for Production:

Bash
npm run build

📁 Project Structure

Studifi/
├── src/
│   ├── components/        # Reusable UI components & Chat dialogs
│   ├── context/           # AuthContext (Supabase authentication state)
│   ├── lib/               # Supabase client configuration & utilities
│   ├── pages/
│   │   ├── auth/          # Login & Signup views
│   │   ├── dashboard/     # Dashboard, Analytics, MyFolders, FileViewer, Quizes
│   │   └── Landing/       # Public landing page & marketing layouts
│   ├── services/
│   │   ├── aiService.js   # OpenRouter/xAI API gateway & chunking RAG engine
│   │   ├── files.js       # Supabase file storage queries
│   │   └── folders.js     # Folder structure management
│   ├── App.jsx            # Routing configuration
│   └── main.jsx           # QueryClientProvider & root mounting
├── public/                # Static assets, branding & web manifests
├── supabase/              # Local configuration & edge functions
└── package.json

