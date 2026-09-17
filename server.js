require('dotenv').config();
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const SESSION_SECRET = process.env.SESSION_SECRET || 'ganti-secret-ini';
const MAX_GAMBAR = 6; // maksimal jumlah foto per produk

// ---------- Setup ----------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

// Upload gambar item
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const nama = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, nama);
  },
});
const upload = multer({ storage });

// Middleware cek login admin
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.redirect('/admin');
}

// Ambil semua item beserta daftar foto masing-masing
function getItemsWithImages() {
  const items = db.prepare('SELECT * FROM items ORDER BY created_at DESC').all();
  const getImages = db.prepare(
    'SELECT id, path FROM item_images WHERE item_id = ? ORDER BY urutan ASC, id ASC'
  );
  return items.map((item) => ({
    ...item,
    images: getImages.all(item.id),
  }));
}

// ---------- Halaman Publik ----------
app.get('/', (req, res) => {
  const totalItem = db.prepare('SELECT COUNT(*) AS total FROM items').get().total;
  res.render('index', { totalItem });
});

app.get('/katalog', (req, res) => {
  const items = getItemsWithImages();
  const kategoriSet = [
    ...new Set(items.map((i) => (i.kategori || '').trim()).filter(Boolean)),
  ];
  res.render('katalog', { items, kategoriList: kategoriSet });
});

// ---------- Admin: Login ----------
app.get('/admin', (req, res) => {
  if (req.session && req.session.isAdmin) return res.redirect('/admin/dashboard');
  res.render('admin-login', { error: null });
});

app.post('/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.redirect('/admin/dashboard');
  }
  res.render('admin-login', { error: 'Password salah, coba lagi.' });
});

app.post('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin'));
});

// ---------- Admin: Dashboard (CRUD item) ----------
app.get('/admin/dashboard', requireAdmin, (req, res) => {
  const items = getItemsWithImages();
  res.render('admin-dashboard', { items });
});

app.post('/admin/items', requireAdmin, upload.array('gambar', MAX_GAMBAR), (req, res) => {
  const { nama, sku, kategori, deskripsi, jumlah, harga } = req.body;
  const result = db
    .prepare(
      'INSERT INTO items (nama, sku, kategori, deskripsi, jumlah, harga) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(nama, sku || null, kategori || null, deskripsi || null, Number(jumlah) || 0, Number(harga) || 0);

  const itemId = result.lastInsertRowid;
  const insertImage = db.prepare(
    'INSERT INTO item_images (item_id, path, urutan) VALUES (?, ?, ?)'
  );
  (req.files || []).forEach((file, index) => {
    insertImage.run(itemId, '/uploads/' + file.filename, index);
  });

  res.redirect('/admin/dashboard');
});

app.post('/admin/items/:id/update', requireAdmin, upload.array('gambar', MAX_GAMBAR), (req, res) => {
  const { id } = req.params;
  const { nama, sku, kategori, deskripsi, jumlah, harga } = req.body;
  const existing = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
  if (!existing) return res.redirect('/admin/dashboard');

  db.prepare(
    'UPDATE items SET nama = ?, sku = ?, kategori = ?, deskripsi = ?, jumlah = ?, harga = ? WHERE id = ?'
  ).run(nama, sku || null, kategori || null, deskripsi || null, Number(jumlah) || 0, Number(harga) || 0, id);

  // Hapus foto yang dicentang untuk dihapus
  let hapusGambar = req.body.hapus_gambar || [];
  if (!Array.isArray(hapusGambar)) hapusGambar = [hapusGambar];
  if (hapusGambar.length > 0) {
    const getImg = db.prepare('SELECT * FROM item_images WHERE id = ? AND item_id = ?');
    const delImg = db.prepare('DELETE FROM item_images WHERE id = ?');
    hapusGambar.forEach((imgId) => {
      const img = getImg.get(imgId, id);
      if (img) {
        const filePath = path.join(__dirname, 'public', img.path);
        fs.unlink(filePath, () => {});
        delImg.run(imgId);
      }
    });
  }

  // Tambahkan foto baru (kalau ada) di urutan setelah foto yang tersisa
  if (req.files && req.files.length > 0) {
    const maxUrutan = db
      .prepare('SELECT COALESCE(MAX(urutan), -1) AS m FROM item_images WHERE item_id = ?')
      .get(id).m;
    const insertImage = db.prepare(
      'INSERT INTO item_images (item_id, path, urutan) VALUES (?, ?, ?)'
    );
    req.files.forEach((file, index) => {
      insertImage.run(id, '/uploads/' + file.filename, maxUrutan + 1 + index);
    });
  }

  res.redirect('/admin/dashboard');
});

app.post('/admin/items/:id/delete', requireAdmin, (req, res) => {
  const { id } = req.params;
  const images = db.prepare('SELECT * FROM item_images WHERE item_id = ?').all(id);
  images.forEach((img) => {
    const filePath = path.join(__dirname, 'public', img.path);
    fs.unlink(filePath, () => {});
  });
  db.prepare('DELETE FROM item_images WHERE item_id = ?').run(id);
  db.prepare('DELETE FROM items WHERE id = ?').run(id);
  res.redirect('/admin/dashboard');
});

app.listen(PORT, () => {
  console.log(`Server jalan di http://localhost:${PORT}`);
});
