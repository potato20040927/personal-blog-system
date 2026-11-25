const express = require('express');
const { requireImageUpload, uploadBufferToCloudinary } = require('../media/images');

function createUploadRoutes({ adminOnly, authMiddleware, cloudinary }) {
  const router = express.Router();

  router.post(
    '/image',
    authMiddleware,
    adminOnly,
    requireImageUpload,
    async (req, res) => {
      try {
        const result = await uploadBufferToCloudinary(cloudinary, req.file.buffer, 'article_images');
        res.status(201).json({ url: result.secure_url });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Image upload failed' });
      }
    }
  );

  return router;
}

module.exports = createUploadRoutes;
