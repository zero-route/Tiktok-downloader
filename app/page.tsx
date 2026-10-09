
"use client";

import { useRef, useState } from "react";

type MediaFile = {
  src: string;
  download: string;
};

type MediaData = {
  id: string | null;
  type: "video" | "photo";
  description: string | string[] | null;
  profileUrl: string | null;
  cover: string | null;
  author: {
    username: string | null;
    nickname: string | null;
    avatar: string | null;
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

  const rawDescription = data?.description;

  const fullCaption = Array.isArray(rawDescription)
    ? rawDescription
        .filter((item): item is string => typeof item === "string")
        .join("\n")
        .trim()
    : typeof rawDescription === "string"
      ? rawDescription.trim()
      : "";

  const hashtags = [
    ...new Set(fullCaption.match(/#[\p{L}\p{N}_]+/gu) ?? []),
  ];

  const caption = fullCaption
    .replace(/#[\p{L}\p{N}_]+/gu, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();

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

    try {
      for (const photo of photos) {
        const link = document.createElement("a");

        link.href = photo.download;
        link.download = "";
        document.body.appendChild(link);
        link.click();
        link.remove();

        await new Promise((resolve) => setTimeout(resolve, 700));
      }
    } finally {
      setBulk(false);
    }
  }

  const username = data?.author.username;
  const displayName = data?.author.nickname || username || "TikTok User";

  return (
    <main className="page">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Vidzy beranda">
          Vidzy
        </a>
        <span className="brand-note">TikTok Downloader</span>
      </header>

      <section className="hero" id="top">
        <h1 className="hero-title">Unduh konten TikTok</h1>
        <p className="tagline">Video dan slideshow, dengan mudah.</p>
      </section>

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

        <button
          type="submit"
          className="btn btn-primary btn-search"
          disabled={loading}
        >
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
                    <img
                      className="stage-blur"
                      src={data.cover}
                      alt=""
                      aria-hidden="true"
                    />
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
                  <svg
                    width="30"
                    height="30"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M8 5.5v13a1 1 0 0 0 1.5.9L20 12.9a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5Z" />
                  </svg>
                </span>
              </button>
            )}

            {isPhoto && activePhoto ? (
              <div className="actions">
                <a
                  className="btn btn-primary btn-block"
                  href={activePhoto.download}
                >
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
                      {bulk
                        ? "Mengunduh..."
                        : `Download Semua (${photos.length})`}
                    </span>
                  </button>
                )}
              </div>
            ) : (
              data.video && (
                <div className="actions">
                  <a
                    className="btn btn-primary btn-block"
                    href={data.video.download}
                  >
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
    key={data.author.avatar}
    className="avatar"
    src={data.author.avatar}
    alt={displayName}
    referrerPolicy="no-referrer"
    onError={(event) => {
      const image = event.currentTarget;

      if (!image.dataset.retried) {
        image.dataset.retried = "true";

        const separator = data.author.avatar!.includes("?") ? "&" : "?";
        image.src = `${data.author.avatar}${separator}_retry=${Date.now()}`;
        return;
      }

      setAvatarFailed(true);
    }}
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

            {caption && (
              <div className="caption">
                <div className="caption-label">
                  <CaptionIcon />
                  <span>Caption</span>
                </div>
                <p>{caption}</p>
              </div>
            )}

            {hashtags.length > 0 && (
              <div className="hashtags">
                <div className="caption-label">
                  <span>Hashtag</span>
                </div>
                <div className="hashtag-list">
                  {hashtags.map((tag) => (
                    <span className="hashtag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
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
