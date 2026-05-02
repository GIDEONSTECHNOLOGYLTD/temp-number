const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('./auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Activation = require('../models/Activation');
const PhoneNumber = require('../models/PhoneNumber');
const Service = require('../models/Service');

const router = express.Router();

function adminAuth(req, res, next) {
  authenticateToken(req, res, () => {
    if (!req.isAdmin) return res.status(403).json({ error: 'Admin access required' });
    next();
  });
}

// ── Stats ─────────────────────────────────────────────────────────────────────
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const [totalUsers, totalActivations, totalNumbers, activeActivations, revenue] = await Promise.all([
      User.countDocuments(),
      Activation.countDocuments(),
      PhoneNumber.countDocuments({ is_active: true }),
      Activation.countDocuments({ status: { $in: ['smsRequested', 'retryRequested'] } }),
      Transaction.aggregate([
        { $match: { type: 'deposit', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const recentActivations = await Activation.find()
      .sort({ created_at: -1 }).limit(10)
      .populate('phone_number_id', 'number country_code')
      .populate('service_id', 'name')
      .populate('user_id', 'email name')
      .lean();

    res.json({
      totalUsers,
      totalActivations,
      totalNumbers,
      activeActivations,
      totalRevenue: revenue[0]?.total || 0,
      recentActivations: recentActivations.map(a => ({
        id: a._id,
        user: a.user_id?.email,
        number: a.phone_number_id?.number,
        service: a.service_id?.name,
        status: a.status,
        created_at: a.created_at
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── Users ─────────────────────────────────────────────────────────────────────
router.get('/users', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';

    const filter = search ? { $or: [{ email: { $regex: search, $options: 'i' } }, { name: { $regex: search, $options: 'i' } }] } : {};
    const [users, total] = await Promise.all([
      User.find(filter).select('-password_hash -verificationToken -resetPasswordToken').sort({ created_at: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      User.countDocuments(filter)
    ]);

    res.json({ users: users.map(u => ({ ...u, id: u._id })), total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.put('/users/:id/ban', adminAuth, async (req, res) => {
  try {
    const { ban } = req.body;
    await User.updateOne({ _id: req.params.id }, { $set: { isBanned: !!ban } });
    res.json({ success: true, isBanned: !!ban });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.put('/users/:id/balance', adminAuth, async (req, res) => {
  try {
    const { balance, reason } = req.body;
    if (balance == null || isNaN(balance)) return res.status(400).json({ error: 'Valid balance required' });

    const user = await User.findByIdAndUpdate(req.params.id, { $set: { balance: parseFloat(balance) } }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });

    await Transaction.create({
      _id: uuidv4(),
      user_id: req.params.id,
      type: 'admin_adjustment',
      amount: parseFloat(balance),
      description: reason || 'Admin balance adjustment',
      status: 'completed'
    });

    res.json({ success: true, newBalance: user.balance });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update balance' });
  }
});

router.put('/users/:id/make-admin', adminAuth, async (req, res) => {
  try {
    await User.updateOne({ _id: req.params.id }, { $set: { isAdmin: true } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// ── Phone Numbers ─────────────────────────────────────────────────────────────
router.get('/numbers', adminAuth, async (req, res) => {
  try {
    const numbers = await PhoneNumber.find().sort({ country_code: 1, number: 1 }).lean();
    res.json(numbers.map(n => ({ ...n, id: n._id })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch numbers' });
  }
});

router.post('/numbers', adminAuth, async (req, res) => {
  try {
    const { number, country_code, country_name } = req.body;
    if (!number || !country_code || !country_name) return res.status(400).json({ error: 'number, country_code, and country_name required' });

    const doc = await PhoneNumber.create({ _id: uuidv4(), number, country_code: country_code.toUpperCase(), country_name });
    res.status(201).json({ ...doc.toObject(), id: doc._id });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'Number already exists' });
    res.status(500).json({ error: 'Failed to add number' });
  }
});

router.put('/numbers/:id', adminAuth, async (req, res) => {
  try {
    const { is_active } = req.body;
    await PhoneNumber.updateOne({ _id: req.params.id }, { $set: { is_active: !!is_active } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update number' });
  }
});

router.delete('/numbers/:id', adminAuth, async (req, res) => {
  try {
    await PhoneNumber.deleteOne({ _id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete number' });
  }
});

// ── Services ──────────────────────────────────────────────────────────────────
router.get('/services', adminAuth, async (req, res) => {
  try {
    const services = await Service.find().sort({ name: 1 }).lean();
    res.json(services.map(s => ({ ...s, id: s._id })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

router.post('/services', adminAuth, async (req, res) => {
  try {
    const { id, name, price } = req.body;
    if (!id || !name || !price) return res.status(400).json({ error: 'id, name, and price required' });
    const doc = await Service.create({ _id: id.toLowerCase(), name, price: parseFloat(price) });
    res.status(201).json({ ...doc.toObject(), id: doc._id });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'Service ID already exists' });
    res.status(500).json({ error: 'Failed to add service' });
  }
});

router.put('/services/:id', adminAuth, async (req, res) => {
  try {
    const { name, price, is_active } = req.body;
    const update = {};
    if (name != null) update.name = name;
    if (price != null) update.price = parseFloat(price);
    if (is_active != null) update.is_active = !!is_active;
    await Service.updateOne({ _id: req.params.id }, { $set: update });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update service' });
  }
});

// ── Activations ───────────────────────────────────────────────────────────────
router.get('/activations', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const statusFilter = req.query.status ? { status: req.query.status } : {};

    const [activations, total] = await Promise.all([
      Activation.find(statusFilter)
        .sort({ created_at: -1 }).skip((page - 1) * limit).limit(limit)
        .populate('phone_number_id', 'number country_code')
        .populate('service_id', 'name price')
        .populate('user_id', 'email name')
        .lean(),
      Activation.countDocuments(statusFilter)
    ]);

    res.json({
      activations: activations.map(a => ({
        id: a._id,
        user: { email: a.user_id?.email, name: a.user_id?.name },
        number: a.phone_number_id?.number,
        country: a.phone_number_id?.country_code,
        service: a.service_id?.name,
        price: a.service_id?.price,
        status: a.status,
        code: a.code,
        message: a.message,
        created_at: a.created_at,
        expires_at: a.expires_at
      })),
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activations' });
  }
});

module.exports = router;
