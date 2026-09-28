import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import {
  Shield,
  Users,
  Activity,
  FileQuestion,
  FileUp,
  Upload,
  Sparkles,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Download,
  Trash2,
  Pencil,
  Search,
  X,
  ImagePlus,
  ImageOff,
  ListChecks,
  Flag,
  Undo2,
  Inbox,
  Newspaper,
  MessageSquare,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { MathText } from "@/components/MathText";
import { canonicaliseSection } from "@/components/MockTestPlayer";
import { useServerFn } from "@tanstack/react-start";
import {
  adminListDeletionRequests,
  adminResolveDeletionRequest,
} from "@/lib/account.functions";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Console — SSC Mentor AI" },
      {
        name: "description",
        content:
          "Protected admin console for CSV import, PDF automation, and question bank management on SSC Mentor AI.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPanel,
});

type Tab = "csv" | "pdf" | "manage" | "reports" | "junk" | "ai_requests" | "behaviour" | "feedback" | "deletions";

function useAdminStats() {
  const [stats, setStats] = useState({ totalUsers: 0, dau: 0, questions: 0, pdfsProcessed: 0 });
  useEffect(() => {
    (async () => {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [
        { count: users },
        { count: qs },
        { count: dau },
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("question_bank").select("id", { count: "exact", head: true }).is("deleted_at", null),
        supabase
          .from("user_activity_logs")
          .select("user_id", { count: "exact", head: true })
          .gte("created_at", dayAgo),
      ]);
      setStats({
        totalUsers: users ?? 0,
        dau: dau ?? 0,
        questions: qs ?? 0,
        pdfsProcessed: 0,
      });
    })();
  }, []);
  return stats;
}

function AdminPanel() {
  const adminStats = useAdminStats();

  const [tab, setTab] = useState<Tab>("csv");
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-elevated">
          <Shield className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold md:text-3xl">Admin Panel</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor the platform, ingest content, and manage every question.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            to="/admin/daily-quiz"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
          >
            <Sparkles className="h-4 w-4" /> Daily Quiz
          </Link>
          <Link
            to="/admin/job-drafts"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
          >
            <Newspaper className="h-4 w-4" /> AI Job Drafts
          </Link>
          <Link
            to="/admin/blog"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
          >
            <Newspaper className="h-4 w-4" /> Blog Editor
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={Users} label="Total users" value={adminStats.totalUsers.toLocaleString()} />
        <Stat icon={Activity} label="DAU" value={adminStats.dau.toLocaleString()} tone="success" />
        <Stat icon={FileQuestion} label="Questions" value={adminStats.questions.toLocaleString()} />
        <Stat icon={Sparkles} label="PDFs processed" value={adminStats.pdfsProcessed} tone="warning" />
      </section>


      <nav className="card-surface flex w-full gap-1 overflow-x-auto p-1">
        <TabBtn id="csv" active={tab} setActive={setTab} icon={Upload} label="Upload via CSV" />
        <TabBtn id="pdf" active={tab} setActive={setTab} icon={Sparkles} label="PDF Parser" />
        <TabBtn id="manage" active={tab} setActive={setTab} icon={ListChecks} label="Manage Questions" />
        <TabBtn id="reports" active={tab} setActive={setTab} icon={Flag} label="Reported Questions" />
        <TabBtn id="junk" active={tab} setActive={setTab} icon={Inbox} label="Junk Folder" />
        <TabBtn id="ai_requests" active={tab} setActive={setTab} icon={Users} label="AI Friend Requests" />
        <TabBtn id="behaviour" active={tab} setActive={setTab} icon={Activity} label="User Behaviour" />
        <TabBtn id="feedback" active={tab} setActive={setTab} icon={MessageSquare} label="User Feedback" />
        <TabBtn id="deletions" active={tab} setActive={setTab} icon={UserX} label="Delete Requests" />
      </nav>

      {tab === "csv" && <CsvImport />}
      {tab === "pdf" && <PdfDropzone />}
      {tab === "manage" && <ManageQuestions />}
      {tab === "reports" && <ReportedQuestions />}
      {tab === "junk" && <JunkFolder />}
      {tab === "ai_requests" && <AiFriendRequests />}
      {tab === "behaviour" && <UserBehaviour />}
      {tab === "feedback" && <UserFeedbackAdmin />}
      {tab === "deletions" && <DeletionRequestsAdmin />}
    </div>
  );
}

