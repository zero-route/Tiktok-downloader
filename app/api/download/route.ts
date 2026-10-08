import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ALLOWED_HOST = "robotilab.online";
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1000;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetry(status: number) {
  return status === 400 || status === 429 || status >= 500;
}

async function fetchFromProvider(
  downloadUrl: string,
  range: string | null
) {
  const headers: Record<string, string> = {
    Accept: "video/mp4,video/*;q=0.9,*/*;q=0.8",
    "User-Agent": USER_AGENT,
  };

  // Teruskan Range supaya preview/seek video tetap lancar.
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

export async function GET(request: NextRequest) {
  const downloadUrl = request.nextUrl.searchParams.get("url");

  if (!downloadUrl) {
    return NextResponse.json(
      { ok: false, error: "Download URL wajib diisi." },
      { status: 400 }
    );
  }

  try {
    const parsed = new URL(downloadUrl);

    if (parsed.protocol !== "https:" || parsed.hostname !== ALLOWED_HOST) {
      return NextResponse.json(
        { ok: false, error: "Download URL tidak diizinkan." },
        { status: 400 }
      );
    }

    const range = request.headers.get("range");

    let response = await fetchFromProvider(downloadUrl, range);

    // Retry untuk error sementara dari provider (400/429/5xx).
    for (
      let attempt = 1;
      attempt < MAX_ATTEMPTS && !response.ok && shouldRetry(response.status);
      attempt++
    ) {
      await sleep(RETRY_DELAY_MS);
      response = await fetchFromProvider(downloadUrl, range);
    }

    if (!response.ok || !response.body) {
      // Baca isi respons provider supaya penyebab aslinya kelihatan.
      const detail = (await response.text().catch(() => "")).slice(0, 300);

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

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const text = await response.text();

      return NextResponse.json(
        {
          ok: false,
          error: "Provider mengembalikan JSON, bukan video.",
          detail: text.slice(0, 300),
        },
        { status: 502 }
      );
    }

    const headers = new Headers();

    headers.set(
      "Content-Type",
      contentType.includes("video") ? contentType : "video/mp4"
    );

    const contentLength = response.headers.get("content-length");
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }

    const contentRange = response.headers.get("content-range");
    if (contentRange) {
      headers.set("Content-Range", contentRange);
    }

    headers.set("Accept-Ranges", response.headers.get("accept-ranges") || "bytes");

    headers.set(
      "Content-Disposition",
      'attachment; filename="tiktok-video.mp4"'
    );

    headers.set("Cache-Control", "no-store, no-cache, must-revalidate");

    return new NextResponse(response.body, {
      // 200 (penuh) atau 206 (sebagian) sesuai respons provider.
      status: response.status === 206 ? 206 : 200,
      headers,
    });
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
