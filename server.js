const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Setup CORS agar bisa diakses dari frontend lokal
app.use(cors());

// Setup folder penyimpanan file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Pastikan folder uploads ada
const fs = require('fs');
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Endpoint untuk menerima form dukungan
app.post('/submit', upload.single('proof'), (req, res) => {
  const { name, contact } = req.body;
  const file = req.file;

  if (!name || !contact || !file) {
    return res.status(400).json({ message: 'Lengkapi semua data dan upload file.' });
  }

  // Tulis ke submissions.csv (timestamp, name, contact, filename)
  const csvPath = path.join(__dirname, 'submissions.csv');
  const timestamp = new Date().toISOString();
  const line = `"${timestamp}","${name.replace(/\"/g, '""')}","${contact.replace(/\"/g, '""')}","${file.filename}"\n`;

  try {
    if (!fs.existsSync(csvPath)) {
      fs.writeFileSync(csvPath, 'timestamp,name,contact,filename\n');
    }
    fs.appendFileSync(csvPath, line);
  } catch (e) {
    console.error('Gagal menulis CSV:', e);
    return res.status(500).json({ message: 'Gagal menyimpan data.' });
  }

  // (Opsional) Kirim email notifikasi ke admin di sini
  // TODO: Integrasi nodemailer jika ingin notifikasi email

  res.json({ message: 'Dukungan berhasil diterima!', filename: file.filename });
});

// Endpoint untuk akses file upload (opsional, untuk testing)
app.use('/uploads', express.static('uploads'));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

