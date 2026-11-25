/**
 * The Word You'd Delete From the Dictionary — deterministic entry picker.
 *
 * Bounty: name the one word you would erase from the dictionary forever.
 * The program writes a single word to $MAKEFUN_OUTPUT_DIR/entry.txt
 * (fallback /output/entry.txt). A judge model compares entries two at a
 * time and keeps the funnier deletion, weighing (most important first):
 *
 *   1. It names one word to erase, a real word a reader recognises.
 *   2. The deletion is funny at first sight: the reader gets the joke
 *      the moment the word is gone, with no caption or defence needed.
 *   3. The humour comes from the word itself — its sound, its double
 *      meanings, or the gap it would leave in the language — not from
 *      shock alone.
 *   4. The pick is fresh: a word the rest of the field would not think
 *      of first, still instantly understood.
 *   5. The entry is exact: one word, spelled correctly, with nothing
 *      added around it.
 *
 * The gate allows 1–77 characters of UTF-8 text, not only whitespace.
 * Criterion 5 rules out everything but a bare word, so each candidate
 * here is a single word: the "one-liners" of the sibling fields become
 * one-word entries, and the scorer is the same shape — a hand-written
 * field scored against the brief, in the brief's own order — with the
 * word-field adaptations spelled out below.
 *
 * Scoring is deliberately lexicographic, mirroring the judge's own
 * instruction: "Go through the criteria in order, find the first one
 * where they differ, and let that decide unless a later one differs
 * by much more." Ties break criterion by criterion in the brief's
 * order, then by shorter length — a shorter word that says the same
 * thing is the tighter pick, and the house tie-break counts bytes.
 *
 * Three sharpening rules sit on top of the flat rubric, adapted from
 * the one-liner fields to a field whose whole entry is one word:
 *
 *   - A pick that only names a subject without a twist is capped on
 *     funniness. "Moist" is an unpleasant word and a long word is a
 *     long word; deleting either is a shrug, not a joke. The joke has
 *     to live in what disappears when the word goes — the gap, the
 *     double meaning, the sound — not in pointing at the word.
 *   - Predictable gags are docked. "Moist" is the first word every
 *     entrant thinks of, "irregardless" and "literally" are the
 *     pedants' reflex picks, and the famous long words are a stunt
 *     the field has already pulled. A joke the field saw coming is
 *     less funny at first sight and worth nothing on freshness.
 *   - The twist must land late. A one-word entry has no last six
 *     words, so "late" here means the punch lands a beat after the
 *     word itself: the reader reads the word, then realises what is
 *     gone. A pick whose humour is all surface — the word sounds
 *     gross, the word is long, the word is shocking — lands at once
 *     and fizzles; only a pick whose punch comes from the word's
 *     meaning, its sound-play, or the gap it leaves earns the
 *     late-twist bonus.
 *
 * Node 22+, standard library only, no network. Deterministic: the
 * same candidates always produce the same winner.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/* ------------------------------------------------------------------ */
/* Candidates                                                          */
/* ------------------------------------------------------------------ */

/**
 * Where the punch of a pick comes from. "gap" means the joke is the
 * world without the word; "meaning" means a double meaning or a word
 * describing itself; "sound" means the word's sound alone; "surface"
 * means there is no punch beyond the word being ugly, long, or
 * shocking. Gap and meaning punches land a beat after the word is
 * read — the late twist — while surface punches land at once and
 * fizzle.
 */
type TwistSource = "gap" | "meaning" | "sound" | "surface";

/**
 * One hand-written candidate word. `id` is stable so the report and
 * any later audit can name a word without reprinting it. The numeric
 * fields are hand-written assessments of the word against the brief,
 * each 0–10; `note` records the joke itself — what disappears when
 * the word goes — so the numbers can be audited against the reasoning.
 */
interface Candidate {
  id: string;
  /** The single word, exactly as it would be written to entry.txt. */
  word: string;
  /** How readily a reader recognises it as a real word (criterion 1). */
  recognition: number;
  /** How funny the world without the word is, at first sight (criterion 2). */
  instantGap: number;
  /** How funny the word sounds to say (criterion 3). */
  soundFun: number;
  /** Double meanings and self-reference: the word describing itself (criterion 3). */
  selfRef: number;
  /** Humour from the gap between spelling and sound (criterion 3). */
  spellingTrap: number;
  /** How likely the rest of the field is to pick it first (criterion 4). */
  predictability: number;
  /** True when the pick is just an ugly / long / shocking word with no twist. */
  surfaceOnly: boolean;
  /** Where the punch comes from: the gap, a meaning, the sound, or the surface. */
  twist: TwistSource;
  /** True when readers dispute that it is a word at all, or its spelling. */
  contested: boolean;
  /** The joke, in one line: what disappears when the word goes. */
  note: string;
}

