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
  if (value === undefined || value === null) {
    return "-";
  }

  return new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [videoError, setVideoError] = useState(false);

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
        `/api/tiktok?url=${encodeURIComponent(cleanUrl)}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data: ApiResponse = await response.json();

      setResult(data);
    } catch {
      setResult({
        ok: false,
        error: "Tidak dapat terhubung ke server.",
      });
    } finally {
      setLoading(false);
    }
  }

  const data = result?.data;

  const mediaUrl = data?.downloadUrl
    ? `/api/download?url=${encodeURIComponent(
        data.downloadUrl
      )}`
    : null;

  return (
    <main className="page">
      <div className="shell">

        <section className="hero">
          <h1>TikTok Downloader</h1>

          <p>
            Unduh video TikTok dengan cepat dan mudah.
          </p>
        </section>

        <section className="card">

          <form
            className="form"
            onSubmit={handleSubmit}
          >
            <div className="input-wrapper">
              <input
                className="input"
                type="url"
                value={url}
                required
                onChange={(event) =>
                  setUrl(event.target.value)
                }
                placeholder="Masukkan tautan media..."
              />

              {url && (
                <button
                  type="button"
                  className="clear-button"
                  onClick={() => setUrl("")}
                  aria-label="Hapus URL"
                >
                  ×
                </button>
              )}
            </div>

            <button
              className="button"
              type="submit"
              disabled={loading}
            >
              {loading ? "Memproses..." : "Unduh"}
            </button>
          </form>

          <div className="copyright-note">
            Pengingat: Hormati karya dan hak kekayaan
            intelektual kreator.
          </div>

          {loading && (
            <div className="status">
              <div className="loading-spinner" />
              <span>
                Mengambil dan memproses video TikTok...
              </span>
            </div>
          )}

          {result?.error && (
            <div className="error">
              <div className="error-icon">!</div>

              <div>
                <strong>Gagal memproses video</strong>
                <p>{result.error}</p>
              </div>
            </div>
          )}

          {data && (
            <section className="result">

              {mediaUrl && (
                <>
                  <div className="video-section">

                    <div className="section-label">
                      Video Utama
                    </div>

                    <div className="video-wrapper">
                      <video
                        className="preview"
                        controls
                        playsInline
                        preload="metadata"
                        poster={
                          data.cover || undefined
                        }
                        src={mediaUrl}
                        onError={() =>
                          setVideoError(true)
                        }
                      />

                      {videoError && (
                        <div className="video-error">
                          <strong>
                            Video gagal dimuat
                          </strong>

                          <span>
                            Gunakan tombol download
                            di bawah.
                          </span>
                        </div>
                      )}
                    </div>

                  </div>

                  <div className="download-area">

                    <div className="download-line" />

                    <a
                      className="download-button"
                      href={mediaUrl}
                    >
                      <span className="download-icon">
                        ↓
                      </span>

                      <span>
                        Download VT
                      </span>
                    </a>

                    <div className="download-line" />

                  </div>
                </>
              )}

              <div className="summary">

                <div className="summary-heading">
                  <div>
                    <span className="section-label">
                      Rangkuman VT
                    </span>

                    <h2>
                      Informasi Video
                    </h2>
                  </div>
                </div>

                <div className="creator">

                  <div className="creator-avatar">

                    {data.author?.avatar ? (
                      <img
                        src={data.author.avatar}
                        alt={
                          data.author.nickname ||
                          "Creator"
                        }
                      />
                    ) : (
                      <span>
                        {(data.author?.nickname ||
                          data.author?.username ||
                          "T")[0].toUpperCase()}
                      </span>
                    )}

                  </div>

                  <div className="creator-info">

                    <div className="creator-name">
                      {data.author?.nickname ||
                        data.author?.username ||
                        "Nama kreator"}

                      {data.author?.verified && (
                        <span className="verified">
                          ✓
                        </span>
                      )}
                    </div>

                    {data.author?.username && (
                      <div className="creator-username">
                        @{data.author.username}
                      </div>
                    )}

                  </div>

                </div>

                <div className="stats">

                  <div className="stat">
                    <span className="stat-icon">
                      ▶
                    </span>

                    <div>
                      <small>Views</small>
                      <strong>
                        {formatNumber(
                          data.stats?.views
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="stat">
                    <span className="stat-icon">
                      ♡
                    </span>

                    <div>
                      <small>Likes</small>
                      <strong>
                        {formatNumber(
                          data.stats?.likes
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="stat">
                    <span className="stat-icon">
                      ○
                    </span>

                    <div>
                      <small>Komentar</small>
                      <strong>
                        {formatNumber(
                          data.stats?.comments
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="stat">
                    <span className="stat-icon">
                      ↗
                    </span>

                    <div>
                      <small>Repost</small>
                      <strong>
                        {formatNumber(
                          data.stats?.shares
                        )}
                      </strong>
                    </div>
                  </div>

                </div>

                {data.description && (
                  <div className="description-box">

                    <div className="description-title">
                      Caption
                    </div>

                    <p>
                      {data.description}
                    </p>

                  </div>
                )}

                {data.hashtags &&
                  data.hashtags.length > 0 && (
                    <div className="hashtags">

                      {data.hashtags.map(
                        (hashtag, index) => (
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

              </div>

              <div className="processing-note">
                Video diproses melalui server Next.js
                dan provider download.
              </div>

            </section>
          )}

        </section>

        <footer className="footer">
          Gunakan hanya untuk konten yang kamu
          berhak unduh.
        </footer>

      </div>
    </main>
  );
}