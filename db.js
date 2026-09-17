const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'data.sqlite'));

db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    gambar TEXT,
    jumlah INTEGER NOT NULL DEFAULT 0,
    harga INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// Tambah kolom baru dengan aman (tidak error kalau kolomnya sudah ada)
function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}
ensureColumn('items', 'sku', 'TEXT');
ensureColumn('items', 'kategori', 'TEXT');
ensureColumn('items', 'deskripsi', 'TEXT');

db.exec(`
  CREATE TABLE IF NOT EXISTS item_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    path TEXT NOT NULL,
    urutan INTEGER DEFAULT 0,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
  )
`);

// Migrasi data lama: kalau ada item yang masih pakai kolom 'gambar' lama
// dan belum punya baris di item_images, pindahkan otomatis
const oldImageItems = db
  .prepare("SELECT id, gambar FROM items WHERE gambar IS NOT NULL AND gambar != ''")
  .all();
for (const item of oldImageItems) {
  const count = db
    .prepare('SELECT COUNT(*) AS c FROM item_images WHERE item_id = ?')
    .get(item.id).c;
  if (count === 0) {
    db.prepare('INSERT INTO item_images (item_id, path, urutan) VALUES (?, ?, 0)').run(
      item.id,
      item.gambar
    );
  }
}

module.exports = db;
