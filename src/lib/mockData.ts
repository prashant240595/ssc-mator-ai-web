import type { Bilingual } from "./i18n";

export type Subject = "quant" | "reasoning" | "ga" | "english";

export interface SubjectMeta {
  id: Subject;
  name: Bilingual;
  short: Bilingual;
  color: string;
  topics: Bilingual[];
}

export const SUBJECTS: SubjectMeta[] = [
  {
    id: "quant",
    name: { en: "Quantitative Aptitude", hi: "संख्यात्मक अभियोग्यता" },
    short: { en: "Quant", hi: "गणित" },
    color: "subject-quant",
    topics: [
      { en: "Number System", hi: "संख्या पद्धति" },
      { en: "Percentage", hi: "प्रतिशत" },
      { en: "Profit & Loss", hi: "लाभ और हानि" },
      { en: "Time & Work", hi: "समय और कार्य" },
      { en: "Geometry", hi: "ज्यामिति" },
      { en: "Algebra", hi: "बीजगणित" },
    ],
  },
  {
    id: "reasoning",
    name: { en: "Reasoning", hi: "तर्कशक्ति" },
    short: { en: "Reasoning", hi: "तर्क" },
    color: "subject-reasoning",
    topics: [
      { en: "Analogy", hi: "सादृश्यता" },
      { en: "Series", hi: "श्रृंखला" },
      { en: "Coding-Decoding", hi: "कूटलेखन-कूटवाचन" },
      { en: "Syllogism", hi: "न्याय निगमन" },
      { en: "Blood Relations", hi: "रक्त संबंध" },
    ],
  },
  {
    id: "ga",
    name: { en: "General Awareness", hi: "सामान्य जागरूकता" },
    short: { en: "GA", hi: "सामान्य" },
    color: "subject-ga",
    topics: [
      { en: "History", hi: "इतिहास" },
      { en: "Geography", hi: "भूगोल" },
      { en: "Polity", hi: "राज्यव्यवस्था" },
      { en: "Economics", hi: "अर्थशास्त्र" },
      { en: "Current Affairs", hi: "करेंट अफेयर्स" },
      { en: "Science", hi: "विज्ञान" },
    ],
  },
  {
    id: "english",
    name: { en: "English", hi: "अंग्रेज़ी" },
    short: { en: "English", hi: "अंग्रेज़ी" },
    color: "subject-english",
    topics: [
      { en: "Vocabulary", hi: "शब्दावली" },
      { en: "Grammar", hi: "व्याकरण" },
      { en: "Reading Comp.", hi: "पठन बोध" },
      { en: "Cloze Test", hi: "क्लोज़ टेस्ट" },
      { en: "Idioms", hi: "मुहावरे" },
    ],
  },
];

export interface Question {
  id: string;
  subject: Subject;
  topic: Bilingual;
  text: Bilingual;
  options: Bilingual[];
  correct: number;
  explanation: Bilingual;
  diagram?: string;
}

