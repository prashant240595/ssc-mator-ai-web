export type JobStage = "notification" | "admit_card" | "answer_key" | "result";

export const JOB_STAGES: {
  key: JobStage;
  label: string;
  path: "/jobs/notification" | "/jobs/admit-card" | "/jobs/answer-key" | "/jobs/result";
  blurb: string;
}[] = [
  {
    key: "notification",
    label: "Job Notification",
    path: "/jobs/notification",
    blurb: "Latest government vacancy notifications with eligibility and apply links.",
  },
  {
    key: "admit_card",
    label: "Admit Card",
    path: "/jobs/admit-card",
    blurb: "Exam admit cards / hall tickets released by recruitment boards.",
  },
  {
    key: "answer_key",
    label: "Answer Key",
    path: "/jobs/answer-key",
    blurb: "Official and provisional answer keys with objection window details.",
  },
  {
    key: "result",
    label: "Result",
    path: "/jobs/result",
    blurb: "Declared results, merit lists and cut-off marks.",
  },
];

export function stageLabel(stage?: string | null) {
  return JOB_STAGES.find((s) => s.key === (stage ?? "notification"))?.label ?? "Job Notification";
}
