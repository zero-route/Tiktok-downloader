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

  downloadUrl?: string;
};

type ApiResponse = {
  ok: boolean;
  error?: string;
  data?: TikTokData;
};

function formatNumber(value?: number) {
  if (value === undefined || value === null) {
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

    try {
      const response = await fetch(
        `/api/tiktok?url=${encodeURIComponent(cleanUrl)}`,
        {
          method: "GET",
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
            Download video TikTok dalam format
            MP4 dengan cepat.
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
                setUrl(event.target.value)
              }
              placeholder="https://www.tiktok.com/@user/video/..."
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
              Mengambil video dari RapidAPI...
            </div>
          )}

          {result?.error && (
            <div className="error">
              {result.error}
            </div>
          )}

          {data && (
            <section className="result">

              {data.downloadUrl && (
                <video
                  className="preview"
                  controls
                  playsInline
                  preload="metadata"
                  src={data.downloadUrl}
                />
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

                {data.description && (
                  <p className="description">
                    {data.description}
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

              {data.downloadUrl && (
                <div className="download">

                  <div>
                    <div className="download-title">
                      Video MP4
                    </div>

                    <div className="download-subtitle">
                      TikTok video
                    </div>
                  </div>

                  <a
                    href={`/api/download?url=${encodeURIComponent(
                      data.downloadUrl
                    )}`}
                  >
                    Download MP4
                  </a>

                </div>
              )}

              <div className="note">
                Video diambil menggunakan
                endpoint RapidAPI
                <code> /media </code>
                dan
                <code> downloadUrl </code>
                dari response API.
              </div>

            </section>
          )}

        </section>

        <div className="footer">
          Gunakan hanya untuk konten yang
          kamu berhak unduh.
        </div>

      </div>
    </main>
  );
}