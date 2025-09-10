import formidable from 'formidable';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = new formidable.IncomingForm();

  form.parse(req, (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: 'Error parsing form data' });
    }
    // fields: { name, contact }
    // files: { proof }
    // Untuk demo, tidak simpan file, hanya balas sukses
    return res.status(200).json({ success: true, fields, files });
  });
}
