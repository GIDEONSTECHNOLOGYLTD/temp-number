const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const activationSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  user_id: { type: String, ref: 'User', required: true },
  phone_number_id: { type: String, ref: 'PhoneNumber', required: true },
  service_id: { type: String, ref: 'Service', required: true },
  status: { type: String, default: 'smsRequested' },
  message: { type: String, default: null },
  code: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
  expires_at: { type: Date }
}, { _id: false, versionKey: false });

activationSchema.index({ user_id: 1, created_at: -1 });
activationSchema.index({ phone_number_id: 1, status: 1 });
activationSchema.index({ status: 1 });

module.exports = mongoose.model('Activation', activationSchema);
