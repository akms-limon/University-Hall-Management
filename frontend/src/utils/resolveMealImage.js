import { resolveAssetUrl } from "@/utils/resolveAssetUrl";

const localMealImages = import.meta.glob("/src/assets/*.{png,jpg,jpeg,webp,avif}", {
  eager: true,
  import: "default",
});

function normalizeText(value) {
  if (!value || typeof value !== "string") return "";
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function toTokens(value) {
  return normalizeText(value)
    .split(" ")
    .filter(Boolean);
}

const localImageEntries = Object.entries(localMealImages).map(([, url]) => {
  const filename = String(url).split("/").pop() || "";
  const baseName = filename.replace(/\.[a-z0-9]+$/i, "");
  const normalizedName = normalizeText(baseName);

  return {
    normalizedName,
    tokens: toTokens(baseName),
    url,
  };
});

function pickBestLocalImage(itemName = "", category = "") {
  const normalizedItemName = normalizeText(itemName);
  const normalizedCategory = normalizeText(category);
  const itemTokens = new Set(toTokens(itemName));
  const categoryTokens = new Set(toTokens(category));

  if (!normalizedItemName && !categoryTokens.size) {
    return "";
  }

  // For breakfast category, always prefer the dedicated breakfast image.
  if (normalizedCategory === "breakfast") {
    const breakfastImage = localImageEntries.find((entry) => entry.normalizedName === "breakfast");
    if (breakfastImage) {
      return breakfastImage.url;
    }
  }

  const exactMatch = localImageEntries.find((entry) => entry.normalizedName === normalizedItemName);
  if (exactMatch) {
    return exactMatch.url;
  }

  let best = { score: 0, url: "" };

  localImageEntries.forEach((entry) => {
    let score = 0;

    entry.tokens.forEach((token) => {
      if (itemTokens.has(token)) score += 2;
      if (categoryTokens.has(token)) score += 1;
    });

    if (score > best.score) {
      best = { score, url: entry.url };
    }
  });

  return best.score > 0 ? best.url : "";
}

export function resolveMealImage({ image = "", itemName = "", category = "" } = {}) {
  if (image) {
    return resolveAssetUrl(image);
  }

  return pickBestLocalImage(itemName, category);
}
