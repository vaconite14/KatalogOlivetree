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

// ---------- Halaman Publik ----------
app.get('/', (req, res) => {
  const totalItem = db.prepare('SELECT COUNT(*) AS total FROM items').get().total;
  res.render('index', { totalItem });
});

app.get('/katalog', (req, res) => {
  const items = db.prepare('SELECT * FROM items ORDER BY created_at DESC').all();
  res.render('katalog', { items });
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
  const items = db.prepare('SELECT * FROM items ORDER BY created_at DESC').all();
  res.render('admin-dashboard', { items });
});

app.post('/admin/items', requireAdmin, upload.single('gambar'), (req, res) => {
  const { nama, jumlah, harga } = req.body;
  const gambar = req.file ? '/uploads/' + req.file.filename : null;
  db.prepare(
    'INSERT INTO items (nama, gambar, jumlah, harga) VALUES (?, ?, ?, ?)'
  ).run(nama, gambar, Number(jumlah) || 0, Number(harga) || 0);
  res.redirect('/admin/dashboard');
});

app.post('/admin/items/:id/update', requireAdmin, upload.single('gambar'), (req, res) => {
  const { id } = req.params;
  const { nama, jumlah, harga } = req.body;
  const existing = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
  if (!existing) return res.redirect('/admin/dashboard');

  let gambar = existing.gambar;
  if (req.file) {
    // hapus gambar lama kalau ada file baru
    if (existing.gambar) {
      const oldPath = path.join(__dirname, 'public', existing.gambar);
      fs.unlink(oldPath, () => {});
    }
    gambar = '/uploads/' + req.file.filename;
  }

  db.prepare(
    'UPDATE items SET nama = ?, gambar = ?, jumlah = ?, harga = ? WHERE id = ?'
  ).run(nama, gambar, Number(jumlah) || 0, Number(harga) || 0, id);
  res.redirect('/admin/dashboard');
});

app.post('/admin/items/:id/delete', requireAdmin, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
  if (existing && existing.gambar) {
    const filePath = path.join(__dirname, 'public', existing.gambar);
    fs.unlink(filePath, () => {});
  }
  db.prepare('DELETE FROM items WHERE id = ?').run(id);
  res.redirect('/admin/dashboard');
});

app.listen(PORT, () => {
  console.log(`Server jalan di http://localhost:${PORT}`);
});
