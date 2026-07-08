import { shuffle, type Rng } from "./rng";

export interface PermutableOption {
  index: number;
  text: string;
  justification?: string | null;
}

export interface PermutedOptions {
  options: PermutableOption[];
  correctOptionIndex: number;
}

/**
 * Randomizes option order for an attempt snapshot, re-indexing to 0..3 and
 * remapping the correct index. Generated questions put the correct answer in
 * position A ~90% of the time, so presentation order must never follow bank
 * order. Runs at snapshot-assembly time: every attempt gets a fresh order,
 * and repeats of the same question land on different letters.
 */
export function permuteOptions(
  options: PermutableOption[],
  correctOptionIndex: number,
  rng: Rng,
): PermutedOptions {
  const shuffled = shuffle([...options], rng);
  return {
    options: shuffled.map((option, position) => ({
      index: position,
      text: option.text,
      justification: option.justification ?? null,
    })),
    correctOptionIndex: shuffled.findIndex(
      (option) => option.index === correctOptionIndex,
    ),
  };
}
