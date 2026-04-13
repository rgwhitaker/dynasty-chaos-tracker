const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authMiddleware = require('../middleware/auth');
const db = require('../config/database');

const notificationRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 60, // max 60 requests per minute
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again shortly.' },
});

// Get unread notifications for the current user
router.get('/', notificationRateLimit, authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, user_id, dynasty_id, notification_type, message, is_read, created_at FROM notifications
       WHERE user_id = $1 AND is_read = false
       ORDER BY created_at DESC
       LIMIT 20`,
      [req.user.id]
    );
    res.json({ notifications: result.rows });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// Mark a notification as read
router.patch('/:notificationId/read', notificationRateLimit, authMiddleware, async (req, res) => {
  try {
    const { notificationId } = req.params;
    await db.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [notificationId, req.user.id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.patch('/read-all', notificationRateLimit, authMiddleware, async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [req.user.id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

module.exports = router;
