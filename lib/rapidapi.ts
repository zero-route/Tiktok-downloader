const RAPIDAPI_HOST =
  process.env.RAPIDAPI_HOST ||
  "tiktok-video-downloader-api.p.rapidapi.com";

const RAPIDAPI_KEY =
  process.env.RAPIDAPI_KEY;

export type TikTokData = {
  id?: string;

  author?: {
    username?: string;
    nickname?: string;
    verified?: boolean;
    signature?: string;
    avatar?: string;
    id?: string;
  };

  description?: string;

  cover?: string;

  stats?: {
    likes?: number;
    comments?: number;
    views?: number;
    shares?: number;
    saves?: number;
  };

  hashtags?: Array<{
    hashtagId?: string;
    hashtagName?: string;
  }>;

  locationCreated?: string;

  downloadUrl?: string;
};

export async function fetchTikTokMedia(
  videoUrl: string
): Promise<TikTokData> {
  if (!RAPIDAPI_KEY) {
    throw new Error(
      "RAPIDAPI_KEY belum dikonfigurasi di environment."
    );
  }

  if (!videoUrl) {
    throw new Error(
      "URL TikTok tidak boleh kosong."
    );
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(videoUrl);
  } catch {
    throw new Error(
      "URL TikTok yang dikirim ke RapidAPI tidak valid."
    );
  }

  if (
    !parsedUrl.hostname
      .toLowerCase()
      .includes("tiktok.com")
  ) {
    throw new Error(
      "URL yang dikirim ke RapidAPI bukan URL TikTok."
    );
  }

  const endpoint =
    `https://${RAPIDAPI_HOST}/media?videoUrl=${encodeURIComponent(
      videoUrl
    )}`;

  const response = await fetch(
    endpoint,
    {
      method: "GET",
      headers: {
        "x-rapidapi-key":
          RAPIDAPI_KEY,

        "x-rapidapi-host":
          RAPIDAPI_HOST,

        Accept:
          "application/json",

        "User-Agent":
          "Mozilla/5.0",
      },

      cache: "no-store",
    }
  );

  const text =
    await response.text();

  let data: unknown;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `RapidAPI mengembalikan response bukan JSON. HTTP ${response.status}: ${text.slice(
        0,
        500
      )}`
    );
  }

  if (!response.ok) {
    const errorMessage =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof (
        data as {
          error?: unknown;
        }
      ).error === "string"
        ? (
            data as {
              error: string;
            }
          ).error
        : JSON.stringify(data);

    throw new Error(
      `RapidAPI HTTP ${response.status}: ${errorMessage}`
    );
  }

  if (
    typeof data !== "object" ||
    data === null ||
    Array.isArray(data)
  ) {
    throw new Error(
      "Format response RapidAPI tidak valid."
    );
  }

  const result =
    data as TikTokData;

  if (!result.downloadUrl) {
    throw new Error(
      "RapidAPI berhasil merespons tetapi downloadUrl tidak ditemukan."
    );
  }

  return result;
}