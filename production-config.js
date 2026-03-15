const config = {
  production: {
    database: {
      type: 'postgresql',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'tempsms_prod',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      ssl: process.env.NODE_ENV === 'production'
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD
    },
    sms: {
      provider: process.env.SMS_PROVIDER || 'twilio',
      twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        webhookUrl: process.env.TWILIO_WEBHOOK_URL
      },
      vonage: {
        apiKey: process.env.VONAGE_API_KEY,
        apiSecret: process.env.VONAGE_API_SECRET
      }
    },
    payment: {
      stripe: {
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
      }
    },
    security: {
      jwtSecret: process.env.JWT_SECRET,
      bcryptRounds: 12,
      rateLimits: {
        api: { windowMs: 15 * 60 * 1000, max: 1000 },
        auth: { windowMs: 15 * 60 * 1000, max: 5 },
        sms: { windowMs: 60 * 1000, max: 10 }
      }
    },
    monitoring: {
      logLevel: 'info',
      enableMetrics: true,
      enableTracing: true
    }
  },
  development: {
    database: {
      type: 'sqlite',
      filename: 'temp_numbers.db'
    },
    sms: {
      provider: 'simulation',
      simulationDelay: { min: 3000, max: 15000 }
    },
    security: {
      jwtSecret: 'dev-secret-key',
      bcryptRounds: 8
    }
  }
};

module.exports = config[process.env.NODE_ENV || 'development'];
