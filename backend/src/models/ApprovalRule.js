const mongoose = require('mongoose');

const approvalRuleSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  conditions: {
    minAmount: {
      type: Number,
      default: 0
    },
    maxAmount: {
      type: Number,
      default: Number.MAX_SAFE_INTEGER
    },
    categories: [{
      type: String
    }],
    departments: [{
      type: String
    }]
  },
  approvers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sequence: {
      type: Number,
      required: true
    },
    isRequired: {
      type: Boolean,
      default: true
    }
  }],
  rules: {
    type: {
      type: String,
      enum: ['sequential', 'percentage', 'specific_approver', 'hybrid'],
      default: 'sequential'
    },
    percentageRequired: {
      type: Number,
      min: 1,
      max: 100
    },
    specificApprovers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    requireManagerApproval: {
      type: Boolean,
      default: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ApprovalRule', approvalRuleSchema);