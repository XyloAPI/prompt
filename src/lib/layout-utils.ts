import type { Image } from "@/db/schema";

/**
 * Arranges images with diverse aspect ratios (portrait, landscape, square)
 * so that adjacent cards in columns and across rows have dynamic visual contrast,
 * preventing uniform or unbalanced stacking.
 */
export function arrangeAestheticImages(items: Image[], numColumns: number = 4): Image[] {
  if (!items || items.length <= 2) return items;

  // Classify items by aspect ratio
  const portraits: Image[] = [];
  const landscapes: Image[] = [];
  const squares: Image[] = [];

  for (const img of items) {
    const ratio = img.width && img.height ? img.height / img.width : 1.25;
    if (ratio > 1.15) {
      portraits.push(img);
    } else if (ratio < 0.88) {
      landscapes.push(img);
    } else {
      squares.push(img);
    }
  }

  // Shuffle pools slightly deterministically
  const shuffleArray = (arr: Image[]) => {
    return [...arr].sort((a, b) => {
      const hashA = a.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const hashB = b.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
      return (hashA % 19) - (hashB % 19);
    });
  };

  const pPool = shuffleArray(portraits);
  const lPool = shuffleArray(landscapes);
  const sPool = shuffleArray(squares);

  // Distribute into virtual columns (greedy height balance + ratio alternation)
  const columns: Image[][] = Array.from({ length: numColumns }, () => []);
  const colHeights: number[] = Array.from({ length: numColumns }, () => 0);
  const colLastType: ("portrait" | "landscape" | "square" | null)[] = Array.from(
    { length: numColumns },
    () => null
  );

  const allItemsCount = items.length;
  for (let i = 0; i < allItemsCount; i++) {
    // Find column with the lowest total height
    let targetCol = 0;
    let minHeight = colHeights[0];
    for (let c = 1; c < numColumns; c++) {
      if (colHeights[c] < minHeight) {
        minHeight = colHeights[c];
        targetCol = c;
      }
    }

    const lastType = colLastType[targetCol];
    let chosen: Image | undefined;
    let chosenType: "portrait" | "landscape" | "square" = "portrait";

    // Try to pick a different type than the last item in this column
    if (lastType === "portrait") {
      if (lPool.length > 0) {
        chosen = lPool.shift();
        chosenType = "landscape";
      } else if (sPool.length > 0) {
        chosen = sPool.shift();
        chosenType = "square";
      } else {
        chosen = pPool.shift();
        chosenType = "portrait";
      }
    } else if (lastType === "landscape") {
      if (pPool.length > 0) {
        chosen = pPool.shift();
        chosenType = "portrait";
      } else if (sPool.length > 0) {
        chosen = sPool.shift();
        chosenType = "square";
      } else {
        chosen = lPool.shift();
        chosenType = "landscape";
      }
    } else {
      if (pPool.length > 0) {
        chosen = pPool.shift();
        chosenType = "portrait";
      } else if (lPool.length > 0) {
        chosen = lPool.shift();
        chosenType = "landscape";
      } else {
        chosen = sPool.shift();
        chosenType = "square";
      }
    }

    if (!chosen) {
      chosen = pPool.shift() || lPool.shift() || sPool.shift();
      if (!chosen) break;
    }

    const ratio = chosen.width && chosen.height ? chosen.height / chosen.width : 1.25;
    columns[targetCol].push(chosen);
    colHeights[targetCol] += ratio;
    colLastType[targetCol] = chosenType;
  }

  // Flatten columns in column-major order so CSS `columns` renders them in the exact balanced distribution
  const result: Image[] = [];
  for (const col of columns) {
    result.push(...col);
  }
  return result;
}
