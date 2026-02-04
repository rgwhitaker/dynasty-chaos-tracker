const nodemailer = require('nodemailer');
const db = require('../config/database');

// Create email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Create notification
 */
async function createNotification(userId, dynastyId, type, message) {
  try {
    const result = await db.query(
      `INSERT INTO notifications (user_id, dynasty_id, notification_type, message)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, dynastyId, type, message]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Create notification error:', error);
    throw error;
  }
}

/**
 * Send email notification
 */
async function sendEmail(to, subject, html) {
  try {
    if (!process.env.SMTP_USER) {
      console.log('SMTP not configured, skipping email');
      return null;
    }

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html
    });

    return info;
  } catch (error) {
    console.error('Send email error:', error);
    throw error;
  }
}

/**
 * Send recruiting reminder
 */
async function sendRecruitingReminder(userId, dynastyId, targets) {
  try {
    // Get user email
    const userResult = await db.query('SELECT email FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) return;

    const userEmail = userResult.rows[0].email;

    // Create notification
    const message = `You have ${targets.length} recruiting priorities that need attention`;
    await createNotification(userId, dynastyId, 'recruiting_reminder', message);

    // Send email
    const targetsHtml = targets.map(t => 
      `<li>${t.position}: Need ${t.recommended_recruits} recruits (${t.leaving_count} leaving)</li>`
    ).join('');

    const html = `
      <h2>Dynasty Recruiting Reminder</h2>
      <p>Your dynasty has recruiting needs in the following positions:</p>
      <ul>${targetsHtml}</ul>
      <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dynasties/${dynastyId}/recruiting">View Recruiting Board</a></p>
    `;

    await sendEmail(userEmail, 'Dynasty Recruiting Reminder', html);

  } catch (error) {
    console.error('Send recruiting reminder error:', error);
  }
}

/**
 * Send player departure alert
 */
async function sendDepartureAlert(userId, dynastyId, players) {
  try {
    // Get user email
    const userResult = await db.query('SELECT email FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) return;

    const userEmail = userResult.rows[0].email;

    // Create notification
    const message = `${players.length} players are likely to leave your roster`;
    await createNotification(userId, dynastyId, 'player_departure', message);

    // Send email
    const playersHtml = players.map(p => 
      `<li>${p.first_name} ${p.last_name} - ${p.position} (${p.year}) - ${p.departure_risk}% risk</li>`
    ).join('');

    const html = `
      <h2>Player Departure Alert</h2>
      <p>The following players are likely to leave your dynasty:</p>
      <ul>${playersHtml}</ul>
      <p>Consider recruiting replacements for these positions.</p>
      <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dynasties/${dynastyId}/roster">View Roster</a></p>
    `;

    await sendEmail(userEmail, 'Player Departure Alert', html);

  } catch (error) {
    console.error('Send departure alert error:', error);
  }
}

module.exports = {
  createNotification,
  sendEmail,
  sendRecruitingReminder,
  sendDepartureAlert
};
