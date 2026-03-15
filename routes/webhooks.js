const express = require('express');
const SMSGateway = require('../sms-gateway');
const Database = require('../database');

const router = express.Router();
const db = new Database();
const smsGateway = new SMSGateway();

// Twilio webhook endpoint
router.post('/twilio', async (req, res) => {
  try {
    const smsData = smsGateway.processTwilioWebhook(req.body);
    
    // Find activation by phone number
    const phoneNumbers = await db.getPhoneNumbers();
    const phoneNumber = phoneNumbers.find(p => p.number === smsData.to);
    
    if (phoneNumber) {
      // Find active activation for this number
      const activation = await db.getActiveActivationByPhone(phoneNumber.id);
      
      if (activation) {
        // Extract verification code from message
        const codeMatch = smsData.body.match(/\b\d{4,8}\b/);
        const code = codeMatch ? codeMatch[0] : null;
        
        await db.updateActivationStatus(activation.id, 'smsReceived', smsData.body, code);
        
        // Emit via WebSocket
        req.io.to(`activation-${activation.id}`).emit('sms-received', {
          id: activation.id,
          status: 'smsReceived',
          message: smsData.body,
          code: code
        });
        
        req.logger.info(`Real SMS processed for activation ${activation.id}`);

        // Broadcast to all clients for the public feed
        req.io.emit('public-sms', {
          from: smsData.from,
          to: smsData.to,
          message: smsData.body,
          service: activation.service_name, // Assuming service name is on activation
          country_code: phoneNumber.country_code,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    req.logger.error('Twilio webhook error:', error);
    res.status(500).send('Error');
  }
});

// Vonage webhook endpoint
router.post('/vonage', async (req, res) => {
  try {
    const smsData = smsGateway.processVonageWebhook(req.body);
    
    // Similar processing as Twilio
    const phoneNumbers = await db.getPhoneNumbers();
    const phoneNumber = phoneNumbers.find(p => p.number === smsData.to);
    
    if (phoneNumber) {
      const activation = await db.getActiveActivationByPhone(phoneNumber.id);
      
      if (activation) {
        const codeMatch = smsData.body.match(/\b\d{4,8}\b/);
        const code = codeMatch ? codeMatch[0] : null;
        
        await db.updateActivationStatus(activation.id, 'smsReceived', smsData.body, code);
        
        req.io.to(`activation-${activation.id}`).emit('sms-received', {
          id: activation.id,
          status: 'smsReceived',
          message: smsData.body,
          code: code
        });
        
        req.logger.info(`Real SMS processed for activation ${activation.id}`);

        // Broadcast to all clients for the public feed
        req.io.emit('public-sms', {
          from: smsData.from,
          to: smsData.to,
          message: smsData.body,
          service: activation.service_name, // Assuming service name is on activation
          country_code: phoneNumber.country_code,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    req.logger.error('Vonage webhook error:', error);
    res.status(500).send('Error');
  }
});

module.exports = router;
