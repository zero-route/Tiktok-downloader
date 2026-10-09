
const DEFAULT_HOST =
  "tiktok-downloader-download-tiktok-videos-without-watermark.p.rapidapi.com";

type Json = Record<string, unknown>;

export type TikTokMedia = {
  id: string | null;
  type: "video" | "photo";
  author: {
    username: string | null;
    nickname: string | null;
    avatar: string | null;
  };
  description: string;
  cover: string | null;
  stats: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
  videoUrl: string | null;
  photos: string[];
};

export class ProviderError extends Error {
  status: number;
  detail?: string;

  constructor(message: string, status = 502, detail?: string) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

function isObj(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function num(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

const URL_KEYS = [
  "url",
  "urlList",
  "url_list",
  "uri_list",
  "src",
  "imageURL",
  "imageUrl",
  "image_url",
  "display_image",
  "download_url",
  "downloadUrl",
  "play_addr",
  "playAddr",
  "download_addr",
  "downloadAddr",
];

function collectUrls(value: unknown, depth = 0): string[] {
  if (depth > 5) {
    return [];
  }

  if (typeof value === "string") {
    return /^https?:\/\//i.test(value.trim()) ? [value.trim()] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectUrls(item, depth + 1));
  }

  if (isObj(value)) {
    for (const key of URL_KEYS) {
      if (key in value) {
        const found = collectUrls(value[key], depth + 1);

        if (found.length > 0) {
          return found;
        }
      }
    }
  }

  return [];
}

function firstUrl(value: unknown): string | undefined {
  return collectUrls(value)[0];
}

function bestImageUrl(value: unknown): string | undefined {
  const urls = collectUrls(value);

  if (urls.length === 0) {
    return undefined;
  }

  const usable = urls.filter((url) => !/\.heic?(\?|$)/i.test(url));

  return (
    usable.find((url) => /\.(jpe?g|webp|png)(\?|$)/i.test(url)) ??
    usable[0] ??
    urls[0]
  );
}

function pickUrl(sources: Json[], keys: string[], image = false) {
  for (const source of sources) {
    for (const key of keys) {
      if (key in source) {
        const found = image ? bestImageUrl(source[key]) : firstUrl(source[key]);

        if (found) {
          return found;
        }
      }
    }
  }

  return undefined;
}

function pickStr(sources: Json[], keys: string[]) {
  for (const source of sources) {
    for (const key of keys) {
      const found = str(source[key]);

      if (found) {
        return found;
      }
    }
  }

  return undefined;
}

function pickDescription(sources: Json[], keys: string[]): string {
  for (const source of sources) {
    for (const key of keys) {
      const value = source[key];

      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }

      if (Array.isArray(value)) {
        const text = value
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
          .join("\n");

        if (text) {
          return text;
        }
      }
    }
  }

  return "";
}

function pickNum(sources: Json[], keys: string[]) {
  for (const source of sources) {
    for (const key of keys) {
      const found = num(source[key]);

      if (found !== undefined) {
        return found;
      }
    }
  }

  return 0;
}

function pickObj(sources: Json[], keys: string[]) {
  for (const source of sources) {
    for (const key of keys) {
      if (isObj(source[key])) {
        return source[key] as Json;
      }
    }
  }

  return undefined;
}

function unwrap(payload: unknown) {
  let current: unknown = payload;

  for (let i = 0; i < 4; i++) {
    if (!isObj(current)) {
      break;
    }

    const next = ["data", "result", "response", "item", "aweme_detail"]
      .map((key) => current && (current as Json)[key])
      .find((value) => isObj(value));

    if (!next) {
      break;
    }

    current = next;
  }

  return isObj(current) ? current : undefined;
}

function extractPhotos(root: Json, extra: Json[]) {
  const keys = [
    "images",
    "image_post",
    "imagePost",
    "photos",
    "slides",
    "image_urls",
    "imageUrls",
    "pictures",
  ];

  for (const source of [root, ...extra]) {
    for (const key of keys) {
      let list: unknown = source[key];

      if (isObj(list)) {
        list = list.images ?? list.photos ?? list.list;
      }

      if (Array.isArray(list)) {
        const urls = list
          .map((item) => bestImageUrl(item))
          .filter((item): item is string => Boolean(item));

        if (urls.length > 0) {
          return Array.from(new Set(urls));
        }
      }
    }
  }

  return [];
}

function usernameFromUrl(value: string) {
  try {
    const match = new URL(value).pathname.match(/^\/@([^/]+)/);

    return match?.[1] ? decodeURIComponent(match[1]) : undefined;
  } catch {
    return undefined;
  }
}

export function normalizeMedia(payload: unknown, inputUrl: string): TikTokMedia {
  const root = unwrap(payload);

  if (!root) {
    throw new ProviderError("Format response provider tidak dikenali.");
  }

  const videoObj = pickObj([root], ["video", "video_info", "videoInfo"]);
  const authorRaw =
    root.author ?? root.user ?? root.authorInfo ?? root.author_info;
  const authorObj = isObj(authorRaw) ? authorRaw : undefined;
  const statsObj = pickObj(
    [root],
    ["stats", "statistics", "statistic", "stat", "statsV2"]
  );

  const mediaSources: Json[] = [root];

  if (videoObj) {
    mediaSources.push(videoObj);
  }

  const photos = extractPhotos(root, videoObj ? [videoObj] : []);

  const videoUrl =
    pickUrl(mediaSources, [
      "nowm",
      "no_watermark",
      "noWatermark",
      "hdplay",
      "play",
      "play_url",
      "playUrl",
      "playAddr",
      "play_addr",
      "video_url",
      "videoUrl",
      "download",
      "downloadUrl",
      "download_url",
      "video",
      "url",
    ]) ?? null;

  if (photos.length === 0 && !videoUrl) {
    throw new ProviderError(
      "Media tidak ditemukan pada response provider.",
      502,
      JSON.stringify(payload).slice(0, 1500)
    );
  }

  const authorSources = authorObj ? [authorObj] : [];

  const username =
    pickStr(authorSources, [
      "unique_id",
      "uniqueId",
      "username",
      "user_name",
      "handle",
    ]) ??
    (typeof authorRaw === "string" ? authorRaw.replace(/^@/, "") : undefined) ??
    pickStr([root], ["unique_id", "uniqueId", "username", "author_username"]) ??
    usernameFromUrl(inputUrl) ??
    null;

  const nickname =
    pickStr(authorSources, ["nickname", "nick_name", "name", "display_name"]) ??
    pickStr([root], ["nickname", "author_name", "authorName"]) ??
    null;

  const avatar =
    pickUrl(authorSources.length ? authorSources : [root], [
      "avatar",
      "avatar_thumb",
      "avatarThumb",
      "avatar_medium",
      "avatarMedium",
      "avatar_larger",
      "avatarLarger",
      "avatar_url",
    ], true) ?? null;

  const statSources = statsObj ? [statsObj, root] : [root];

  const cover =
    pickUrl(mediaSources, [
      "cover",
      "origin_cover",
      "originCover",
      "dynamic_cover",
      "dynamicCover",
      "thumbnail",
      "thumb",
      "poster",
    ], true) ??
    photos[0] ??
    null;

  return {
    id: pickStr([root], ["id", "aweme_id", "awemeId", "video_id", "videoId"]) ?? null,
    type: photos.length > 0 ? "photo" : "video",
    author: { username, nickname, avatar },
    description: pickDescription(
      [root],
      ["description", "desc", "caption", "title", "text"]
    ),
    cover,
    stats: {
      likes: pickNum(statSources, [
        "digg_count",
        "diggCount",
        "like_count",
        "likeCount",
        "likes",
      ]),
      comments: pickNum(statSources, [
        "comment_count",
        "commentCount",
        "comments",
      ]),
      shares: pickNum(statSources, [
        "share_count",
        "shareCount",
        "repost_count",
        "repostCount",
        "shares",
      ]),
      views: pickNum(statSources, [
        "play_count",
        "playCount",
        "view_count",
        "viewCount",
        "views",
      ]),
    },
    videoUrl: photos.length > 0 ? null : videoUrl,
    photos,
  };
}

const POST_PATH = /^\/@[^/]+\/(video|photo)\/\d+/;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

function normalizePath(value: string) {
  const trimmed = value.trim();

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

async function resolvePostUrl(inputUrl: string) {
  let current = inputUrl;

  for (let i = 0; i < 5; i++) {
    let parsed: URL;

    try {
      parsed = new URL(current);
    } catch {
      return inputUrl;
    }

    if (POST_PATH.test(parsed.pathname)) {
      return `${parsed.origin}${parsed.pathname}`;
    }

    try {
      const response = await fetch(current, {
        method: "GET",
        redirect: "manual",
        cache: "no-store",
        headers: { "User-Agent": USER_AGENT, Accept: "text/html,*/*" },
      });

      const location = response.headers.get("location");

      if (!location) {
        return inputUrl;
      }

      current = new URL(location, current).toString();
    } catch {
      return inputUrl;
    }
  }

  return inputUrl;
}

async function callProvider(
  host: string,
  key: string,
  path: string,
  targetUrl: string
) {
  const response = await fetch(
    `https://${host}${path}?url=${encodeURIComponent(targetUrl)}`,
    {
      method: "GET",
      headers: {
        "X-Rapidapi-Key": key,
        "X-Rapidapi-Host": host,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  const text = await response.text();

  let payload: unknown;

  try {
    payload = JSON.parse(text);
  } catch {
    throw new ProviderError(
      `Provider mengembalikan response bukan JSON (HTTP ${response.status}).`,
      502,
      text.slice(0, 500)
    );
  }

  if (!response.ok) {
    const message =
      isObj(payload) && typeof payload.message === "string"
        ? payload.message
        : `Provider HTTP ${response.status}`;

    console.error(
      `[rapidapi] ${response.status} ${host}${path}:`,
      text.slice(0, 300)
    );

    throw new ProviderError(
      message,
      response.status === 429 ? 429 : response.status === 403 ? 403 : 502,
      text.slice(0, 500)
    );
  }

  return payload;
}

export async function fetchTikTokMedia(inputUrl: string) {
  const key = process.env.RAPIDAPI_KEY;
  const host = process.env.RAPIDAPI_HOST || DEFAULT_HOST;

  if (!key) {
    throw new ProviderError(
      "RAPIDAPI_KEY belum dikonfigurasi di environment.",
      500
    );
  }

  const videoPath = normalizePath(process.env.RAPIDAPI_VIDEO_PATH || "/vid/index");
  const photoPath = normalizePath(process.env.RAPIDAPI_PHOTO_PATH || "/index");

  const targetUrl = await resolvePostUrl(inputUrl);
  const isPhoto = /\/photo\/\d+/.test(targetUrl);
  const order = isPhoto ? [photoPath, videoPath] : [videoPath, photoPath];

  let lastError: ProviderError | null = null;

  for (const path of order) {
    try {
      const payload = await callProvider(host, key, path, targetUrl);

      return normalizeMedia(payload, targetUrl);
    } catch (error) {
      const failure =
        error instanceof ProviderError
          ? error
          : new ProviderError(
              error instanceof Error ? error.message : "Gagal memanggil provider."
            );

      if (failure.status === 429 || failure.status === 403 || failure.status === 500) {
        throw failure;
      }

      lastError = failure;
    }
  }

  throw lastError ?? new ProviderError("Gagal memanggil provider.");
}
