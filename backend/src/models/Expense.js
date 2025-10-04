const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  amount: {
    value: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      required: true
    }
  },
  convertedAmount: {
    value: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      required: true
    }
  },
  category: {
    type: String,
    required: true,
    enum: ['travel', 'food', 'accommodation', 'transportation', 'office_supplies', 'entertainment', 'other']
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  expenseDate: {
    type: Date,
    required: true
  },
  receipt: {
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimeType: String
  },
  ocrData: {
    extractedText: String,
    confidence: Number,
    autoFilled: Boolean
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'in_review'],
    default: 'pending'
  },
  approvals: [{
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected']
    },
    comments: String,
    approvedAt: Date,
    sequence: Number
  }],
  currentApprovalLevel: {
    type: Number,
    default: 0
  },
  finalApprover: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  rejectedAt: Date,
  rejectionReason: String
}, {
  timestamps: true
});

// Index for efficient queries
expenseSchema.index({ employee: 1, status: 1 });
expenseSchema.index({ company: 1, status: 1 });
expenseSchema.index({ 'approvals.approver': 1, 'approvals.status': 1 });

module.exports = mongoose.model('Expense', expenseSchema);