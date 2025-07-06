const mongoose = require('mongoose');

const LicenseSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  hwid: { type: String, default: null },
  expiryDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  lastUsed: { type: Date, default: Date.now }
});

module.exports = mongoose.model('License', LicenseSchema);