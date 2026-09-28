// Deterministic dummy leaderboard generator per (exam, shift).
// Generates plausible Indian aspirant names with scores between ~60-80% of max.

const FIRST_NAMES = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Krishna",
  "Ishaan", "Shaurya", "Atharv", "Advik", "Pranav", "Rohan", "Kabir", "Aryan",
  "Rudra", "Yash", "Dhruv", "Karan", "Harsh", "Manish", "Nikhil", "Rahul",
  "Ankit", "Deepak", "Suresh", "Ramesh", "Pankaj", "Vikas", "Amit", "Sumit",
  "Priya", "Ananya", "Diya", "Saanvi", "Aadhya", "Aarohi", "Anika", "Ishita",
  "Kavya", "Khushi", "Riya", "Sneha", "Pooja", "Neha", "Shreya", "Megha",
  "Nisha", "Ritu", "Kiran", "Anjali", "Rekha", "Sunita",
];

const LAST_NAMES = [
  "Sharma", "Verma", "Gupta", "Singh", "Kumar", "Yadav", "Mishra", "Pandey",
  "Tiwari", "Dubey", "Chauhan", "Rajput", "Joshi", "Saxena", "Agarwal",
  "Bansal", "Jain", "Goyal", "Mehta", "Patel", "Shah", "Reddy", "Iyer",
  "Nair", "Menon", "Bhatt", "Rao", "Das", "Sinha", "Roy", "Mukherjee",
  "Chatterjee", "Banerjee", "Ghosh", "Bose",
];

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type DummyLeader = {
  id: string;
  user_id: string; // dummy:* — never matches a real user id
  display_name: string;
  total_score: number;
  correct_count: number;
  incorrect_count: number;
  unattempted_count: number;
  __dummy: true;
};

/**
 * Generate deterministic dummy ranking rows for a given (examId, shift).
 * Scores fall in the 60% - 80% band of the total possible marks.
 */
export function generateDummyLeaders(
  examId: string,
  shift: string,
  totalQuestions: number,
  positiveMark: number,
  negativeMarking: number,
  count = 12,
): DummyLeader[] {
  if (!totalQuestions || totalQuestions <= 0) return [];
  const seed = hashString(`${examId}::${shift}`);
  const rand = mulberry32(seed);
  const maxMarks = totalQuestions * positiveMark;

  const rows: DummyLeader[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < count; i++) {
    let name = "";
    for (let attempt = 0; attempt < 8; attempt++) {
      const f = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)];
      const l = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)];
      name = `${f} ${l}`;
      if (!usedNames.has(name)) break;
    }
    usedNames.add(name);

    // Target score % between 60 and 80, sorted descending later.
    const pct = 0.6 + rand() * 0.2;
    const targetScore = maxMarks * pct;

    // Back-solve approximate correct/incorrect counts.
    // score = correct*pos - incorrect*neg ; attempted up to total.
    const correct = Math.min(
      totalQuestions,
      Math.round((targetScore + (totalQuestions * 0.1) * negativeMarking) / positiveMark),
    );
    const remaining = totalQuestions - correct;
    const incorrect = Math.min(remaining, Math.round(remaining * (0.3 + rand() * 0.4)));
    const unattempted = totalQuestions - correct - incorrect;
    const score = +(correct * positiveMark - incorrect * negativeMarking).toFixed(2);

    rows.push({
      id: `dummy-${examId}-${shift}-${i}`,
      user_id: `dummy:${i}`,
      display_name: name,
      total_score: score,
      correct_count: correct,
      incorrect_count: incorrect,
      unattempted_count: unattempted,
      __dummy: true,
    });
  }

  return rows.sort((a, b) => b.total_score - a.total_score);
}
