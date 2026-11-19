import type { BadgeTone } from "@/components/ui/badge";
import type {
  OptionLetter,
  PlanDay,
  UploadCard,
  WordCard,
  WordCardFields,
  WordCardPatch,
  WordKind,
  WordPlan,
} from "@/lib/api/admin-words";

/**
 * Plain rules behind the admin Words pages: reading a cards file, the card
 * form, and the plan grid. No React here, so it can be tested on its own.
 */

export const OPTION_LETTERS: OptionLetter[] = ["A", "B", "C", "D", "E"];

/** The backend's slug rule (words.domain.ts), so the page can spot clashes before it asks. */
export function slugify(headword: string): string {
  return headword
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function chunk<T>(list: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let start = 0; start < list.length; start += size) {
    groups.push(list.slice(start, start + size));
  }
  return groups;
}

/* ── The cards file ─────────────────────────────────────────── */

export type ParsedCardFile = {
  cards: UploadCard[];
  /** Problems that stop the whole file. Empty when the file can be sent. */
  problems: string[];
};

const isText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

/**
 * Reads a cards file from the content pipeline: { "cards": [...] }, or a
 * bare list. Only the shape is checked here. The server checks the rest
 * on the test run, including finding each question.
 */
export function parseCardFile(text: string): ParsedCardFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { cards: [], problems: ["This file is not valid JSON."] };
  }

  const list = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { cards?: unknown }).cards)
      ? (data as { cards: unknown[] }).cards
      : null;

  if (!list) {
    return { cards: [], problems: ['The file needs a "cards" list.'] };
  }
  if (list.length === 0) {
    return { cards: [], problems: ["The file has no cards in it."] };
  }

  const problems: string[] = [];
  const cards: UploadCard[] = [];
  const slugCount = new Map<string, number>();

  list.forEach((raw, index) => {
    const card = (raw ?? {}) as Partial<UploadCard>;
    const name = isText(card.headword) ? `"${card.headword}"` : `Card ${index + 1}`;
    if (card.kind !== "WORD" && card.kind !== "IDIOM") problems.push(`${name}: kind must be WORD or IDIOM.`);
    if (!isText(card.headword)) problems.push(`${name}: the headword is missing.`);
    if (!isText(card.meaning)) problems.push(`${name}: the meaning is missing.`);
    const matches = Array.isArray(card.questionMatches) ? card.questionMatches : [];
    if (matches.length === 0) problems.push(`${name}: it needs at least one question in questionMatches.`);
    matches.forEach((match, matchIndex) => {
      if (typeof match?.year !== "number" || !isText(match?.textIncludes)) {
        problems.push(`${name}: question ${matchIndex + 1} needs a year and textIncludes.`);
      }
    });
    if (isText(card.headword)) {
      const slug = isText(card.slug) ? card.slug : slugify(card.headword);
      slugCount.set(slug, (slugCount.get(slug) ?? 0) + 1);
    }
    cards.push(card as UploadCard);
  });

  for (const [slug, count] of slugCount) {
    if (count > 1) problems.push(`/${slug} is in the file ${count} times.`);
  }
  if (cards.length > 500) problems.push("Upload at most 500 cards at a time.");

  return { cards, problems };
}

/* ── Showing a card ─────────────────────────────────────────── */

export function cardState(card: Pick<WordCard, "status" | "readyProblems">): { label: string; tone: BadgeTone } {
  if (card.status === "READY") return { label: "Ready", tone: "success" };
  if (card.readyProblems.length > 0) {
    return { label: `Draft · ${card.readyProblems.length} to fix`, tone: "warning" };
  }
  return { label: "Draft", tone: "neutral" };
}

/** Drafts the server would accept as READY right now. */
export function canGoReady(card: Pick<WordCard, "status" | "readyProblems">): boolean {
  return card.status === "DRAFT" && card.readyProblems.length === 0;
}

/** Splits question text on <u>...</u>, the only tag a vocabulary stem carries. */
export function splitUnderline(text: string): { text: string; underlined: boolean }[] {
  const parts: { text: string; underlined: boolean }[] = [];
  const pattern = /<u>([\s\S]*?)<\/u>/g;
  let last = 0;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index), underlined: false });
    parts.push({ text: match[1], underlined: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), underlined: false });
  return parts.map((part) => ({ ...part, text: part.text.replace(/<\/?u>/g, "") }));
}

