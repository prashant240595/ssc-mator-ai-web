export type Bilingual = { en: string; hi: string };
export type QuizOption = { text: Bilingual; isCorrect?: boolean; image_url?: string | null };

export type QuizQuestion = {
  id: string;
  subject: string | null;
  topic_name: string | null;
  category_type: string | null;
  exam_name: string | null;
  shift_details: string | null;
  text: Bilingual | null;
  options: QuizOption[] | null;
  correct: number;
  explanation: Bilingual | null;
  image_url: string | null;
  image_svg: string | null;
};

export const PENDING_IMAGE_MARKER = "[UPLOAD_PENDING]";

export function cleanSvg(raw?: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/```(?:html|xml|svg)?/gi, "").replace(/```/g, "").trim();
  if (!cleaned || cleaned === PENDING_IMAGE_MARKER) return null;
  return cleaned;
}
