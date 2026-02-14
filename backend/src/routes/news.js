const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newsController');
const { authenticate } = require('../middleware/auth');

/**
 * @swagger
 * /api/news:
 *   get:
 *     summary: Retrieve all news items
 *     tags: [News]
 *     responses:
 *       200:
 *         description: A list of news items.
 */
// Public routes
router.get('/', newsController.getAllNews);
router.get('/category/:category', newsController.getNewsByCategory);
router.get('/:id', newsController.getNewsById);

// Protected routes (require authentication)
router.use(authenticate);
router.get('/user/popup', newsController.getPopupNews);
router.post('/:id/read', newsController.markAsRead);
router.post('/:id/like', newsController.likeNews);

// Admin routes (you can add admin middleware later)
router.post('/', newsController.createNews);
router.put('/:id', newsController.updateNews);
router.delete('/:id', newsController.deleteNews);

module.exports = router;
