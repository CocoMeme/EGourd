const express = require('express');
const router = express.Router();
const forumController = require('../controllers/forumController');
const { authenticate } = require('../middleware/auth');

// Debug: Check what's loaded
console.log('Forum Controller exports:', Object.keys(forumController));

// Public routes
router.get('/posts', forumController.getAllPosts);
router.get('/posts/:id', forumController.getPostById);
router.get('/topics/popular', forumController.getPopularTopics);

// Protected routes (require authentication)
router.get('/my-posts', authenticate, forumController.getMyPosts);
router.post('/posts', authenticate, forumController.createPost);
router.put('/posts/:id', authenticate, forumController.updatePost);
router.delete('/posts/:id', authenticate, forumController.deletePost);
router.post('/posts/:id/like', authenticate, forumController.toggleLike);
router.post('/posts/:id/comments', authenticate, forumController.addComment);
router.post('/posts/:id/comments/:commentId/replies', authenticate, forumController.addReply);
router.post('/posts/:id/report', authenticate, forumController.reportPost);

module.exports = router;
