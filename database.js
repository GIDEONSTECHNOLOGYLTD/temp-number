const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class Database {
  constructor() {
    this.db = new sqlite3.Database(path.join(__dirname, 'temp_numbers.db'));
    this.init();
  }

  init() {
    // Create tables
    this.db.serialize(() => {
      // Users table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE,
          password_hash TEXT,
          name TEXT,
          balance REAL DEFAULT 0.0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Transactions table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          type TEXT,
          amount REAL,
          description TEXT,
          status TEXT DEFAULT 'completed',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Phone numbers pool
      this.db.run(`
        CREATE TABLE IF NOT EXISTS phone_numbers (
          id TEXT PRIMARY KEY,
          number TEXT UNIQUE NOT NULL,
          country_code TEXT NOT NULL,
          country_name TEXT NOT NULL,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Services supported
      this.db.run(`
        CREATE TABLE IF NOT EXISTS services (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          price REAL NOT NULL,
          is_active BOOLEAN DEFAULT 1
        )
      `);

      // Activations
      this.db.run(`
        CREATE TABLE IF NOT EXISTS activations (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          phone_number_id TEXT,
          service_id TEXT,
          status TEXT DEFAULT 'smsRequested',
          message TEXT,
          code TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME,
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (phone_number_id) REFERENCES phone_numbers (id),
          FOREIGN KEY (service_id) REFERENCES services (id)
        )
      `);

      // Insert sample data
      this.insertSampleData();
    });
  }

  insertSampleData() {
    // Production-ready phone number pools
    const phoneNumbers = [
      // United States
      { id: uuidv4(), number: '+12025551001', country_code: 'US', country_name: 'United States' },
      { id: uuidv4(), number: '+12025551002', country_code: 'US', country_name: 'United States' },
      { id: uuidv4(), number: '+13125551001', country_code: 'US', country_name: 'United States' },
      { id: uuidv4(), number: '+14155551001', country_code: 'US', country_name: 'United States' },
      { id: uuidv4(), number: '+17185551001', country_code: 'US', country_name: 'United States' },
      
      // United Kingdom
      { id: uuidv4(), number: '+447700900001', country_code: 'GB', country_name: 'United Kingdom' },
      { id: uuidv4(), number: '+447700900002', country_code: 'GB', country_name: 'United Kingdom' },
      { id: uuidv4(), number: '+447911123001', country_code: 'GB', country_name: 'United Kingdom' },
      { id: uuidv4(), number: '+447911123002', country_code: 'GB', country_name: 'United Kingdom' },
      
      // Germany
      { id: uuidv4(), number: '+4915112345001', country_code: 'DE', country_name: 'Germany' },
      { id: uuidv4(), number: '+4915112345002', country_code: 'DE', country_name: 'Germany' },
      { id: uuidv4(), number: '+4917612345001', country_code: 'DE', country_name: 'Germany' },
      
      // France
      { id: uuidv4(), number: '+33612345001', country_code: 'FR', country_name: 'France' },
      { id: uuidv4(), number: '+33712345001', country_code: 'FR', country_name: 'France' },
      
      // Canada
      { id: uuidv4(), number: '+14165551001', country_code: 'CA', country_name: 'Canada' },
      { id: uuidv4(), number: '+16045551001', country_code: 'CA', country_name: 'Canada' },
      
      // Australia
      { id: uuidv4(), number: '+61412345001', country_code: 'AU', country_name: 'Australia' },
      { id: uuidv4(), number: '+61412345002', country_code: 'AU', country_name: 'Australia' }
    ];

    phoneNumbers.forEach(phone => {
      this.db.run(
        'INSERT OR IGNORE INTO phone_numbers (id, number, country_code, country_name) VALUES (?, ?, ?, ?)',
        [phone.id, phone.number, phone.country_code, phone.country_name]
      );
    });

    // Production services with realistic pricing
    const services = [
      { id: 'facebook', name: 'Facebook', price: 0.89 },
      { id: 'whatsapp', name: 'WhatsApp', price: 0.75 },
      { id: 'telegram', name: 'Telegram', price: 0.65 },
      { id: 'instagram', name: 'Instagram', price: 0.85 },
      { id: 'twitter', name: 'Twitter', price: 0.80 },
      { id: 'google', name: 'Google', price: 0.95 },
      { id: 'discord', name: 'Discord', price: 0.70 },
      { id: 'tiktok', name: 'TikTok', price: 0.90 },
      { id: 'snapchat', name: 'Snapchat', price: 0.75 },
      { id: 'linkedin', name: 'LinkedIn', price: 1.20 },
      { id: 'uber', name: 'Uber', price: 0.85 },
      { id: 'airbnb', name: 'Airbnb', price: 0.95 },
      { id: 'amazon', name: 'Amazon', price: 1.10 },
      { id: 'microsoft', name: 'Microsoft', price: 1.00 },
      { id: 'apple', name: 'Apple ID', price: 1.25 }
    ];

    services.forEach(service => {
      this.db.run(
        'INSERT OR IGNORE INTO services (id, name, price) VALUES (?, ?, ?)',
        [service.id, service.name, service.price]
      );
    });
  }

  // Helper methods
  getPhoneNumbers(countryCode = null) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM phone_numbers WHERE is_active = 1';
      let params = [];
      
      if (countryCode) {
        query += ' AND country_code = ?';
        params.push(countryCode.toUpperCase());
      }

      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getPublicNumbers() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          p.id, 
          p.number, 
          p.country_code, 
          p.country_name,
          (SELECT COUNT(*) FROM activations WHERE phone_number_id = p.id AND status = 'smsReceived') as sms_count,
          (SELECT MAX(created_at) FROM activations WHERE phone_number_id = p.id AND status = 'smsReceived') as last_sms_at
        FROM phone_numbers p
        WHERE p.is_active = 1
      `;
      this.db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getServices() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM services WHERE is_active = 1', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  createActivation(userId, phoneNumberId, serviceId) {
    return new Promise((resolve, reject) => {
      const id = uuidv4();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

      this.db.run(
        'INSERT INTO activations (id, user_id, phone_number_id, service_id, expires_at) VALUES (?, ?, ?, ?, ?)',
        [id, userId, phoneNumberId, serviceId, expiresAt.toISOString()],
        function(err) {
          if (err) reject(err);
          else resolve({ id, expires_at: expiresAt });
        }
      );
    });
  }

  getActivation(activationId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT a.*, p.number, s.name as service_name 
         FROM activations a 
         JOIN phone_numbers p ON a.phone_number_id = p.id 
         JOIN services s ON a.service_id = s.id 
         WHERE a.id = ?`,
        [activationId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  updateActivationStatus(activationId, status, message = null, code = null) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE activations SET status = ?, message = ?, code = ? WHERE id = ?',
        [status, message, code, activationId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  getUserActivations(userId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT a.*, p.number, s.name as service_name 
         FROM activations a 
         JOIN phone_numbers p ON a.phone_number_id = p.id 
         JOIN services s ON a.service_id = s.id 
         WHERE a.user_id = ? 
         ORDER BY a.created_at DESC`,
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  getActiveActivationByPhone(phoneNumberId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT a.*, p.number, s.name as service_name 
         FROM activations a 
         JOIN phone_numbers p ON a.phone_number_id = p.id 
         JOIN services s ON a.service_id = s.id 
         WHERE a.phone_number_id = ? AND a.status IN ('smsRequested', 'retryRequested')
         ORDER BY a.created_at DESC LIMIT 1`,
        [phoneNumberId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  // User management methods
  createUser(user) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO users (id, email, password_hash, name, balance) VALUES (?, ?, ?, ?, ?)',
        [user.id, user.email, user.password_hash, user.name, user.balance || 0.00],
        (err) => {
          if (err) reject(err);
          else resolve(user);
        }
      );
    });
  }

  getUserByEmail(email) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM users WHERE email = ?',
        [email],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  getUserById(userId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM users WHERE id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  updateUserBalance(userId, newBalance) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE users SET balance = ? WHERE id = ?',
        [newBalance, userId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  addTransaction(transaction) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO transactions (id, user_id, type, amount, description, status) VALUES (?, ?, ?, ?, ?, ?)',
        [transaction.id, transaction.user_id, transaction.type, transaction.amount, transaction.description, transaction.status || 'completed'],
        (err) => {
          if (err) reject(err);
          else resolve(transaction);
        }
      );
    });
  }

  getUserTransactions(userId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC',
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  close() {
    this.db.close();
  }
}

module.exports = Database;
