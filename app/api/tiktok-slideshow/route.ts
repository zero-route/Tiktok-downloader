import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const APIFY_API_URL =
  "https://api.apify.com/v2/actors/parsebird~tiktok-slideshow-downloader/run-sync-get-dataset-items";

type ApifyPhoto = {
  downloadUrl?: string;
  fileName?: string;
  contentType?: string;
  fileSizeBytes?: number;
  imageWidth?: number;
  imageHeight?: number;
  photoIndex?: number;
  photoCount?: number;
  videoId?: string;
  sourceUrl?: string;
  requestedUrl?: string;
  authorUsername?: string;
  authorName?: string;
  caption?: string;
  post?: {
    playCount?: number;
    likeCount?: number;
    commentCount?: number;
    shareCount?: number;
    collectCount?: number;
  };
};

function isTikTokUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();

    return (
      host === "tiktok.com" ||
      host.endsWith(".tiktok.com")
    );
  } catch {
    return false;
  }
}

function isTikTokHost(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();

    return (
      host === "tiktok.com" ||
      host.endsWith(".tiktok.com")
    );
  } catch {
    return false;
  }
}

async function resolveTikTokUrl(inputUrl: string) {
  try {
    const response = await fetch(inputUrl, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
      },
    });

    const finalUrl = response.url?.trim();

    if (finalUrl && isTikTokHost(finalUrl)) {
      return finalUrl;
    }

    return inputUrl;
  } catch {
    return inputUrl;
  }
}

export async function GET(request: NextRequest) {
  const inputUrl =
    request.nextUrl.searchParams.get("url")?.trim();

  const token = process.env.APIFY_API_TOKEN;

  if (!inputUrl) {
    return NextResponse.json(
      {
        ok: false,
        error: "URL TikTok wajib diisi.",
      },
      { status: 400 }
    );
  }

  if (!isTikTokUrl(inputUrl)) {
    return NextResponse.json(
      {
        ok: false,
        error: "URL TikTok tidak valid.",
      },
      { status: 400 }
    );
  }

  if (!token) {
    console.error(
      "[tiktok-slideshow] APIFY_API_TOKEN belum tersedia."
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Konfigurasi Apify belum tersedia di server.",
      },
      { status: 500 }
    );
  }

  try {
    const resolvedUrl =
      await resolveTikTokUrl(inputUrl);

    console.log(
      "[tiktok-slideshow] Input URL:",
      inputUrl
    );

    console.log(
      "[tiktok-slideshow] Resolved URL:",
      resolvedUrl
    );

    const response = await fetch(
      APIFY_API_URL,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          slideshowUrls: [
            {
              url: resolvedUrl,
            },
          ],
          fileNamePattern:
            "Vidzly-{postId}-photo-{photoIndex}.{extension}",
        }),
        cache: "no-store",
      }
    );

    const text = await response.text();

    let result: unknown = null;

    try {
      result = JSON.parse(text);
    } catch {
      result = null;
    }

    if (!response.ok) {
      console.error(
        `[tiktok-slideshow] Apify HTTP ${response.status}:`,
        text.slice(0, 500)
      );

      return NextResponse.json(
        {
          ok: false,
          error: `Apify HTTP ${response.status}.`,
          detail: text.slice(0, 500),
        },
        { status: 502 }
      );
    }

    const items = Array.isArray(result)
      ? (result as ApifyPhoto[])
      : [];

    const photos = items
      .filter(
        (item) =>
          typeof item?.downloadUrl === "string" &&
          item.downloadUrl.length > 0
      )
      .map((item, index) => ({
        downloadUrl: item.downloadUrl,
        fileName:
          item.fileName ||
          `Vidzly-photo-${item.photoIndex || index + 1}.jpg`,
        contentType:
          item.contentType || "image/jpeg",
        fileSizeBytes:
          item.fileSizeBytes || null,
        imageWidth:
          item.imageWidth || null,
        imageHeight:
          item.imageHeight || null,
        photoIndex:
          item.photoIndex || index + 1,
        photoCount:
          item.photoCount || items.length,
      }));

    if (photos.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Tidak ditemukan foto slideshow. Pastikan tautan tersebut adalah postingan foto TikTok dan link masih aktif.",
        },
        { status: 404 }
      );
    }

    const first = items[0];

    return NextResponse.json({
      ok: true,
      type: "photo",
      data: {
        id: first?.videoId || null,
        originalUrl: inputUrl,
        resolvedUrl,
        author: {
          username:
            first?.authorUsername || null,
          nickname:
            first?.authorName || null,
        },
        description:
          first?.caption || "",
        stats: {
          views:
            first?.post?.playCount || 0,
          likes:
            first?.post?.likeCount || 0,
          comments:
            first?.post?.commentCount || 0,
          shares:
            first?.post?.shareCount || 0,
          saves:
            first?.post?.collectCount || 0,
        },
        photos,
      },
    });
  } catch (error) {
    console.error(
      "[tiktok-slideshow] Error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengambil slideshow TikTok.",
      },
      { status: 502 }
    );
  }
}