import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_HOST = "robotilab.online";

export async function GET(request: NextRequest) {
  const downloadUrl =
    request.nextUrl.searchParams.get("url");

  const download =
    request.nextUrl.searchParams.get("download") === "1";

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
      redirect: "follow",
      cache: "no-store",
      headers: {
        Accept:
          "video/mp4,video/*;q=0.9,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
      },
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

    const contentType =
      response.headers.get("content-type");

    headers.set(
      "Content-Type",
      contentType?.includes("video")
        ? contentType
        : "video/mp4"
    );

    const contentLength =
      response.headers.get("content-length");

    if (contentLength) {
      headers.set(
        "Content-Length",
        contentLength
      );
    }

    headers.set(
      "Content-Disposition",
      download
        ? 'attachment; filename="tiktok-video.mp4"'
        : "inline"
    );

    headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate"
    );

    headers.set(
      "Accept-Ranges",
      "bytes"
    );

    return new NextResponse(
      response.body,
      {
        status: 200,
        headers,
      }
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Gagal mengambil file video dari server provider.",
      },
      { status: 502 }
    );
  }
}