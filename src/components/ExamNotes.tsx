import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, NotebookPen, Plus, Check } from "lucide-react";
import { toast } from "sonner";

type Props = {
  storageKey: string;
};

const WORDS_PER_BLOCK = 300;
const MAX_BLOCKS = 5;

function countWords(s: string) {
  const t = s.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

export function ExamNotes({ storageKey }: Props) {
  const [text, setText] = useState("");
  const [blocks, setBlocks] = useState(1);
  const [listening, setListening] = useState(false);
  const [saved, setSaved] = useState(false);
  const recRef = useRef<any>(null);
  const baseRef = useRef<string>("");

  const key = `exam-notes:${storageKey}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        setText(parsed.text ?? "");
        setBlocks(parsed.blocks ?? 1);
      }
    } catch {}
  }, [key]);

  const wordLimit = blocks * WORDS_PER_BLOCK;
  const wordCount = useMemo(() => countWords(text), [text]);
  const remaining = wordLimit - wordCount;
  const atLimit = wordCount >= wordLimit;

  const SR: any =
    typeof window !== "undefined"
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;
  const voiceSupported = !!SR;

  const stopListening = () => {
    try {
      recRef.current?.stop();
    } catch {}
    setListening(false);
  };

  const startListening = () => {
    if (!SR) {
      toast.error("Voice input not supported in this browser");
      return;
    }
    if (atLimit) {
      toast.error(`Limit reached — ${wordLimit} words`);
      return;
    }
    try {
      const rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-IN";
      baseRef.current = text ? text.trimEnd() + " " : "";
      rec.onresult = (e: any) => {
        // Rebuild the whole transcript from scratch each time to avoid duplicates
        let transcript = "";
        for (let i = 0; i < e.results.length; i++) {
          transcript += e.results[i][0].transcript + " ";
        }
        const combined = (baseRef.current + transcript).replace(/\s+/g, " ").trimStart();
        const words = combined.trim() ? combined.trim().split(/\s+/) : [];
        if (words.length > wordLimit) {
          setText(words.slice(0, wordLimit).join(" "));
          try {
            rec.stop();
          } catch {}
        } else {
          setText(combined);
        }
      };

      rec.onerror = () => setListening(false);
      rec.onend = () => setListening(false);
      recRef.current = rec;
      rec.start();
      setListening(true);
    } catch (err) {
      console.error(err);
      setListening(false);
      toast.error("Could not start voice input");
    }
  };

  const handleChange = (v: string) => {
    const words = v.trim() ? v.trim().split(/\s+/) : [];
    if (words.length > wordLimit) {
      setText(words.slice(0, wordLimit).join(" "));
      return;
    }
    setText(v);
  };

  const save = () => {
    try {
      localStorage.setItem(key, JSON.stringify({ text, blocks, savedAt: Date.now() }));
      setSaved(true);
      toast.success("Notes saved");
      setTimeout(() => setSaved(false), 1500);
    } catch {
      toast.error("Could not save notes");
    }
  };

  const extend = () => {
    if (!atLimit) {
      toast.info(`Finish current ${wordLimit} words first`);
      return;
    }
    if (blocks >= MAX_BLOCKS) {
      toast.error("Maximum limit reached");
      return;
    }
    setBlocks((b) => b + 1);
    toast.success(`+${WORDS_PER_BLOCK} words unlocked`);
  };

  return (
    <section className="card-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <NotebookPen className="h-4 w-4 text-primary" />
          <p className="text-sm font-bold">My Notes</p>
        </div>
        <p className="text-xs font-medium text-muted-foreground">
          {wordCount} / {wordLimit} words
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {voiceSupported ? (
          <button
            type="button"
            onClick={listening ? stopListening : startListening}
            className={
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold " +
              (listening
                ? "bg-destructive text-destructive-foreground"
                : "bg-primary text-primary-foreground hover:opacity-95")
            }
          >
            {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            {listening ? "Stop" : "Speak"}
          </button>
        ) : (
          <span className="text-[11px] text-muted-foreground">Voice input not supported here</span>
        )}
        <button
          type="button"
          onClick={save}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted"
        >
          {saved ? <Check className="h-3.5 w-3.5 text-success" /> : null}
          Save
        </button>
        <button
          type="button"
          onClick={extend}
          disabled={!atLimit || blocks >= MAX_BLOCKS}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold disabled:opacity-50 hover:bg-muted"
          title={atLimit ? "Add 300 more words" : "Available after current limit is reached"}
        >
          <Plus className="h-3.5 w-3.5" />
          +{WORDS_PER_BLOCK} words
        </button>
      </div>

      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Apne notes yaha likhe ya mic dabakar bole… (max 300 words at a time)"
        className="mt-3 h-40 w-full resize-y rounded-xl border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
      />

      <p className="mt-2 text-[11px] text-muted-foreground">
        {remaining > 0
          ? `${remaining} words remaining. `
          : `Limit reached. Click +${WORDS_PER_BLOCK} words to continue. `}
        Notes save locally on this device.
      </p>
    </section>
  );
}
