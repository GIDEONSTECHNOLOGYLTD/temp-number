const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const phoneNumberSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  number: { type: String, unique: true, required: true },
  country_code: { type: String, required: true, uppercase: true },
  country_name: { type: String, required: true },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now }
}, { _id: false, versionKey: false });

module.exports = mongoose.model('PhoneNumber', phoneNumberSchema);
