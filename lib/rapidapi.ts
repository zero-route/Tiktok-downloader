import { NextRequest, NextResponse } from "next/server";
import { fetchTikTokMedia } from "@/lib/rapidapi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isTikTokUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();

    return (
      hostname === "tiktok.com" ||
      hostname.endsWith(".tiktok.com")
    );
  } catch {
    return false;
  }
}

async function resolveTikTokUrl(url: string): Promise<string> {
  const response = await fetch(url, {
    method: "GET",
    redirect: "manual",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    cache: "no-store",
  });

  const location = response.headers.get("location");

  if (location) {
    const resolvedUrl = new URL(location, url).toString();

    if (isTikTokUrl(resolvedUrl)) {
      return resolvedUrl;
    }
  }

  if (response.url && isTikTokUrl(response.url)) {
    return response.url;
  }

  return url;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")?.trim();

  if (!url) {
    return NextResponse.json(
      {
        ok: false,
        error: "Parameter url wajib diisi.",
      },
      { status: 400 }
    );
  }

  if (!isTikTokUrl(url)) {
    return NextResponse.json(
      {
        ok: false,
        error: "URL TikTok tidak valid.",
      },
      { status: 400 }
    );
  }

  try {
    const resolvedUrl = await resolveTikTokUrl(url);

    const data = await fetchTikTokMedia(resolvedUrl);

    return NextResponse.json({
      ok: true,
      data: {
        id: data.id ?? null,
        author: data.author ?? null,
        description: data.description ?? null,
        cover: data.cover ?? null,
        stats: data.stats ?? null,
        hashtags: data.hashtags ?? [],
        locationCreated: data.locationCreated ?? null,
        downloadUrl: data.downloadUrl,
        originalUrl: url,
        resolvedUrl,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan pada server.",
      },
      { status: 502 }
    );
  }
}