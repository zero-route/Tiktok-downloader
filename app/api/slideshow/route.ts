
import { NextRequest, NextResponse } from "next/server";
import { renderSlideshow } from "@/lib/slideshow/render";
import type { SlideshowInput } from "@/lib/slideshow/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<SlideshowInput>;

    if (
      !Array.isArray(body.images) ||
      body.images.length === 0 ||
      body.images.length > 30 ||
      !body.images.every(
        (url) => typeof url === "string" && url.length <= 4096,
      ) ||
      typeof body.audioUrl !== "string" ||
      body.audioUrl.length > 4096
    ) {
      return NextResponse.json(
        { error: "Data slideshow tidak valid." },
        { status: 400 },
      );
    }

    const result = await renderSlideshow({
      images: body.images,
      audioUrl: body.audioUrl,
    });

    return new Response(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": 'attachment; filename="vidzy-slideshow.mp4"',
        "Content-Length": String(result.buffer.length),
        "Cache-Control": "no-store",
        "X-Slideshow-Duration": String(result.duration),
        "X-Slideshow-Images": String(result.imageCount),
      },
    });
  } catch (error) {
    console.error("[slideshow]", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal membuat slideshow.",
      },
      { status: 500 },
    );
  }
}
