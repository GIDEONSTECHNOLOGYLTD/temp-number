const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('./auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const router = express.Router();

// ── Paystack ──────────────────────────────────────────────────────────────────

router.post('/paystack/initialize', authenticateToken, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount < 1) return res.status(400).json({ error: 'Minimum deposit is $1' });

    const user = await User.findById(req.userId).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const amountKobo = Math.round(parseFloat(amount) * 100);
    const reference = `TSMS-${uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase()}`;

    const { data } = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: user.email,
        amount: amountKobo,
        reference,
        callback_url: `${process.env.APP_URL || 'http://localhost:3000'}/api/payments/paystack/verify/${reference}`,
        metadata: { userId: req.userId, amountUSD: parseFloat(amount) }
      },
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' } }
    );

    res.json({ authorizationUrl: data.data.authorization_url, reference });
  } catch (error) {
    console.error('Paystack init error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Payment initialization failed' });
  }
});

router.get('/paystack/verify/:reference', async (req, res) => {
  try {
    const { reference } = req.params;
    const { data } = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );

    if (data.data.status !== 'success') return res.redirect('/app/funds?status=failed');

    const { userId, amountUSD } = data.data.metadata;
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { balance: parseFloat(amountUSD) } },
      { new: true }
    );

    await Transaction.create({
      _id: uuidv4(),
      user_id: userId,
      type: 'deposit',
      amount: parseFloat(amountUSD),
      description: `Paystack deposit - ref: ${reference}`,
      status: 'completed'
    });

    res.redirect('/app/funds?status=success');
  } catch (error) {
    console.error('Paystack verify error:', error.response?.data || error.message);
    res.redirect('/app/funds?status=error');
  }
});

router.post('/paystack/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body)).digest('hex');
    if (hash !== req.headers['x-paystack-signature']) return res.status(401).send('Invalid signature');

    const event = req.body;
    if (event.event === 'charge.success') {
      const { userId, amountUSD } = event.data.metadata;
      const reference = event.data.reference;

      const already = await Transaction.findOne({ description: { $regex: reference } });
      if (!already) {
        await User.findByIdAndUpdate(userId, { $inc: { balance: parseFloat(amountUSD) } });
        await Transaction.create({
          _id: uuidv4(),
          user_id: userId,
          type: 'deposit',
          amount: parseFloat(amountUSD),
          description: `Paystack webhook - ref: ${reference}`,
          status: 'completed'
        });
      }
    }
    res.sendStatus(200);
  } catch (error) {
    console.error('Paystack webhook error:', error);
    res.sendStatus(500);
  }
});

// ── Crypto via NOWPayments ────────────────────────────────────────────────────

router.post('/crypto/create', authenticateToken, async (req, res) => {
  try {
    const { amount, currency } = req.body;
    const supportedCurrencies = ['btc', 'eth', 'usdt', 'ltc', 'bnb', 'trx'];

    if (!amount || amount < 1) return res.status(400).json({ error: 'Minimum deposit is $1' });
    if (!supportedCurrencies.includes((currency || '').toLowerCase())) {
      return res.status(400).json({ error: `Supported currencies: ${supportedCurrencies.join(', ')}` });
    }

    const user = await User.findById(req.userId).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { data } = await axios.post(
      'https://api.nowpayments.io/v1/payment',
      {
        price_amount: parseFloat(amount),
        price_currency: 'usd',
        pay_currency: currency.toLowerCase(),
        order_id: `TSMS-${req.userId}-${Date.now()}`,
        order_description: `TempSMS Pro balance top-up for ${user.email}`,
        ipn_callback_url: `${process.env.APP_URL || 'http://localhost:3000'}/api/payments/crypto/webhook`
      },
      { headers: { 'x-api-key': process.env.NOWPAYMENTS_API_KEY, 'Content-Type': 'application/json' } }
    );

    await Transaction.create({
      _id: uuidv4(),
      user_id: req.userId,
      type: 'deposit_pending',
      amount: parseFloat(amount),
      description: `Crypto deposit pending - paymentId: ${data.payment_id} - currency: ${currency.toUpperCase()}`,
      status: 'pending'
    });

    res.json({
      paymentId: data.payment_id,
      payAddress: data.pay_address,
      payAmount: data.pay_amount,
      payCurrency: data.pay_currency,
      priceAmount: data.price_amount,
      priceCurrency: 'USD',
      status: data.payment_status,
      expiresAt: data.expiration_estimate_date
    });
  } catch (error) {
    console.error('NOWPayments create error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Crypto payment creation failed' });
  }
});

router.get('/crypto/status/:paymentId', authenticateToken, async (req, res) => {
  try {
    const { data } = await axios.get(
      `https://api.nowpayments.io/v1/payment/${req.params.paymentId}`,
      { headers: { 'x-api-key': process.env.NOWPAYMENTS_API_KEY } }
    );
    res.json({ paymentId: data.payment_id, status: data.payment_status, payAmount: data.pay_amount, payCurrency: data.pay_currency });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payment status' });
  }
});

router.post('/crypto/webhook', async (req, res) => {
  try {
    const sig = req.headers['x-nowpayments-sig'];
    const sorted = JSON.stringify(req.body, Object.keys(req.body).sort());
    const expected = crypto.createHmac('sha512', process.env.NOWPAYMENTS_IPN_SECRET || '')
      .update(sorted).digest('hex');

    if (process.env.NOWPAYMENTS_IPN_SECRET && sig !== expected) {
      return res.status(401).send('Invalid signature');
    }

    const { payment_status, order_id, price_amount } = req.body;
    if (['finished', 'confirmed'].includes(payment_status)) {
      const userIdMatch = order_id?.match(/TSMS-([^-]+-[^-]+-[^-]+-[^-]+-[^-]+)-\d+/);
      if (userIdMatch) {
        const userId = userIdMatch[1];
        const already = await Transaction.findOne({ description: { $regex: `paymentId: ${req.body.payment_id}` }, status: 'completed' });
        if (!already) {
          await User.findByIdAndUpdate(userId, { $inc: { balance: parseFloat(price_amount) } });
          await Transaction.updateOne(
            { description: { $regex: `paymentId: ${req.body.payment_id}` } },
            { $set: { status: 'completed', description: `Crypto deposit confirmed - paymentId: ${req.body.payment_id}` } }
          );
        }
      }
    }
    res.sendStatus(200);
  } catch (error) {
    console.error('Crypto webhook error:', error);
    res.sendStatus(500);
  }
});

module.exports = router;
