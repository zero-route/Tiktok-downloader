import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ALLOWED_HOSTS = [
  "api.apify.com",
  "apifyusercontent.com",
  "runs.apify.net",
];

function isAllowedHost(hostname: string) {
  const host = hostname.toLowerCase();

  return ALLOWED_HOSTS.some(
    (allowed) =>
      host === allowed ||
      host.endsWith(`.${allowed}`)
  );
}

function sanitizeFilename(value: string) {
  return value
    .replace(/^@+/, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[_\-.]+|[_\-.]+$/g, "")
    .slice(0, 80);
}

function getExtension(
  contentType: string,
  url: URL
) {
  const type = contentType.toLowerCase();

  if (type.includes("png")) {
    return "png";
  }

  if (type.includes("webp")) {
    return "webp";
  }

  if (type.includes("gif")) {
    return "gif";
  }

  if (type.includes("avif")) {
    return "avif";
  }

  if (type.includes("jpeg") || type.includes("jpg")) {
    return "jpg";
  }

  const pathname = url.pathname.toLowerCase();

  if (pathname.endsWith(".png")) {
    return "png";
  }

  if (pathname.endsWith(".webp")) {
    return "webp";
  }

  if (pathname.endsWith(".gif")) {
    return "gif";
  }

  if (pathname.endsWith(".avif")) {
    return "avif";
  }

  return "jpg";
}

export async function GET(
  request: NextRequest
) {
  const imageUrl =
    request.nextUrl.searchParams
      .get("url")
      ?.trim();

  const username =
    request.nextUrl.searchParams
      .get("username")
      ?.trim() || "tiktok";

  if (!imageUrl) {
    return NextResponse.json(
      {
        ok: false,
        error: "URL foto wajib diisi.",
      },
      { status: 400 }
    );
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "URL foto tidak valid.",
      },
      { status: 400 }
    );
  }

  if (
    parsedUrl.protocol !== "https:" ||
    !isAllowedHost(parsedUrl.hostname)
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Sumber foto tidak diizinkan.",
      },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      parsedUrl.toString(),
      {
        method: "GET",
        redirect: "follow",
        cache: "no-store",
        headers: {
          Accept:
            "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
        },
      }
    );

    if (!response.ok || !response.body) {
      const detail = (
        await response
          .text()
          .catch(() => "")
      ).slice(0, 300);

      return NextResponse.json(
        {
          ok: false,
          error: `Provider foto HTTP ${response.status}.`,
          detail,
        },
        { status: 502 }
      );
    }

    const contentType =
      response.headers.get(
        "content-type"
      ) || "image/jpeg";

    if (
      !contentType
        .toLowerCase()
        .startsWith("image/")
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Provider tidak mengembalikan file gambar.",
        },
        { status: 502 }
      );
    }

    const safeUsername =
      sanitizeFilename(username) ||
      "tiktok";

    const randomId =
      crypto.randomUUID();

    const extension = getExtension(
      contentType,
      parsedUrl
    );

    const filename =
      `Vidzly_${safeUsername}_${randomId}.${extension}`;

    const headers = new Headers();

    headers.set(
      "Content-Type",
      contentType
    );

    headers.set(
      "Content-Disposition",
      `attachment; filename="${filename}"`
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

    headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate"
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
            : "Gagal mengunduh foto.",
      },
      { status: 502 }
    );
  }
}