const words = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}']+/gu, ' ').trim();

/**
 * Joins Web Speech result chunks into one transcript. Desktop Chrome sends disjoint chunks
 * ("hello nice", " to meet you"), but Android Chrome sends cumulative ones ("hello nice",
 * "hello nice", "hello nice to meet you"): a chunk that repeats or extends the text so far
 * replaces it, and one already contained at its start is dropped, instead of being appended.
 */
export function mergeTranscripts(chunks: readonly string[]): string {
  let text = '';
  for (const raw of chunks) {
    const chunk = raw.trim();
    if (!chunk) continue;
    const have = words(text);
    const next = words(chunk);
    if (!have || next === have || next.startsWith(`${have} `)) text = chunk;
    else if (!have.startsWith(`${next} `)) text = `${text} ${chunk}`;
  }
  return text;
}
