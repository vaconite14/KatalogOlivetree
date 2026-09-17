# Katalog Produk

Website katalog produk sederhana dengan 3 halaman:

- **Halaman utama** (`/`) — landing page toko.
- **Katalog** (`/katalog`) — daftar produk: nama, gambar, jumlah stok, harga.
- **Admin** (`/admin`) — login password, lalu bisa tambah/edit/hapus produk (`/admin/dashboard`).

Dibangun dengan Node.js + Express, database SQLite (file lokal, tidak perlu setup server database terpisah), dan EJS untuk tampilan.

## 1. Jalankan di komputer sendiri

```bash
npm install
cp .env.example .env
```

Buka file `.env`, ganti:
- `ADMIN_PASSWORD` — password untuk login ke halaman admin.
- `SESSION_SECRET` — kalimat acak bebas, buat mengamankan sesi login.

Lalu jalankan:

```bash
npm start
```

Buka `http://localhost:3000` di browser. Halaman admin ada di `http://localhost:3000/admin`.

## 2. Push ke GitHub

```bash
git init
git add .
git commit -m "Initial commit: katalog app"
git branch -M main
git remote add origin https://github.com/USERNAME/NAMA-REPO.git
git push -u origin main
```

File `.env`, `node_modules/`, `data.sqlite`, dan isi folder `public/uploads/` sudah otomatis diabaikan lewat `.gitignore` — jadi password dan data kamu tidak ikut ter-upload ke GitHub.

## 3. Deploy (Railway / Render)

Kedua platform ini bisa deploy langsung dari repo GitHub kamu, gratis untuk skala kecil.

**Railway:**
1. Buat akun di railway.app, pilih "New Project" → "Deploy from GitHub repo".
2. Pilih repo ini.
3. Di tab "Variables", tambahkan `ADMIN_PASSWORD` dan `SESSION_SECRET` (isinya sama seperti di `.env` lokal kamu).
4. Railway otomatis menjalankan `npm install` dan `npm start`. Setelah selesai, kamu dapat URL publik.

**Render:**
1. Buat akun di render.com, pilih "New" → "Web Service", hubungkan ke repo GitHub ini.
2. Build command: `npm install`. Start command: `npm start`.
3. Di tab "Environment", tambahkan `ADMIN_PASSWORD` dan `SESSION_SECRET`.
4. Deploy, lalu buka URL yang diberikan.

### ⚠️ Catatan penting soal penyimpanan gambar & data

Di paket gratis Railway/Render, disk itu bisa ter-reset setiap kali kamu deploy ulang (redeploy). Artinya:
- Data produk (`data.sqlite`) dan gambar yang di-upload lewat admin **bisa hilang setelah redeploy**.
- Ini cukup aman untuk mulai/coba-coba, tapi kalau bisnisnya sudah jalan dan datanya penting, ada 2 opsi:
  1. Aktifkan **persistent volume/disk** (biasanya fitur berbayar di kedua platform) supaya folder `public/uploads` dan file `data.sqlite` tidak ter-reset.
  2. Pindah database ke layanan terpisah (misalnya Postgres dari Railway/Render) dan gambar ke layanan seperti Cloudinary — bisa aku bantu kalau nanti sudah butuh ke situ.

## Struktur folder

```
catalog-app/
├── server.js          # Server & semua routes
├── db.js              # Setup database SQLite
├── views/              # Halaman (EJS)
│   ├── index.ejs
│   ├── katalog.ejs
│   ├── admin-login.ejs
│   └── admin-dashboard.ejs
├── public/
│   ├── css/style.css
│   └── uploads/         # Gambar produk yang di-upload
└── .env.example
```

## Mengubah field produk

Field saat ini: nama, gambar, jumlah, harga (harga opsional). Kalau mau tambah field lain (misal warna, ukuran, kategori — cocok kalau nanti mau disamakan dengan data stok Google Sheets kamu), tinggal:
1. Tambah kolom di `db.js`.
2. Tambah input di form `admin-dashboard.ejs`.
3. Tambah ke query INSERT/UPDATE di `server.js`.
