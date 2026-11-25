const multer = require('multer');

const receiveImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, callback) {
    if (!file.mimetype.startsWith('image/')) {
      return callback(new Error('Only image uploads are allowed'));
    }
    callback(null, true);
  },
}).single('file');

function requireImageUpload(req, res, next) {
  receiveImage(req, res, (err) => {
    if (err?.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Image file is too large' });
    }
    if (err) return res.status(400).json({ error: err.message || 'Invalid upload' });
    if (!req.file) return res.status(400).json({ error: 'Missing image file' });
    next();
  });
}

function uploadBufferToCloudinary(cloudinary, buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (err, result) => {
        if (err) reject(err);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
}

module.exports = { requireImageUpload, uploadBufferToCloudinary };