const CANDIDATES: Candidate[] = [
  {
    id: "moist",
    word: "moist",
    recognition: 10,
    instantGap: 4,
    soundFun: 6,
    selfRef: 0,
    spellingTrap: 0,
    predictability: 10,
    surfaceOnly: true,
    twist: "surface",
    contested: false,
    note: "Deleting the internet's most-hated word pleases nobody twice: the joke is just 'ew', and every entrant thinks of it first.",
  },
  {
    id: "irregardless",
    word: "irregardless",
    recognition: 7,
    instantGap: 5,
    soundFun: 2,
    selfRef: 3,
    spellingTrap: 0,
    predictability: 9,
    surfaceOnly: true,
    twist: "surface",
    contested: true,
    note: "Half the readers will say it is not a real word at all, which loses criterion 1 before the joke starts; the rest is a pedant's victory lap.",
  },
  {
    id: "literally",
    word: "literally",
    recognition: 10,
    instantGap: 5,
    soundFun: 1,
    selfRef: 4,
    spellingTrap: 0,
    predictability: 9,
    surfaceOnly: true,
    twist: "surface",
    contested: false,
    note: "Ending the misuse debate is a grammar lesson, not a joke; the field's pedants all reach for it first.",
  },
  {
    id: "supercalifragilistic",
    word: "supercalifragilisticexpialidocious",
    recognition: 10,
    instantGap: 3,
    soundFun: 7,
    selfRef: 2,
    spellingTrap: 3,
    predictability: 8,
    surfaceOnly: true,
    twist: "surface",
    contested: false,
    note: "A long word is a stunt, not a punchline: deleting it removes a party trick nobody uses in a sentence.",
  },
  {
    id: "antidisestablishmentarianism",
    word: "antidisestablishmentarianism",
    recognition: 10,
    instantGap: 2,
    soundFun: 4,
    selfRef: 1,
    spellingTrap: 2,
    predictability: 8,
    surfaceOnly: true,
    twist: "surface",
    contested: false,
    note: "The longest-word flex every schoolchild knows; deleting it changes nothing because nobody ever says it.",
  },
  {
    id: "floccinaucinihilipilification",
    word: "floccinaucinihilipilification",
    recognition: 4,
    instantGap: 7,
    soundFun: 5,
    selfRef: 9,
    spellingTrap: 2,
    predictability: 3,
    surfaceOnly: false,
    twist: "meaning",
    contested: false,
    note: "It literally means 'estimating something as worthless', so deleting it is a word cancelling itself — but most readers have never met it, which loses criterion 1.",
  },
  {
    id: "queue",
    word: "queue",
    recognition: 10,
    instantGap: 5,
    soundFun: 3,
    selfRef: 5,
    spellingTrap: 9,
    predictability: 5,
    surfaceOnly: false,
    twist: "meaning",
    contested: false,
    note: "A queue is just the letter Q with four silent letters standing in line behind it; deleting it fires four letters that never did any work.",
  },
  {
    id: "colonel",
    word: "colonel",
    recognition: 10,
    instantGap: 6,
    soundFun: 4,
    selfRef: 3,
    spellingTrap: 9,
    predictability: 4,
    surfaceOnly: false,
    twist: "meaning",
    contested: false,
    note: "Spelled like a colonel, pronounced like a kernel: the word has been lying about its own sound for centuries, and deleting it ends the con.",
  },
  {
    id: "defenestration",
    word: "defenestration",
    recognition: 7,
    instantGap: 7,
    soundFun: 7,
    selfRef: 2,
    spellingTrap: 1,
    predictability: 3,
    surfaceOnly: false,
    twist: "gap",
    contested: false,
    note: "The only word for throwing someone out of a window; without it every defenestration has to be described in full, which rather ruins the moment.",
  },
  {
    id: "thingamajig",
    word: "thingamajig",
    recognition: 10,
    instantGap: 8,
    soundFun: 6,
    selfRef: 8,
    spellingTrap: 0,
    predictability: 3,
    surfaceOnly: false,
    twist: "gap",
    contested: false,
    note: "The word you reach for when you have lost the word; delete it and the next time a word escapes you, you have no word for that either.",
  },
  {
    id: "thingy",
    word: "thingy",
    recognition: 10,
    instantGap: 7,
    soundFun: 4,
    selfRef: 7,
    spellingTrap: 0,
    predictability: 4,
    surfaceOnly: false,
    twist: "gap",
    contested: false,
    note: "Everyone says 'thingy' instead of learning the name of the thing; without it the whole language has to grow up and learn nouns.",
  },
  {
    id: "gobbledygook",
    word: "gobbledygook",
    recognition: 10,
    instantGap: 6,
    soundFun: 8,
    selfRef: 8,
    spellingTrap: 0,
    predictability: 4,
    surfaceOnly: false,
    twist: "meaning",
    contested: false,
    note: "The word for meaningless language is itself meaningless language; deleting it removes the label and leaves the gobbledygook exactly where it was.",
  },
  {
    id: "no",
    word: "no",
    recognition: 10,
    instantGap: 9,
    soundFun: 1,
    selfRef: 2,
    spellingTrap: 0,
    predictability: 8,
    surfaceOnly: false,
    twist: "gap",
    contested: false,
    note: "Nobody can ever refuse anything again: every request in the world becomes a yes. The biggest gap in the field — and the first gap every entrant thinks of.",
  },
  {
    id: "why",
    word: "why",
    recognition: 10,
    instantGap: 8,
    soundFun: 2,
    selfRef: 3,
    spellingTrap: 0,
    predictability: 4,
    surfaceOnly: false,
    twist: "gap",
    contested: false,
    note: "Children can never ask why again and curiosity becomes unspeakable; every 'because I said so' becomes the whole of philosophy.",
  },
  {
    id: "tomorrow",
    word: "tomorrow",
    recognition: 10,
    instantGap: 9,
    soundFun: 2,
    selfRef: 2,
    spellingTrap: 0,
    predictability: 3,
    surfaceOnly: false,
    twist: "gap",
    contested: false,
    note: "Nothing can ever be put off again: everything is due today, procrastination dies on the spot, and 'tomorrow never comes' becomes literal.",
  },
  {
    id: "goodbye",
    word: "goodbye",
    recognition: 10,
    instantGap: 8,
    soundFun: 2,
    selfRef: 2,
    spellingTrap: 0,
    predictability: 4,
    surfaceOnly: false,
    twist: "gap",
    contested: false,
    note: "Nobody can ever leave: every conversation ends with an eternal '...so, anyway', and Hotel California becomes a documentary.",
  },
];

