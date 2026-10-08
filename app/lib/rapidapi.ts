const RAPIDAPI_HOST =
  process.env.RAPIDAPI_HOST || "social-media-video-downloader.p.rapidapi.com";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

export type ExtractedMedia = {
  url: string;
  type: "video" | "image" | "audio" | "other";
  label: string;
};

export type TikTokResult = {
  raw: unknown;
  media: ExtractedMedia[];
};

function classifyUrl(url: string): ExtractedMedia["type"] {
  const value = url.toLowerCase();

  if (/\.(mp4|m4v|mov|webm)(\?|#|$)/i.test(value) || value.includes("video")) {
    return "video";
  }

  if (/\.(jpg|jpeg|png|webp|gif)(\?|#|$)/i.test(value) || value.includes("image")) {
    return "image";
  }

  if (/\.(mp3|m4a|aac|wav|ogg)(\?|#|$)/i.test(value) || value.includes("audio") || value.includes("music")) {
    return "audio";
  }

  return "other";
}

function collectUrls(value: unknown, found: Set<string>, depth = 0): void {
  if (depth > 8 || value == null) return;

  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value)) {
      found.add(value);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectUrls(item, found, depth + 1);
    return;
  }

  if (typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      collectUrls(item, found, depth + 1);
    }
  }
}

export async function getTikTokDetails(url: string): Promise<TikTokResult> {
  if (!RAPIDAPI_KEY) {
    throw new Error("RAPIDAPI_KEY belum dikonfigurasi di environment Vercel.");
  }

  const endpoint =
    `https://${RAPIDAPI_HOST}/tiktok/v3/post/details?url=${encodeURIComponent(url)}`;

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      "x-rapidapi-key": RAPIDAPI_KEY,
      "x-rapidapi-host": RAPIDAPI_HOST,
      "accept": "application/json"
    },
    cache: "no-store"
  });

  const text = await response.text();

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      response.ok
        ? "RapidAPI mengembalikan response yang bukan JSON."
        : `RapidAPI error ${response.status}: ${text.slice(0, 300)}`
    );
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null
        ? JSON.stringify(data).slice(0, 500)
        : `HTTP ${response.status}`;

    throw new Error(`RapidAPI error ${response.status}: ${message}`);
  }

  const urls = new Set<string>();
  collectUrls(data, urls);

  const media = Array.from(urls)
    .map((mediaUrl) => ({
      url: mediaUrl,
      type: classifyUrl(mediaUrl),
      label: classifyUrl(mediaUrl)
    }))
    .filter((item) => item.type !== "other");

  return {
    raw: data,
    media
  };
}