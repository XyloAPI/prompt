import type { Image } from "@/db/schema";

const STOP_WORDS = new Set([
  "a", "an", "the", "in", "on", "at", "to", "for", "of", "with", "and", "or", "by", "from",
  "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
  "this", "that", "these", "those", "it", "its", "as", "into", "like", "through", "over", "after",
  "photo", "image", "shot", "picture", "style", "view", "background", "high", "detail", "lighting"
]);

function hexToRgb(hex: string): [number, number, number] | null {
  if (!hex || typeof hex !== "string") return null;
  const clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : [r, g, b];
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : [r, g, b];
  }
  return null;
}

function colorDistance(c1: [number, number, number], c2: [number, number, number]): number {
  return Math.sqrt(
    Math.pow(c1[0] - c2[0], 2) +
    Math.pow(c1[1] - c2[1], 2) +
    Math.pow(c1[2] - c2[2], 2)
  );
}

function extractKeywords(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  return new Set(words);
}

export function calculateImageSimilarity(target: Image, candidate: Image): number {
  if (target.id === candidate.id) return -1;
  let score = 0;

  // 1. Tag Similarity (Primary factor)
  const targetTags = (target.tags ?? []).map((t) => t.toLowerCase().trim()).filter(Boolean);
  const candidateTags = (candidate.tags ?? []).map((t) => t.toLowerCase().trim()).filter(Boolean);

  if (targetTags.length > 0 && candidateTags.length > 0) {
    const candidateTagSet = new Set(candidateTags);
    let matchedTags = 0;
    for (const tag of targetTags) {
      if (candidateTagSet.has(tag)) {
        matchedTags++;
        score += 15;
      } else {
        for (const cTag of candidateTags) {
          if (cTag.includes(tag) || tag.includes(cTag)) {
            score += 6;
            break;
          }
        }
      }
    }
    const union = new Set([...targetTags, ...candidateTags]).size;
    if (union > 0) {
      score += (matchedTags / union) * 20;
    }
  }

  // 2. Keyword Similarity (Title, Description, Prompt)
  const targetText = `${target.title} ${target.description ?? ""} ${target.prompt ?? ""}`;
  const candidateText = `${candidate.title} ${candidate.description ?? ""} ${candidate.prompt ?? ""}`;

  const targetKeywords = extractKeywords(targetText);
  const candidateKeywords = extractKeywords(candidateText);

  let sharedKeywords = 0;
  for (const kw of targetKeywords) {
    if (candidateKeywords.has(kw)) {
      sharedKeywords++;
    }
  }
  score += sharedKeywords * 5;

  // 3. Color Palette Similarity
  const targetColors = (target.palette ?? [])
    .map((p) => hexToRgb(p.hex))
    .filter((c): c is [number, number, number] => c !== null);
  const candidateColors = (candidate.palette ?? [])
    .map((p) => hexToRgb(p.hex))
    .filter((c): c is [number, number, number] => c !== null);

  if (targetColors.length > 0 && candidateColors.length > 0) {
    for (const tc of targetColors) {
      for (const cc of candidateColors) {
        const dist = colorDistance(tc, cc);
        if (dist < 45) {
          score += 6;
          break;
        } else if (dist < 75) {
          score += 3;
          break;
        }
      }
    }
  }

  // 4. Category Match
  if (target.category === candidate.category) {
    score += 4;
  }

  // 5. Aspect Ratio Match
  if (target.width && target.height && candidate.width && candidate.height) {
    const targetAspect = target.width / target.height;
    const candidateAspect = candidate.width / candidate.height;
    const diff = Math.abs(targetAspect - candidateAspect);
    if (diff < 0.25) {
      score += 3;
    }
  }

  return score;
}

export function rankSimilarImages(target: Image, allCandidates: Image[], limit = 6): Image[] {
  const scored = allCandidates
    .filter((img) => img.id !== target.id)
    .map((img) => ({
      image: img,
      score: calculateImageSimilarity(target, img),
    }));

  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return (b.image.trending ?? 0) - (a.image.trending ?? 0);
  });

  return scored.slice(0, limit).map((s) => s.image);
}
