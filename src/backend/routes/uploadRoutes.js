const express = require('express');
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter(req, file, callback) {
    if (!file.mimetype.startsWith('image/')) {
      callback(new Error('Only image uploads are allowed'));
      return;
    }

    callback(null, true);
  },
});

function createUploadRoutes({ adminOnly, authMiddleware, cloudinary }) {
  const router = express.Router();

  router.post(
    '/image',
    authMiddleware,
    adminOnly,
    upload.single('file'),
    async (req, res) => {
      if (!req.file) {
        return res.status(400).json({ error: 'Missing image file' });
      }

      try {
        const result = await uploadBufferToCloudinary(cloudinary, req.file.buffer);
        res.status(201).json({ url: result.secure_url });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Image upload failed' });
      }
    }
  );

  router.use((err, req, res, next) => {
    if (!err) {
      next();
      return;
    }

    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: 'Image file is too large' });
      return;
    }

    res.status(400).json({ error: err.message || 'Invalid upload' });
  });

  return router;
}

function uploadBufferToCloudinary(cloudinary, buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'article_images',
        resource_type: 'image',
      },
      (err, result) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(result);
      }
    );

    stream.end(buffer);
  });
}

module.exports = createUploadRoutes;
