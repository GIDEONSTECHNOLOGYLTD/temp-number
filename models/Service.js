const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  _id: { type: String },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  is_active: { type: Boolean, default: true }
}, { _id: false, versionKey: false });

module.exports = mongoose.model('Service', serviceSchema);
