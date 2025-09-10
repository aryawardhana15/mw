const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Setup CORS agar bisa diakses dari frontend
app.use(cors());

// Helper untuk sanitasi nama ke bentuk slug aman file
function toSafeSlug(input) {
  return String(input || 'anon')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // hapus diakritik
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'anon';
}

// Setup folder penyimpanan file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const nameSlug = toSafeSlug(req.body && req.body.name);
    const ext = path.extname(file.originalname || '').toLowerCase() || '.dat';
    cb(null, `${timestamp}-${nameSlug}${ext}`);
  }
});
const upload = multer({ storage: storage });

// Pastikan folder uploads ada
const fs = require('fs');
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Path CSV sebagai konstanta
const CSV_PATH = path.join(__dirname, 'submissions.csv');

// Endpoint untuk menerima form dukungan
app.post('/submit', upload.single('proof'), (req, res) => {
  const { name, contact } = req.body;
  const file = req.file;

  if (!name || !contact || !file) {
    return res.status(400).json({ message: 'Lengkapi semua data dan upload file.' });
  }

  // Tulis ke submissions.csv (timestamp, name, contact, filename)
  const timestamp = new Date().toISOString();
  const line = `"${timestamp}","${String(name).replace(/\"/g, '""')}","${String(contact).replace(/\"/g, '""')}","${file.filename}"\n`;

  try {
    if (!fs.existsSync(CSV_PATH)) {
      fs.writeFileSync(CSV_PATH, 'timestamp,name,contact,filename\n');
    }
    fs.appendFileSync(CSV_PATH, line);
  } catch (e) {
    console.error('Gagal menulis CSV:', e);
    return res.status(500).json({ message: 'Gagal menyimpan data.' });
  }

  // (Opsional) Kirim email notifikasi ke admin di sini
  // TODO: Integrasi nodemailer jika ingin notifikasi email

  res.json({ message: 'Dukungan berhasil diterima!', filename: file.filename });
});

// Endpoint untuk mengunduh CSV
app.get('/submissions.csv', (req, res) => {
  if (!fs.existsSync(CSV_PATH)) {
    return res.status(404).send('Belum ada data.');
  }
  res.sendFile(CSV_PATH);
});

// Endpoint untuk melihat entri sebagai JSON sederhana
app.get('/entries', (req, res) => {
  if (!fs.existsSync(CSV_PATH)) {
    return res.json([]);
  }
  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  const lines = raw.trim().split(/\r?\n/);
  const header = lines.shift();
  const rows = lines.map(line => {
    // parsing sangat sederhana untuk 4 kolom ter-quote
    const match = line.match(/^"(.*?)","(.*?)","(.*?)","(.*?)"$/);
    if (!match) return null;
    const [, timestamp, name, contact, filename] = match;
    return { timestamp, name, contact, filename, fileUrl: `/uploads/${filename}` };
  }).filter(Boolean);
  res.json(rows);
});

// Endpoint untuk akses file upload (opsional, untuk testing)
app.use('/uploads', express.static('uploads'));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

