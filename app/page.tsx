"use client";

import { FormEvent, useMemo, useState } from "react";

type Media = {
  url: string;
  type: "video" | "image" | "audio" | "other";
  label: string;
};

type ApiResponse = {
  ok: boolean;
  error?: string;
  media?: Media[];
  data?: unknown;
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);

  const media = useMemo(() => {
    return (result?.media || []).filter(
      (item) => item.type === "video" || item.type === "image"
    );
  }, [result]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanUrl = url.trim();
    if (!cleanUrl) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(
        `/api/tiktok?url=${encodeURIComponent(cleanUrl)}`,
        { method: "GET" }
      );

      const data: ApiResponse = await response.json();
      setResult(data);
    } catch {
      setResult({
        ok: false,
        error: "Tidak dapat terhubung ke server."
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <div className="shell">
        <section className="hero">
          <div className="badge">TikTok Downloader · RapidAPI</div>
          <h1>Download TikTok</h1>
          <p>
            Tempel URL TikTok untuk mengambil media video atau gambar yang
            tersedia dari API.
          </p>
        </section>

        <section className="card">
          <form className="form" onSubmit={handleSubmit}>
            <input
              className="input"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://www.tiktok.com/@user/video/..."
              type="url"
              required
            />
            <button className="button" disabled={loading}>
              {loading ? "Processing..." : "Download"}
            </button>
          </form>

          {loading && (
            <div className="status">Menghubungi TikTok API...</div>
          )}

          {result?.error && <div className="error">{result.error}</div>}

          {result?.ok && media.length === 0 && (
            <div className="status">
              API berhasil merespons, tetapi tidak ada URL video/gambar yang
              berhasil dikenali dari response.
            </div>
          )}

          {media.length > 0 && (
            <div className="result">
              {media[0].type === "video" ? (
                <video className="preview" controls preload="metadata">
                  <source src={media[0].url} />
                </video>
              ) : (
                <img
                  className="preview"
                  src={media[0].url}
                  alt="TikTok preview"
                />
              )}

              <div className="meta">
                <span>{media.length} media ditemukan</span>
                <span>Tautan CDN dari API</span>
              </div>

              <div className="downloads">
                {media.map((item, index) => (
                  <div className="download" key={`${item.url}-${index}`}>
                    <div>
                      <div>{item.type === "video" ? "Video" : "Image"} {index + 1}</div>
                      <span>{item.type.toUpperCase()}</span>
                    </div>

                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                    >
                      Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <div className="footer">
          Gunakan hanya untuk konten yang kamu berhak unduh.
        </div>
      </div>
    </main>
  );
}