/** "JAMB 1978, 1982" from a card's questions, main question first. */
export function cameOutLine(card: Pick<WordCard, "questions">): string {
  const years = [...new Set(card.questions.map((question) => question.year).filter((year): year is number => year !== null))]
    .sort((left, right) => left - right);
  const board = card.questions.find((question) => question.isMain)?.board ?? card.questions[0]?.board ?? "";
  if (years.length === 0) return "No question linked";
  return `${board} ${years.join(", ")}`.trim();
}

/** "Wed 19 Nov" for a YYYY-MM-DD day. Read as UTC so the day never shifts. */
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDay(iso: string, withYear = false): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  const day = `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
  return withYear ? `${day} ${date.getUTCFullYear()}` : day;
}

export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/* ── The card form ──────────────────────────────────────────── */

export type CardForm = {
  kind: WordKind;
  headword: string;
  slug: string;
  partOfSpeech: string;
  sayAs: string;
  ipa: string;
  /** Typed as "in · sol · vent". */
  syllables: string;
  stressIndex: number | null;
  meaning: string;
  /** Always three boxes; empty ones are dropped on save. */
  examples: string[];
  builtFrom: string;
  comesFrom: string;
  opposite: string;
  closeTo: string;
  watchOut: string;
  answerNote: string;
  trapOption: "" | OptionLetter;
  theme: string;
  questions: { questionId: string; isMain: boolean }[];
};

export const TEXT_LIMITS = {
  headword: 120,
  partOfSpeech: 40,
  sayAs: 120,
  ipa: 120,
  meaning: 400,
  example: 300,
  builtFrom: 300,
  comesFrom: 400,
  opposite: 120,
  closeTo: 200,
  watchOut: 500,
  answerNote: 500,
  theme: 40,
} as const;

const pad3 = (list: string[]) => [...list, "", "", ""].slice(0, 3);

export function emptyForm(kind: WordKind = "WORD"): CardForm {
  return {
    kind,
    headword: "",
    slug: "",
    partOfSpeech: kind === "IDIOM" ? "idiom" : "",
    sayAs: "",
    ipa: "",
    syllables: "",
    stressIndex: null,
    meaning: "",
    examples: ["", "", ""],
    builtFrom: "",
    comesFrom: "",
    opposite: "",
    closeTo: "",
    watchOut: "",
    answerNote: "",
    trapOption: "",
    theme: "",
    questions: [],
  };
}

export function toForm(card: WordCard): CardForm {
  return {
    kind: card.kind,
    headword: card.headword,
    slug: card.slug,
    partOfSpeech: card.partOfSpeech ?? "",
    sayAs: card.sayAs ?? "",
    ipa: card.ipa ?? "",
    syllables: card.syllables.join(" · "),
    stressIndex: card.stressIndex,
    meaning: card.meaning,
    examples: pad3(card.examples),
    builtFrom: card.builtFrom ?? "",
    comesFrom: card.comesFrom ?? "",
    opposite: card.opposite ?? "",
    closeTo: card.closeTo ?? "",
    watchOut: card.watchOut ?? "",
    answerNote: card.answerNote ?? "",
    trapOption: OPTION_LETTERS.includes(card.trapOption as OptionLetter) ? (card.trapOption as OptionLetter) : "",
    theme: card.theme ?? "",
    questions: card.questions.map((question) => ({ questionId: String(question.questionId), isMain: question.isMain })),
  };
}

/** "in · sol · vent", "in-sol-vent" and "in sol vent" all give three syllables. */
export function parseSyllables(text: string): string[] {
  return text.split(/[\s·•,\-/|]+/).map((part) => part.trim()).filter(Boolean);
}

const orNull = (value: string) => (value.trim() ? value.trim() : null);

export type FormResult = { fields: WordCardFields | null; errors: Partial<Record<string, string>> };

/** Turns the form into what the server takes, or says what to fix first. */
export function formToFields(form: CardForm): FormResult {
  const errors: Partial<Record<string, string>> = {};
  const syllables = parseSyllables(form.syllables);
  const examples = form.examples.map((line) => line.trim()).filter(Boolean);

  if (!form.headword.trim()) errors.headword = "Add the word or idiom.";
  if (!form.meaning.trim()) errors.meaning = "Add the meaning.";
  if (form.slug.trim() && !/^[a-z0-9-]+$/.test(form.slug.trim())) {
    errors.slug = "Small letters, digits and dashes only.";
  }
  if (syllables.length > 12) errors.syllables = "At most 12 syllables.";
  if (syllables.some((part) => part.length > 20)) errors.syllables = "A syllable can be at most 20 letters.";
  if (syllables.length > 0 && form.kind === "IDIOM") errors.syllables = "Only words get the stress tap. Leave this empty for an idiom.";

  for (const [key, limit] of Object.entries(TEXT_LIMITS)) {
    if (key === "example") continue;
    const value = form[key as keyof CardForm];
    if (typeof value === "string" && value.trim().length > limit) errors[key] = `At most ${limit} characters.`;
  }
  if (examples.some((line) => line.length > TEXT_LIMITS.example)) errors.examples = `Each example can be at most ${TEXT_LIMITS.example} characters.`;

  const questions: { questionId: number; isMain: boolean }[] = [];
  for (const row of form.questions) {
    const raw = row.questionId.trim().replace(/^#/, "");
    if (!raw) continue;
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
      errors.questions = `"${row.questionId}" is not a question number.`;
      continue;
    }
    if (questions.some((question) => question.questionId === id)) {
      errors.questions = `Question #${id} is in the list twice.`;
      continue;
    }
    questions.push({ questionId: id, isMain: row.isMain });
  }
  if (questions.filter((question) => question.isMain).length > 1) errors.questions = "Mark only one question as the main one.";
  if (questions.length > 10) errors.questions = "At most 10 questions.";

  if (Object.keys(errors).length > 0) return { fields: null, errors };

  const stressIndex =
    syllables.length > 0 && form.stressIndex !== null && form.stressIndex < syllables.length ? form.stressIndex : null;

  return {
    errors,
    fields: {
      kind: form.kind,
      headword: form.headword.trim(),
      ...(form.slug.trim() ? { slug: form.slug.trim() } : {}),
      partOfSpeech: orNull(form.partOfSpeech),
      sayAs: orNull(form.sayAs),
      ipa: orNull(form.ipa),
      syllables,
      stressIndex,
      meaning: form.meaning.trim(),
      examples,
      builtFrom: orNull(form.builtFrom),
      comesFrom: orNull(form.comesFrom),
      opposite: orNull(form.opposite),
      closeTo: orNull(form.closeTo),
      watchOut: orNull(form.watchOut),
      answerNote: orNull(form.answerNote),
      trapOption: form.trapOption || null,
      theme: orNull(form.theme),
      questions,
    },
  };
}

