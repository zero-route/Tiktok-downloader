"use client";

import { useRef, useState } from "react";

type MediaFile = {
  src: string;
  download: string;
};

type MediaData = {
  id: string | null;
  type: "video" | "photo";
  description: string;
  profileUrl: string | null;
  cover: string | null;
  author: {
    username: string | null;
    nickname: string | null;
    avatar: string | null;
  };
  stats: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
  video: MediaFile | null;
  photos: MediaFile[];
};

type ApiResponse = {
  ok?: boolean;
  data?: MediaData;
  error?: string;
  detail?: string;
};

function formatNumber(value?: number) {
  if (!value) return "0";

  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1).replace(".0", "")}B`;
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(".0", "")}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(".0", "")}K`;
  }

  return value.toLocaleString("id-ID");
}

function Icon({
  children,
  size = 20,
}: {
  children: React.ReactNode;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function LinkIcon() {
  return (
    <Icon size={22}>
      <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
      <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
    </Icon>
  );
}

function DownloadIcon({ size = 22 }: { size?: number }) {
  return (
    <Icon size={size}>
      <path d="M12 3v12" />
      <path d="m7 11 5 5 5-5" />
      <path d="M4 20h16" />
    </Icon>
  );
}

function ExternalIcon() {
  return (
    <Icon size={18}>
      <path d="M18 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
    </Icon>
  );
}

function HeartIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 21s-7.5-4.6-9.6-9.3C.8 8 2.9 4.5 6.4 4.5c2 0 3.7 1.1 4.6 2.7h2c.9-1.6 2.6-2.7 4.6-2.7 3.5 0 5.6 3.5 4 7.2C19.5 16.4 12 21 12 21Z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3C6.5 3 2 6.6 2 11.2c0 2.3 1.2 4.4 3 5.9-.1 1.4-.7 2.8-1.7 3.9 2-.1 3.7-.8 5-1.9 1.1.3 2.3.5 3.7.5 5.5 0 10-3.6 10-8.4S17.500 3 12 3Zm-4 9.200a1.200 1.200 0 1 1 0-2.400 1.200 1.200 0 0 1 0 2.400Zm4 0a1.200 1.200 0 1 1 0-2.400 1.200 1.200 0 0 1 0 2.400Zm4 0a1.200 1.200 0 1 1 0-2.400 1.200 1.200 0 0 1 0 2.400Z" />
    </svg>
  );
}

function RepostIcon() {
  return (
    <Icon size={26}>
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11V9a3 3 0 0 1 3-3h15" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v2a3 3 0 0 1-3 3H3" />
    </Icon>
  );
}

function ViewsIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 4.500v15a1 1 0 0 0 1.500.9l12-7.500a1 1 0 0 0 0-1.700l-12-7.500A1 1 0 0 0 7 4.500Z" />
    </svg>
  );
}

