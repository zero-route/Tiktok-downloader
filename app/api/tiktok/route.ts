import { NextRequest, NextResponse } from "next/server";
import { fetchTikTokMedia } from "@/lib/rapidapi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isTikTokHost(hostname: string) {
  const host = hostname.toLowerCase();

  return (
    host === "tiktok.com" ||
    host.endsWith(".tiktok.com")
  );
}

function isTikTokVideoUrl(url: string) {
  try {
    const parsed = new URL(url);

    if (!isTikTokHost(parsed.hostname)) {
      return false;
    }

    return /^\/@[^/]+\/video\/\d+/.test(
      parsed.pathname
    );
  } catch {
    return false;
  }
}

function cleanTikTokVideoUrl(url: string) {
  try {
    const parsed = new URL(url);

    return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`;
  } catch {
    return url;
  }
}

function extractTikTokVideoUrl(
  html: string
): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i,

    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:url["']/i,

    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,

    /https?:\\?\/\\?\/(?:www\.)?tiktok\.com\\?\/@[^"'\\]+\\?\/video\\?\/\d+/i,

    /https?:\/\/(?:www\.)?tiktok\.com\/@[^"'\\]+\/video\/\d+/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (!match) {
      continue;
    }

    const candidate =
      match[1] || match[0];

    try {
      const decoded = candidate
        .replace(/\\u002F/g, "/")
        .replace(/\\\//g, "/")
        .replace(/&amp;/g, "&");

      if (isTikTokVideoUrl(decoded)) {
        return cleanTikTokVideoUrl(decoded);
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function fetchTikTokPage(
  url: string,
  redirect: RequestRedirect
) {
  return fetch(url, {
    method: "GET",
    redirect,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language":
        "en-US,en;q=0.9",
      Referer: "https://www.tiktok.com/",
    },
    cache: "no-store",
  });
}

async function resolveTikTokUrl(
  inputUrl: string
): Promise<string> {
  if (isTikTokVideoUrl(inputUrl)) {
    return cleanTikTokVideoUrl(inputUrl);
  }

  let currentUrl = inputUrl;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetchTikTokPage(
        currentUrl,
        "manual"
      );

      const location =
        response.headers.get("location");

      if (location) {
        const nextUrl = new URL(
          location,
          currentUrl
        ).toString();

        if (isTikTokVideoUrl(nextUrl)) {
          return cleanTikTokVideoUrl(nextUrl);
        }

        currentUrl = nextUrl;
        continue;
      }

      const html = await response.text();

      const extracted =
        extractTikTokVideoUrl(html);

      if (extracted) {
        return extracted;
      }

      if (response.url &&
          isTikTokVideoUrl(response.url)) {
        return cleanTikTokVideoUrl(
          response.url
        );
      }
    } catch {
      continue;
    }
  }

  throw new Error(
    "Gagal mendapatkan URL video TikTok. Pastikan link TikTok masih aktif."
  );
}

export async function GET(
  request: NextRequest
) {
  const inputUrl =
    request.nextUrl.searchParams
      .get("url")
      ?.trim();

  if (!inputUrl) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Parameter url wajib diisi.",
      },
      { status: 400 }
    );
  }

  let parsedInput: URL;

  try {
    parsedInput = new URL(inputUrl);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error:
          "URL TikTok tidak valid.",
      },
      { status: 400 }
    );
  }

  if (
    !isTikTokHost(
      parsedInput.hostname
    )
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "URL harus berasal dari TikTok.",
      },
      { status: 400 }
    );
  }

  try {
    const resolvedUrl =
      await resolveTikTokUrl(
        inputUrl
      );

    const data =
      await fetchTikTokMedia(
        resolvedUrl
      );

    return NextResponse.json({
      ok: true,

      data: {
        id: data.id ?? null,

        author:
          data.author ?? null,

        description:
          data.description ?? null,

        cover:
          data.cover ?? null,

        stats:
          data.stats ?? null,

        hashtags:
          data.hashtags ?? [],

        locationCreated:
          data.locationCreated ?? null,

        downloadUrl:
          data.downloadUrl,

        originalUrl:
          inputUrl,

        resolvedUrl,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan pada server.";

    let status = 502;

    if (
      message.includes(
        "Gagal mendapatkan URL video TikTok"
      )
    ) {
      status = 422;
    }

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status }
    );
  }
}