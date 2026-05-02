const { v4: uuidv4 } = require('uuid');
const User = require('./models/User');
const Transaction = require('./models/Transaction');
const PhoneNumber = require('./models/PhoneNumber');
const Service = require('./models/Service');
const Activation = require('./models/Activation');

class Database {
  constructor() {
    // MongoDB connection is managed externally via config/db.js
  }

  // Seed default phone numbers and services (idempotent via upsert)
  async init() {
    const phoneNumbers = [
      { number: '+12025551001', country_code: 'US', country_name: 'United States' },
      { number: '+12025551002', country_code: 'US', country_name: 'United States' },
      { number: '+13125551001', country_code: 'US', country_name: 'United States' },
      { number: '+14155551001', country_code: 'US', country_name: 'United States' },
      { number: '+17185551001', country_code: 'US', country_name: 'United States' },
      { number: '+447700900001', country_code: 'GB', country_name: 'United Kingdom' },
      { number: '+447700900002', country_code: 'GB', country_name: 'United Kingdom' },
      { number: '+447911123001', country_code: 'GB', country_name: 'United Kingdom' },
      { number: '+447911123002', country_code: 'GB', country_name: 'United Kingdom' },
      { number: '+4915112345001', country_code: 'DE', country_name: 'Germany' },
      { number: '+4915112345002', country_code: 'DE', country_name: 'Germany' },
      { number: '+4917612345001', country_code: 'DE', country_name: 'Germany' },
      { number: '+33612345001', country_code: 'FR', country_name: 'France' },
      { number: '+33712345001', country_code: 'FR', country_name: 'France' },
      { number: '+14165551001', country_code: 'CA', country_name: 'Canada' },
      { number: '+16045551001', country_code: 'CA', country_name: 'Canada' },
      { number: '+61412345001', country_code: 'AU', country_name: 'Australia' },
      { number: '+61412345002', country_code: 'AU', country_name: 'Australia' }
    ];

    for (const phone of phoneNumbers) {
      await PhoneNumber.updateOne(
        { number: phone.number },
        { $setOnInsert: { _id: uuidv4(), ...phone } },
        { upsert: true }
      );
    }

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

    for (const service of services) {
      await Service.updateOne(
        { _id: service.id },
        { $setOnInsert: { _id: service.id, name: service.name, price: service.price } },
        { upsert: true }
      );
    }
  }

  // ─── Phone Numbers ───────────────────────────────────────────────────────────

  async getPhoneNumbers(countryCode = null) {
    const filter = { is_active: true };
    if (countryCode) filter.country_code = countryCode.toUpperCase();
    const docs = await PhoneNumber.find(filter).lean();
    return docs.map(d => ({ ...d, id: d._id }));
  }

  async getPublicNumbers() {
    const results = await PhoneNumber.aggregate([
      { $match: { is_active: true } },
      {
        $lookup: {
          from: 'activations',
          let: { phoneId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$phone_number_id', '$$phoneId'] },
                    { $eq: ['$status', 'smsReceived'] }
                  ]
                }
              }
            }
          ],
          as: 'received'
        }
      },
      {
        $project: {
          _id: 0,
          id: '$_id',
          number: 1,
          country_code: 1,
          country_name: 1,
          sms_count: { $size: '$received' },
          last_sms_at: { $max: '$received.created_at' }
        }
      }
    ]);
    return results;
  }

  // ─── Services ────────────────────────────────────────────────────────────────

  async getServices() {
    const docs = await Service.find({ is_active: true }).lean();
    return docs.map(d => ({ ...d, id: d._id }));
  }

  // ─── Activations ─────────────────────────────────────────────────────────────

  async createActivation(userId, phoneNumberId, serviceId) {
    const id = uuidv4();
    const expires_at = new Date(Date.now() + 10 * 60 * 1000);
    await Activation.create({ _id: id, user_id: userId, phone_number_id: phoneNumberId, service_id: serviceId, expires_at });
    return { id, expires_at };
  }

  async getActivation(activationId) {
    const doc = await Activation.findById(activationId)
      .populate('phone_number_id', 'number')
      .populate('service_id', 'name')
      .lean();
    if (!doc) return null;
    return {
      ...doc,
      id: doc._id,
      number: doc.phone_number_id?.number,
      service_name: doc.service_id?.name,
      phone_number_id: doc.phone_number_id?._id,
      service_id: doc.service_id?._id
    };
  }

  async updateActivationStatus(activationId, status, message = null, code = null) {
    const result = await Activation.updateOne({ _id: activationId }, { $set: { status, message, code } });
    return result.modifiedCount;
  }

  async getUserActivations(userId) {
    const docs = await Activation.find({ user_id: userId })
      .populate('phone_number_id', 'number')
      .populate('service_id', 'name')
      .sort({ created_at: -1 })
      .lean();
    return docs.map(d => ({
      ...d,
      id: d._id,
      number: d.phone_number_id?.number,
      service_name: d.service_id?.name,
      phone_number_id: d.phone_number_id?._id,
      service_id: d.service_id?._id
    }));
  }

  async getActiveActivationByPhone(phoneNumberId) {
    const doc = await Activation.findOne({
      phone_number_id: phoneNumberId,
      status: { $in: ['smsRequested', 'retryRequested'] }
    })
      .populate('phone_number_id', 'number')
      .populate('service_id', 'name')
      .sort({ created_at: -1 })
      .lean();
    if (!doc) return null;
    return {
      ...doc,
      id: doc._id,
      number: doc.phone_number_id?.number,
      service_name: doc.service_id?.name,
      phone_number_id: doc.phone_number_id?._id,
      service_id: doc.service_id?._id
    };
  }

  // ─── Users ───────────────────────────────────────────────────────────────────

  async createUser(user) {
    await User.create({ _id: user.id, email: user.email, password_hash: user.password_hash, name: user.name, balance: user.balance || 0 });
    return user;
  }

  async getUserByEmail(email) {
    const doc = await User.findOne({ email: email.toLowerCase() }).lean();
    if (!doc) return null;
    return { ...doc, id: doc._id };
  }

  async getUserById(userId) {
    const doc = await User.findById(userId).lean();
    if (!doc) return null;
    return { ...doc, id: doc._id };
  }

  async updateUserBalance(userId, newBalance) {
    const result = await User.updateOne({ _id: userId }, { $set: { balance: newBalance } });
    return result.modifiedCount;
  }

  // ─── Transactions ─────────────────────────────────────────────────────────────

  async addTransaction(transaction) {
    await Transaction.create({
      _id: transaction.id,
      user_id: transaction.user_id,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      status: transaction.status || 'completed'
    });
    return transaction;
  }

  async getUserTransactions(userId) {
    const docs = await Transaction.find({ user_id: userId }).sort({ created_at: -1 }).lean();
    return docs.map(d => ({ ...d, id: d._id }));
  }

  close() {
    // No-op: Mongoose connection is managed globally
  }
}

module.exports = Database;
