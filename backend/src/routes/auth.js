const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const authController = require('../controllers/authController');

// Local auth routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', 
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  authController.googleCallback
);

// Twitter OAuth routes (if configured)
if (process.env.TWITTER_CONSUMER_KEY && process.env.TWITTER_CONSUMER_SECRET) {
  router.get('/twitter', passport.authenticate('twitter'));
  router.get('/twitter/callback',
    passport.authenticate('twitter', { session: false, failureRedirect: '/login' }),
    authController.googleCallback // Reuse same callback logic
  );
}

module.exports = router;
