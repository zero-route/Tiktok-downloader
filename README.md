# TikTok RapidAPI Downloader

Next.js TikTok video/image downloader untuk deploy ke Vercel.

## 1. Install

```bash
npm install
```

## 2. Local environment

Copy `.env.example` menjadi `.env.local`:

```env
RAPIDAPI_KEY=your_rapidapi_key
RAPIDAPI_HOST=social-media-video-downloader.p.rapidapi.com
```

Jangan commit `.env.local`.

## 3. Run

```bash
npm run dev
```

Buka `http://localhost:3000`.

## 4. Endpoint internal

Frontend memanggil:

```text
GET /api/tiktok?url=<TIKTOK_URL>
```

Server kemudian memanggil:

```text
GET https://social-media-video-downloader.p.rapidapi.com/tiktok/v3/post/details?url=<TIKTOK_URL>
```

Dengan header:

```text
x-rapidapi-key
x-rapidapi-host
```

API key hanya berada di server.

## 5. Deploy GitHub

```bash
git init
git add .
git commit -m "Initial TikTok downloader"
git branch -M main
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin main
```

## 6. Deploy Vercel

Import repository GitHub ke Vercel.

Tambahkan Environment Variables:

```text
RAPIDAPI_KEY = API key RapidAPI kamu
RAPIDAPI_HOST = social-media-video-downloader.p.rapidapi.com
```

Lalu deploy.

## Catatan

Parser media dibuat fleksibel karena response API dapat berubah. Parser mencari URL HTTP(S) di response JSON dan mengklasifikasikan URL video/image berdasarkan URL dan ekstensi.

Jika API ternyata mengembalikan struktur media khusus yang tidak memiliki URL langsung atau menggunakan field yang tidak dapat dikenali, parser dapat disesuaikan setelah melihat contoh response aktual dari API.