/**
 * Every candidate must be exactly one word: no whitespace, no
 * punctuation, no capitalisation games, and no two candidates may
 * name the same word. A field that broke this rule would fail
 * criterion 5 before the judge ever saw it.
 */
function validateCandidates(): void {
  const seen = new Set<string>();
  for (const c of CANDIDATES) {
    if (!/^[a-z]+$/.test(c.word)) {
      throw new Error(`candidate ${c.id} is not a single lowercase word: ${c.word}`);
    }
    if (seen.has(c.word)) {
      throw new Error(`duplicate candidate word: ${c.word}`);
    }
    seen.add(c.word);
  }
}

/* ------------------------------------------------------------------ */
/* Criterion scores (0–10 each, brief order)                           */
/* ------------------------------------------------------------------ */

/** Clamp a computed score into the 0–10 range. */
function clampScore(n: number): number {
  return Math.max(0, Math.min(10, Math.round(n)));
}

interface Scores {
  /** C1: names one real word a reader recognises. */
  realWord: number;
  /** C2: the deletion is funny at first sight. */
  funnyAtFirstSight: number;
  /** C3: the humour comes from the word itself. */
  fromTheWord: number;
  /** C4: a fresh pick, not the field's first thought. */
  fresh: number;
  /** C5: exact — one word, spelled correctly, nothing added. */
  exact: number;
}