function CaptionIcon() {
  return (
    <Icon size={22}>
      <path d="M4 5h16" />
      <path d="M4 10h10" />
      <path d="M4 15h16" />
      <path d="M4 20h10" />
    </Icon>
  );
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<MediaData | null>(null);
  const [playing, setPlaying] = useState(false);
  const [slide, setSlide] = useState(0);
  const [bulk, setBulk] = useState(false);
  const [ratio, setRatio] = useState<number | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const touchStart = useRef<number | null>(null);

  const photos = data?.photos ?? [];
  const stageStyle = ratio
    ? { aspectRatio: String(Math.min(2, Math.max(0.5, ratio))) }
    : undefined;

  function captureRatio(event: React.SyntheticEvent<HTMLImageElement>) {
    const image = event.currentTarget;

    if (ratio === null && image.naturalWidth && image.naturalHeight) {
      setRatio(image.naturalWidth / image.naturalHeight);
    }
  }

  const isPhoto = data?.type === "photo" && photos.length > 0;
  const activePhoto = isPhoto ? photos[slide] : null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = url.trim();

    if (!value) {
      setError("Masukkan tautan TikTok terlebih dahulu.");
      return;
    }

    setLoading(true);
    setError("");
    setData(null);
    setPlaying(false);
    setSlide(0);
    setRatio(null);
    setAvatarFailed(false);

    try {
      const response = await fetch(
        `/api/tiktok?url=${encodeURIComponent(value)}`,
        { cache: "no-store" }
      );

      const result = (await response
        .json()
        .catch(() => null)) as ApiResponse | null;

      if (!response.ok || !result?.ok || !result.data) {
        throw new Error(
          result?.error || "Gagal memproses media. Pastikan link masih aktif."
        );
      }

      setData(result.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memproses media TikTok."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setUrl("");
    setError("");
    setData(null);
    setPlaying(false);
    setSlide(0);
    setRatio(null);
    setAvatarFailed(false);
  }

  function goTo(index: number) {
    if (!photos.length) return;

    setSlide((index + photos.length) % photos.length);
  }

  function onTouchEnd(event: React.TouchEvent) {
    if (touchStart.current === null) return;

    const delta = event.changedTouches[0].clientX - touchStart.current;

    touchStart.current = null;

    if (Math.abs(delta) > 40) {
      goTo(delta < 0 ? slide + 1 : slide - 1);
    }
  }

  async function downloadAll() {
    if (bulk) return;

    setBulk(true);

    for (const photo of photos) {
      const link = document.createElement("a");

      link.href = photo.download;
      link.download = "";
      document.body.appendChild(link);
      link.click();
      link.remove();

      await new Promise((resolve) => setTimeout(resolve, 700));
    }

    setBulk(false);
  }

  const username = data?.author.username;
  const displayName = data?.author.nickname || username || "TikTok User";

  return (
    <main className="page">
      <header className="hero">
        <h1 className="logo">
          Vid<span>zy</span>
        </h1>
        <p className="tagline">
          Unduh video dan slideshow TikTok dengan cepat dan mudah.
        </p>
      </header>

      <form className="search" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field-icon">
            <LinkIcon />
          </span>

          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="Tempel URL TikTok..."
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            inputMode="url"
          />

          {url && (
            <button
              type="button"
              className="field-clear"
              onClick={handleClear}
              aria-label="Hapus URL"
            >
              ×
            </button>
          )}
        </label>

        <button type="submit" className="btn btn-primary btn-search" disabled={loading}>
          {loading ? (
            <span className="spinner" aria-hidden="true" />
          ) : (
            <DownloadIcon size={20} />
          )}
          <span>{loading ? "Memproses" : "Unduh"}</span>
        </button>
      </form>

      {error && (
        <div className="alert" role="alert">
          <span className="alert-icon">!</span>
          <div>
            <strong>Gagal memproses media</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {loading && (
        <section className="card" aria-busy="true">
          <div className="stage skeleton" />
          <div className="skeleton skeleton-btn" />
        </section>
      )}

      {data && !loading && (
        <>
          <section className="card">
            {isPhoto && activePhoto ? (
              <div
                className="stage stage-slide"
                style={stageStyle}
                onTouchStart={(event) => {
                  touchStart.current = event.touches[0].clientX;
                }}
                onTouchEnd={onTouchEnd}
              >
                <img
                  className="stage-blur"
                  src={activePhoto.src}
                  alt=""
                  aria-hidden="true"
                />
                <img
                  className="stage-img"
                  src={activePhoto.src}
                  alt={`Slide ${slide + 1}`}
                  draggable={false}
                  onLoad={captureRatio}
                />

                <span className="badge badge-left">Slide</span>
                <span className="badge badge-right">
                  {slide + 1} / {photos.length}
                </span>

                {photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="nav nav-left"
                      onClick={() => goTo(slide - 1)}
                      aria-label="Slide sebelumnya"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="nav nav-right"
                      onClick={() => goTo(slide + 1)}
                      aria-label="Slide berikutnya"
                    >
                      ›
                    </button>
                    <div className="dots">
                      {photos.map((_, index) => (
                        <button
                          key={index}
                          type="button"
                          className={index === slide ? "dot active" : "dot"}
                          onClick={() => goTo(index)}
                          aria-label={`Slide ${index + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : playing && data.video ? (
              <div className="stage stage-playing">
                <video
                  className="player"
                  src={data.video.src}
                  poster={data.cover ?? undefined}
                  controls
                  autoPlay
                  playsInline
                />
              </div>
            ) : (
              <button
                type="button"
                className="stage stage-thumb"
                style={stageStyle}
                onClick={() => data.video && setPlaying(true)}
                aria-label="Putar video"
              >
                {data.cover ? (
                  <>
                    <img className="stage-blur" src={data.cover} alt="" aria-hidden="true" />
                    <img
                      className="thumb"
                      src={data.cover}
                      alt="Thumbnail video"
                      onLoad={captureRatio}
                    />
                  </>
                ) : (
                  <span className="thumb thumb-empty" />
                )}
                <span className="play">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M8 5.500v13a1 1 0 0 0 1.500.9l10.500-6.500a1 1 0 0 0 0-1.800L9.500 4.600A1 1 0 0 0 8 5.500Z" />
                  </svg>
                </span>
              </button>
            )}

            {isPhoto && activePhoto ? (
              <div className="actions">
                <a className="btn btn-primary btn-block" href={activePhoto.download}>
                  <DownloadIcon />
                  <span>Download Slide {slide + 1}</span>
                </a>

                {photos.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-block"
                    onClick={downloadAll}
                    disabled={bulk}
                  >
                    <DownloadIcon />
                    <span>
                      {bulk ? "Mengunduh..." : `Download Semua (${photos.length})`}
                    </span>
                  </button>
                )}
              </div>
            ) : (
              data.video && (
                <div className="actions">
                  <a className="btn btn-primary btn-block" href={data.video.download}>
                    <DownloadIcon />
                    <span>Download</span>
                  </a>
                </div>
              )
            )}
          </section>

          <section className="card info">
            <div className="profile">
              {data.author.avatar && !avatarFailed ? (
                <img
                  className="avatar"
                  src={data.author.avatar}
                  alt={displayName}
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <span className="avatar avatar-fallback">
                  {displayName[0].toUpperCase()}
                </span>
              )}

              <div className="profile-text">
                <strong>{displayName}</strong>
                {username && <span>@{username}</span>}
              </div>

              {data.profileUrl && (
                <a
                  className="btn btn-outline"
                  href={data.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalIcon />
                  <span>Kunjungi</span>
                </a>
              )}
            </div>

            <div className="stats">
              <div className="stat">
                <div className="stat-top">
                  <HeartIcon />
                  <strong>{formatNumber(data.stats.likes)}</strong>
                </div>
                <span>Likes</span>
              </div>
              <div className="stat">
                <div className="stat-top">
                  <CommentIcon />
                  <strong>{formatNumber(data.stats.comments)}</strong>
                </div>
                <span>Komentar</span>
              </div>
              <div className="stat">
                <div className="stat-top">
                  <RepostIcon />
                  <strong>{formatNumber(data.stats.shares)}</strong>
                </div>
                <span>Repost</span>
              </div>
              <div className="stat">
                <div className="stat-top">
                  <ViewsIcon />
                  <strong>{formatNumber(data.stats.views)}</strong>
                </div>
                <span>Views</span>
              </div>
            </div>

            {data.description && (
              <div className="caption">
                <div className="caption-label">
                  <CaptionIcon />
                  <span>Caption</span>
                </div>
                <p>{data.description}</p>
              </div>
            )}
          </section>
        </>
      )}

      <footer className="footer">
        Gunakan hanya untuk konten yang kamu berhak unduh. Hormati karya kreator.
      </footer>
    </main>
  );
}
