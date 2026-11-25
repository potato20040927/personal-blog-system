const express = require('express');
const { promisify } = require('node:util');
const districtNames = require('../data/districts.json');
const { requireImageUpload, uploadBufferToCloudinary } = require('../media/images');

function createDistrictVisitRoutes({ db, authMiddleware, adminOnly, cloudinary }) {
  const router = express.Router();
  const run = promisify(db.run.bind(db));

  router.get('/', (req, res) => {
    db.all(`
      SELECT district_id, description, NULL AS public_id, NULL AS image_url, NULL AS created_at
      FROM district_visit_notes
      UNION ALL
      SELECT district_id, NULL AS description, public_id, image_url, created_at
      FROM district_visit_photos
      ORDER BY district_id, created_at, public_id
    `, [], (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: '無法載入到訪紀錄' });
      }

      const visits = new Map();
      for (const row of rows) {
        const districtId = row.district_id;
        const visit = visits.get(districtId) ?? { districtId, description: '', photos: [] };
        if (row.description !== null) visit.description = row.description;
        if (row.public_id) visit.photos.push({ id: row.public_id, url: row.image_url });
        visits.set(districtId, visit);
      }
      res.json([...visits.values()]);
    });
  });

  router.param('districtId', (req, res, next, districtId) => {
    if (!Object.hasOwn(districtNames, districtId)) {
      return res.status(404).json({ error: '找不到行政區' });
    }
    next();
  });

  router.put('/:districtId', authMiddleware, adminOnly, async (req, res) => {
    const { districtId } = req.params;
    if (typeof req.body?.description !== 'string') {
      return res.status(400).json({ error: '請輸入文字說明' });
    }

    const description = req.body.description.trim();
    try {
      if (description) {
        await run(`
          INSERT INTO district_visit_notes (district_id, description)
          VALUES (?, ?)
          ON CONFLICT (district_id) DO UPDATE SET description = excluded.description
        `, [districtId, description]);
      } else {
        await run('DELETE FROM district_visit_notes WHERE district_id = ?', [districtId]);
      }
      res.json({ description });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: '無法儲存到訪說明' });
    }
  });

  router.post('/:districtId/photos', authMiddleware, adminOnly, requireImageUpload, async (req, res) => {
    const { districtId } = req.params;
    let image;
    try {
      image = await uploadBufferToCloudinary(cloudinary, req.file.buffer, 'district_visit_images');
      await run(`
        INSERT INTO district_visit_photos (public_id, district_id, image_url)
        VALUES (?, ?, ?)
      `, [image.public_id, districtId, image.secure_url]);
    } catch (err) {
      console.error(err);
      if (image?.public_id) {
        await cloudinary.uploader.destroy(image.public_id).catch(console.error);
      }
      return res.status(500).json({ error: '無法新增到訪照片' });
    }
    res.status(201).json({ id: image.public_id, url: image.secure_url });
  });

  return router;
}

module.exports = createDistrictVisitRoutes;
