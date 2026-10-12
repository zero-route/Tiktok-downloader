import { NextRequest, NextResponse } from "next/server";
import {
  fetchTikTokMedia,
  ProviderError,
  resolvePostUrl,
} from "@/lib/rapidapi";
import { fetchTikTokDetails } from "@/lib/details";
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
    const postUrl = await resolvePostUrl(inputUrl);

    const [media, details] = await Promise.all([
      fetchTikTokMedia(postUrl),
      fetchTikTokDetails(postUrl).catch(() => null),
    ]);

    const username = media.author.username || details?.author.username || "tiktok";
    const nickname = media.author.nickname || details?.author.nickname || null;
    const avatar = media.author.avatar || details?.author.avatar || null;
    const description = media.description || details?.description || "";
    const baseName = media.id ? `${username}_${media.id}` : username;

    const mainHasStats =
      media.stats.views + media.stats.likes + media.stats.comments + media.stats.shares >
      0;

    const stats = {
      views: details?.stats.views ?? (mainHasStats ? media.stats.views : null),
      likes: details?.stats.likes ?? (mainHasStats ? media.stats.likes : null),
      comments:
        details?.stats.comments ?? (mainHasStats ? media.stats.comments : null),
      shares:
        details?.stats.shares ?? (mainHasStats ? media.stats.shares : null),
      saves: details?.stats.saves ?? null,
      reposts: details?.stats.reposts ?? null,
    };

    return NextResponse.json({
      ok: true,
      data: {
        id: media.id,
        type: media.type,
        description,
        stats,
        originalUrl: inputUrl,
        meta: media.meta,
        profileUrl:
          media.author.username || details?.author.username
            ? `https://www.tiktok.com/@${
                media.author.username || details?.author.username
              }`
            : null,
        author: {
          username: media.author.username || details?.author.username || null,
          nickname,
          followers: details?.author.followers ?? null,
          avatar: avatar ? proxyPath(avatar) : null,
          avatarDirect: avatar,
        },
        cover: media.cover ? proxyPath(media.cover) : null,
        coverDirect: media.cover,
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
          direct: photo,
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
