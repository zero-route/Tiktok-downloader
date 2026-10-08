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
    const data = await fetchTikTokMedia(url);

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