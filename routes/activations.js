const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const Database = require('../database');
const SMSGateway = require('../sms-gateway');
const { authenticateToken } = require('./auth');

const router = express.Router();
const db = new Database();
const smsGateway = new SMSGateway();

// Request new activation (requires authentication)
router.post('/', authenticateToken, [
  body('serviceId').notEmpty().withMessage('Service ID is required'),
  body('countryId').isLength({ min: 2, max: 2 }).withMessage('Country ID must be 2 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { serviceId, countryId } = req.body;
    const userId = req.userId;
    const io = req.io;
    const logger = req.logger;

    logger.info(`New activation request: ${serviceId} for ${countryId} by user ${userId}`);

    // Get user and check balance
    const user = await db.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get service price
    const services = await db.getServices();
    const service = services.find(s => s.id === serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Check if user has sufficient balance
    if (user.balance < service.price) {
      return res.status(402).json({ 
        error: 'Insufficient balance',
        required: service.price,
        current: user.balance
      });
    }

    // Get available phone numbers for the country
    const phoneNumbers = await db.getPhoneNumbers(countryId);
    if (phoneNumbers.length === 0) {
      return res.status(404).json({ error: 'No available numbers for this country' });
    }

    // Select a random available number
    const selectedNumber = phoneNumbers[Math.floor(Math.random() * phoneNumbers.length)];

    // Deduct balance
    const newBalance = user.balance - service.price;
    await db.updateUserBalance(userId, newBalance);

    // Record transaction
    await db.addTransaction({
      id: uuidv4(),
      user_id: userId,
      type: 'purchase',
      amount: -service.price,
      description: `Purchased ${service.name} number`,
      status: 'completed'
    });

    // Create activation
    const activation = await db.createActivation(userId, selectedNumber.id, serviceId);

    logger.info(`Activation created: ${activation.id} with number ${selectedNumber.number} for user ${userId}`);

    // Process SMS using enhanced gateway
    smsGateway.processSMS(activation.id, serviceId, selectedNumber.number, io).then(async (smsData) => {
      await db.updateActivationStatus(activation.id, 'smsReceived', smsData.message, smsData.code);
      logger.info(`SMS delivered for activation ${activation.id}: ${smsData.code}`);
    }).catch(error => {
      logger.error(`SMS processing failed for activation ${activation.id}:`, error);
    });

    res.json({
      id: activation.id,
      number: selectedNumber.number,
      status: 'smsRequested',
      expires_at: activation.expires_at,
      remaining_balance: newBalance
    });

  } catch (error) {
    req.logger.error('Error creating activation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get activation data
router.get('/:activationId', authenticateToken, async (req, res) => {
  try {
    const { activationId } = req.params;
    const userId = req.userId;
    
    const activation = await db.getActivation(activationId);
    if (!activation) {
      return res.status(404).json({ error: 'Activation not found' });
    }

    // Verify user owns this activation
    if (activation.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if activation has expired
    const now = new Date();
    const expiresAt = new Date(activation.expires_at);
    
    if (now > expiresAt && activation.status !== 'smsReceived') {
      await db.updateActivationStatus(activationId, 'expired');
      activation.status = 'expired';
    }

    res.json({
      id: activation.id,
      status: activation.status,
      message: activation.message,
      code: activation.code,
      number: activation.number,
      service: activation.service_name,
      created_at: activation.created_at,
      expires_at: activation.expires_at
    });

  } catch (error) {
    console.error('Error getting activation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Retry activation with new SMS
router.post('/:activationId/retry', authenticateToken, async (req, res) => {
  try {
    const { activationId } = req.params;
    const userId = req.userId;
    
    const activation = await db.getActivation(activationId);
    if (!activation) {
      return res.status(404).json({ error: 'Activation not found' });
    }

    // Verify user owns this activation
    if (activation.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update status to retry requested
    await db.updateActivationStatus(activationId, 'retryRequested');

    // Simulate new SMS after delay
    setTimeout(async () => {
      const codes = ['2468', '1357', '9753', '8642', '1928'];
      const randomCode = codes[Math.floor(Math.random() * codes.length)];
      const message = `Your new verification code is: ${randomCode}`;
      
      await db.updateActivationStatus(activationId, 'smsReceived', message, randomCode);
    }, Math.random() * 15000 + 5000);

    res.json({
      id: activationId,
      status: 'retryRequested',
      message: 'New SMS requested'
    });

  } catch (error) {
    console.error('Error retrying activation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get activations history
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const activations = await db.getUserActivations(userId);

    res.json(activations.map(activation => ({
      id: activation.id,
      status: activation.status,
      message: activation.message,
      code: activation.code,
      number: activation.number,
      service: activation.service_name,
      created_at: activation.created_at,
      expires_at: activation.expires_at
    })));

  } catch (error) {
    console.error('Error getting activations history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
