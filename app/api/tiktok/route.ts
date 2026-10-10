import { NextRequest, NextResponse } from "next/server";
import { fetchTikTokMedia, ProviderError } from "@/lib/rapidapi";
import { proxyPath } from "@/lib/sign";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isTikTokHost(hostname: string) {
  const host = hostname.toLowerCase();

  return host === "tiktok.com" || host.endsWith(".tiktok.com");
}

function fail(error: string, status: number, detail?: string) {
  return NextResponse.json({ ok: false, error, detail }, { status });
}

export async function GET(request: NextRequest) {
  const inputUrl = request.nextUrl.searchParams.get("url")?.trim();

  if (!inputUrl) {
    return fail("Parameter url wajib diisi.", 400);
  }

  let parsed: URL;

  try {
    parsed = new URL(inputUrl);
  } catch {
    return fail("URL TikTok tidak valid.", 400);
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return fail("URL TikTok tidak valid.", 400);
  }

  if (!isTikTokHost(parsed.hostname)) {
    return fail("URL harus berasal dari TikTok.", 400);
  }

  try {
    const media = await fetchTikTokMedia(inputUrl);
    const username = media.author.username || "tiktok";
    const baseName = media.id ? `${username}_${media.id}` : username;

    return NextResponse.json({
      ok: true,
      data: {
        id: media.id,
        type: media.type,
        description: media.description,
        stats: media.stats,
        originalUrl: inputUrl,
        profileUrl: media.author.username
          ? `https://www.tiktok.com/@${media.author.username}`
          : null,
        author: {
          username: media.author.username,
          nickname: media.author.nickname,
          avatar: media.author.avatar ? proxyPath(media.author.avatar) : null,
        },
        cover: media.cover ? proxyPath(media.cover) : null,
        video: media.videoUrl
          ? {
              src: proxyPath(media.videoUrl),
              download: proxyPath(media.videoUrl, {
                name: baseName,
                download: true,
              }),
            }
          : null,
        slideshow:
          media.type === "photo" && media.audioUrl
            ? {
                images: media.photos.slice(0, 30),
                audioUrl: media.audioUrl,
              }
            : null,
        photos: media.photos.map((photo, index) => ({
          src: proxyPath(photo),
          download: proxyPath(photo, {
            name: `${baseName}_${index + 1}`,
            download: true,
          }),
        })),
      },
    });
  } catch (error) {
    if (error instanceof ProviderError) {
      return fail(error.message, error.status, error.detail);
    }

    return fail(
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan pada server.",
      502
    );
  }
}
