import { NextRequest, NextResponse } from "next/server";
import { fetchTikTokMedia } from "@/lib/rapidapi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ALLOWED_HOST = "robotilab.online";
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 800;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetry(status: number) {
  return status === 400 || status === 429 || status >= 500;
}

function isTikTokVideoUrl(value: string) {
  try {
    const u = new URL(value);
    const host = u.hostname.toLowerCase();

    return (
      (host === "tiktok.com" || host.endsWith(".tiktok.com")) &&
      /^\/@[^/]+\/video\/\d+/.test(u.pathname)
    );
  } catch {
    return false;
  }
}

function isAllowedProviderUrl(value: string) {
  try {
    const u = new URL(value);

    return (
      u.protocol === "https:" &&
      u.hostname === ALLOWED_HOST
    );
  } catch {
    return false;
  }
}

function getTikTokUsername(tiktokUrl: string) {
  try {
    const u = new URL(tiktokUrl);

    const match = u.pathname.match(
      /^\/@([^/]+)\/video\/\d+/
    );

    if (!match?.[1]) {
      return "unknown";
    }

    return decodeURIComponent(match[1]);
  } catch {
    return "unknown";
  }
}

function sanitizeUsername(username: string) {
  const cleaned = username
    .replace(/^@/, "")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 80);

  return cleaned || "unknown";
}

function getDownloadFilename(tiktokUrl: string) {
  const username = getTikTokUsername(tiktokUrl);
  const safeUsername = sanitizeUsername(username);

  return `Vidzly-${safeUsername}.mp4`;
}

async function getFreshDownloadUrl(tiktokUrl: string) {
  const data = await fetchTikTokMedia(tiktokUrl);

  if (
    !data.downloadUrl ||
    !isAllowedProviderUrl(data.downloadUrl)
  ) {
    throw new Error(
      "Download URL dari API tidak valid."
    );
  }

  return data.downloadUrl;
}

async function fetchFromProvider(
  downloadUrl: string,
  range: string | null
) {
  const headers: Record<string, string> = {
    Accept:
      "video/mp4,video/*;q=0.9,*/*;q=0.8",
    "User-Agent": USER_AGENT,
  };

  if (range) {
    headers.Range = range;
  }

  return fetch(downloadUrl, {
    method: "GET",
    redirect: "follow",
    cache: "no-store",
    headers,
  });
}

export async function GET(
  request: NextRequest
) {
  const tiktokUrl =
    request.nextUrl.searchParams
      .get("tiktok")
      ?.trim();

  const providerUrl =
    request.nextUrl.searchParams
      .get("url")
      ?.trim();

  const range =
    request.headers.get("range");

  const isDownloadMode =
    Boolean(tiktokUrl);

  if (!tiktokUrl && !providerUrl) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Parameter tiktok atau url wajib diisi.",
      },
      { status: 400 }
    );
  }

  if (
    tiktokUrl &&
    !isTikTokVideoUrl(tiktokUrl)
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "URL video TikTok tidak valid.",
      },
      { status: 400 }
    );
  }

  if (
    !tiktokUrl &&
    providerUrl &&
    !isAllowedProviderUrl(providerUrl)
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Download URL tidak diizinkan.",
      },
      { status: 400 }
    );
  }

  try {
    let currentUrl: string;

    try {
      currentUrl = tiktokUrl
        ? await getFreshDownloadUrl(tiktokUrl)
        : (providerUrl as string);
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Gagal meminta link download.",
        },
        { status: 502 }
      );
    }

    let response = await fetchFromProvider(
      currentUrl,
      range
    );

    for (
      let attempt = 1;
      attempt < MAX_ATTEMPTS &&
      !response.ok &&
      shouldRetry(response.status);
      attempt++
    ) {
      await sleep(RETRY_DELAY_MS);

      if (tiktokUrl) {
        try {
          currentUrl =
            await getFreshDownloadUrl(
              tiktokUrl
            );
        } catch {
          break;
        }
      }

      response = await fetchFromProvider(
        currentUrl,
        range
      );
    }

    if (!response.ok || !response.body) {
      const detail = (
        await response.text().catch(() => "")
      ).slice(0, 300);

      console.error(
        `[download] provider HTTP ${response.status}:`,
        detail
      );

      return NextResponse.json(
        {
          ok: false,
          error: `Video provider HTTP ${response.status}`,
          detail,
        },
        { status: 502 }
      );
    }

    const contentType =
      response.headers.get("content-type") || "";

    if (
      contentType.includes(
        "application/json"
      )
    ) {
      const text =
        await response.text();

      return NextResponse.json(
        {
          ok: false,
          error:
            "Provider mengembalikan JSON, bukan video.",
          detail: text.slice(0, 300),
        },
        { status: 502 }
      );
    }

    const headers = new Headers();

    headers.set(
      "Content-Type",
      contentType.includes("video")
        ? contentType
        : "video/mp4"
    );

    const contentLength =
      response.headers.get(
        "content-length"
      );

    if (contentLength) {
      headers.set(
        "Content-Length",
        contentLength
      );
    }

    const contentRange =
      response.headers.get(
        "content-range"
      );

    if (contentRange) {
      headers.set(
        "Content-Range",
        contentRange
      );
    }

    headers.set(
      "Accept-Ranges",
      response.headers.get(
        "accept-ranges"
      ) || "bytes"
    );

    if (isDownloadMode) {
      const filename =
        getDownloadFilename(
          tiktokUrl as string
        );

      headers.set(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
    } else {
      headers.set(
        "Content-Disposition",
        "inline"
      );
    }

    headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate"
    );

    return new NextResponse(
      response.body,
      {
        status:
          response.status === 206
            ? 206
            : 200,
        headers,
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengambil file video.",
      },
      { status: 502 }
    );
  }
}