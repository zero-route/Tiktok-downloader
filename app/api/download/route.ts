import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_HOST = "robotilab.online";

export async function GET(request: NextRequest) {
  const downloadUrl =
    request.nextUrl.searchParams.get("url");

  if (!downloadUrl) {
    return NextResponse.json(
      {
        ok: false,
        error: "Download URL wajib diisi.",
      },
      { status: 400 }
    );
  }

  try {
    const parsed = new URL(downloadUrl);

    if (
      parsed.protocol !== "https:" ||
      parsed.hostname !== ALLOWED_HOST
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Download URL tidak diizinkan.",
        },
        { status: 400 }
      );
    }

    const response = await fetch(downloadUrl, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok || !response.body) {
      return NextResponse.json(
        {
          ok: false,
          error: `Download server HTTP ${response.status}`,
        },
        { status: 502 }
      );
    }

    const headers = new Headers();

    headers.set(
      "Content-Type",
      response.headers.get("content-type") ||
        "video/mp4"
    );

    const contentLength =
      response.headers.get("content-length");

    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }

    headers.set(
      "Content-Disposition",
      'attachment; filename="tiktok-video.mp4"'
    );

    headers.set("Cache-Control", "no-store");

    return new NextResponse(response.body, {
      status: 200,
      headers,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Gagal mengambil file video.",
      },
      { status: 502 }
    );
  }
}