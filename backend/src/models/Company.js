const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  country: {
    type: String,
    required: true
  },
  currency: {
    code: {
      type: String,
      required: true
    },
    symbol: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    }
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  settings: {
    requireManagerApproval: {
      type: Boolean,
      default: true
    },
    maxExpenseAmount: {
      type: Number,
      default: 10000
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Company', companySchema);