function TabBtn({
  id,
  active,
  setActive,
  icon: Icon,
  label,
}: {
  id: Tab;
  active: Tab;
  setActive: (t: Tab) => void;
  icon: typeof Upload;
  label: string;
}) {
  const isActive = id === active;
  return (
    <button
      onClick={() => setActive(id)}
      className={
        "inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition " +
        (isActive
          ? "bg-primary text-primary-foreground shadow-elevated"
          : "text-muted-foreground hover:bg-muted hover:text-foreground")
      }
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone = "primary",
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  tone?: "primary" | "success" | "warning";
}) {
  const cls =
    tone === "success"
      ? "bg-success-soft text-success"
      : tone === "warning"
        ? "bg-warning-soft text-warning-foreground"
        : "bg-primary-soft text-primary";
  return (
    <div className="card-surface p-4">
      <span className={`grid h-9 w-9 place-items-center rounded-lg ${cls}`}>
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-3 font-display text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

/* ============================================================
   SHARED
   ============================================================ */

const SUBJECTS = ["Maths", "Reasoning", "English", "General Awareness"] as const;
const EXAM_TYPES = [
  { id: "pyq", label: "Previous Year Paper (PYQ)" },
  { id: "mock_test", label: "Mock Test" },
] as const;

type CategoryType = "subject_specific" | "exam_series";

type Bilingual = { en: string; hi: string };
type OptionRow = { text: Bilingual; isCorrect: boolean; image_url?: string | null };

type QuestionRow = {
  id: string;
  subject: string | null;
  topic_name: string | null;
  category_type: string | null;
  exam_type: string | null;
  exam_name: string | null;
  shift_details: string | null;
  text: Bilingual | null;
  options: OptionRow[] | null;
  correct: number;
  explanation: Bilingual | null;
  image_url: string | null;
  image_svg: string | null;
};

async function uploadQuestionImage(file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `q/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("question-images")
    .upload(path, file, { contentType: file.type, upsert: true });
  if (upErr) throw new Error(upErr.message);
  const { data, error: sErr } = await supabase.storage
    .from("question-images")
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (sErr || !data?.signedUrl) throw new Error(sErr?.message || "Could not sign URL");
  return data.signedUrl;
}

/* ============================================================
   CSV IMPORT (headerless: question, opt1, opt2, opt3, opt4, correct(1-4), image_svg?)
   ============================================================ */

type PreparedQuestion = {
  category_type: CategoryType;
  subject: string;
  topic_name: string | null;
  exam_type: string | null;
  exam_name: string | null;
  shift_details: string | null;
  topic: Bilingual;
  text: Bilingual;
  options: OptionRow[];
  correct: number;
  explanation: Bilingual;
  image_svg: string | null;
  image_url: string | null;
  source_pdf: string | null;
};

type CsvMeta = {
  categoryType: CategoryType;
  subject: string;
  topic: string;
  examType: string;
  examName: string;
  year: string;
  shift: string;
  totalTime: string;
  negativeMarking: string;
  correctMarks: string;
  examSummary: string;
  /** Mock test only: when true, each row is also written to the subject-wise folder. */
  copyToSubject: boolean;
};

const PYQ_YEARS: string[] = (() => {
  const cur = new Date().getFullYear();
  const arr: string[] = [];
  for (let y = cur; y >= 2010; y--) arr.push(String(y));
  return arr;
})();

// Combine free-text exam name + year into a single canonical exam_name like "CGL Tier 1 (2023)"
function composeExamName(baseName: string, year: string | null | undefined) {
  const base = (baseName || "").trim();
  if (!year) return base;
  return base ? `${base} (${year})` : `(${year})`;
}

// Parse year suffix back out of an exam_name. Returns { base, year }.
function parseExamName(full: string | null | undefined): { base: string; year: string } {
  const s = (full || "").trim();
  const m = s.match(/^(.*?)\s*\((\d{4})\)\s*$/);
  if (m) return { base: m[1].trim(), year: m[2] };
  return { base: s, year: "" };
}

const EXPECTED_KEYWORDS = [
  "subject", "topic",
  "question_en", "question_hi",
  "opt1_en", "opt1_hi",
  "opt2_en", "opt2_hi",
  "opt3_en", "opt3_hi",
  "opt4_en", "opt4_hi",
  "correct_opt", "svg_url",
  "solution_en", "solution_hi",
] as const;

// Subject-specific mode requires per-row subject + topic columns
const SUBJECT_KEYWORDS = ["subject", "topic", "exam_name", "shift_details", ...EXPECTED_KEYWORDS.filter(k => k !== "subject" && k !== "topic")] as const;

// Mock test mode: per-row `subject` is required (auto-mapped to canonical section: Reasoning / GA / Quant / English); topic optional.
const MOCK_KEYWORDS = ["subject", "topic", ...EXPECTED_KEYWORDS.filter(k => k !== "subject" && k !== "topic")] as const;

const SAMPLE_CSV = [
  EXPECTED_KEYWORDS as readonly string[],
  ["Maths", "Algebra", "What is 2 + 2?", "२ + २ = ?", "3", "३", "4", "४", "5", "५", "6", "६", "2", "", "Basic addition: 2 + 2 = 4.", "मूल जोड़: २ + २ = ४।"],
  ["Maths", "Geometry", "Find the area of a circle.", "वृत्त का क्षेत्रफल ज्ञात करें।", "πr", "πr", "πr²", "πr²", "2πr", "2πr", "r²", "r²", "2", "[UPLOAD_PENDING]", "Area of circle = πr².", "वृत्त का क्षेत्रफल = πr²।"],
  ["General Awareness", "Geography", "Capital of France?", "फ्रांस की राजधानी?", "Berlin", "बर्लिन", "Madrid", "मैड्रिड", "Paris", "पेरिस", "Rome", "रोम", "3", "", "Paris is the capital of France.", "पेरिस फ्रांस की राजधानी है।"],
]
  .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
  .join("\n");

const SAMPLE_SUBJECT_CSV = [
  SUBJECT_KEYWORDS as readonly string[],
  ["Maths", "Algebra", "SSC CGL 2023", "12th Aug, Shift 1", "What is 2 + 2?", "२ + २ = ?", "3", "३", "4", "४", "5", "५", "6", "६", "2", "", "Basic addition: 2 + 2 = 4.", "मूल जोड़: २ + २ = ४।"],
  ["General Awareness", "Geography", "", "", "Capital of France?", "फ्रांस की राजधानी?", "Berlin", "बर्लिन", "Madrid", "मैड्रिड", "Paris", "पेरिस", "Rome", "रोम", "3", "", "Paris is the capital of France.", "पेरिस फ्रांस की राजधानी है।"],
]
  .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
  .join("\n");

const SAMPLE_MOCK_CSV = [
  MOCK_KEYWORDS as readonly string[],
  ["Reasoning", "Series", "Find the odd one out: 2, 4, 7, 8", "विषम चुनें: 2, 4, 7, 8", "2", "२", "4", "४", "7", "७", "8", "८", "3", "", "7 is the only odd number.", "7 एकमात्र विषम संख्या है।"],
  ["General Awareness", "Geography", "Capital of France?", "फ्रांस की राजधानी?", "Berlin", "बर्लिन", "Madrid", "मैड्रिड", "Paris", "पेरिस", "Rome", "रोम", "3", "", "Paris is the capital of France.", "पेरिस फ्रांस की राजधानी है।"],
  ["Maths", "Arithmetic", "What is 2 + 2?", "२ + २ = ?", "3", "३", "4", "४", "5", "५", "6", "६", "2", "", "Basic addition.", "मूल जोड़।"],
  ["English", "Vocabulary", "Synonym of 'happy'?", "'happy' का पर्यायवाची?", "Sad", "उदास", "Joyful", "हर्षित", "Angry", "क्रोधित", "Tired", "थका", "2", "", "Joyful means happy.", "Joyful का अर्थ है खुश।"],
]
  .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
  .join("\n");





function CsvImport() {
  const [meta, setMeta] = useState<CsvMeta>({
    categoryType: "subject_specific",
    subject: "Maths",
    topic: "",
    examType: "pyq",
    examName: "",
    year: "",
    shift: "",
    totalTime: "60",
    negativeMarking: "0.50",
    correctMarks: "2",
    examSummary: "",
    copyToSubject: false,
  });

  const [existingSubjects, setExistingSubjects] = useState<string[]>([]);
  const [existingExamNames, setExistingExamNames] = useState<string[]>([]);
  useEffect(() => {
    (async () => {
      const [{ data: subs }, { data: exs }] = await Promise.all([
        supabase.from("question_bank").select("subject").is("deleted_at", null).not("subject", "is", null).limit(2000),
        supabase.from("question_bank").select("exam_name").is("deleted_at", null).not("exam_name", "is", null).limit(2000),
      ]);
      const subjSet = new Set<string>([...(SUBJECTS as readonly string[])]);
      (subs ?? []).forEach((r: any) => r.subject && subjSet.add(r.subject));
      setExistingSubjects(Array.from(subjSet).sort());
      const examSet = new Set<string>();
      (exs ?? []).forEach((r: any) => r.exam_name && examSet.add(r.exam_name));
      setExistingExamNames(Array.from(examSet).sort());
    })();
  }, []);

  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<PreparedQuestion[]>([]);
  const [errors, setErrors] = useState<{ row: number; error: string }[]>([]);
  const [status, setStatus] = useState<"idle" | "parsing" | "ready" | "uploading" | "done">("idle");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isMockMode = meta.categoryType === "exam_series" && meta.examType === "mock_test";
  const metaValid =
    meta.categoryType === "subject_specific"
      ? true
      : Boolean(
          meta.examType &&
            meta.examName.trim() &&
            (meta.examType !== "pyq" || meta.year) &&
            Number(meta.totalTime) > 0 &&
            !Number.isNaN(Number(meta.negativeMarking)),
        );


  const reset = () => {
    setFile(null);
    setRows([]);
    setErrors([]);
    setStatus("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = (f: File) => {
    if (!metaValid) {
      toast.error("Please fill the configuration above first.");
      return;
    }
    if (!/\.csv$/i.test(f.name)) {
      toast.error("Please upload a .csv file");
      return;
    }
    setFile(f);
    setStatus("parsing");
    setRows([]);
    setErrors([]);

    const isSubj = meta.categoryType === "subject_specific";
    const isMock = isMockMode;




    Papa.parse<Record<string, string>>(f, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (res) => {
        const prepared: PreparedQuestion[] = [];
        const errs: { row: number; error: string }[] = [];
        (res.data as Record<string, string>[]).forEach((row, i) => {
          const qEn = String(row.question_en ?? "").trim();
          const correctOpt = String(row.correct_opt ?? "").trim();
          const correctNum = Number(correctOpt);
          if (!qEn) {
            errs.push({ row: i + 2, error: "Missing question_en" });
            return;
          }
          if (![1, 2, 3, 4].includes(correctNum)) {
            errs.push({ row: i + 2, error: "correct_opt must be 1-4" });
            return;
          }

          let rowSubject: string | null = null;
          let rowTopic: string | null = null;
          let rowExamName: string | null = null;
          let rowShiftDetails: string | null = null;

          if (isMock) {
            const rawSubject = String(row.subject ?? "").trim();
            if (!rawSubject) {
              errs.push({ row: i + 2, error: "Missing subject column" });
              return;
            }
            // Preserve the exact subject name from CSV — used as the section grouping key.
            rowSubject = rawSubject;
            rowShiftDetails = rawSubject; // mirror into shift_details for player grouping
            rowTopic = String(row.topic ?? "").trim() || rawSubject;

          } else if (isSubj) {
            rowSubject = String(row.subject ?? "").trim() || null;
            rowTopic = String(row.topic ?? "").trim() || null;
            rowExamName = String(row.exam_name ?? "").trim() || null;
            rowShiftDetails = String(row.shift_details ?? "").trim() || null;
            if (!rowSubject) { errs.push({ row: i + 2, error: "Missing subject column" }); return; }
            if (!rowTopic) { errs.push({ row: i + 2, error: "Missing topic column" }); return; }
          } else {
            // PYQ exam series: per-row subject+topic, exam_name+shift from form
            rowSubject = String(row.subject ?? "").trim() || null;
            rowTopic = String(row.topic ?? "").trim() || null;
            if (!rowSubject) { errs.push({ row: i + 2, error: "Missing subject column" }); return; }
            if (!rowTopic) { errs.push({ row: i + 2, error: "Missing topic column" }); return; }
          }

          const effectiveExamName = isSubj
            ? rowExamName
            : composeExamName(meta.examName, meta.examType === "pyq" ? meta.year : "");
          prepared.push({
            category_type: meta.categoryType,
            subject: rowSubject as string,
            topic_name: rowTopic,
            exam_type: isSubj ? null : meta.examType,
            exam_name: effectiveExamName,
            shift_details: isSubj
              ? rowShiftDetails
              : isMock
                ? rowShiftDetails // canonical section
                : meta.shift || null,
            topic: {
              en: rowTopic as string,
              hi: rowTopic as string,
            },
            text: {
              en: qEn,
              hi: String(row.question_hi ?? "").trim(),
            },
            options: [1, 2, 3, 4].map((n) => ({
              text: {
                en: String(row[`opt${n}_en`] ?? "").trim(),
                hi: String(row[`opt${n}_hi`] ?? "").trim(),
              },
              isCorrect: correctNum === n,
              image_url: null,
            })),
            correct: correctNum - 1,
            explanation: {
              en: String(row.solution_en ?? "").trim(),
              hi: String(row.solution_hi ?? "").trim(),
            },
            image_svg: String(row.svg_url ?? "").trim() || null,
            image_url: null,
            source_pdf: null,
          });
        });


        setRows(prepared);
        setErrors(errs);
        setStatus("ready");
        if (prepared.length === 0) toast.error("No valid rows found in CSV");
        else
          toast.message(
            `Parsed ${prepared.length} questions${errs.length ? ` (${errs.length} skipped)` : ""}`,
          );
      },
      error: (err) => {
        setStatus("idle");
        toast.error(`CSV parse error: ${err.message}`);
      },
    });
  };

  const downloadSample = () => {
    const csv = isMockMode
      ? SAMPLE_MOCK_CSV
      : meta.categoryType === "subject_specific"
        ? SAMPLE_SUBJECT_CSV
        : SAMPLE_CSV;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = isMockMode
      ? "ssc-mock-test-sample.csv"
      : meta.categoryType === "subject_specific"
        ? "ssc-subject-bank-sample.csv"
        : "ssc-exam-bank-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const confirmSave = async () => {
    if (rows.length === 0) return;
    setStatus("uploading");
    try {
      const { data: sess } = await supabase.auth.getSession();
      const userId = sess.session?.user.id;
      if (!userId) throw new Error("You must be signed in as admin.");

      if (meta.categoryType === "exam_series") {
        const { error: metaErr } = await (supabase.from("exam_metadata" as any) as any).upsert(
          {
            exam_name: composeExamName(meta.examName, meta.examType === "pyq" ? meta.year : ""),
            exam_type: meta.examType,
            total_time_minutes: Number(meta.totalTime) || 60,
            negative_marking: Number(meta.negativeMarking) || 0,
            correct_marks: Number(meta.correctMarks) || 2,
            exam_summary: meta.examSummary.trim() || null,
            created_by: userId,
          },
          { onConflict: "exam_name" },
        );
        if (metaErr) throw new Error(`Exam metadata: ${metaErr.message}`);
      }

      const payload = rows.map((r) => ({ ...r, source_pdf: file?.name ?? null, created_by: userId }));
      const { error } = await supabase.from("question_bank").insert(payload);
      if (error) throw new Error(error.message);

      toast.success(`Successfully uploaded ${rows.length} questions!`);
      setStatus("done");
      setTimeout(reset, 1200);
    } catch (e: any) {
      setStatus("ready");
      toast.error(e?.message ?? "Upload failed");
    }
  };

  const previewRows = useMemo(() => rows.slice(0, 10), [rows]);
  const isSubj = meta.categoryType === "subject_specific";


  return (
    <div className="card-surface p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
          <Upload className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Upload via CSV</p>
          <p className="text-xs text-muted-foreground">
            Configure the destination, then drop your file. Metadata is auto-injected.
          </p>
        </div>
        <button
          type="button"
          onClick={downloadSample}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold transition hover:bg-muted"
        >
          <Download className="h-3.5 w-3.5" /> Sample CSV
        </button>
      </div>

      {/* CONFIG */}
      <div className="mt-5 space-y-4 rounded-2xl border border-border bg-muted/30 p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Step 1 · Category Type
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { id: "subject_specific" as const, label: "Subject Specific", desc: "Maths · Reasoning · etc." },
              { id: "exam_series" as const, label: "Exam Series", desc: "PYQ · Mock Tests" },
            ]
          ).map((opt) => (
            <button
              key={opt.id}
              onClick={() => setMeta((m) => ({ ...m, categoryType: opt.id }))}
              className={
                "rounded-xl border p-3 text-left transition " +
                (meta.categoryType === opt.id
                  ? "border-primary bg-primary-soft"
                  : "border-border bg-card hover:border-primary/40")
              }
            >
              <p className="text-sm font-semibold">{opt.label}</p>
              <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
            </button>
          ))}
        </div>

        {isSubj ? (
          <div className="rounded-xl border border-dashed border-primary/30 bg-primary-soft/30 p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-primary">No setup needed — subject &amp; topic come from the CSV.</p>
            <p className="mt-1">
              Each row must include a <code className="font-mono">subject</code> and{" "}
              <code className="font-mono">topic</code> column. Folders are created (or appended to) automatically based on unique values.
            </p>
            {(existingSubjects.length > 0) && (
              <p className="mt-2">
                Existing subjects: {existingSubjects.slice(0, 8).map((s) => (
                  <code key={s} className="ml-1 rounded bg-card px-1.5 py-0.5 font-mono text-[10px]">{s}</code>
                ))}
                {existingSubjects.length > 8 && <span className="ml-1">…</span>}
              </p>
            )}
          </div>
        ) : (
          <>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Step 2 · Details</p>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Exam Type">
              <select
                value={meta.examType}
                onChange={(e) => setMeta((m) => ({ ...m, examType: e.target.value }))}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
              >
                {EXAM_TYPES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Exam Name">
              <input
                list="admin-examnames-list"
                value={meta.examName}
                onChange={(e) => setMeta((m) => ({ ...m, examName: e.target.value }))}
                placeholder="Search existing or add new…"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
              />
              <datalist id="admin-examnames-list">
                {existingExamNames.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </Field>
            {!isMockMode && (
              <Field label="Shift">
                <input
                  value={meta.shift}
                  onChange={(e) => setMeta((m) => ({ ...m, shift: e.target.value }))}
                  placeholder="e.g. Shift 1 - 9 AM"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                />
              </Field>
            )}
            {meta.examType === "pyq" && (
              <Field label="Year (PYQ)">
                <select
                  value={meta.year}
                  onChange={(e) => setMeta((m) => ({ ...m, year: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                >
                  <option value="">Select year…</option>
                  {PYQ_YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Year is appended to exam name (e.g. "CGL Tier 1 (2023)") so each year shows as its own folder.
                </p>
              </Field>
            )}
          </div>

          {isMockMode && (
            <div className="rounded-xl border border-dashed border-primary/30 bg-primary-soft/30 p-3 text-xs">
              <p className="font-semibold text-primary">Mock test structure</p>
              <p className="mt-1 text-muted-foreground">
                Each row needs a <code className="font-mono">subject</code> column — use <strong>any subject names you want</strong> (e.g. Reasoning, GA, Quant, English, or custom). Sections are auto-grouped by the exact subject value from the CSV, and admin can rename a subject later from the Manage Questions tab.
                Upload the full test in a single CSV. Each section runs <strong>15 minutes</strong> with its own timer.
                The <strong>Exam Name</strong> you enter above becomes the test folder shown to students.
              </p>

            </div>
          )}

        {!isSubj && (

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Total Time (minutes)">
              <input
                type="number"
                min={1}
                value={meta.totalTime}
                onChange={(e) => setMeta((m) => ({ ...m, totalTime: e.target.value }))}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Marks per Correct Answer">
              <input
                type="number"
                step="0.25"
                min={0}
                value={meta.correctMarks}
                onChange={(e) => setMeta((m) => ({ ...m, correctMarks: e.target.value }))}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Negative Marking (per wrong)">
              <input
                type="number"
                step="0.25"
                min={0}
                value={meta.negativeMarking}
                onChange={(e) => setMeta((m) => ({ ...m, negativeMarking: e.target.value }))}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
              />
            </Field>
            <div className="sm:col-span-3">
              <Field label="Exam Summary / Instructions">
                <textarea
                  rows={4}
                  value={meta.examSummary}
                  onChange={(e) => setMeta((m) => ({ ...m, examSummary: e.target.value }))}
                  placeholder="General instructions shown before the exam starts…"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                />
              </Field>
            </div>
          </div>
        )}
          </>
        )}

      </div>


      {/* EXPECTED HEADERS INSTRUCTIONS */}
      <div className="mt-4 rounded-2xl border border-primary/20 bg-primary-soft/40 p-3 text-xs">
        <p className="font-semibold text-primary">CSV header keywords (required)</p>
        <p className="mt-1 text-muted-foreground">
          Your CSV must have a header row. The order of columns does not matter, but the header names must match the keywords exactly (case-insensitive, spaces trimmed).
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {(isMockMode ? MOCK_KEYWORDS : isSubj ? SUBJECT_KEYWORDS : EXPECTED_KEYWORDS).map((k) => (
            <code key={k} className="rounded-md bg-card px-1.5 py-0.5 font-mono text-[11px] shadow-card">
              {k}
            </code>
          ))}
        </div>
        <p className="mt-2 text-muted-foreground">
          {isSubj && (
            <>
              <span className="font-semibold">subject</span> &amp; <span className="font-semibold">topic</span> are required per row · <span className="font-semibold">exam_name</span> &amp; <span className="font-semibold">shift_details</span> are optional · {" "}
            </>
          )}
          <span className="font-semibold">correct_opt</span> = 1, 2, 3, or 4 · <span className="font-semibold">svg_url</span> is optional · Hindi columns (<span className="font-mono">_hi</span>) may be left blank.
        </p>
        <p className="mt-2 rounded-md bg-card p-2 text-[11px] text-muted-foreground shadow-card">
          <span className="font-semibold text-primary">Pending image marker:</span> Type <code className="rounded bg-muted px-1 font-mono text-destructive">[UPLOAD_PENDING]</code> in the <code className="font-mono">svg_url</code> column when the question needs an image but the image is not ready yet. These questions will appear in the Manage Questions tab under <strong>Action Required (Pending Images)</strong> filter, so you can upload the image later.
        </p>
      </div>

      {/* DROPZONE */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (metaValid) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        onClick={() => metaValid && inputRef.current?.click()}
        className={
          "mt-4 grid place-items-center rounded-2xl border-2 border-dashed px-4 py-6 text-center transition " +
          (!metaValid
            ? "cursor-not-allowed border-border bg-muted/20 opacity-60"
            : "cursor-pointer ") +
          (dragging
            ? "border-primary bg-primary-soft"
            : metaValid
              ? "border-border bg-muted/40 hover:border-primary hover:bg-primary-soft/40"
              : "")
        }
      >
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-card text-primary shadow-card">
          <FileUp className="h-5 w-5" />
        </span>
        <p className="mt-2 text-sm font-semibold">
          {file ? file.name : metaValid ? "Drop CSV here or click to browse" : "Complete configuration above"}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Header-based mapping · column order does not matter
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </div>

      {status === "parsing" && (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Parsing CSV…
        </p>
      )}

      {errors.length > 0 && (
        <div className="mt-3 max-h-24 space-y-1 overflow-y-auto rounded-xl border border-warning/30 bg-warning-soft p-2 text-xs">
          {errors.slice(0, 10).map((e, i) => (
            <div key={i} className="flex items-center gap-1.5 text-warning-foreground">
              <AlertCircle className="h-3 w-3" /> Row {e.row}: {e.error}
            </div>
          ))}
          {errors.length > 10 && (
            <div className="text-warning-foreground/80">…and {errors.length - 10} more</div>
          )}
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">
              Preview ({previewRows.length} of {rows.length} questions)
            </p>
            <button
              onClick={reset}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" /> Clear
            </button>
          </div>
          <div className="max-h-72 overflow-auto rounded-xl border border-border">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                <tr>
                  <th className="px-2 py-2 font-semibold">#</th>
                  <th className="px-2 py-2 font-semibold">Question</th>
                  <th className="px-2 py-2 font-semibold">Option 1</th>
                  <th className="px-2 py-2 font-semibold">Option 2</th>
                  <th className="px-2 py-2 font-semibold">Option 3</th>
                  <th className="px-2 py-2 font-semibold">Option 4</th>
                  <th className="px-2 py-2 font-semibold">Correct</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((r, i) => (
                  <tr key={i} className="border-t border-border align-top">
                    <td className="px-2 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-2 py-2 max-w-[240px] truncate" title={r.text.en}>{r.text.en}</td>
                    <td className="px-2 py-2 max-w-[120px] truncate" title={r.options[0]?.text.en}>{r.options[0]?.text.en}</td>
                    <td className="px-2 py-2 max-w-[120px] truncate" title={r.options[1]?.text.en}>{r.options[1]?.text.en}</td>
                    <td className="px-2 py-2 max-w-[120px] truncate" title={r.options[2]?.text.en}>{r.options[2]?.text.en}</td>
                    <td className="px-2 py-2 max-w-[120px] truncate" title={r.options[3]?.text.en}>{r.options[3]?.text.en}</td>
                    <td className="px-2 py-2 font-semibold text-success">{r.correct + 1}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            disabled={status === "uploading"}
            onClick={confirmSave}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-elevated transition hover:opacity-95 disabled:opacity-50"
          >
            {status === "uploading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving {rows.length} questions…
              </>
            ) : status === "done" ? (
              <>
                <CheckCircle2 className="h-4 w-4" /> Saved
              </>
            ) : (
              <>Confirm & Save {rows.length} to Database</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

/* ============================================================
   MANAGE QUESTIONS
   ============================================================ */

function ManageQuestions() {
  const [catType, setCatType] = useState<CategoryType>("subject_specific");
  // Subject-specific path
  const [subject, setSubject] = useState<string>("");
  const [topic, setTopic] = useState<string>("");
  // Exam series path
  const [examName, setExamName] = useState<string>("");
  const [shift, setShift] = useState<string>("");

  const [facetSubjects, setFacetSubjects] = useState<string[]>([]);
  const [facetTopics, setFacetTopics] = useState<string[]>([]);
  const [facetExams, setFacetExams] = useState<string[]>([]);
  const [facetShifts, setFacetShifts] = useState<string[]>([]);

  const [rows, setRows] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [imageFilter, setImageFilter] = useState<"all" | "pending" | "completed">("all");
  const [editing, setEditing] = useState<QuestionRow | null>(null);

  // Reset downstream filters when type / parent changes
  useEffect(() => {
    setSubject(""); setTopic(""); setExamName(""); setShift(""); setRows([]);
  }, [catType]);
  useEffect(() => { setTopic(""); setRows([]); }, [subject]);
  useEffect(() => { setShift(""); setRows([]); }, [examName]);

  // Load Step 2 facet (subjects or exam names) from the single master question_bank table.
  // Subject-wise folders intentionally aggregate every row with subject/topic, including PYQ rows.
  useEffect(() => {
    (async () => {
      if (catType === "subject_specific") {
        const { data, error } = await supabase.rpc("admin_list_subjects" as any);
        if (error) { toast.error(error.message); return; }
        setFacetSubjects(((data as any[]) ?? []).map((r) => r.subject as string));
      } else {
        const { data, error } = await supabase.rpc("admin_list_exam_names" as any, { p_category: catType });
        if (error) { toast.error(error.message); return; }
        setFacetExams(((data as any[]) ?? []).map((r) => r.exam_name as string));
      }
    })();
  }, [catType]);

  // Step 3 facet
  useEffect(() => {
    if (catType !== "subject_specific" || !subject) return;
    (async () => {
      const { data, error } = await supabase.rpc("admin_list_topics" as any, { p_subject: subject });
      if (error) { toast.error(error.message); return; }
      setFacetTopics(((data as any[]) ?? []).map((r) => r.topic as string));
    })();
  }, [catType, subject]);

  useEffect(() => {
    if (catType !== "exam_series" || !examName) return;
    (async () => {
      const { data, error } = await supabase.rpc("admin_list_shifts" as any, { p_category: "exam_series", p_exam: examName });
      if (error) { toast.error(error.message); return; }
      setFacetShifts(((data as any[]) ?? []).map((r) => r.shift as string));
    })();
  }, [catType, examName]);


  // Refresh top-level facet (subjects or exam names)
  const reloadTopFacet = useCallback(async () => {
    if (catType === "subject_specific") {
      const { data } = await supabase.rpc("admin_list_subjects" as any);
      setFacetSubjects(((data as any[]) ?? []).map((r) => r.subject as string));
    } else {
      const { data } = await supabase.rpc("admin_list_exam_names" as any, { p_category: catType });
      setFacetExams(((data as any[]) ?? []).map((r) => r.exam_name as string));
    }
  }, [catType]);


  // Rename a folder: updates the column value for all matching question_bank rows.
  const renameFolder = useCallback(
    async (level: "top" | "sub") => {
      const col =
        level === "top"
          ? catType === "subject_specific" ? "subject" : "exam_name"
          : catType === "subject_specific" ? "topic_name" : "shift_details";
      const oldVal =
        level === "top"
          ? catType === "subject_specific" ? subject : examName
          : catType === "subject_specific" ? topic : shift;
      if (!oldVal || oldVal === "—") return;
      const next = window.prompt(`Rename folder "${oldVal}" to:`, oldVal);
      if (!next || next.trim() === "" || next === oldVal) return;
      const newVal = next.trim();

      let q = supabase
        .from("question_bank")
        .update({ [col]: newVal } as any)
        .eq(col, oldVal);
      if (catType !== "subject_specific") q = q.eq("category_type", catType);
      // Scope sub-folder rename under its parent
      if (level === "sub") {
        if (catType === "subject_specific") q = q.eq("subject", subject);
        else q = q.eq("exam_name", examName);
      }
      const { error } = await q;
      if (error) return toast.error(error.message);

      // Also rename the test_series title prefix when renaming an exam_name folder.
      if (level === "top" && catType === "exam_series") {
        const { data: tsRows } = await supabase
          .from("question_bank")
          .select("test_series_id")
          .eq("category_type", "exam_series")
          .eq("exam_name", newVal)
          .not("test_series_id", "is", null);
        const ids = Array.from(new Set((tsRows ?? []).map((r: any) => r.test_series_id).filter(Boolean)));
        if (ids.length) {
          const { data: series } = await supabase.from("test_series").select("id,title").in("id", ids);
          await Promise.all(
            (series ?? []).map((s: any) => {
              const newTitle = s.title?.includes("— Test Series")
                ? s.title.replace(/^.*?(?= — Test Series)/, newVal)
                : s.title;
              return supabase.from("test_series").update({ title: newTitle }).eq("id", s.id);
            }),
          );
        }
      }

      toast.success(`Renamed to "${newVal}"`);
      if (level === "top") {
        if (catType === "subject_specific") setSubject(newVal);
        else setExamName(newVal);
        await reloadTopFacet();
      } else {
        if (catType === "subject_specific") setTopic(newVal);
        else setShift(newVal);
      }
      
    },
    [catType, subject, topic, examName, shift, reloadTopFacet],
  );

  // Delete a folder: removes all questions in it, plus any now-empty test_series.
  const deleteFolder = useCallback(
    async (level: "top" | "sub") => {
      const col =
        level === "top"
          ? catType === "subject_specific" ? "subject" : "exam_name"
          : catType === "subject_specific" ? "topic_name" : "shift_details";
      const val =
        level === "top"
          ? catType === "subject_specific" ? subject : examName
          : catType === "subject_specific" ? topic : shift;
      if (!val) return;
      if (!window.confirm(`Move folder "${val}" to Junk? It will be auto-deleted after 10 days unless you restore it.`)) return;

      // Collect rows to soft-delete. Only target rows not already in Junk.
      let scoped = supabase
        .from("question_bank")
        .select("id,test_series_id")
        .is("deleted_at", null);
      if (catType !== "subject_specific") scoped = scoped.eq("category_type", catType);
      if (val === "—" && col === "shift_details") scoped = scoped.is("shift_details", null);
      else scoped = scoped.eq(col, val);
      if (level === "sub") {
        if (catType === "subject_specific") scoped = scoped.eq("subject", subject);
        else scoped = scoped.eq("exam_name", examName);
      }
      const { data: affected, error: selErr } = await scoped;
      if (selErr) return toast.error(selErr.message);
      const ids = (affected ?? []).map((r: any) => r.id);
      const seriesIds = Array.from(new Set((affected ?? []).map((r: any) => r.test_series_id).filter(Boolean)));
      if (ids.length === 0) {
        toast.message("No questions to move.");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      const { error: delErr } = await supabase
        .from("question_bank")
        .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id ?? null })
        .in("id", ids);
      if (delErr) return toast.error(delErr.message);

      // Soft-delete test_series rows whose remaining active questions are zero.
      if (seriesIds.length) {
        const { data: remaining } = await supabase
          .from("question_bank")
          .select("test_series_id")
          .is("deleted_at", null)
          .in("test_series_id", seriesIds);
        const stillUsed = new Set((remaining ?? []).map((r: any) => r.test_series_id));
        const empty = seriesIds.filter((id) => !stillUsed.has(id));
        if (empty.length) {
          await supabase
            .from("test_series")
            .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id ?? null })
            .in("id", empty);
        }
      }

      toast.success(`Moved "${val}" to Junk (${ids.length} question${ids.length === 1 ? "" : "s"}). Auto-deletes in 10 days.`);
      if (level === "top") {
        if (catType === "subject_specific") { setSubject(""); setTopic(""); }
        else { setExamName(""); setShift(""); }
        await reloadTopFacet();
      } else {
        if (catType === "subject_specific") setTopic("");
        else setShift("");
      }
      setRows([]);
    },
    [catType, subject, topic, examName, shift, reloadTopFacet],
  );

  const canLoad = catType === "subject_specific"
    ? Boolean(subject && topic)
    : Boolean(examName && shift);

  const loadQuestions = useCallback(async () => {
    if (!canLoad) return;
    setLoading(true);
    let q = supabase
      .from("question_bank")
      .select("id,subject,topic_name,category_type,exam_type,exam_name,shift_details,text,options,correct,explanation,image_url,image_svg")
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(500);
    if (catType === "subject_specific") {
      q = q.eq("subject", subject).eq("topic_name", topic);
    } else {
      q = q.eq("category_type", catType);
      q = q.eq("exam_name", examName);
      if (shift === "—") q = q.is("shift_details", null);
      else q = q.eq("shift_details", shift);
    }
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows((data ?? []) as unknown as QuestionRow[]);
    setLoading(false);
  }, [canLoad, catType, subject, topic, examName, shift]);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  const isPending = (r: QuestionRow) =>
    r.image_svg === "[UPLOAD_PENDING]" || r.image_url === "[UPLOAD_PENDING]";
  const hasValidImage = (r: QuestionRow) => {
    const url = r.image_url && r.image_url !== "[UPLOAD_PENDING]" ? r.image_url : null;
    const svg = r.image_svg && r.image_svg !== "[UPLOAD_PENDING]" ? r.image_svg : null;
    return Boolean(url || svg);
  };

  const filtered = useMemo(() => {
    let list = rows;
    if (imageFilter === "pending") list = list.filter(isPending);
    else if (imageFilter === "completed") list = list.filter((r) => !isPending(r) && hasValidImage(r));
    if (!search.trim()) return list;
    const s = search.toLowerCase();
    return list.filter((r) =>
      `${r.text?.en ?? ""} ${r.text?.hi ?? ""}`.toLowerCase().includes(s),
    );
  }, [rows, search, imageFilter]);

  const pendingCount = useMemo(() => rows.filter(isPending).length, [rows]);

  const [exporting, setExporting] = useState(false);

  // Download questions as CSV in the exact same format used for uploads.
  const exportCsv = useCallback(
    async (scope: "folder" | "series") => {
      setExporting(true);
      try {
        const all: any[] = [];
        const page = 1000;
        for (let from = 0; ; from += page) {
          let q = supabase
            .from("question_bank")
            .select("subject,topic_name,exam_name,shift_details,text,options,correct,explanation,image_svg,image_url")
            .is("deleted_at", null)
            .order("created_at", { ascending: true })
            .range(from, from + page - 1);
          if (catType === "subject_specific") {
            q = q.eq("subject", subject);
            if (scope === "folder" && topic) q = q.eq("topic_name", topic);
          } else {
            q = q.eq("category_type", catType).eq("exam_name", examName);
            if (scope === "folder" && shift) {
              if (shift === "—") q = q.is("shift_details", null);
              else q = q.eq("shift_details", shift);
            }
          }
          const { data, error } = await q;
          if (error) throw new Error(error.message);
          const batch = data ?? [];
          all.push(...batch);
          if (batch.length < page) break;
        }

        if (all.length === 0) {
          toast.error("No questions found to export");
          return;
        }

        const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
        const header = (SUBJECT_KEYWORDS as readonly string[]).join(",");
        const lines = all.map((r) => {
          const opts = Array.isArray(r.options) ? r.options : [];
          const o = (n: number, lang: "en" | "hi") =>
            (opts[n]?.text?.[lang] ?? opts[n]?.[lang] ?? "") as string;
          return [
            r.subject ?? "",
            r.topic_name ?? "",
            r.exam_name ?? "",
            r.shift_details ?? "",
            r.text?.en ?? "",
            r.text?.hi ?? "",
            o(0, "en"), o(0, "hi"),
            o(1, "en"), o(1, "hi"),
            o(2, "en"), o(2, "hi"),
            o(3, "en"), o(3, "hi"),
            Number(r.correct ?? 0) + 1,
            r.image_svg ?? r.image_url ?? "",
            r.explanation?.en ?? "",
            r.explanation?.hi ?? "",
          ]
            .map(esc)
            .join(",");
        });

        const csv = "\uFEFF" + [header, ...lines].join("\n");
        const base =
          catType === "subject_specific"
            ? `${subject}${scope === "folder" && topic ? `-${topic}` : ""}`
            : `${examName}${scope === "folder" && shift && shift !== "—" ? `-${shift}` : ""}`;
        const name = `${base.replace(/[^\w\-]+/g, "-").replace(/-+/g, "-").toLowerCase()}-questions.csv`;
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Downloaded ${all.length} questions`);
      } catch (e: any) {
        toast.error(e?.message ?? "Export failed");
      } finally {
        setExporting(false);
      }
    },
    [catType, subject, topic, examName, shift],
  );



  const handleDelete = async (id: string) => {
    if (!id) return toast.error("Missing question ID; cannot delete safely.");
    if (!confirm("Move this question to Junk? Duplicate copies in Subject folders will also be moved.")) return;
    const { data: { user } } = await supabase.auth.getUser();

    // Load the row so we can find matching duplicates by text.
    const { data: row } = await supabase
      .from("question_bank")
      .select("id, subject, text, category_type")
      .eq("id", id)
      .maybeSingle();

    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("question_bank")
      .update({ deleted_at: nowIso, deleted_by: user?.id ?? null })
      .eq("id", id)
      .select("id")
      .single();
    if (error) return toast.error(error.message);
    if (!data?.id) return toast.error("Question was not moved. Please reload and try again.");

    // Cascade: soft-delete any duplicate rows in other category folders with the
    // same English question text + subject (from the old duplicate-upload flow).
    let cascadeCount = 0;
    const enText = (row as any)?.text?.en as string | undefined;
    if (enText && row?.subject) {
      const { data: dupes } = await supabase
        .from("question_bank")
        .select("id")
        .neq("id", id)
        .eq("subject", row.subject)
        .is("deleted_at", null)
        .eq("text->>en", enText);
      const dupIds = (dupes ?? []).map((d: any) => d.id);
      if (dupIds.length > 0) {
        await supabase
          .from("question_bank")
          .update({ deleted_at: nowIso, deleted_by: user?.id ?? null })
          .in("id", dupIds);
        cascadeCount = dupIds.length;
      }
    }

    toast.success(
      cascadeCount > 0
        ? `Moved to Junk (${cascadeCount + 1} copies, incl. Subject folder)`
        : "Moved to Junk",
    );
    setRows((prev) => prev.filter((r) => r.id !== id));
  };


  return (
    <div className="card-surface p-5">
      <div>
        <p className="text-sm font-semibold">Manage Questions</p>
        <p className="text-xs text-muted-foreground">Drill down folder-by-folder to find questions.</p>
      </div>

      {/* Step 1: Category Type Tabs */}
      <div className="mt-4 inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
        {([
          ["subject_specific", "Subject Specific"],
          ["exam_series", "Exam Series"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setCatType(id)}
            className={
              "rounded-md px-3 py-1.5 text-xs font-semibold transition " +
              (catType === id
                ? "bg-card text-foreground shadow-card"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* Step 2 + Step 3 */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {catType === "subject_specific" ? (
          <>
            <FolderSelect
              label="Subject"
              value={subject}
              onChange={setSubject}
              options={facetSubjects}
              placeholder="Select a subject"
              onRename={() => renameFolder("top")}
              onDelete={() => deleteFolder("top")}
            />
            <FolderSelect
              label="Topic"
              value={topic}
              onChange={setTopic}
              options={facetTopics}
              placeholder={subject ? "Select a topic" : "Pick a subject first"}
              disabled={!subject}
              onRename={() => renameFolder("sub")}
              onDelete={() => deleteFolder("sub")}
            />
          </>
        ) : (
          <>
            <FolderSelect
              label="Exam Name"
              value={examName}
              onChange={setExamName}
              options={facetExams}
              placeholder="Select an exam"
              onRename={() => renameFolder("top")}
              onDelete={() => deleteFolder("top")}
            />
            <FolderSelect
              label="Shift / Paper"
              value={shift}
              onChange={setShift}
              options={facetShifts}
              placeholder={examName ? "Select a shift" : "Pick an exam first"}
              disabled={!examName}
              onRename={() => renameFolder("sub")}
              onDelete={() => deleteFolder("sub")}
            />
          </>
        )}
      </div>

      {/* List */}
      {!canLoad ? (
        <div className="mt-6 grid place-items-center rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Select a {catType === "subject_specific" ? "subject and topic" : "exam and shift"} to load questions.
        </div>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {loading ? "Loading…" : `${filtered.length} question${filtered.length === 1 ? "" : "s"}`}
              </p>
              {pendingCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                  🔴 {pendingCount} pending image{pendingCount === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-[11px] font-semibold text-muted-foreground">Filter by Image Status:</label>
              <select
                value={imageFilter}
                onChange={(e) => setImageFilter(e.target.value as any)}
                className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-semibold"
              >
                <option value="all">All Questions</option>
                <option value="pending">🔴 Action Required (Pending Images)</option>
                <option value="completed">🟢 Completed</option>
              </select>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search in results…"
                  className="w-56 rounded-lg border border-border bg-card py-2 pl-8 pr-3 text-sm"
                />
              </div>
              <button
                type="button"
                disabled={exporting}
                onClick={() => exportCsv("folder")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-50"
              >
                {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Download CSV (this folder)
              </button>
              <button
                type="button"
                disabled={exporting}
                onClick={() => exportCsv("series")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 disabled:opacity-50"
              >
                {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                {catType === "subject_specific" ? "Download full subject" : "Download full test series"}
              </button>
            </div>

          </div>

          <div className="mt-3 space-y-2">
            {filtered.map((r, idx) => {
              const pending = isPending(r);
              const hasImg = hasValidImage(r);
              return (
              <div
                key={r.id}
                className={
                  "flex items-start gap-3 rounded-xl border bg-card p-3 transition " +
                  (pending
                    ? "border-destructive/60 bg-destructive/5 hover:border-destructive"
                    : "border-border hover:border-primary/40")
                }
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-muted text-[11px] font-bold text-muted-foreground">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm">{r.text?.en || <span className="text-muted-foreground">— no English text —</span>}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="font-mono">#{r.id.slice(0, 8)}</span>
                    <span>· Correct: {String.fromCharCode(65 + r.correct)}</span>
                    {pending ? (
                      <span className="inline-flex items-center gap-1 rounded bg-destructive/15 px-1.5 py-0.5 font-bold text-destructive">
                        🔴 Image Pending
                      </span>
                    ) : hasImg ? (
                      <span className="inline-flex items-center gap-1 rounded bg-success-soft px-1.5 py-0.5 font-semibold text-success">
                        🟢 Image Uploaded
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-semibold text-muted-foreground">
                        ⚪ No Image
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => setEditing(r)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold hover:bg-muted"
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1.5 text-[11px] font-semibold text-destructive hover:bg-destructive-soft"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
              );
            })}
            {filtered.length === 0 && !loading && (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No questions found in this folder.
              </div>
            )}
          </div>
        </>
      )}

      {editing && (
        <EditQuestionDialog
          question={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function FolderSelect({
  label, value, onChange, options, placeholder, disabled, onRename, onDelete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  disabled?: boolean;
  onRename?: () => void;
  onDelete?: () => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        {value && (onRename || onDelete) && (
          <span className="flex items-center gap-1 normal-case tracking-normal">
            {onRename && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); onRename(); }}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] font-semibold text-foreground hover:bg-muted"
                title={`Rename "${value}"`}
              >
                <Pencil className="h-3 w-3" /> Rename
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); onDelete(); }}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] font-semibold text-destructive hover:bg-destructive-soft"
                title={`Delete "${value}" and all its questions`}
              >
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            )}
          </span>
        )}
      </span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm disabled:opacity-50"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

function EditQuestionDialog({
  question,
  onClose,
  onSaved,
}: {
  question: QuestionRow;
  onClose: () => void;
  onSaved: (q: QuestionRow) => void;
}) {
  const [draft, setDraft] = useState<QuestionRow>(() => ({
    ...question,
    text: question.text ?? { en: "", hi: "" },
    explanation: question.explanation ?? { en: "", hi: "" },
    options:
      question.options && question.options.length === 4
        ? question.options
        : [0, 1, 2, 3].map((i) => ({
            text: { en: "", hi: "" },
            isCorrect: i === question.correct,
            image_url: null,
          })),
  }));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [optUploadingIdx, setOptUploadingIdx] = useState<number | null>(null);

  const setOption = (idx: number, lang: "en" | "hi", value: string) => {
    setDraft((d) => ({
      ...d,
      options: d.options!.map((o, i) =>
        i === idx ? { ...o, text: { ...o.text, [lang]: value } } : o,
      ),
    }));
  };

  const setCorrect = (idx: number) => {
    setDraft((d) => ({
      ...d,
      correct: idx,
      options: d.options!.map((o, i) => ({ ...o, isCorrect: i === idx })),
    }));
  };

  const onImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\/(png|jpe?g|webp|gif)/i.test(f.type)) {
      toast.error("Please upload a PNG, JPG, WEBP or GIF image.");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadQuestionImage(f);
      setDraft((d) => ({
        ...d,
        image_url: url,
        image_svg: d.image_svg === "[UPLOAD_PENDING]" ? null : d.image_svg,
      }));
      toast.success("Image uploaded");
    } catch (err: any) {
      toast.error(err?.message ?? "Image upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const onOptionImageSelected = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\/(png|jpe?g|webp|gif)/i.test(f.type)) {
      toast.error("Please upload a PNG, JPG, WEBP or GIF image.");
      return;
    }
    setOptUploadingIdx(idx);
    try {
      const url = await uploadQuestionImage(f);
      setDraft((d) => ({
        ...d,
        options: d.options!.map((o, i) => (i === idx ? { ...o, image_url: url } : o)),
      }));
      toast.success(`Image attached to Option ${String.fromCharCode(65 + idx)}`);
    } catch (err: any) {
      toast.error(err?.message ?? "Image upload failed");
    } finally {
      setOptUploadingIdx(null);
      e.target.value = "";
    }
  };

  const removeOptionImage = (idx: number) => {
    setDraft((d) => ({
      ...d,
      options: d.options!.map((o, i) => (i === idx ? { ...o, image_url: null } : o)),
    }));
  };



  const isPyq =
    draft.category_type === "exam_series" && draft.exam_type === "pyq";
  const parsedExam = parseExamName(draft.exam_name);

  const setYear = (year: string) => {
    setDraft((d) => {
      const { base } = parseExamName(d.exam_name);
      const newName = composeExamName(base, year);
      return { ...d, exam_name: newName };
    });
  };

  const save = async () => {
    if (!draft.id) {
      toast.error("Missing question ID; cannot update safely.");
      return;
    }
    setSaving(true);
    const updatePayload = {
      text: draft.text,
      options: draft.options as any,
      correct: draft.correct,
      explanation: draft.explanation,
      image_url: draft.image_url,
      image_svg: draft.image_svg,
      exam_name: draft.exam_name,
      shift_details: draft.shift_details,
      subject: draft.subject ?? undefined,
      topic_name: draft.topic_name,
      exam_type: draft.exam_type,
      category_type: draft.category_type,
    };
    const { data, error } = await supabase
      .from("question_bank")
      .update(updatePayload)
      .eq("id", draft.id)
      .select("id,subject,topic_name,category_type,exam_type,exam_name,shift_details,text,options,correct,explanation,image_url,image_svg")
      .single();
    setSaving(false);
    if (error) return toast.error(error.message);
    if (!data?.id) return toast.error("Question was not updated. Please reload and try again.");
    toast.success("Question updated successfully!");
    onSaved(data as unknown as QuestionRow);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="min-w-0">
            <p className="text-sm font-bold">Deep Edit · Question</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {question.subject ?? "—"} ·{" "}
              {question.category_type === "subject_specific"
                ? question.topic_name
                : `${question.exam_name ?? ""}${question.shift_details ? ` · ${question.shift_details}` : ""}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          {/* Image */}
          {isPyq && (
            <Section title="Previous Year Paper · Year">
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={parsedExam.year}
                  onChange={(e) => setYear(e.target.value)}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
                >
                  <option value="">Select year…</option>
                  {PYQ_YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Folder: <span className="font-mono">{draft.exam_name || "—"}</span>
                </p>
              </div>
            </Section>
          )}

          <Section title="Question Image">
            {(() => {
              const pendingImg =
                draft.image_url === "[UPLOAD_PENDING]" || draft.image_svg === "[UPLOAD_PENDING]";
              const validImgUrl =
                draft.image_url && draft.image_url !== "[UPLOAD_PENDING]" ? draft.image_url : null;
              return (
                <div
                  className={
                    "rounded-xl p-3 " +
                    (pendingImg ? "border-2 border-destructive bg-destructive/5" : "")
                  }
                >
                  {pendingImg && (
                    <div className="mb-3 flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>⚠️ Don't forget to upload the pending image for this question!</span>
                    </div>
                  )}
                  <div className="flex flex-wrap items-start gap-4">
                    {validImgUrl ? (
                      <img
                        src={validImgUrl}
                        alt=""
                        className="h-28 w-auto rounded-lg border border-border bg-card object-contain"
                      />
                    ) : (
                      <div
                        className={
                          "grid h-28 w-44 place-items-center rounded-lg border border-dashed text-[11px] " +
                          (pendingImg
                            ? "border-destructive text-destructive"
                            : "border-border text-muted-foreground")
                        }
                      >
                        {pendingImg ? "🔴 Upload pending" : "No image attached"}
                      </div>
                    )}
              <div className="flex flex-col gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted">
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                  {uploading ? "Uploading…" : draft.image_url ? "Replace image" : "Upload image"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={onImageSelected}
                    disabled={uploading}
                  />
                </label>
                {draft.image_url && (
                  <button
                    onClick={() => setDraft((d) => ({ ...d, image_url: null }))}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive-soft"
                  >
                    <ImageOff className="h-3.5 w-3.5" /> Remove
                  </button>
                )}
              </div>
            </div>
                  </div>
              );
            })()}
          </Section>

          {/* Question Text */}
          <Section title="Question Text">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="English">
                <textarea
                  rows={4}
                  value={draft.text?.en ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, text: { ...d.text!, en: e.target.value } }))}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono"
                />
                <MathPreview value={draft.text?.en} />
              </Field>
              <Field label="हिंदी (Hindi)">
                <textarea
                  rows={4}
                  value={draft.text?.hi ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, text: { ...d.text!, hi: e.target.value } }))}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono"
                />
                <MathPreview value={draft.text?.hi} />
              </Field>
            </div>
          </Section>

          {/* Options */}
          <Section title="Options · Mark the correct one">
            <div className="space-y-3">
              {draft.options!.map((o, i) => {
                const isCorrect = draft.correct === i;
                return (
                  <div
                    key={i}
                    className={
                      "rounded-xl border p-3 transition " +
                      (isCorrect ? "border-success bg-success-soft/40" : "border-border bg-card")
                    }
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold">
                        <input
                          type="radio"
                          name="correct-option"
                          checked={isCorrect}
                          onChange={() => setCorrect(i)}
                          className="h-4 w-4 accent-success"
                        />
                        Option {String.fromCharCode(65 + i)}
                        {isCorrect && (
                          <span className="inline-flex items-center gap-1 rounded bg-success px-1.5 py-0.5 text-[10px] font-bold text-success-foreground">
                            <CheckCircle2 className="h-3 w-3" /> Correct
                          </span>
                        )}
                      </label>
                      <div className="flex items-center gap-2">
                        {o.image_url && (
                          <img
                            src={o.image_url}
                            alt=""
                            className="h-10 w-10 rounded border border-border object-contain bg-white"
                          />
                        )}
                        <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-semibold hover:bg-muted">
                          {optUploadingIdx === i ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <ImagePlus className="h-3 w-3" />
                          )}
                          {o.image_url ? "Replace" : "Image"}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            className="hidden"
                            onChange={(e) => onOptionImageSelected(i, e)}
                            disabled={optUploadingIdx === i}
                          />
                        </label>
                        {o.image_url && (
                          <button
                            onClick={() => removeOptionImage(i)}
                            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-semibold text-destructive hover:bg-destructive-soft"
                            type="button"
                          >
                            <ImageOff className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div>
                        <input
                          placeholder="English"
                          value={o.text.en}
                          onChange={(e) => setOption(i, "en", e.target.value)}
                          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono"
                        />
                        <MathPreview value={o.text.en} compact />
                      </div>
                      <div>
                        <input
                          placeholder="हिंदी"
                          value={o.text.hi}
                          onChange={(e) => setOption(i, "hi", e.target.value)}
                          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono"
                        />
                        <MathPreview value={o.text.hi} compact />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* Explanation */}
          <Section title="Explanation">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="English">
                <textarea
                  rows={4}
                  value={draft.explanation?.en ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, explanation: { ...d.explanation!, en: e.target.value } }))
                  }
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono"
                />
                <MathPreview value={draft.explanation?.en} />
              </Field>
              <Field label="हिंदी (Hindi)">
                <textarea
                  rows={4}
                  value={draft.explanation?.hi ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, explanation: { ...d.explanation!, hi: e.target.value } }))
                  }
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono"
                />
                <MathPreview value={draft.explanation?.hi} />
              </Field>
            </div>
          </Section>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border p-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted"
          >
            Cancel
          </button>
          <button
            disabled={saving}
            onClick={save}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-elevated hover:opacity-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

function MathPreview({ value, compact }: { value?: string | null; compact?: boolean }) {
  if (!value || !value.trim()) return null;
  return (
    <div
      className={
        "mt-1.5 rounded-md border border-dashed border-border bg-muted/30 px-2.5 py-1.5 text-xs text-foreground " +
        (compact ? "" : "min-h-[2rem]")
      }
    >
      <span className="mr-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        Preview:
      </span>
      <MathText className="inline">{value}</MathText>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5 rounded-xl border border-border bg-muted/20 p-4">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      {children}
    </section>
  );
}

/* ============================================================
   PDF DROPZONE (unchanged)
   ============================================================ */

const QUESTIONS_PER_SERIES = 100;
const PAGES_PER_CHUNK = 2;
const PAGE_OVERLAP = 1;
const THROTTLE_DELAY_MS = 15_000;
const RATE_LIMIT_PAUSE_MS = 60_000;
const OVERLOAD_PAUSE_MS = 120_000;

type ChunkStatus = "pending" | "processing" | "retrying" | "done" | "error";

function PdfDropzone() {
  const [file, setFile] = useState<File | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [seriesCount, setSeriesCount] = useState(0);
  const [phase, setPhase] = useState<string>("");
  const [, setCountdown] = useState<number>(0);
  const [chunkLog, setChunkLog] = useState<
    { idx: number; status: ChunkStatus; count?: number; error?: string }[]
  >([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setRunning(false);
    setDone(false);
    setError(null);
    setCurrentChunk(0);
    setTotalChunks(0);
    setTotalQuestions(0);
    setSeriesCount(0);
    setPhase("");
    setCountdown(0);
    setChunkLog([]);
  };

  const run = async (f: File) => {
    setFile(f);
    reset();
    setRunning(true);

    try {
      if (f.type !== "application/pdf") throw new Error("Please upload a PDF file.");
      if (f.size > 200 * 1024 * 1024) throw new Error("PDF must be under 200 MB.");

      const { data: sess } = await supabase.auth.getSession();
      const userId = sess.session?.user.id;
      if (!userId) throw new Error("You must be signed in as admin.");

      setPhase("Reading PDF…");
      const { PDFDocument } = await import("pdf-lib");
      const srcBytes = new Uint8Array(await f.arrayBuffer());
      const srcDoc = await PDFDocument.load(srcBytes);
      const pageCount = srcDoc.getPageCount();

      const step = Math.max(1, PAGES_PER_CHUNK - PAGE_OVERLAP);
      const chunks: { from: number; to: number }[] = [];
      if (pageCount <= PAGES_PER_CHUNK) {
        chunks.push({ from: 0, to: pageCount });
      } else {
        for (let i = 0; i + PAGES_PER_CHUNK <= pageCount; i += step) {
          chunks.push({ from: i, to: i + PAGES_PER_CHUNK });
        }
      }
      setTotalChunks(chunks.length);
      setChunkLog(chunks.map((_, i) => ({ idx: i, status: "pending" as ChunkStatus })));
      toast.message(`PDF split into ${chunks.length} overlapping chunks (${pageCount} pages).`);

      const safeBase = f.name.replace(/\.pdf$/i, "").replace(/[^a-zA-Z0-9._-]/g, "_");
      const sessionId = Date.now();

      const seenKeys = new Set<string>();
      const fingerprint = (en: string) =>
        en.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 30);

      let questionCounter = 0;
      let createdSeries = 0;
      let currentSeriesId: string | null = null;
      let currentSeriesRemaining = 0;

      const ensureSeries = async (): Promise<string> => {
        if (currentSeriesId && currentSeriesRemaining > 0) return currentSeriesId;
        createdSeries += 1;
        const { data: ts, error: tsErr } = await supabase
          .from("test_series")
          .insert({
            title: `${safeBase} — Test Series ${createdSeries}`,
            description: `Auto-generated from ${f.name} (batch ${createdSeries})`,
            source_pdf: f.name,
            created_by: userId,
          })
          .select("id")
          .single();
        if (tsErr || !ts) throw new Error(`Failed to create test series: ${tsErr?.message}`);
        currentSeriesId = ts.id;
        currentSeriesRemaining = QUESTIONS_PER_SERIES;
        setSeriesCount(createdSeries);
        return ts.id;
      };

      const pauseWithCountdown = async (ms: number, label: string) => {
        const totalSec = Math.ceil(ms / 1000);
        for (let s = totalSec; s > 0; s--) {
          setCountdown(s);
          setPhase(`${label} — resuming in ${s}s…`);
          await sleep(1000);
        }
        setCountdown(0);
      };

      for (let i = 0; i < chunks.length; i++) {
        const { from, to } = chunks[i];
        setCurrentChunk(i + 1);
        if (i > 0) {
          await pauseWithCountdown(THROTTLE_DELAY_MS, "Throttling to stay under Gemini limits");
        }
        setPhase(`Processing chunk ${i + 1} of ${chunks.length} (pages ${from + 1}–${to})…`);
        setChunkLog((prev) => prev.map((c) => (c.idx === i ? { ...c, status: "processing" } : c)));

        const chunkDoc = await PDFDocument.create();
        const pageIndices = Array.from({ length: to - from }, (_, k) => from + k);
        const copied = await chunkDoc.copyPages(srcDoc, pageIndices);
        copied.forEach((p) => chunkDoc.addPage(p));
        const chunkBytes = await chunkDoc.save();

        const chunkPath = `${userId}/${sessionId}-${safeBase}/chunk-${String(i + 1).padStart(4, "0")}.pdf`;
        const { error: upErr } = await supabase.storage
          .from("admin-pdf-uploads")
          .upload(chunkPath, new Blob([chunkBytes as BlobPart], { type: "application/pdf" }), {
            contentType: "application/pdf",
            upsert: true,
          });
        if (upErr) throw new Error(`Chunk ${i + 1} upload failed: ${upErr.message}`);

        const seriesId = await ensureSeries();

        const data = await invokeChunkInfiniteRetry({
          storagePath: chunkPath,
          testSeriesId: seriesId,
          chunkIndex: i + 1,
          totalChunkCount: chunks.length,
          onRateLimit: async (status) => {
            const wait = status === 503 ? OVERLOAD_PAUSE_MS : RATE_LIMIT_PAUSE_MS;
            const label =
              status === 503
                ? `Chunk ${i + 1}: Gemini overloaded (503), waiting 120s`
                : `Chunk ${i + 1}: Rate limit (429), waiting 60s`;
            setChunkLog((prev) => prev.map((c) => (c.idx === i ? { ...c, status: "retrying" } : c)));
            await pauseWithCountdown(wait, label);
            setChunkLog((prev) => prev.map((c) => (c.idx === i ? { ...c, status: "processing" } : c)));
            setPhase(`Retrying chunk ${i + 1} of ${chunks.length}…`);
          },
        });

        const rawQuestions: any[] = Array.isArray(data?.questions) ? data.questions : [];
        const fresh: any[] = [];
        for (const q of rawQuestions) {
          const key = fingerprint(q?.text?.en ?? "");
          if (!key || seenKeys.has(key)) continue;
          seenKeys.add(key);
          fresh.push({
            ...q,
            test_series_id: seriesId,
            image_svg: cleanSvgString(q.image_svg),
          });
        }

        let insertedNow = 0;
        if (fresh.length > 0) {
          const { data: insRows, error: insErr } = await supabase
            .from("question_bank")
            .insert(fresh)
            .select("id");
          if (insErr) throw new Error(`Chunk ${i + 1} DB insert failed: ${insErr.message}`);
          insertedNow = insRows?.length ?? 0;
        }

        let remaining = insertedNow;
        while (remaining > 0) {
          if (currentSeriesRemaining <= 0) await ensureSeries();
          const take = Math.min(remaining, currentSeriesRemaining);
          currentSeriesRemaining -= take;
          questionCounter += take;
          remaining -= take;
        }

        if (currentSeriesId) {
          await supabase
            .from("test_series")
            .update({ question_count: QUESTIONS_PER_SERIES - currentSeriesRemaining })
            .eq("id", currentSeriesId);
        }

        setTotalQuestions(questionCounter);
        setChunkLog((prev) =>
          prev.map((c) => (c.idx === i ? { ...c, status: "done", count: insertedNow } : c)),
        );
      }

      setPhase("All chunks processed.");
      setDone(true);
      setRunning(false);
      toast.success(`Done! ${questionCounter} questions across ${createdSeries} test series.`);
    } catch (e: any) {
      const msg = e?.message ?? "Processing failed";
      setError(msg);
      setRunning(false);
      toast.error(msg);
    }
  };

  return (
    <div className="card-surface relative overflow-hidden p-5">
      <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-elevated">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Auto-Looping PDF Parser</p>
          <p className="text-xs text-muted-foreground">
            Splits big PDFs into {PAGES_PER_CHUNK}-page chunks, loops Gemini sequentially, and auto-creates
            a Test Series every {QUESTIONS_PER_SERIES} questions.
          </p>
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f && !running) run(f);
        }}
        onClick={() => !running && inputRef.current?.click()}
        className={
          "mt-4 grid place-items-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition " +
          (running ? "cursor-not-allowed opacity-70 " : "cursor-pointer ") +
          (dragging
            ? "border-primary bg-primary-soft"
            : "border-border bg-muted/40 hover:border-primary hover:bg-primary-soft/40")
        }
      >
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-card text-primary shadow-card">
          <FileUp className="h-6 w-6" />
        </span>
        <p className="mt-3 text-sm font-semibold">
          {file ? file.name : "Drop PDF here or click to browse"}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Handles 500+ pages · auto-chunked · sequential
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          disabled={running}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) run(f);
          }}
        />
      </div>

      {(running || done || error) && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <KPI label="Chunk" value={totalChunks ? `${currentChunk}/${totalChunks}` : "—"} accent="primary" />
            <KPI label="Questions" value={totalQuestions.toString()} accent="success" />
            <KPI label="Test Series" value={seriesCount.toString()} accent="warning" />
          </div>

          {totalChunks > 0 && (
            <div className="space-y-1.5">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.round((currentChunk / totalChunks) * 100)}%` }}
                />
              </div>
              <p className="text-xs font-medium text-muted-foreground">{phase}</p>
            </div>
          )}

          {chunkLog.length > 0 && (
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl bg-muted/40 p-2">
              {chunkLog.map((c) => (
                <div
                  key={c.idx}
                  className={
                    "flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium " +
                    (c.status === "done"
                      ? "bg-success-soft text-success"
                      : c.status === "processing"
                        ? "bg-primary-soft text-primary"
                        : c.status === "retrying"
                          ? "bg-warning-soft text-warning-foreground"
                          : c.status === "error"
                            ? "bg-destructive/10 text-destructive"
                            : "text-muted-foreground")
                  }
                >
                  <span className="flex items-center gap-2">
                    {c.status === "done" ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : c.status === "processing" || c.status === "retrying" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : c.status === "error" ? (
                      <AlertCircle className="h-3.5 w-3.5" />
                    ) : (
                      <span className="h-3.5 w-3.5 rounded-full border border-current opacity-40" />
                    )}
                    Chunk {c.idx + 1}
                  </span>
                  <span className="opacity-80">
                    {c.status === "done"
                      ? `+${c.count ?? 0} Qs`
                      : c.status === "error"
                        ? "skipped"
                        : c.status === "retrying"
                          ? "pausing…"
                          : c.status === "processing"
                            ? "running…"
                            : "queued"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {done && (
            <div className="rounded-xl border border-success/30 bg-success-soft p-3 text-xs font-semibold text-success">
              ✓ Finished — {totalQuestions} questions across {seriesCount} test series.
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

async function invokeChunkInfiniteRetry({
  storagePath,
  testSeriesId,
  chunkIndex,
  totalChunkCount,
  onRateLimit,
}: {
  storagePath: string;
  testSeriesId: string;
  chunkIndex: number;
  totalChunkCount: number;
  onRateLimit: (status: number) => Promise<void>;
}): Promise<any> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase.functions.invoke("parse-pdf-gemini", {
      body: {
        storage_path: storagePath,
        test_series_id: testSeriesId,
        chunk_index: chunkIndex,
        total_chunks: totalChunkCount,
      },
    });

    if (!error) return data;

    const details = await getFunctionErrorDetails(error);
    if (details.status === 429 || isRateLimitMessage(details.message)) {
      await onRateLimit(429);
      continue;
    }
    if (details.status === 503 || /overload|unavailable|503/i.test(details.message)) {
      await onRateLimit(503);
      continue;
    }

    throw new Error(`Chunk ${chunkIndex}: ${details.message}`);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitMessage(msg: string) {
  return /429|quota|rate limit|too many requests/i.test(msg);
}

function cleanSvgString(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/```(?:html|xml|svg)?/gi, "").replace(/```/g, "").trim();
  return cleaned.length > 0 ? cleaned : null;
}

async function getFunctionErrorDetails(error: unknown): Promise<{ status?: number; message: string }> {
  const fallback = error instanceof Error ? error.message : "Edge Function failed";
  const context = (error as { context?: unknown })?.context;
  if (context instanceof Response) {
    try {
      const body = await context.clone().json();
      if (typeof body?.error === "string") return { status: context.status, message: body.error };
      if (typeof body?.message === "string") return { status: context.status, message: body.message };
    } catch {
      try {
        const text = await context.clone().text();
        if (text) return { status: context.status, message: text };
      } catch {
        return { status: context.status, message: fallback };
      }
    }
  }
  return { message: fallback };
}

function KPI({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "primary" | "success" | "warning";
}) {
  const cls =
    accent === "success"
      ? "bg-success-soft text-success"
      : accent === "warning"
        ? "bg-warning-soft text-warning-foreground"
        : "bg-primary-soft text-primary";
  return (
    <div className={`rounded-xl px-3 py-2 ${cls}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-0.5 font-display text-lg font-bold leading-tight">{value}</p>
    </div>
  );
}

/* ============================================================
   REPORTED QUESTIONS — admin reviews user-reported questions
   ============================================================ */

const REPORT_REASON_LABELS: Record<string, string> = {
  wrong_answer: "Wrong correct answer",
  typo: "Typo / spelling",
  unclear: "Unclear question",
  wrong_explanation: "Wrong explanation",
  image_issue: "Image issue",
  other: "Other",
};

type ReportRow = {
  id: string;
  question_id: string;
  user_id: string;
  reason: string;
  details: string | null;
  created_at: string;
};

type GroupedReport = {
  question: QuestionRow;
  reports: ReportRow[];
};

function ReportedQuestions() {
  const [groups, setGroups] = useState<GroupedReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<QuestionRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: reports, error } = await supabase
      .from("question_reports")
      .select("id,question_id,user_id,reason,details,created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const reportRows = (reports ?? []) as ReportRow[];
    const ids = Array.from(new Set(reportRows.map((r) => r.question_id)));
    if (!ids.length) {
      setGroups([]);
      setLoading(false);
      return;
    }
    const { data: questions, error: qErr } = await supabase
      .from("question_bank")
      .select(
        "id,subject,topic_name,category_type,exam_type,exam_name,shift_details,text,options,correct,explanation,image_url,image_svg",
      )
      .in("id", ids);
    if (qErr) {
      toast.error(qErr.message);
      setLoading(false);
      return;
    }
    const qMap = new Map<string, QuestionRow>();
    (questions ?? []).forEach((q: any) => qMap.set(q.id, q as QuestionRow));
    const grouped = new Map<string, ReportRow[]>();
    reportRows.forEach((r) => {
      const arr = grouped.get(r.question_id) ?? [];
      arr.push(r);
      grouped.set(r.question_id, arr);
    });
    const result: GroupedReport[] = [];
    grouped.forEach((rs, qid) => {
      const q = qMap.get(qid);
      if (q) result.push({ question: q, reports: rs });
    });
    result.sort((a, b) => b.reports.length - a.reports.length);
    setGroups(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dismiss = useCallback(
    async (qid: string) => {
      if (!confirm("Mark this question as correct and remove all its reports?")) return;
      const { error } = await supabase.from("question_reports").delete().eq("question_id", qid);
      if (error) return toast.error(error.message);
      toast.success("Reports cleared.");
      setGroups((prev) => prev.filter((g) => g.question.id !== qid));
    },
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Reported Questions</h2>
          <p className="text-xs text-muted-foreground">
            Sorted by report count. Fix the question or mark it as correct to clear its reports.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted"
        >
          Refresh
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading reports…
        </div>
      )}

      {!loading && groups.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No reported questions. 🎉
        </div>
      )}

      <div className="space-y-3">
        {groups.map(({ question, reports }) => (
          <div key={question.id} className="card-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold uppercase text-destructive-foreground">
                    <Flag className="h-3 w-3" /> {reports.length} report{reports.length === 1 ? "" : "s"}
                  </span>
                  {question.subject && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase">
                      {question.subject}
                    </span>
                  )}
                  {question.topic_name && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase">
                      {question.topic_name}
                    </span>
                  )}
                  {question.exam_name && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase">
                      {question.exam_name}
                    </span>
                  )}
                </div>
                <MathText className="mt-2 block text-sm font-semibold">
                  {question.text?.en || question.text?.hi || "(no text)"}
                </MathText>
                <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                  {(question.options ?? []).map((opt, oi) => (
                    <div
                      key={oi}
                      className={
                        "rounded-md border px-2 py-1 " +
                        (oi === question.correct ? "border-success bg-success-soft text-success" : "border-border")
                      }
                    >
                      <span className="font-bold">{String.fromCharCode(65 + oi)}.</span>{" "}
                      <MathText className="inline">{opt.text?.en || opt.text?.hi || ""}</MathText>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(question)}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-95"
                >
                  <Pencil className="h-3 w-3" /> Edit & resolve
                </button>
                <button
                  type="button"
                  onClick={() => dismiss(question.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                >
                  <CheckCircle2 className="h-3 w-3" /> Mark correct
                </button>
              </div>
            </div>

            <details className="mt-3 rounded-lg border border-border bg-muted/40 p-2 text-xs">
              <summary className="cursor-pointer font-semibold">
                User reasons ({reports.length})
              </summary>
              <ul className="mt-2 space-y-1.5">
                {reports.map((r) => (
                  <li key={r.id} className="rounded-md bg-card p-2">
                    <div className="font-semibold text-foreground">
                      {REPORT_REASON_LABELS[r.reason] ?? r.reason}
                    </div>
                    {r.details && <div className="mt-0.5 text-muted-foreground">{r.details}</div>}
                    <div className="mt-0.5 text-[10px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        ))}
      </div>

      {editing && (
        <EditQuestionDialog
          question={editing}
          onClose={() => setEditing(null)}
          onSaved={async (updated) => {
            // After fixing, clear all reports for this question.
            const { error } = await supabase
              .from("question_reports")
              .delete()
              .eq("question_id", updated.id);
            if (error) toast.error(`Saved, but couldn't clear reports: ${error.message}`);
            else toast.success("Question updated. Reports cleared.");
            setGroups((prev) => prev.filter((g) => g.question.id !== updated.id));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

/* ============================================================
   JUNK FOLDER
   ============================================================ */

type JunkRow = {
  id: string;
  category_type: string | null;
  subject: string | null;
  topic_name: string | null;
  exam_name: string | null;
  shift_details: string | null;
  deleted_at: string;
};

type JunkGroup = {
  key: string;
  label: string;
  sublabel: string;
  ids: string[];
  count: number;
  oldestDeletedAt: string;
};

function daysLeft(deletedAt: string): number {
  const expires = new Date(deletedAt).getTime() + 10 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((expires - Date.now()) / (24 * 60 * 60 * 1000)));
}

function JunkFolder() {
  const [groups, setGroups] = useState<JunkGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [purging, setPurging] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("question_bank")
      .select("id,category_type,subject,topic_name,exam_name,shift_details,deleted_at")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: true })
      .limit(10000);
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as JunkRow[];
    const map = new Map<string, JunkGroup>();
    rows.forEach((r) => {
      const isSubj = r.category_type === "subject_specific";
      const key = isSubj
        ? `subj::${r.subject ?? ""}::${r.topic_name ?? ""}`
        : `exam::${r.category_type ?? ""}::${r.exam_name ?? ""}::${r.shift_details ?? ""}`;
      const label = isSubj
        ? `${r.subject ?? "—"} › ${r.topic_name ?? "—"}`
        : `${r.exam_name ?? "—"}${r.shift_details ? ` › ${r.shift_details}` : ""}`;
      const sublabel = isSubj ? "Subject folder" : `Exam folder (${r.category_type ?? ""})`;
      const existing = map.get(key);
      if (existing) {
        existing.ids.push(r.id);
        existing.count += 1;
        if (r.deleted_at < existing.oldestDeletedAt) existing.oldestDeletedAt = r.deleted_at;
      } else {
        map.set(key, {
          key,
          label,
          sublabel,
          ids: [r.id],
          count: 1,
          oldestDeletedAt: r.deleted_at,
        });
      }
    });
    setGroups(Array.from(map.values()).sort((a, b) => a.oldestDeletedAt.localeCompare(b.oldestDeletedAt)));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const restore = useCallback(
    async (g: JunkGroup) => {
      if (!confirm(`Restore "${g.label}" (${g.count} question${g.count === 1 ? "" : "s"})?`)) return;
      setRestoring(g.key);
      const { error } = await supabase
        .from("question_bank")
        .update({ deleted_at: null, deleted_by: null })
        .in("id", g.ids);
      setRestoring(null);
      if (error) return toast.error(error.message);
      toast.success(`Restored ${g.count} question${g.count === 1 ? "" : "s"}.`);
      setGroups((prev) => prev.filter((x) => x.key !== g.key));
    },
    [],
  );

  const deleteNow = useCallback(
    async (g: JunkGroup) => {
      if (
        !confirm(
          `Permanently delete "${g.label}" (${g.count} question${g.count === 1 ? "" : "s"})?\n\nThis cannot be undone.`,
        )
      )
        return;
      setDeleting(g.key);
      const { error } = await supabase.from("question_bank").delete().in("id", g.ids);
      setDeleting(null);
      if (error) return toast.error(error.message);
      toast.success(`Deleted ${g.count} question${g.count === 1 ? "" : "s"} forever.`);
      setGroups((prev) => prev.filter((x) => x.key !== g.key));
    },
    [],
  );

  const purgeAll = useCallback(async () => {
    if (groups.length === 0) return;
    const total = groups.reduce((s, g) => s + g.count, 0);
    if (!confirm(`Permanently delete ALL junk (${total} question${total === 1 ? "" : "s"})?\n\nThis cannot be undone.`))
      return;
    setPurging(true);
    const allIds = groups.flatMap((g) => g.ids);
    const { error } = await supabase.from("question_bank").delete().in("id", allIds);
    setPurging(false);
    if (error) return toast.error(error.message);
    toast.success(`Deleted ${total} question${total === 1 ? "" : "s"} forever.`);
    setGroups([]);
  }, [groups]);



  return (
    <div className="card-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Junk Folder</p>
          <p className="text-xs text-muted-foreground">
            Deleted questions stay here for 10 days, then auto-delete forever. Restore puts them back in the exact same folder.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={load}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted"
          >
            Refresh
          </button>
          {groups.length > 0 && (
            <button
              onClick={purgeAll}
              disabled={purging}
              className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground shadow-elevated transition hover:opacity-90 disabled:opacity-60"
            >
              {purging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete all
            </button>
          )}
        </div>

      </div>

      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Junk is empty.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {groups.map((g) => {
            const left = daysLeft(g.oldestDeletedAt);
            return (
              <li
                key={g.key}
                className="flex flex-col gap-2 rounded-xl border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{g.label}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {g.sublabel} · {g.count} question{g.count === 1 ? "" : "s"} · deletes in {left} day
                    {left === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => restore(g)}
                    disabled={restoring === g.key || deleting === g.key}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-elevated transition hover:opacity-90 disabled:opacity-60"
                  >
                    {restoring === g.key ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Undo2 className="h-3.5 w-3.5" />
                    )}
                    Restore
                  </button>
                  <button
                    onClick={() => deleteNow(g)}
                    disabled={deleting === g.key || restoring === g.key}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive-soft px-3 py-1.5 text-xs font-semibold text-destructive transition hover:bg-destructive hover:text-destructive-foreground disabled:opacity-60"
                  >
                    {deleting === g.key ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Delete
                  </button>
                </div>

              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ============================================================
   AI FRIEND REQUESTS — admin accepts/rejects requests users send to AI buddies
   ============================================================ */

type AiReqRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  requester: { full_name: string | null; email: string | null } | null;
  addressee: { full_name: string | null; avatar_emoji: string | null } | null;
};

function AiFriendRequests() {
  const [rows, setRows] = useState<AiReqRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: bots } = await supabase.from("profiles").select("id").eq("is_ai", true);
    const botIds = (bots ?? []).map((b) => b.id);
    if (botIds.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    let q = supabase
      .from("partner_requests")
      .select("id, requester_id, addressee_id, status, created_at")
      .in("addressee_id", botIds)
      .order("created_at", { ascending: false })
      .limit(200);
    if (filter === "pending") q = q.eq("status", "pending");
    const { data, error } = await q;
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const list = data ?? [];
    const ids = Array.from(new Set(list.flatMap((r) => [r.requester_id, r.addressee_id])));
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_emoji")
      .in("id", ids);
    const byId = new Map((profs ?? []).map((p) => [p.id, p]));
    setRows(
      list.map((r) => ({
        ...r,
        requester: byId.get(r.requester_id)
          ? { full_name: byId.get(r.requester_id)!.full_name, email: byId.get(r.requester_id)!.email }
          : null,
        addressee: byId.get(r.addressee_id)
          ? {
              full_name: byId.get(r.addressee_id)!.full_name,
              avatar_emoji: byId.get(r.addressee_id)!.avatar_emoji,
            }
          : null,
      })) as AiReqRow[],
    );
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const respond = async (id: string, status: "accepted" | "rejected") => {
    const { error } = await supabase.from("partner_requests").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "accepted" ? "Accepted on behalf of AI" : "Rejected");
    void load();
  };

  return (
    <div className="card-surface space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">AI Friend Requests</h2>
          <p className="text-xs text-muted-foreground">
            Requests users sent TO AI buddies. Accept to start their chat, or reject.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border p-0.5">
          {(["pending", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold capitalize ${
                filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No requests to review.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-lg">
                {r.addressee?.avatar_emoji ?? "🤖"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {r.requester?.full_name ?? "User"}{" "}
                  <span className="text-muted-foreground">→</span>{" "}
                  {r.addressee?.full_name ?? "AI"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {r.requester?.email ?? ""} · {new Date(r.created_at).toLocaleString()}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                  r.status === "pending"
                    ? "bg-warning/15 text-warning"
                    : r.status === "accepted"
                      ? "bg-success/15 text-success"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {r.status}
              </span>
              {r.status === "pending" && (
                <div className="flex gap-1">
                  <button
                    onClick={() => respond(r.id, "accepted")}
                    className="rounded-lg bg-success px-2.5 py-1.5 text-xs font-semibold text-success-foreground"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => respond(r.id, "rejected")}
                    className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ============= User Behaviour Tracking =============
type ActivityRow = {
  id: string;
  user_id: string;
  activity_type: string;
  details: Record<string, unknown> | null;
  created_at: string;
};
type UserProfile = { id: string; email: string | null; full_name: string | null };

function UserBehaviour() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [days, setDays] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("user_activity_logs")
      .select("id,user_id,activity_type,details,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const list = (data ?? []) as ActivityRow[];
    setRows(list);
    const ids = Array.from(new Set(list.map((r) => r.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,email,full_name")
        .in("id", ids);
      const map: Record<string, UserProfile> = {};
      (profs ?? []).forEach((p) => {
        map[p.id] = p as UserProfile;
      });
      setProfiles(map);
    }
    setLoading(false);
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const types = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => s.add(r.activity_type));
    return Array.from(s).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (typeFilter !== "all" && r.activity_type !== typeFilter) return false;
      if (userFilter.trim()) {
        const p = profiles[r.user_id];
        const q = userFilter.trim().toLowerCase();
        const hay = `${p?.email ?? ""} ${p?.full_name ?? ""} ${r.user_id}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, typeFilter, userFilter, profiles]);

  // Aggregates
  const activeUsers = useMemo(() => new Set(rows.map((r) => r.user_id)).size, [rows]);
  const loginsToday = useMemo(() => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.activity_type === "login" && new Date(r.created_at).getTime() >= dayAgo) {
        set.add(r.user_id);
      }
    });
    return set.size;
  }, [rows]);
  const topPages = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => {
      if (r.activity_type !== "page_view") return;
      const path = (r.details as { path?: string } | null)?.path ?? "unknown";
      m.set(path, (m.get(path) ?? 0) + 1);
    });
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [rows]);
  const topUsers = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => m.set(r.user_id, (m.get(r.user_id) ?? 0) + 1));
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [rows]);

  // Where users come from (first page view per user in the window)
  const acquisition = useMemo(() => {
    const first = new Map<string, ActivityRow>();
    rows.forEach((r) => {
      if (r.activity_type !== "page_view") return;
      const prev = first.get(r.user_id);
      if (!prev || new Date(r.created_at) < new Date(prev.created_at)) first.set(r.user_id, r);
    });
    const sources = new Map<string, number>();
    const devices = new Map<string, number>();
    first.forEach((r) => {
      const d = (r.details ?? {}) as { traffic_source?: string; referrer?: string; ua?: string };
      let src = d.traffic_source;
      if (!src) {
        const ref = d.referrer ?? "";
        src = /play\.google\.com|com\.android\.vending/i.test(ref)
          ? "play_store"
          : /google\./i.test(ref)
            ? "google_search"
            : ref
              ? "referral"
              : "unknown (not tracked yet)";
      }
      sources.set(src, (sources.get(src) ?? 0) + 1);
      const ua = d.ua ?? "";
      const dev = /;\s*wv\)/i.test(ua)
        ? "Android app (WebView)"
        : /android/i.test(ua)
          ? "Android browser"
          : /iphone|ipad/i.test(ua)
            ? "iOS"
            : "Desktop / other";
      devices.set(dev, (devices.get(dev) ?? 0) + 1);
    });
    const sort = (m: Map<string, number>) =>
      Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
    return { total: first.size, sources: sort(sources), devices: sort(devices) };
  }, [rows]);

  const fmtUser = (id: string) => {
    const p = profiles[id];
    return p?.full_name || p?.email || id.slice(0, 8);
  };
  const fmtDetails = (d: Record<string, unknown> | null) => {
    if (!d) return "";
    const parts: string[] = [];
    if (typeof d.path === "string") parts.push(d.path);
    if (typeof d.source === "string") parts.push(`(${d.source})`);
    Object.entries(d).forEach(([k, v]) => {
      if (k === "path" || k === "source" || k === "ua") return;
      if (typeof v === "string" || typeof v === "number") parts.push(`${k}=${v}`);
    });
    return parts.join(" ");
  };

  return (
    <div className="card-surface space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">User Behaviour</h2>
          <p className="text-xs text-muted-foreground">
            Logins, page views, and in-app actions across all users.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
          >
            <option value={1}>Last 24h</option>
            <option value={3}>Last 3 days</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
          </select>
          <button
            onClick={load}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-xs text-muted-foreground">Events in window</p>
          <p className="text-2xl font-bold">{rows.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-xs text-muted-foreground">Active users</p>
          <p className="text-2xl font-bold">{activeUsers}</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-xs text-muted-foreground">Logins (24h)</p>
          <p className="text-2xl font-bold">{loginsToday}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="mb-1 text-sm font-semibold">Where users come from</p>
          <p className="mb-2 text-[11px] text-muted-foreground">
            First visit source of {acquisition.total} users in this window.
          </p>
          {acquisition.sources.length === 0 ? (
            <p className="text-xs text-muted-foreground">No page views yet.</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {acquisition.sources.map(([src, n]) => (
                <li key={src} className="flex justify-between gap-2">
                  <span className="truncate capitalize">{src.replace(/_/g, " ")}</span>
                  <span className="font-semibold">
                    {n} ({Math.round((n / Math.max(acquisition.total, 1)) * 100)}%)
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="mb-1 text-sm font-semibold">Device / platform</p>
          <p className="mb-2 text-[11px] text-muted-foreground">
            App WebView vs mobile browser vs desktop.
          </p>
          {acquisition.devices.length === 0 ? (
            <p className="text-xs text-muted-foreground">No data yet.</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {acquisition.devices.map(([dev, n]) => (
                <li key={dev} className="flex justify-between gap-2">
                  <span className="truncate">{dev}</span>
                  <span className="font-semibold">
                    {n} ({Math.round((n / Math.max(acquisition.total, 1)) * 100)}%)
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="mb-2 text-sm font-semibold">Top pages</p>
          {topPages.length === 0 ? (
            <p className="text-xs text-muted-foreground">No page views yet.</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {topPages.map(([path, n]) => (
                <li key={path} className="flex justify-between gap-2">
                  <span className="truncate font-mono">{path}</span>
                  <span className="font-semibold">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="mb-2 text-sm font-semibold">Most active users</p>
          {topUsers.length === 0 ? (
            <p className="text-xs text-muted-foreground">No activity.</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {topUsers.map(([uid, n]) => (
                <li key={uid} className="flex justify-between gap-2">
                  <span className="truncate">{fmtUser(uid)}</span>
                  <span className="font-semibold">{n} events</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
        >
          <option value="all">All activity types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          placeholder="Search by name / email"
          className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="p-2">When</th>
              <th className="p-2">User</th>
              <th className="p-2">Activity</th>
              <th className="p-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-muted-foreground">
                  No activity matches these filters.
                </td>
              </tr>
            ) : (
              filtered.slice(0, 500).map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="whitespace-nowrap p-2 text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="p-2">
                    <div className="font-semibold">{fmtUser(r.user_id)}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {profiles[r.user_id]?.email ?? r.user_id.slice(0, 8)}
                    </div>
                  </td>
                  <td className="whitespace-nowrap p-2">
                    <span className="rounded-md bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
                      {r.activity_type}
                    </span>
                  </td>
                  <td className="p-2 text-muted-foreground">{fmtDetails(r.details)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > 500 && (
        <p className="text-center text-[10px] text-muted-foreground">
          Showing first 500 of {filtered.length} matching events.
        </p>
      )}
    </div>
  );
}




function UserFeedbackAdmin() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("user_feedback" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) toast.error(error.message);
    setRows((data as any[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id: string, status: string) => {
    const { error } = await (supabase.from("user_feedback" as never) as any)
      .update({ status })
      .eq("id", id);
    if (error) return toast.error(error.message);
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading feedback...</p>;
  if (!rows.length)
    return <p className="text-sm text-muted-foreground">Abhi tak koi feedback nahi aaya.</p>;

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.id} className="card-surface p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-md bg-primary-soft px-2 py-0.5 font-semibold uppercase text-primary">
              {r.category}
            </span>
            <span className="font-semibold text-foreground">{r.user_email ?? r.user_id}</span>
            <span className="text-muted-foreground">
              {new Date(r.created_at).toLocaleString()}
            </span>
            <span
              className={
                "ml-auto rounded-md px-2 py-0.5 font-semibold " +
                (r.status === "done"
                  ? "bg-success-soft text-success-foreground"
                  : "bg-warning-soft text-warning-foreground")
              }
            >
              {r.status}
            </span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{r.message}</p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => setStatus(r.id, r.status === "done" ? "new" : "done")}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted"
            >
              {r.status === "done" ? "Mark as new" : "Mark as done"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function DeletionRequestsAdmin() {
  const list = useServerFn(adminListDeletionRequests);
  const resolve = useServerFn(adminResolveDeletionRequest);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r: any = await list({});
      setRows(r?.requests ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load requests");
    }
    setLoading(false);
  }, [list]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id: string, action: "approve" | "reject") => {
    if (action === "approve" && !confirm("Permanently delete this user's account?")) return;
    setBusy(id);
    try {
      await resolve({ data: { id, action } });
      toast.success(action === "approve" ? "Account deleted." : "Request rejected.");
      setRows((r) =>
        r.map((x) => (x.id === id ? { ...x, status: action === "approve" ? "approved" : "rejected" } : x)),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
    setBusy(null);
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading deletion requests...</p>;
  if (!rows.length)
    return <p className="text-sm text-muted-foreground">No account deletion requests yet.</p>;

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.id} className="card-surface p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-foreground">{r.user_email ?? r.user_id}</span>
            {r.user_name && <span className="text-muted-foreground">({r.user_name})</span>}
            <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
            <span
              className={
                "ml-auto rounded-md px-2 py-0.5 font-semibold " +
                (r.status === "approved"
                  ? "bg-destructive/15 text-destructive"
                  : r.status === "rejected"
                    ? "bg-muted text-muted-foreground"
                    : "bg-warning-soft text-warning-foreground")
              }
            >
              {r.status}
            </span>
          </div>
          <p className="mt-2 text-sm font-semibold text-foreground">Reason: {r.reason}</p>
          {r.details && (
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{r.details}</p>
          )}
          {r.status === "pending" && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => act(r.id, "approve")}
                disabled={busy === r.id}
                className="inline-flex items-center gap-2 rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Approve & delete
              </button>
              <button
                onClick={() => act(r.id, "reject")}
                disabled={busy === r.id}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