export const QUESTIONS: Question[] = [
  {
    id: "q1",
    subject: "quant",
    topic: { en: "Percentage", hi: "प्रतिशत" },
    text: {
      en: "If 20% of a number is 80, what is 35% of the same number?",
      hi: "यदि किसी संख्या का 20% 80 है, तो उसी संख्या का 35% क्या है?",
    },
    options: [
      { en: "120", hi: "120" },
      { en: "140", hi: "140" },
      { en: "150", hi: "150" },
      { en: "160", hi: "160" },
    ],
    correct: 1,
    explanation: {
      en: "Let the number be x. 20% of x = 80 ⇒ x = 400. Therefore 35% of 400 = 140.",
      hi: "मान लीजिए संख्या x है। x का 20% = 80 ⇒ x = 400। अतः 400 का 35% = 140।",
    },
  },
  {
    id: "q2",
    subject: "quant",
    topic: { en: "Time & Work", hi: "समय और कार्य" },
    text: {
      en: "A can complete a task in 12 days, B in 18 days. Working together, how long do they take?",
      hi: "A किसी कार्य को 12 दिनों में और B 18 दिनों में पूरा कर सकता है। मिलकर कार्य करने पर उन्हें कितना समय लगेगा?",
    },
    options: [
      { en: "6.5 days", hi: "6.5 दिन" },
      { en: "7.2 days", hi: "7.2 दिन" },
      { en: "8 days", hi: "8 दिन" },
      { en: "9 days", hi: "9 दिन" },
    ],
    correct: 1,
    explanation: {
      en: "Combined rate = 1/12 + 1/18 = (3+2)/36 = 5/36. Time = 36/5 = 7.2 days.",
      hi: "संयुक्त दर = 1/12 + 1/18 = (3+2)/36 = 5/36। समय = 36/5 = 7.2 दिन।",
    },
  },
  {
    id: "q3",
    subject: "reasoning",
    topic: { en: "Series", hi: "श्रृंखला" },
    text: {
      en: "Find the next term: 2, 6, 12, 20, 30, ?",
      hi: "अगला पद ज्ञात करें: 2, 6, 12, 20, 30, ?",
    },
    options: [
      { en: "38", hi: "38" },
      { en: "40", hi: "40" },
      { en: "42", hi: "42" },
      { en: "44", hi: "44" },
    ],
    correct: 2,
    explanation: {
      en: "Differences are 4, 6, 8, 10, 12. Next term = 30 + 12 = 42.",
      hi: "अंतर हैं 4, 6, 8, 10, 12। अगला पद = 30 + 12 = 42।",
    },
  },
  {
    id: "q4",
    subject: "ga",
    topic: { en: "Polity", hi: "राज्यव्यवस्था" },
    text: {
      en: "Who is known as the 'Father of the Indian Constitution'?",
      hi: "'भारतीय संविधान के जनक' के रूप में किसे जाना जाता है?",
    },
    options: [
      { en: "Mahatma Gandhi", hi: "महात्मा गांधी" },
      { en: "Jawaharlal Nehru", hi: "जवाहरलाल नेहरू" },
      { en: "B. R. Ambedkar", hi: "बी. आर. अंबेडकर" },
      { en: "Sardar Patel", hi: "सरदार पटेल" },
    ],
    correct: 2,
    explanation: {
      en: "Dr. B. R. Ambedkar chaired the drafting committee of the Indian Constitution.",
      hi: "डॉ. बी. आर. अंबेडकर भारतीय संविधान की प्रारूप समिति के अध्यक्ष थे।",
    },
  },
  {
    id: "q5",
    subject: "english",
    topic: { en: "Vocabulary", hi: "शब्दावली" },
    text: {
      en: "Choose the synonym of 'Ephemeral':",
      hi: "'Ephemeral' का पर्यायवाची चुनें:",
    },
    options: [
      { en: "Eternal", hi: "Eternal (शाश्वत)" },
      { en: "Short-lived", hi: "Short-lived (अल्पकालिक)" },
      { en: "Powerful", hi: "Powerful (शक्तिशाली)" },
      { en: "Hidden", hi: "Hidden (छिपा हुआ)" },
    ],
    correct: 1,
    explanation: {
      en: "'Ephemeral' means lasting for a very short time.",
      hi: "'Ephemeral' का अर्थ है बहुत कम समय तक रहने वाला।",
    },
  },
  {
    id: "q6",
    subject: "reasoning",
    topic: { en: "Coding-Decoding", hi: "कूटलेखन-कूटवाचन" },
    text: {
      en: "If MONDAY is coded as NPOEBZ, how is FRIDAY coded?",
      hi: "यदि MONDAY को NPOEBZ के रूप में कूटबद्ध किया जाता है, तो FRIDAY को कैसे कूटबद्ध किया जाएगा?",
    },
    options: [
      { en: "GSJEBZ", hi: "GSJEBZ" },
      { en: "GSJEBY", hi: "GSJEBY" },
      { en: "GSJFBZ", hi: "GSJFBZ" },
      { en: "GSKEBZ", hi: "GSKEBZ" },
    ],
    correct: 0,
    explanation: {
      en: "Each letter is shifted by +1. F→G, R→S, I→J, D→E, A→B, Y→Z.",
      hi: "प्रत्येक अक्षर को +1 स्थान पर स्थानांतरित किया जाता है। F→G, R→S, I→J, D→E, A→B, Y→Z।",
    },
  },
];

export const DASHBOARD_STATS = {
  attempted: 482,
  correct: 361,
  accuracy: 74.9,
  streak: 12,
  dailyGoal: 50,
  dailyDone: 32,
  weeklyMinutes: 318,
};

export const SUBJECT_ACCURACY: Record<Subject, number> = {
  quant: 78,
  reasoning: 82,
  ga: 54,
  english: 71,
};

export const AI_INSIGHTS = [
  {
    tone: "warning" as const,
    title: "General Awareness needs attention",
    body: "Your GA accuracy is 54% — below your average. Practice 30 GA questions today to climb past 65%.",
  },
  {
    tone: "success" as const,
    title: "Reasoning streak unlocked",
    body: "5 days of 80%+ accuracy in Reasoning. Try a timed 25-question sprint to lock in the gain.",
  },
  {
    tone: "info" as const,
    title: "Revision suggestion",
    body: "Revisit 12 bookmarked Quant questions from last week — spaced repetition is due.",
  },
];

export const MOCK_TESTS = [
  { id: "m1", title: "SSC CGL Tier-1 Full Mock #14", questions: 100, minutes: 60, difficulty: "Hard" },
  { id: "m2", title: "Quant Sectional Test", questions: 25, minutes: 20, difficulty: "Medium" },
  { id: "m3", title: "Reasoning Sectional Test", questions: 25, minutes: 20, difficulty: "Easy" },
  { id: "m4", title: "Previous Year Paper 2023", questions: 100, minutes: 60, difficulty: "Hard" },
];

export const ADMIN_STATS = {
  totalUsers: 18420,
  dau: 4231,
  questions: 12840,
  pdfsProcessed: 187,
};
