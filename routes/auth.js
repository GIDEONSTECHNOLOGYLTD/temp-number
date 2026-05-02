const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../config/email');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SALT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_DAYS = 30;

function signAccessToken(user) {
  return jwt.sign(
    { userId: user._id || user.id, email: user.email, isAdmin: user.isAdmin || false },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

async function issueRefreshToken(userId) {
  const token = uuidv4();
  const expires_at = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
  await RefreshToken.create({ user_id: userId, token, expires_at });
  return token;
}

// ── Register ─────────────────────────────────────────────────────────────────
router.post('/register', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').trim().notEmpty().withMessage('Name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { email, password, name } = req.body;
    if (await User.findOne({ email })) return res.status(409).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const userId = uuidv4();

    await User.create({ _id: userId, email, password_hash, name, balance: 0, verificationToken });

    try { await sendVerificationEmail(email, name, verificationToken); } catch (_) { /* non-fatal */ }

    const accessToken = signAccessToken({ _id: userId, email, isAdmin: false });
    const refreshToken = await issueRefreshToken(userId);

    res.status(201).json({
      accessToken,
      refreshToken,
      user: { id: userId, email, name, balance: 0, isVerified: false }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ── Login ─────────────────────────────────────────────────────────────────────
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { email, password } = req.body;
    const user = await User.findOne({ email }).lean();
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.isBanned) return res.status(403).json({ error: 'Account suspended. Contact support.' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const accessToken = signAccessToken(user);
    const refreshToken = await issueRefreshToken(user._id);

    res.json({
      accessToken,
      refreshToken,
      user: { id: user._id, email: user.email, name: user.name, balance: user.balance, isAdmin: user.isAdmin, isVerified: user.isVerified }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── Refresh Access Token ──────────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

    const stored = await RefreshToken.findOne({ token: refreshToken }).lean();
    if (!stored || new Date() > stored.expires_at) {
      return res.status(401).json({ error: 'Refresh token invalid or expired' });
    }

    const user = await User.findById(stored.user_id).lean();
    if (!user || user.isBanned) return res.status(403).json({ error: 'Account not accessible' });

    const accessToken = signAccessToken(user);
    res.json({ accessToken });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// ── Logout (revoke refresh token) ─────────────────────────────────────────────
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await RefreshToken.deleteOne({ token: refreshToken });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// ── Verify Email ──────────────────────────────────────────────────────────────
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token required' });

    const user = await User.findOne({ verificationToken: token });
    if (!user) return res.status(400).json({ error: 'Invalid or expired verification link' });

    user.isVerified = true;
    user.verificationToken = null;
    await user.save();

    res.redirect('/?verified=1');
  } catch (error) {
    res.status(500).json({ error: 'Email verification failed' });
  }
});

// ── Forgot Password ───────────────────────────────────────────────────────────
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required')
], async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: true }); // don't reveal existence

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    try { await sendPasswordResetEmail(email, user.name, resetToken); } catch (_) { /* non-fatal */ }
    res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (error) {
    res.status(500).json({ error: 'Request failed' });
  }
});

// ── Reset Password ────────────────────────────────────────────────────────────
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Token required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { token, password } = req.body;
    const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: new Date() } });
    if (!user) return res.status(400).json({ error: 'Reset link is invalid or has expired' });

    user.password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    await RefreshToken.deleteMany({ user_id: user._id });
    res.json({ success: true, message: 'Password updated. Please log in.' });
  } catch (error) {
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// ── Get current user ──────────────────────────────────────────────────────────
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user._id, email: user.email, name: user.name, balance: user.balance, isAdmin: user.isAdmin, isVerified: user.isVerified, created_at: user.created_at });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// ── Middleware ─────────────────────────────────────────────────────────────────
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    req.isAdmin = decoded.isAdmin || false;
    next();
  });
}

module.exports = { router, authenticateToken };
