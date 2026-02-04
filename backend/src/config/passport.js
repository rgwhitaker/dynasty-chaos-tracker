const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs');
const db = require('./database');

// Local Strategy
passport.use(new LocalStrategy(
  { usernameField: 'email' },
  async (email, password, done) => {
    try {
      const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
      const user = result.rows[0];

      if (!user) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      if (!user.password_hash) {
        return done(null, false, { message: 'Please login with Google' });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.OAUTH_CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists
      let result = await db.query('SELECT * FROM users WHERE google_id = $1', [profile.id]);
      let user = result.rows[0];

      if (user) {
        return done(null, user);
      }

      // Check if user exists with same email
      const email = profile.emails[0].value;
      result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
      user = result.rows[0];

      if (user) {
        // Link Google account to existing user
        await db.query(
          'UPDATE users SET google_id = $1, display_name = $2 WHERE id = $3',
          [profile.id, profile.displayName, user.id]
        );
        return done(null, user);
      }

      // Create new user
      result = await db.query(
        'INSERT INTO users (email, google_id, display_name) VALUES ($1, $2, $3) RETURNING *',
        [email, profile.id, profile.displayName]
      );
      user = result.rows[0];

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
  ));
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await db.query('SELECT id, email, display_name FROM users WHERE id = $1', [id]);
    done(null, result.rows[0]);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
