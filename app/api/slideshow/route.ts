
import { NextRequest, NextResponse } from "next/server";
import { renderSlideshow } from "@/lib/slideshow/render";
import type { SlideshowInput } from "@/lib/slideshow/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

    const bytes = new Uint8Array(result.buffer);
    const chunkSize = 256 * 1024;
    let offset = 0;

    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (offset >= bytes.length) {
          controller.close();
          return;
        }

        controller.enqueue(bytes.subarray(offset, offset + chunkSize));
        offset += chunkSize;
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": 'attachment; filename="vidzy-slideshow.mp4"',
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
