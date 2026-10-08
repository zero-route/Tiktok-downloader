"use client";

import { useMemo, useState } from "react";

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

type PhotoItem = {
  downloadUrl: string;
  fileName?: string;
  contentType?: string;
  fileSizeBytes?: number | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  photoIndex?: number;
  photoCount?: number;
};

type PhotoData = TikTokData & {
  photos: PhotoItem[];
};

type ApiResponse = {
  ok?: boolean;
  type?: "video" | "photo";
  data?: TikTokData | PhotoData;
  error?: string;
  detail?: string;
};

function isPhotoUrl(value: string) {
  try {
    const parsed = new URL(value);

    return (
      parsed.pathname.toLowerCase().includes("/photo/") ||
      parsed.pathname.toLowerCase().includes("/photos/")
    );
  } catch {
    return false;
  }
}

function isShortTikTokUrl(value: string) {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();

    return (
      host === "vt.tiktok.com" ||
      host === "vm.tiktok.com"
    );
  } catch {
    return false;
  }
}

function formatNumber(value?: number) {
  if (!value) return "0";

  if (value >= 1000000000) {
    return `${(value / 1000000000)
      .toFixed(1)
      .replace(".0", "")}B`;
  }

  if (value >= 1000000) {
    return `${(value / 1000000)
      .toFixed(1)
      .replace(".0", "")}M`;
  }

  if (value >= 1000) {
    return `${(value / 1000)
      .toFixed(1)
      .replace(".0", "")}K`;
  }

  return value.toLocaleString("id-ID");
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<TikTokData | null>(null);
  const [photoData, setPhotoData] = useState<PhotoData | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  const activePhoto =
    photoData?.photos?.[photoIndex] || null;

  const photoDownloadHref = useMemo(() => {
    if (!activePhoto) return null;

    const username =
      photoData?.author?.username || "tiktok";

    return `/api/tiktok-photo-download?url=${encodeURIComponent(
      activePhoto.downloadUrl
    )}&username=${encodeURIComponent(username)}`;
  }, [activePhoto, photoData]);

  const videoDownloadHref = useMemo(() => {
    if (!data) return null;

    const targetUrl =
      data.resolvedUrl ||
      data.originalUrl;

    if (!targetUrl) return null;

    return `/api/download?tiktok=${encodeURIComponent(
      targetUrl
    )}`;
  }, [data]);

  async function requestJson(
    endpoint: string,
    targetUrl: string
  ) {
    const response = await fetch(
      `${endpoint}?url=${encodeURIComponent(targetUrl)}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    const result =
      (await response
        .json()
        .catch(() => null)) as ApiResponse | null;

    return {
      response,
      result,
    };
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const value = url.trim();

    if (!value) {
      setError(
        "Masukkan tautan TikTok terlebih dahulu."
      );
      return;
    }

    setLoading(true);
    setError("");
    setData(null);
    setPhotoData(null);
    setPhotoIndex(0);

    try {
      const photoUrl = isPhotoUrl(value);
      const shortUrl = isShortTikTokUrl(value);

      if (photoUrl || shortUrl) {
        const slideshow =
          await requestJson(
            "/api/tiktok-slideshow",
            value
          );

        if (
          slideshow.response.ok &&
          slideshow.result?.ok &&
          slideshow.result.type === "photo" &&
          slideshow.result.data &&
          "photos" in slideshow.result.data &&
          Array.isArray(
            slideshow.result.data.photos
          ) &&
          slideshow.result.data.photos.length > 0
        ) {
          setPhotoData(
            slideshow.result.data as PhotoData
          );
          return;
        }

        if (photoUrl) {
          throw new Error(
            slideshow.result?.error ||
              "Gagal mendapatkan slideshow TikTok."
          );
        }
      }

      const video =
        await requestJson(
          "/api/tiktok",
          value
        );

      if (
        !video.response.ok ||
        !video.result?.ok ||
        !video.result.data
      ) {
        throw new Error(
          video.result?.error ||
            "Gagal mendapatkan URL video TikTok. Pastikan link TikTok masih aktif."
        );
      }

      setData(video.result.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memproses media TikTok."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setUrl("");
    setError("");
    setData(null);
    setPhotoData(null);
    setPhotoIndex(0);
  }

  function previousPhoto() {
    if (!photoData?.photos?.length) return;

    setPhotoIndex((current) =>
      current <= 0
        ? photoData.photos.length - 1
        : current - 1
    );
  }

  function nextPhoto() {
    if (!photoData?.photos?.length) return;

    setPhotoIndex((current) =>
      current >= photoData.photos.length - 1
        ? 0
        : current + 1
    );
  }

  const displayData =
    photoData || data;

  const hashtags =
    displayData?.hashtags?.length
      ? displayData.hashtags
      : [];

  return (
    <main className="site-page">
      <section className="hero-section">
        <div className="brand-badge">
          VIDZLY
        </div>

        <h1>TikTok Downloader</h1>

        <p className="hero-description">
          Unduh video dan slideshow TikTok dengan cepat dan mudah.
        </p>

        <div className="download-card">
          <form onSubmit={handleSubmit}>
            <div className="url-input-wrap">
              <input
                value={url}
                onChange={(event) =>
                  setUrl(event.target.value)
                }
                placeholder="Masukkan tautan media..."
                autoComplete="off"
                spellCheck={false}
              />

              {url && (
                <button
                  type="button"
                  className="clear-url"
                  onClick={handleClear}
                  aria-label="Hapus URL"
                >
                  ×
                </button>
              )}
            </div>

            <button
              type="submit"
              className="main-download-button"
              disabled={loading}
            >
              {loading
                ? "Memproses..."
                : "Unduh"}
            </button>
          </form>

          <p className="copyright-reminder">
            Pengingat: Hormati karya dan hak kekayaan intelektual kreator.
          </p>

          {error && (
            <div className="error-box">
              <div className="error-icon">
                !
              </div>

              <div>
                <strong>
                  Gagal memproses media
                </strong>

                <p>{error}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {data && (
        <section className="result-section">
          <div className="section-heading">
            <span>VIDEO UTAMA</span>
          </div>

          <div className="video-card">
            {data.downloadUrl ? (
              <video
                className="main-video"
                controls
                playsInline
                preload="none"
                poster={data.cover}
                src={`/api/download?url=${encodeURIComponent(
                  data.downloadUrl
                )}`}
              />
            ) : data.cover ? (
              <img
                className="main-video-image"
                src={data.cover}
                alt="Preview TikTok"
              />
            ) : (
              <div className="video-empty">
                Preview video tidak tersedia.
              </div>
            )}

            {videoDownloadHref && (
              <a
                className="download-vt-button"
                href={videoDownloadHref}
              >
                <span className="download-icon">
                  ↓
                </span>

                <span>
                  Download VT
                </span>
              </a>
            )}
          </div>
        </section>
      )}

      {photoData && activePhoto && (
        <section className="result-section">
          <div className="section-heading">
            <span>SLIDESHOW TIKTOK</span>
          </div>

          <div className="photo-card">
            <div className="photo-viewer">
              <img
                src={activePhoto.downloadUrl}
                alt={`Foto ${photoIndex + 1}`}
                className="photo-main"
              />

              {photoData.photos.length > 1 && (
                <>
                  <button
                    type="button"
                    className="photo-nav photo-nav-left"
                    onClick={previousPhoto}
                    aria-label="Foto sebelumnya"
                  >
                    ‹
                  </button>

                  <button
                    type="button"
                    className="photo-nav photo-nav-right"
                    onClick={nextPhoto}
                    aria-label="Foto berikutnya"
                  >
                    ›
                  </button>
                </>
              )}
            </div>

            {photoData.photos.length > 1 && (
              <div className="photo-indicators">
                {photoData.photos.map(
                  (_, index) => (
                    <button
                      key={index}
                      type="button"
                      className={
                        index === photoIndex
                          ? "photo-dot active"
                          : "photo-dot"
                      }
                      onClick={() =>
                        setPhotoIndex(index)
                      }
                      aria-label={`Foto ${
                        index + 1
                      }`}
                    />
                  )
                )}
              </div>
            )}

            <div className="photo-counter">
              {photoIndex + 1} /{" "}
              {photoData.photos.length}
            </div>

            {photoDownloadHref && (
              <a
                className="photo-download"
                href={photoDownloadHref}
                download
              >
                <span className="download-icon">
                  ↓
                </span>

                <span>
                  Download Foto
                </span>
              </a>
            )}
          </div>
        </section>
      )}

      {displayData && (
        <section className="summary-section">
          <div className="summary-header">
            <span>RANGKUMAN VT</span>
            <span>Informasi Video</span>
          </div>

          <div className="creator-row">
            <div className="avatar-wrap">
              {displayData.author?.avatar ? (
                <img
                  src={displayData.author.avatar}
                  alt={
                    displayData.author.nickname ||
                    displayData.author.username ||
                    "TikTok"
                  }
                  className="creator-avatar"
                />
              ) : (
                <div className="avatar-placeholder">
                  {(
                    displayData.author?.nickname ||
                    displayData.author?.username ||
                    "T"
                  )[0].toUpperCase()}
                </div>
              )}
            </div>

            <div className="creator-info">
              <div className="creator-name">
                {displayData.author?.nickname ||
                  displayData.author?.username ||
                  "TikTok User"}

                {displayData.author?.verified && (
                  <span className="verified-badge">
                    ✓
                  </span>
                )}
              </div>

              {displayData.author?.username && (
                <div className="creator-username">
                  @{displayData.author.username}
                </div>
              )}
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-item">
              <strong>
                {formatNumber(
                  displayData.stats?.views
                )}
              </strong>

              <span>Views</span>
            </div>

            <div className="stat-item">
              <strong>
                {formatNumber(
                  displayData.stats?.likes
                )}
              </strong>

              <span>Likes</span>
            </div>

            <div className="stat-item">
              <strong>
                {formatNumber(
                  displayData.stats?.comments
                )}
              </strong>

              <span>Komentar</span>
            </div>

            <div className="stat-item">
              <strong>
                {formatNumber(
                  displayData.stats?.shares
                )}
              </strong>

              <span>Repost</span>
            </div>
          </div>

          {displayData.description && (
            <div className="caption-box">
              <div className="caption-label">
                Caption
              </div>

              <p>
                {displayData.description}
              </p>
            </div>
          )}

          {hashtags.length > 0 && (
            <div className="hashtag-list">
              {hashtags.map(
                (tag, index) => (
                  <span
                    key={
                      tag.hashtagId ||
                      index
                    }
                  >
                    #
                    {tag.hashtagName?.replace(
                      /^#/,
                      ""
                    )}
                  </span>
                )
              )}
            </div>
          )}
        </section>
      )}

      <footer className="site-footer">
        <p>
          Gunakan hanya untuk konten yang kamu berhak unduh.
        </p>

        <p>
          Vidzly memproses tautan TikTok melalui layanan pihak ketiga.
        </p>
      </footer>
    </main>
  );
}