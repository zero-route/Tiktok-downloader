
import ffmpegPath from "ffmpeg-static";
import { spawn } from "node:child_process";
import {
  mkdtemp,
  writeFile,
  readFile,
  rm,
  stat,
} from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type {
  SlideshowInput,
  SlideshowResult,
} from "./types";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

const MAX_IMAGES = 30;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_AUDIO_BYTES = 30 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 100 * 1024 * 1024;

const ALLOWED_DOMAINS = [
  "tiktokcdn-us.com",
  "tiktokcdn.com",
  "tiktokv.com",
  "tiktok.com",
];

function isAllowedUrl(value: string): URL {
  const url = new URL(value);

  const allowed =
    url.protocol === "https:" &&
    ALLOWED_DOMAINS.some(
      (domain) =>
        url.hostname === domain ||
        url.hostname.endsWith(`.${domain}`),
    );

  if (!allowed) {
    throw new Error(
      "URL aset bukan berasal dari domain TikTok yang diizinkan.",
    );
  }

  return url;
}

async function downloadAsset(
  rawUrl: string,
  maxBytes: number,
): Promise<Buffer> {
  let url = isAllowedUrl(rawUrl);
  let response: Response | undefined;

  for (let i = 0; i <= 4; i++) {
    response = await fetch(url, {
      redirect: "manual",
      headers: {
        Accept: "*/*",
        "User-Agent": USER_AGENT,
        Referer: "https://www.tiktok.com/",
      },
      signal: AbortSignal.timeout(25_000),
    });

    if (
      response.status >= 300 &&
      response.status < 400
    ) {
      const location = response.headers.get("location");

      if (!location || i === 4) {
        throw new Error("Redirect aset tidak valid.");
      }

      url = isAllowedUrl(
        new URL(location, url).toString(),
      );
      continue;
    }

    break;
  }

  if (!response?.ok || !response.body) {
    throw new Error("Gagal mengambil aset TikTok.");
  }

  const declaredLength = Number(
    response.headers.get("content-length") || 0,
  );

  if (declaredLength > maxBytes) {
    throw new Error("Ukuran aset melebihi batas.");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      total += value.byteLength;

      if (total > maxBytes) {
        await reader.cancel();
        throw new Error("Ukuran aset melebihi batas.");
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(
    chunks.map((chunk) => Buffer.from(chunk)),
  );
}

function run(
  command: string,
  args: string[],
  timeoutMs = 120_000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });

    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;

      if (stderr.length > 12_000) {
        stderr = stderr.slice(-12_000);
      }
    });

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(
        new Error("Proses media melewati batas waktu."),
      );
    }, timeoutMs);

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timer);

      if (code !== 0) {
        reject(
          new Error(
            `Proses media gagal: ${stderr.slice(-2000)}`,
          ),
        );
        return;
      }

      resolve(`${stdout}\n${stderr}`.trim());
    });
  });
}

async function getAudioDuration(
  ffmpegBinary: string,
  audioPath: string,
): Promise<number> {
  const output = await run(
    ffmpegBinary,
    [
      "-hide_banner",
      "-nostats",
      "-i", audioPath,
      "-t", "0",
      "-f", "null",
      "-",
    ],
    30_000,
  );

  const match = output.match(
    /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/,
  );

  if (!match) {
    throw new Error("Durasi audio tidak dapat dibaca.");
  }

  const duration =
    Number(match[1]) * 3600 +
    Number(match[2]) * 60 +
    Number(match[3]);

  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error("Durasi audio tidak dapat dibaca.");
  }

  return duration;
}

export async function renderSlideshow(
  input: SlideshowInput,
): Promise<SlideshowResult> {
  if (!ffmpegPath) {
    throw new Error("Binary FFmpeg tidak tersedia.");
  }

  if (
    !Array.isArray(input.images) ||
    input.images.length < 1 ||
    input.images.length > MAX_IMAGES
  ) {
    throw new Error(
      `Jumlah gambar harus antara 1–${MAX_IMAGES}.`,
    );
  }

  isAllowedUrl(input.audioUrl);

  for (const imageUrl of input.images) {
    isAllowedUrl(imageUrl);
  }

  const workDir = await mkdtemp(
    path.join(os.tmpdir(), "vidzy-slideshow-"),
  );

  try {
    const imagePaths: string[] = [];

    for (let i = 0; i < input.images.length; i++) {
      const imageBuffer = await downloadAsset(
        input.images[i],
        MAX_IMAGE_BYTES,
      );

      const imagePath = path.join(
        workDir,
        `image-${String(i).padStart(3, "0")}.jpg`,
      );

      await writeFile(imagePath, imageBuffer);
      imagePaths.push(imagePath);
    }

    const audioBuffer = await downloadAsset(
      input.audioUrl,
      MAX_AUDIO_BYTES,
    );

    const audioPath = path.join(workDir, "audio.mp3");
    const concatPath = path.join(workDir, "images.txt");
    const outputPath = path.join(workDir, "slideshow.mp4");

    await writeFile(audioPath, audioBuffer);

    const duration = await getAudioDuration(ffmpegPath, audioPath);
    const imageDuration = duration / imagePaths.length;

    const concatContent = [
      ...imagePaths.flatMap((imagePath) => [
        `file '${imagePath}'`,
        `duration ${imageDuration.toFixed(6)}`,
      ]),
      `file '${imagePaths[imagePaths.length - 1]}'`,
    ].join("\n");

    await writeFile(concatPath, concatContent);

    await run(
      ffmpegPath,
      [
        "-hide_banner",
        "-loglevel", "error",
        "-y",

        "-f", "concat",
        "-safe", "0",
        "-i", concatPath,

        "-i", audioPath,

        "-map", "0:v:0",
        "-map", "1:a:0",

        "-vf",
        "scale=1080:1920:force_original_aspect_ratio=decrease," +
          "pad=1080:1920:(ow-iw)/2:(oh-ih)/2," +
          "setsar=1,format=yuv420p",

        "-r", "30",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-tune", "stillimage",

        "-c:a", "aac",
        "-b:a", "192k",

        "-t", duration.toFixed(6),
        "-shortest",
        "-movflags", "+faststart",
        outputPath,
      ],
      120_000,
    );

    const outputStat = await stat(outputPath);

    if (outputStat.size > MAX_OUTPUT_BYTES) {
      throw new Error(
        "Hasil video melebihi batas ukuran.",
      );
    }

    const buffer = await readFile(outputPath);

    return {
      buffer,
      duration,
      imageCount: imagePaths.length,
    };
  } finally {
    await rm(workDir, {
      recursive: true,
      force: true,
    });
  }
}