/**
 * C1 — Real word. The candidate's recognition score, as assessed by
 * hand: 10 for a word every reader knows at sight, 7 for one many
 * readers know but some will not (defenestration) or one readers
 * dispute is a word at all (irregardless), 4 for one most readers
 * have never met. A word the reader does not recognise cannot be
 * funny when it is gone, whatever the later criteria say.
 */
function scoreRealWord(c: Candidate): number {
  return clampScore(c.recognition);
}

/**
 * C2 — Funny at first sight. The base is the gap: how funny the
 * world without the word is the moment the reader pictures it. A
 * second comic beat adds a point each — a funny sound, a double
 * meaning, a spelling trap — and a punch that lands a beat after
 * the word (a gap or a meaning twist) adds one more, because the
 * joke keeps unfolding instead of arriving all at once. A
 * predictable gag loses points: a joke the field saw coming is
 * less funny on sight, however sound its premise. A pick that
 * only names its subject without a twist is capped at 4: it has a
 * word, not a joke.
 */
function scoreFunnyAtFirstSight(c: Candidate): number {
  let score = c.instantGap;
  if (c.soundFun >= 7) score += 1;
  if (c.selfRef >= 7) score += 1;
  if (c.spellingTrap >= 8) score += 1;
  // The late twist: the punch lands a beat after the word itself,
  // when the reader realises what is gone.
  if (c.twist === "gap" || c.twist === "meaning") score += 1;
  if (c.predictability >= 9) score -= 2;
  else if (c.predictability >= 7) score -= 1;
  if (c.surfaceOnly) score = Math.min(score, 4);
  return clampScore(score);
}

/**
 * C3 — Humour from the word itself. The strongest of the word's
 * own resources — its sound, its double meanings and self-reference,
 * its spelling trap — set against the gap it would leave, which the
 * brief counts as part of the word itself. A pick whose humour is
 * all surface is capped at 5: sounding gross or being long is the
 * word's property, but it is not a joke about the word, and shock
 * for its own sake does not count.
 */
function scoreFromTheWord(c: Candidate): number {
  const bestIntrinsic = Math.max(c.soundFun, c.selfRef, c.spellingTrap);
  const gapPart =
    c.twist === "gap" || c.twist === "meaning"
      ? c.instantGap
      : Math.floor(c.instantGap / 2);
  let score = Math.max(bestIntrinsic, gapPart);
  if (c.surfaceOnly) score = Math.min(score, 5);
  return clampScore(score);
}

/**
 * C4 — Fresh. Ten minus the predictability: a word the rest of the
 * field would think of first scores near zero here, however funny
 * it is, while a word nobody's first thought reaches keeps most of
 * its points. Every candidate is still instantly understood — the
 * obscure ones already paid for that on criterion 1 — so freshness
 * here is purely about who else had the same idea.
 */
function scoreFresh(c: Candidate): number {
  return clampScore(10 - c.predictability);
}

/**
 * C5 — Exact. One word, spelled correctly, nothing added: every
 * candidate satisfies it by construction (see validateCandidates),
 * so the only deductions are for spelling doubt. A word over 25
 * letters invites the judge to doubt its spelling, and a contested
 * word invites the judge to read it as a misspelling of another
 * word; either costs 2. A word between 16 and 25 letters costs 1.
 */
function scoreExact(c: Candidate): number {
  let score = 10;
  const len = [...c.word].length;
  if (len > 25) score -= 2;
  else if (len > 15) score -= 1;
  if (c.contested) score -= 2;
  return Math.max(0, score);
}

/** Score a candidate on all five criteria, in the brief's order. */
function scoreCandidate(c: Candidate): Scores {
  return {
    realWord: scoreRealWord(c),
    funnyAtFirstSight: scoreFunnyAtFirstSight(c),
    fromTheWord: scoreFromTheWord(c),
    fresh: scoreFresh(c),
    exact: scoreExact(c),
  };
}

/* ------------------------------------------------------------------ */
/* Winner selection                                                    */
/* ------------------------------------------------------------------ */

/**
 * Compare two scored candidates the way the judge compares two
 * words: criterion by criterion in the brief's order, first
 * difference decides. Only when all five criteria tie does the
 * shorter word win — it is the tighter pick, and the house
 * tie-break counts bytes.
 */
