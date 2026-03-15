const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Database = require('../database');
const { authenticateToken } = require('./auth');

const router = express.Router();
const db = new Database();

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await db.getUserById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      balance: user.balance,
      created_at: user.created_at
    });
  } catch (error) {
    console.error('Error getting profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user balance
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    const user = await db.getUserById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      balance: user.balance,
      currency: 'USD'
    });
  } catch (error) {
    console.error('Error getting balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get transaction history
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const transactions = await db.getUserTransactions(req.userId);
    res.json(transactions);
  } catch (error) {
    console.error('Error getting transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add funds (simplified - in production integrate with Stripe/PayPal)
router.post('/add-funds', authenticateToken, async (req, res) => {
  try {
    const { amount, paymentMethod } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount required' });
    }

    const user = await db.getUserById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate new balance
    const newBalance = user.balance + parseFloat(amount);

    // Update user balance
    await db.updateUserBalance(req.userId, newBalance);

    // Record transaction
    await db.addTransaction({
      id: uuidv4(),
      user_id: req.userId,
      type: 'deposit',
      amount: parseFloat(amount),
      description: `Added funds via ${paymentMethod || 'manual'}`,
      status: 'completed'
    });

    res.json({
      success: true,
      newBalance,
      amount: parseFloat(amount)
    });

  } catch (error) {
    console.error('Error adding funds:', error);
    res.status(500).json({ error: 'Failed to add funds' });
  }
});

module.exports = router;
