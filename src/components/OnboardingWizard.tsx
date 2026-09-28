import { useState } from "react";
import { GraduationCap, ArrowRight, ArrowLeft, SkipForward, Check, Trophy, User } from "lucide-react";
import {
  useOnboarding,
  type AttemptCount,
  type HighestStage,
  type PreviousScores,
  type Gender,
} from "@/lib/onboarding";
import { toast } from "sonner";

const GENDERS: { value: Gender; label: string; hint: string }[] = [
  { value: "male", label: "Male", hint: "" },
  { value: "female", label: "Female", hint: "" },
  { value: "other", label: "Other", hint: "" },
];

const ATTEMPTS: { value: AttemptCount; label: string; hint: string }[] = [
  { value: "first", label: "First attempt", hint: "Fresh start" },
  { value: "1", label: "1 attempt", hint: "One previous try" },
  { value: "2", label: "2 attempts", hint: "Two previous tries" },
  { value: "3+", label: "3+ attempts", hint: "Seasoned aspirant" },
];

const STAGES: { value: HighestStage; label: string }[] = [
  { value: "tier1", label: "Tier 1 / Prelims" },
  { value: "tier2", label: "Tier 2 / Mains" },
  { value: "dv", label: "Document Verification" },
];

export function OnboardingWizard() {
  const { save, skip } = useOnboarding();
  const [step, setStep] = useState(1);
  const [gender, setGender] = useState<Gender | null>(null);
  const [attempts, setAttempts] = useState<AttemptCount | null>(null);
  const [stage, setStage] = useState<HighestStage | null>(null);
  const [scores, setScores] = useState<PreviousScores>({});

  const hasPrior = attempts && attempts !== "first";
  const totalSteps = hasPrior ? 4 : 2;
  const progress = Math.round((step / totalSteps) * 100);

  const handleSkip = () => {
    skip();
    toast.info("You can complete this anytime from your profile.");
  };

  const finish = () => {
    save({
      gender: gender ?? undefined,
      attempts: attempts ?? "first",
      ...(hasPrior ? { highestStage: stage ?? undefined, scores } : {}),
    });
    toast.success("Profile saved");
  };

  const next = () => {
    if (step === 1) {
      if (!gender) return;
      setStep(2);
    } else if (step === 2) {
      if (!attempts) return;
      if (!hasPrior) {
        finish();
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!stage) return;
      setStep(4);
    } else {
      finish();
    }
  };

  const back = () => setStep((s) => Math.max(1, s - 1));

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="relative w-full max-w-lg overflow-hidden rounded-t-3xl border border-border bg-card shadow-elevated sm:rounded-3xl">
        {/* Skip — always visible */}
        <button
          onClick={handleSkip}
          className="absolute right-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1.5 text-xs font-semibold text-muted-foreground backdrop-blur transition hover:bg-muted hover:text-foreground"
        >
          <SkipForward className="h-3.5 w-3.5" />
          Skip for Now
        </button>

        {/* Header */}
        <div className="bg-gradient-to-br from-primary to-primary/80 px-6 pb-8 pt-6 text-primary-foreground">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-foreground/15 backdrop-blur">
            <GraduationCap className="h-6 w-6" />
          </span>
          <h2 className="mt-4 font-display text-xl font-bold sm:text-2xl">
            Let's personalise your prep
          </h2>
          <p className="mt-1 text-sm text-primary-foreground/85">
            A few quick questions help your AI Coach build the right plan.
          </p>
          {/* Stepper */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-primary-foreground/80">
              <span>
                Step {step} of {totalSteps}
              </span>
              <span>{progress}%</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-primary-foreground/20">
              <div
                className="h-full rounded-full bg-primary-foreground transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[65vh] overflow-y-auto px-6 py-6">
          <div key={step} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {step === 1 && (
              <Section
                title="What is your gender?"
                subtitle="Helps us personalise your study buddy matches."
              >
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {GENDERS.map((g) => (
                    <SelectCard
                      key={g.value}
                      active={gender === g.value}
                      onClick={() => setGender(g.value)}
                      title={g.label}
                      icon={<User className="h-4 w-4" />}
                    />
                  ))}
                </div>
              </Section>
            )}

            {step === 2 && (
              <Section
                title="How many times have you attempted SSC CGL?"
                subtitle="This helps us calibrate difficulty."
              >
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {ATTEMPTS.map((a) => (
                    <SelectCard
                      key={a.value}
                      active={attempts === a.value}
                      onClick={() => setAttempts(a.value)}
                      title={a.label}
                      hint={a.hint}
                    />
                  ))}
                </div>
              </Section>
            )}

            {step === 3 && (
              <Section
                title="Which was your highest stage?"
                subtitle="The furthest stage you've cleared so far."
              >
                <div className="flex flex-col gap-2">
                  {STAGES.map((s) => (
                    <SelectCard
                      key={s.value}
                      active={stage === s.value}
                      onClick={() => setStage(s.value)}
                      title={s.label}
                      icon={<Trophy className="h-4 w-4" />}
                    />
                  ))}
                </div>
              </Section>
            )}

            {step === 4 && (
              <Section
                title="Enter your previous scores"
                subtitle="Optional but recommended for sharper insights."
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <ScoreField
                    label="Total Score"
                    value={scores.total}
                    onChange={(v) => setScores((s) => ({ ...s, total: v }))}
                    full
                  />
                  <ScoreField
                    label="Quantitative Aptitude"
                    value={scores.quant}
                    onChange={(v) => setScores((s) => ({ ...s, quant: v }))}
                  />
                  <ScoreField
                    label="Reasoning"
                    value={scores.reasoning}
                    onChange={(v) => setScores((s) => ({ ...s, reasoning: v }))}
                  />
                  <ScoreField
                    label="English"
                    value={scores.english}
                    onChange={(v) => setScores((s) => ({ ...s, english: v }))}
                  />
                  <ScoreField
                    label="General Awareness"
                    value={scores.ga}
                    onChange={(v) => setScores((s) => ({ ...s, ga: v }))}
                  />
                </div>
              </Section>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-border bg-background/60 px-6 py-4">
          <button
            onClick={back}
            disabled={step === 1}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <button
            onClick={next}
            disabled={(step === 1 && !gender) || (step === 2 && !attempts) || (step === 3 && !stage)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-elevated transition hover:opacity-95 disabled:opacity-50"
          >
            {step === totalSteps ? (
              <>
                <Check className="h-4 w-4" />
                Finish
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="font-display text-base font-bold text-foreground sm:text-lg">{title}</h3>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function SelectCard({
  active,
  onClick,
  title,
  hint,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition " +
        (active
          ? "border-primary bg-primary-soft text-foreground shadow-card"
          : "border-border bg-background hover:border-primary/40 hover:bg-muted")
      }
    >
      <div className="flex items-center gap-3">
        {icon && (
          <span
            className={
              "grid h-8 w-8 place-items-center rounded-lg " +
              (active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")
            }
          >
            {icon}
          </span>
        )}
        <div>
          <p className="text-sm font-semibold">{title}</p>
          {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
        </div>
      </div>
      <span
        className={
          "grid h-5 w-5 place-items-center rounded-full border transition " +
          (active ? "border-primary bg-primary text-primary-foreground" : "border-border")
        }
      >
        {active && <Check className="h-3 w-3" />}
      </span>
    </button>
  );
}

function ScoreField({
  label,
  value,
  onChange,
  full,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  full?: boolean;
}) {
  return (
    <label className={"flex flex-col gap-1 " + (full ? "sm:col-span-2" : "")}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        type="number"
        inputMode="decimal"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}