function compareScored(
  a: { candidate: Candidate; scores: Scores },
  b: { candidate: Candidate; scores: Scores },
): number {
  const order: (keyof Scores)[] = [
    "realWord",
    "funnyAtFirstSight",
    "fromTheWord",
    "fresh",
    "exact",
  ];
  for (const key of order) {
    if (a.scores[key] !== b.scores[key]) return b.scores[key] - a.scores[key];
  }
  const lenA = [...a.candidate.word].length;
  const lenB = [...b.candidate.word].length;
  if (lenA !== lenB) return lenA - lenB;
  return a.candidate.id.localeCompare(b.candidate.id);
}

/** Score every candidate, sort best first, and return the ranking. */
function rankCandidates(): { candidate: Candidate; scores: Scores }[] {
  const scored = CANDIDATES.map((candidate) => ({
    candidate,
    scores: scoreCandidate(candidate),
  }));
  scored.sort(compareScored);
  return scored;
}

/* ------------------------------------------------------------------ */
/* Gate verification                                                   */
/* ------------------------------------------------------------------ */

interface GateResult {
  lengthChars: number;
  lengthBytes: number;
  singleLine: boolean;
  validUtf8: boolean;
  notOnlyWhitespace: boolean;
  within77: boolean;
  passed: boolean;
}

/**
 * Verify the written file byte-for-byte against every gate the
 * sealed scorer applies: UTF-8 text of 1 to 77 characters, not
 * only whitespace. A single word means no newline characters
 * inside the entry (a trailing newline written by the file writer
 * is stripped before the check, and the stored entry itself holds
 * no newline).
 */
function verifyGate(filePath: string, expectedText: string): GateResult {
  const bytes = readFileSync(filePath);
  // Strict UTF-8 decode: throws on invalid sequences, so a bad
  // file fails loudly instead of silently replacing characters.
  const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const text = decoded.replace(/\n$/, "");
  const lengthChars = [...text].length;
  const result: GateResult = {
    lengthChars,
    lengthBytes: bytes.length,
    singleLine: !text.includes("\n") && !text.includes("\r"),
    validUtf8: true,
    notOnlyWhitespace: text.trim().length > 0,
    within77: lengthChars >= 1 && lengthChars <= 77,
    passed: false,
  };
  result.passed =
    result.singleLine &&
    result.validUtf8 &&
    result.notOnlyWhitespace &&
    result.within77 &&
    text === expectedText;
  return result;
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

function main(): void {
  validateCandidates();

  const ranked = rankCandidates();

  console.log("Candidate ranking (criteria in the judge's order):");
  console.log("id                               C1 C2 C3 C4 C5  chars  word");
  for (const { candidate, scores } of ranked) {
    const chars = [...candidate.word].length;
    console.log(
      `${candidate.id.padEnd(32)} ${scores.realWord}  ${scores.funnyAtFirstSight}  ` +
        `${scores.fromTheWord}  ${scores.fresh}  ${scores.exact}  ` +
        `${String(chars).padStart(5)}  ${candidate.word}`,
    );
  }

  const winner = ranked[0];
  console.log("");
  console.log(`Winner: ${winner.candidate.id}`);
  console.log(`Word: ${winner.candidate.word}`);
  console.log(`Why: ${winner.candidate.note}`);
  console.log(
    `Scores: realWord=${winner.scores.realWord} funnyAtFirstSight=${winner.scores.funnyAtFirstSight} ` +
      `fromTheWord=${winner.scores.fromTheWord} fresh=${winner.scores.fresh} ` +
      `exact=${winner.scores.exact}`,
  );

  // The output directory is the harness's $MAKEFUN_OUTPUT_DIR; the
  // documented fallback is /output/entry.txt.
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "entry.txt");
  writeFileSync(outPath, winner.candidate.word + "\n", "utf8");
  console.log(`Wrote ${outPath}`);

  // Read it back and verify byte-for-byte against every gate.
  const gate = verifyGate(outPath, winner.candidate.word);
  console.log(
    `Gate: chars=${gate.lengthChars} bytes=${gate.lengthBytes} ` +
      `singleLine=${gate.singleLine} validUtf8=${gate.validUtf8} ` +
      `notOnlyWhitespace=${gate.notOnlyWhitespace} within77=${gate.within77} ` +
      `passed=${gate.passed}`,
  );
  if (!gate.passed) {
    console.error("GATE FAILED: entry.txt does not satisfy every gate.");
    process.exit(1);
  }
  console.log("Gate passed: entry is valid.");
}

main();
