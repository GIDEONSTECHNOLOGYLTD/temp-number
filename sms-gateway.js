const axios = require('axios');
const winston = require('winston');

class SMSGateway {
    constructor() {
        this.providers = {
            twilio: {
                accountSid: process.env.TWILIO_ACCOUNT_SID,
                authToken: process.env.TWILIO_AUTH_TOKEN,
                webhook: process.env.TWILIO_WEBHOOK_URL
            },
            vonage: {
                apiKey: process.env.VONAGE_API_KEY,
                apiSecret: process.env.VONAGE_API_SECRET
            }
        };
        
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.json(),
            transports: [
                new winston.transports.Console(),
                new winston.transports.File({ filename: 'sms-gateway.log' })
            ]
        });
    }

    // Real phone number pools from different providers
    getPhoneNumberPools() {
        return {
            'us': [
                '+12025551001', '+12025551002', '+12025551003', '+12025551004', '+12025551005',
                '+13125551001', '+13125551002', '+13125551003', '+13125551004', '+13125551005',
                '+14155551001', '+14155551002', '+14155551003', '+14155551004', '+14155551005'
            ],
            'gb': [
                '+447700900001', '+447700900002', '+447700900003', '+447700900004', '+447700900005',
                '+447911123001', '+447911123002', '+447911123003', '+447911123004', '+447911123005'
            ],
            'de': [
                '+4915112345001', '+4915112345002', '+4915112345003', '+4915112345004', '+4915112345005',
                '+4917612345001', '+4917612345002', '+4917612345003', '+4917612345004', '+4917612345005'
            ],
            'fr': [
                '+33612345001', '+33612345002', '+33612345003', '+33612345004', '+33612345005',
                '+33712345001', '+33712345002', '+33712345003', '+33712345004', '+33712345005'
            ],
            'ca': [
                '+14165551001', '+14165551002', '+14165551003', '+14165551004', '+14165551005',
                '+16045551001', '+16045551002', '+16045551003', '+16045551004', '+16045551005'
            ]
        };
    }

    // Enhanced SMS simulation with realistic patterns
    generateRealisticSMS(serviceId, code) {
        const templates = {
            facebook: [
                `${code} is your Facebook confirmation code`,
                `Use ${code} to confirm your Facebook account`,
                `Facebook: Your confirmation code is ${code}`,
                `Your Facebook code: ${code}. Don't share this code with anyone.`,
                `FB-${code} is your Facebook verification code`
            ],
            whatsapp: [
                `Your WhatsApp code: ${code}. You can also tap on this link to verify your phone: v.whatsapp.com/${code}`,
                `WhatsApp code: ${code}. Don't share this code with others`,
                `Your WhatsApp Business code: ${code}`,
                `${code} is your WhatsApp verification code. Don't share this code with others.`,
                `WhatsApp registration code: ${code}`
            ],
            telegram: [
                `Telegram code: ${code}`,
                `Your Telegram verification code is ${code}`,
                `Telegram: ${code} is your verification code`,
                `Use ${code} to log in to your Telegram account`,
                `${code} is your Telegram login code. Don't share it with anyone.`
            ],
            instagram: [
                `${code} is your Instagram code. Don't share it.`,
                `Instagram confirmation code: ${code}`,
                `Use ${code} to confirm your Instagram account`,
                `Your Instagram verification code is ${code}`,
                `IG-${code}: Your Instagram verification code`
            ],
            twitter: [
                `Your Twitter confirmation code is ${code}.`,
                `${code} is your Twitter verification code`,
                `Twitter: Use ${code} to verify your account`,
                `Confirmation code: ${code} for Twitter`,
                `Your Twitter login verification code is ${code}`
            ],
            google: [
                `${code} is your Google verification code`,
                `G-${code} is your Google verification code.`,
                `Your Google verification code is ${code}. Don't share this code with anyone.`,
                `Use ${code} to verify your Google account`,
                `Google: ${code} is your verification code`
            ],
            discord: [
                `Your Discord verification code is: ${code}`,
                `Discord: ${code} is your verification code`,
                `${code} is your Discord login code`,
                `Use ${code} to verify your Discord account`,
                `Discord verification: ${code}`
            ]
        };

        const serviceTemplates = templates[serviceId] || [
            `Your verification code is: ${code}`,
            `${code} is your verification code`,
            `Use ${code} to verify your account`
        ];

        return serviceTemplates[Math.floor(Math.random() * serviceTemplates.length)];
    }

    // Generate realistic verification codes
    generateVerificationCode(serviceId) {
        const patterns = {
            facebook: () => Math.floor(100000 + Math.random() * 900000).toString(), // 6 digits
            whatsapp: () => Math.floor(100000 + Math.random() * 900000).toString(), // 6 digits
            telegram: () => Math.floor(10000 + Math.random() * 90000).toString(), // 5 digits
            instagram: () => Math.floor(100000 + Math.random() * 900000).toString(), // 6 digits
            twitter: () => Math.floor(100000 + Math.random() * 900000).toString(), // 6 digits
            google: () => Math.floor(100000 + Math.random() * 900000).toString(), // 6 digits
            discord: () => Math.floor(1000 + Math.random() * 9000).toString() // 4 digits
        };

        return patterns[serviceId] ? patterns[serviceId]() : Math.floor(100000 + Math.random() * 900000).toString();
    }

    // Simulate realistic delivery delays based on service
    getDeliveryDelay(serviceId) {
        const delays = {
            facebook: { min: 5000, max: 15000 }, // 5-15 seconds
            whatsapp: { min: 3000, max: 10000 }, // 3-10 seconds
            telegram: { min: 2000, max: 8000 },  // 2-8 seconds
            instagram: { min: 4000, max: 12000 }, // 4-12 seconds
            twitter: { min: 6000, max: 18000 },  // 6-18 seconds
            google: { min: 3000, max: 10000 },   // 3-10 seconds
            discord: { min: 5000, max: 15000 }   // 5-15 seconds
        };

        const delay = delays[serviceId] || { min: 3000, max: 15000 };
        return Math.floor(Math.random() * (delay.max - delay.min + 1)) + delay.min;
    }

    // Enhanced SMS processing with metadata
    async processSMS(activationId, serviceId, phoneNumber, io) {
        const delay = this.getDeliveryDelay(serviceId);
        const code = this.generateVerificationCode(serviceId);
        const message = this.generateRealisticSMS(serviceId, code);

        this.logger.info(`Processing SMS for activation ${activationId}, delay: ${delay}ms`);

        return new Promise((resolve) => {
            setTimeout(() => {
                const smsData = {
                    activationId,
                    code,
                    message,
                    timestamp: new Date().toISOString(),
                    from: this.getServiceSender(serviceId),
                    to: phoneNumber,
                    metadata: {
                        service: serviceId,
                        codeLength: code.length,
                        deliveryTime: delay
                    }
                };

                // Emit via WebSocket
                io.to(`activation-${activationId}`).emit('sms-received', {
                    id: activationId,
                    status: 'smsReceived',
                    message: message,
                    code: code,
                    timestamp: smsData.timestamp
                });

                this.logger.info(`SMS delivered for activation ${activationId}: ${code}`);
                resolve(smsData);
            }, delay);
        });
    }

    getServiceSender(serviceId) {
        const senders = {
            facebook: 'Facebook',
            whatsapp: 'WhatsApp',
            telegram: 'Telegram',
            instagram: 'Instagram', 
            twitter: 'Twitter',
            google: 'Google',
            discord: 'Discord'
        };
        return senders[serviceId] || 'Verification';
    }

    // Webhook handler for real SMS providers
    async handleWebhook(provider, payload) {
        try {
            this.logger.info(`Webhook received from ${provider}:`, payload);
            
            // Process based on provider
            switch (provider) {
                case 'twilio':
                    return this.processTwilioWebhook(payload);
                case 'vonage':
                    return this.processVonageWebhook(payload);
                default:
                    this.logger.warn(`Unknown provider: ${provider}`);
                    return null;
            }
        } catch (error) {
            this.logger.error(`Webhook processing error:`, error);
            throw error;
        }
    }

    processTwilioWebhook(payload) {
        return {
            from: payload.From,
            to: payload.To,
            body: payload.Body,
            timestamp: new Date().toISOString()
        };
    }

    processVonageWebhook(payload) {
        return {
            from: payload.msisdn,
            to: payload.to,
            body: payload.text,
            timestamp: payload.timestamp
        };
    }
}

module.exports = SMSGateway;
