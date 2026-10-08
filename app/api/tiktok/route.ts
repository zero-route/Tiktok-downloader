import { NextRequest, NextResponse } from "next/server";
import { getTikTokDetails } from "@/lib/rapidapi";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isTikTokUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
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
      { ok: false, error: "Parameter url wajib diisi." },
      { status: 400 }
    );
  }

  if (!isTikTokUrl(url)) {
    return NextResponse.json(
      { ok: false, error: "Masukkan URL TikTok yang valid." },
      { status: 400 }
    );
  }

  try {
    const result = await getTikTokDetails(url);

    return NextResponse.json({
      ok: true,
      media: result.media,
      data: result.raw
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan pada server.";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 502 }
    );
  }
}