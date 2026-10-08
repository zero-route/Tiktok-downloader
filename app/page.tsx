"use client";

import { FormEvent, useState } from "react";

type TikTokPhoto = {
  downloadUrl: string;
  fileName?: string;
  contentType?: string;
  fileSizeBytes?: number | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  photoIndex?: number;
  photoCount?: number;
};

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
  photos?: TikTokPhoto[];
};

type ApiResponse = {
  ok: boolean;
  error?: string;
  data?: TikTokData;
  type?: "video" | "photo";
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanUrl = url.trim();

    if (!cleanUrl) {
      return;
    }

    setLoading(true);
    setResult(null);
    setVideoError(false);

    try {
      const isPhotoPost = /\/photo\//i.test(cleanUrl);

      const endpoint = isPhotoPost
        ? `/api/tiktok-slideshow?url=${encodeURIComponent(cleanUrl)}`
        : `/api/tiktok?url=${encodeURIComponent(cleanUrl)}`;

      const response = await fetch(endpoint, {
        method: "GET",
        cache: "no-store",
      });

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

  const isPhotoResult =
    result?.type === "photo" &&
    Boolean(data?.photos && data.photos.length > 0);

  const mediaUrl = data?.downloadUrl
    ? `/api/download?url=${encodeURIComponent(data.downloadUrl)}`
    : null;

  const downloadHref = data?.resolvedUrl
    ? `/api/download?tiktok=${encodeURIComponent(data.resolvedUrl)}`
    : mediaUrl;

  return (
    <main className="page">
      <div className="shell">
        <section className="hero">
          <div className="hero-badge">Vidzly</div>

          <h1>TikTok Downloader</h1>

          <p>
            Unduh video dan slideshow TikTok dengan cepat dan mudah.
          </p>
        </section>

        <section className="card">
          <form className="form" onSubmit={handleSubmit}>
            <div className="input-wrapper">
              <input
                className="input"
                type="url"
                value={url}
                required
                onChange={(event) => setUrl(event.target.value)}
                placeholder="Masukkan tautan media..."
                autoComplete="off"
                spellCheck={false}
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
            Pengingat: Hormati karya dan hak kekayaan intelektual kreator.
          </div>

          {loading && (
            <div className="status">
              <div className="loading-spinner" />

              <span>
                Mengambil dan memproses media TikTok...
              </span>
            </div>
          )}

          {result?.error && (
            <div className="error">
              <div className="error-icon">!</div>

              <div className="error-content">
                <strong>Gagal memproses media</strong>

                <p>{result.error}</p>
              </div>
            </div>
          )}

          {data && (
            <section className="result">
              {isPhotoResult && data.photos && (
                <section className="photo-section">
                  <div className="section-header">
                    <div>
                      <span className="section-label">
                        Slideshow TikTok
                      </span>

                      <h2>Foto Video</h2>
                    </div>

                    <div className="photo-count">
                      {data.photos.length} foto
                    </div>
                  </div>

                  {data.description && (
                    <div className="photo-caption">
                      {data.description}
                    </div>
                  )}

                  <div className="photo-grid">
                    {data.photos.map((photo, index) => (
                      <article
                        className="photo-card"
                        key={`${photo.downloadUrl}-${index}`}
                      >
                        <div className="photo-number">
                          {photo.photoIndex || index + 1}
                        </div>

                        <div className="photo-image-wrapper">
                          <img
                            src={photo.downloadUrl}
                            alt={`Foto slideshow ${
                              photo.photoIndex || index + 1
                            }`}
                            loading="lazy"
                          />
                        </div>

                        <a
                          className="photo-download"
                          href={photo.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <span className="download-icon">
                            ↓
                          </span>

                          <span>Download Foto</span>
                        </a>
                      </article>
                    ))}
                  </div>
                </section>
              )}

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
                        preload="none"
                        poster={data.cover || undefined}
                        src={mediaUrl}
                        onError={() => setVideoError(true)}
                      />

                      {videoError && (
                        <div className="video-error">
                          <strong>
                            Video gagal dimuat
                          </strong>

                          <span>
                            Gunakan tombol download di bawah.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="download-area">
                    <div className="download-line" />

                    <a
                      className="download-button"
                      href={downloadHref || undefined}
                    >
                      <span className="download-icon">
                        ↓
                      </span>

                      <span>Download VT</span>
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

                    <h2>Informasi Video</h2>
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
                        {(
                          data.author?.nickname ||
                          data.author?.username ||
                          "T"
                        )[0].toUpperCase()}
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

                {data.description && !isPhotoResult && (
                  <div className="description-box">
                    <div className="description-title">
                      Caption
                    </div>

                    <p>{data.description}</p>
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
                            #{hashtag.hashtagName}
                          </span>
                        )
                      )}
                    </div>
                  )}
              </div>

              <div className="processing-note">
                Media diproses melalui server Next.js,
                RapidAPI, dan provider download.
              </div>
            </section>
          )}
        </section>

        <footer className="footer">
          Gunakan hanya untuk konten yang kamu berhak unduh.
        </footer>
      </div>
    </main>
  );
}