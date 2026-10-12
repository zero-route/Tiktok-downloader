const DEFAULT_DETAILS_HOST =
  "best-tiktok-scraper-free-1000-calls.p.rapidapi.com";

type Json = Record<string, unknown>;

export type TikTokDetails = {
  stats: {
    views: number | null;
    likes: number | null;
    comments: number | null;
    shares: number | null;
    saves: number | null;
    reposts: number | null;
  };
  author: {
    username: string | null;
    nickname: string | null;
    avatar: string | null;
    followers: number | null;
  };
  description: string | null;
};

function obj(value: unknown): Json | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Json)
    : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function count(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);

    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseDetails(body: Json): TikTokDetails | null {
  const root = obj(body.data) ?? body;
  const stats = obj(root.stats);

  if (!stats) {
    return null;
  }

  const author = obj(root.author);
  const authorStats = obj(root.author_stats);

  return {
    stats: {
      views: count(stats.play_count),
      likes: count(stats.like_count),
      comments: count(stats.comment_count),
      shares: count(stats.share_count),
      saves: count(stats.save_count),
      reposts: count(stats.repost_count),
    },
    author: {
      username: str(author?.username),
      nickname: str(author?.nickname),
      avatar: str(author?.profile_picture),
      followers: count(authorStats?.follower_count),
    },
    description: str(root.description),
  };
}

export async function fetchTikTokDetails(
  postUrl: string
): Promise<TikTokDetails | null> {
  const key = process.env.RAPIDAPI_KEY;

  if (!key) {
    return null;
  }

  const host =
    process.env.RAPIDAPI_DETAILS_HOST?.trim() || DEFAULT_DETAILS_HOST;

  const endpoint = `https://${host}/videos/details?video=${encodeURIComponent(
    postUrl
  )}`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: "GET",
        cache: "no-store",
        headers: {
          "X-Rapidapi-Key": key,
          "X-Rapidapi-Host": host,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(18_000),
      });

      const body = obj(await response.json().catch(() => null));
      const details = response.ok && body ? parseDetails(body) : null;

      console.info(
        `[tiktok-details] attempt=${attempt} http=${response.status} valid=${
          details !== null
        }`
      );

      if (details) {
        return details;
      }

      if ([400, 401, 403, 404, 422, 429].includes(response.status)) {
        return null;
      }
    } catch (error) {
      console.info(
        `[tiktok-details] attempt=${attempt} error=${
          error instanceof Error ? error.message : "unknown"
        }`
      );
    }

    if (attempt < 2) {
      await sleep(800);
    }
  }

  return null;
}
