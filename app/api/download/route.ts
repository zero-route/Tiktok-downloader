import { NextRequest, NextResponse } from "next/server";
import { fetchTikTokMedia } from "@/lib/rapidapi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest
) {
  const videoUrl =
    request.nextUrl.searchParams
      .get("videoUrl")
      ?.trim();

  const download =
    request.nextUrl.searchParams.get(
      "download"
    ) === "1";

  if (!videoUrl) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Video URL wajib diisi.",
      },
      { status: 400 }
    );
  }

  try {
    const parsedUrl =
      new URL(videoUrl);

    const hostname =
      parsedUrl.hostname.toLowerCase();

    if (
      hostname !== "tiktok.com" &&
      !hostname.endsWith(".tiktok.com")
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "URL video tidak valid.",
        },
        { status: 400 }
      );
    }

    const media =
      await fetchTikTokMedia(
        videoUrl
      );

    if (!media.downloadUrl) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Provider tidak memberikan download URL.",
        },
        { status: 502 }
      );
    }

    const response =
      await fetch(
        media.downloadUrl,
        {
          method: "GET",
          redirect: "follow",
          cache: "no-store",
          headers: {
            Accept:
              "video/mp4,video/*;q=0.9,*/*;q=0.8",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
          },
        }
      );

    if (
      !response.ok ||
      !response.body
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            `Provider video HTTP ${response.status}`,
        },
        { status: 502 }
      );
    }

    const contentType =
      response.headers.get(
        "content-type"
      ) || "";

    if (
      contentType.includes(
        "application/json"
      )
    ) {
      const errorBody =
        await response.text();

      return NextResponse.json(
        {
          ok: false,
          error:
            "Provider mengembalikan response JSON, bukan file video.",
          details:
            errorBody.slice(0, 300),
        },
        { status: 502 }
      );
    }

    const headers =
      new Headers();

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

    if (download) {
      headers.set(
        "Content-Disposition",
        'attachment; filename="tiktok-video.mp4"'
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
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengambil video.",
      },
      { status: 502 }
    );
  }
}