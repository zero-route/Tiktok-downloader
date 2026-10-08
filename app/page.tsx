"use client";

import { FormEvent, useState } from "react";

type TikTokData = {
  id?: string;

  author?: {
    username?: string;
    nickname?: string;
    verified?: boolean;
    avatar?: string;
  };

  description?: string;

  cover?: string;

  stats?: {
    likes?: number;
    comments?: number;
    views?: number;
    shares?: number;
    saves?: number;
  };

  hashtags?: Array<{
    hashtagId?: string;
    hashtagName?: string;
  }>;

  downloadUrl?: string;

  originalUrl?: string;

  resolvedUrl?: string;
};

type ApiResponse = {
  ok: boolean;
  error?: string;
  data?: TikTokData;
};

function formatNumber(value?: number) {
  if (
    value === undefined ||
    value === null
  ) {
    return "-";
  }

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] =
    useState<ApiResponse | null>(null);

  const [videoError, setVideoError] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const cleanUrl = url.trim();

    if (!cleanUrl) {
      return;
    }

    setLoading(true);
    setResult(null);
    setVideoError(false);

    try {
      const response = await fetch(
        `/api/tiktok?url=${encodeURIComponent(
          cleanUrl
        )}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data: ApiResponse =
        await response.json();

      setResult(data);
    } catch {
      setResult({
        ok: false,
        error:
          "Tidak dapat terhubung ke server.",
      });
    } finally {
      setLoading(false);
    }
  }

  const data = result?.data;

  const videoUrl =
    data?.downloadUrl
      ? `/api/download?url=${encodeURIComponent(
          data.downloadUrl
        )}`
      : null;

  // Download memakai sesi BARU: server meminta link baru ke RapidAPI
  // tepat saat tombol ditekan, jadi tidak kena "Invalid Session".
  const downloadUrl =
    data?.resolvedUrl
      ? `/api/download?tiktok=${encodeURIComponent(
          data.resolvedUrl
        )}`
      : null;

  return (
    <main className="page">
      <div className="shell">

        <section className="hero">
          <div className="badge">
            RapidAPI · TikTok Downloader
          </div>

          <h1>
            TikTok Downloader
          </h1>

          <p>
            Download video TikTok
            dalam format MP4
            dengan cepat.
          </p>
        </section>

        <section className="card">

          <form
            className="form"
            onSubmit={handleSubmit}
          >
            <input
              className="input"
              type="url"
              value={url}
              required
              onChange={(event) =>
                setUrl(
                  event.target.value
                )
              }
              placeholder="https://vt.tiktok.com/..."
            />

            <button
              className="button"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Processing..."
                : "Get Video"}
            </button>
          </form>

          {loading && (
            <div className="status">
              Mengambil dan
              memproses video
              TikTok...
            </div>
          )}

          {result?.error && (
            <div className="error">
              {result.error}
            </div>
          )}

          {data && (
            <section className="result">

              {videoUrl && (
                <div className="video-wrapper">

                  <video
                    className="preview"
                    controls
                    playsInline
                    preload="none"
                    poster={
                      data.cover ||
                      undefined
                    }
                    src={videoUrl}
                    onError={() =>
                      setVideoError(
                        true
                      )
                    }
                  />

                  {videoError && (
                    <div className="video-error">
                      Video gagal dimuat.

                      <br />

                      Coba tekan tombol
                      <strong>
                        {" "}
                        Download MP4
                      </strong>
                      .
                    </div>
                  )}

                </div>
              )}

              <div className="info">

                {data.author && (
                  <div className="author">
                    {data.author.nickname ||
                      data.author.username ||
                      "TikTok User"}

                    {data.author.verified && (
                      <span>
                        {" "}
                        ✓
                      </span>
                    )}
                  </div>
                )}

                {data.author?.username && (
                  <div className="username">
                    @
                    {
                      data.author
                        .username
                    }
                  </div>
                )}

                {data.description && (
                  <p className="description">
                    {
                      data.description
                    }
                  </p>
                )}

                <div className="stats">

                  <div className="stat">
                    <small>
                      Views
                    </small>

                    <strong>
                      {formatNumber(
                        data.stats?.views
                      )}
                    </strong>
                  </div>

                  <div className="stat">
                    <small>
                      Likes
                    </small>

                    <strong>
                      {formatNumber(
                        data.stats?.likes
                      )}
                    </strong>
                  </div>

                  <div className="stat">
                    <small>
                      Comments
                    </small>

                    <strong>
                      {formatNumber(
                        data.stats?.comments
                      )}
                    </strong>
                  </div>

                  <div className="stat">
                    <small>
                      Shares
                    </small>

                    <strong>
                      {formatNumber(
                        data.stats?.shares
                      )}
                    </strong>
                  </div>

                </div>
              </div>

              {downloadUrl && (
                <div className="download">

                  <div>
                    <div className="download-title">
                      Video MP4
                    </div>

                    <div className="download-subtitle">
                      Video + Audio
                    </div>
                  </div>

                  <a
                    className="download-button"
                    href={downloadUrl}
                  >
                    Download MP4
                  </a>

                </div>
              )}

              {data.hashtags &&
                data.hashtags.length > 0 && (
                  <div className="hashtags">
                    {data.hashtags.map(
                      (
                        hashtag,
                        index
                      ) => (
                        <span
                          key={
                            hashtag.hashtagId ||
                            index
                          }
                        >
                          #
                          {
                            hashtag.hashtagName
                          }
                        </span>
                      )
                    )}
                  </div>
                )}

              <div className="note">
                Video diproses melalui
                server Next.js dan
                download URL dari
                provider.
              </div>

            </section>
          )}

        </section>

        <div className="footer">
          Gunakan hanya untuk
          konten yang kamu
          berhak unduh.
        </div>

      </div>
    </main>
  );
}