const sameQuestions = (
  left: { questionId: number; isMain: boolean }[],
  right: { questionId: number; isMain: boolean }[],
) => {
  const key = (list: { questionId: number; isMain: boolean }[]) =>
    JSON.stringify([...list].sort((a, b) => a.questionId - b.questionId).map((q) => [q.questionId, q.isMain]));
  return key(left) === key(right);
};

/** Only what changed, so a save never rewrites fields nobody touched. */
export function changedFields(card: WordCard, fields: WordCardFields): WordCardPatch {
  const patch: Record<string, unknown> = {};
  const scalarKeys = [
    "kind", "headword", "partOfSpeech", "sayAs", "ipa", "stressIndex", "meaning", "builtFrom",
    "comesFrom", "opposite", "closeTo", "watchOut", "answerNote", "trapOption", "theme",
  ] as const;
  for (const key of scalarKeys) {
    const next = fields[key] ?? null;
    const before = card[key] ?? null;
    if (next !== before) patch[key] = next;
  }
  if (fields.slug && fields.slug !== card.slug) patch.slug = fields.slug;
  if (JSON.stringify(fields.syllables ?? []) !== JSON.stringify(card.syllables)) patch.syllables = fields.syllables ?? [];
  if (JSON.stringify(fields.examples ?? []) !== JSON.stringify(card.examples)) patch.examples = fields.examples ?? [];
  const nextQuestions = fields.questions ?? [];
  const beforeQuestions = card.questions.map((question) => ({ questionId: question.questionId, isMain: question.isMain }));
  if (!sameQuestions(nextQuestions, beforeQuestions)) patch.questions = nextQuestions;
  return patch as WordCardPatch;
}

/* ── The plan ───────────────────────────────────────────────── */

export type PlanRow = {
  date: string;
  isToday: boolean;
  isPast: boolean;
  word: PlanDay | null;
  idiom: PlanDay | null;
};

/** One row per day from `from` to `to`, empty days included, so a gap shows as a gap. */
export function planRows(plan: WordPlan, from: string, to: string): PlanRow[] {
  const rows: PlanRow[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    rows.push({
      date,
      isToday: date === plan.today,
      isPast: date < plan.today,
      word: plan.days.find((day) => day.date === date && day.kind === "WORD") ?? null,
      idiom: plan.days.find((day) => day.date === date && day.kind === "IDIOM") ?? null,
    });
    if (rows.length > 120) break;
  }
  return rows;
}
