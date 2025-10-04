const Expense = require('../models/Expense');
const User = require('../models/User');
const CurrencyService = require('../services/currencyService');
const OCRService = require('../services/ocrService');
const ApprovalService = require('../services/approvalService');

class ExpenseController {
  // New function to handle real-time OCR
  static async processReceiptForOcr(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No receipt file uploaded' });
      }

      const ocrResult = await OCRService.processReceipt(req.file.path);

      res.status(200).json({
        message: 'Receipt processed successfully',
        ocrData: ocrResult.extractedData,
      });
    } catch (error) {
      console.error('OCR processing error:', error);
      res.status(500).json({ message: 'Failed to process receipt' });
    }
  }

  static async createExpense(req, res) {
    try {
      console.log('Request body:', req.body);
      const { amount, currency, category, description, expenseDate } = req.body;
      const employee = req.user;

      // Validate required fields
      if (!amount || !currency || !category || !description || !expenseDate) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      // Validate amount
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ message: 'Invalid amount' });
      }

      // Convert amount to company currency
      const convertedAmount = await CurrencyService.convertCurrency(
        numAmount,
        currency,
        employee.company.currency.code
      );

      const expense = new Expense({
        employee: employee._id,
        company: employee.company._id,
        amount: {
          value: numAmount,
          currency: currency
        },
        convertedAmount: {
          value: convertedAmount,
          currency: employee.company.currency.code
        },
        category,
        description,
        expenseDate: new Date(expenseDate)
      });

      // Handle receipt upload if present
      if (req.file) {
        expense.receipt = {
          filename: req.file.filename,
          originalName: req.file.originalname,
          path: req.file.path,
          size: req.file.size,
          mimeType: req.file.mimetype
        };

        // Process OCR if receipt is uploaded
        try {
          const ocrResult = await OCRService.processReceipt(req.file.path);
          expense.ocrData = ocrResult;

          // Auto-fill fields if OCR confidence is high
          if (ocrResult.autoFilled && ocrResult.extractedData) {
            if (ocrResult.extractedData.amount && !amount) {
              expense.amount.value = ocrResult.extractedData.amount;
            }
            if (ocrResult.extractedData.date && !expenseDate) {
              expense.expenseDate = ocrResult.extractedData.date;
            }
            if (ocrResult.extractedData.category && !category) {
              expense.category = ocrResult.extractedData.category;
            }
          }
        } catch (ocrError) {
          console.error('OCR processing failed:', ocrError);
          // Continue without OCR if it fails
        }
      }

      // Determine approvers
      const approvers = await ApprovalService.determineApprovers(expense);
      expense.approvals = approvers;

      if (approvers.length > 0) {
        expense.status = 'in_review';
        expense.currentApprovalLevel = approvers[0].sequence;
      } else {
        expense.status = 'approved'; // Auto-approve if no approvers needed
        expense.approvedAt = new Date();
      }

      const savedExpense = await expense.save();

      // Populate fields for response
      await savedExpense.populate([
        { path: 'employee', select: 'firstName lastName email' },
        { path: 'approvals.approver', select: 'firstName lastName email role' }
      ]);

      res.status(201).json({
        message: 'Expense created successfully',
        expense: savedExpense
      });
    } catch (error) {
      console.error('Create expense error:', error);
      res.status(500).json({ message: 'Failed to create expense' });
    }
  }

  static async getExpenses(req, res) {
    try {
      const { status, startDate, endDate, category, page = 1, limit = 10 } = req.query;
      const employee = req.user;

      let query = { employee: employee._id };

      // Apply filters
      if (status) query.status = status;
      if (category) query.category = category;
      if (startDate || endDate) {
        query.expenseDate = {};
        if (startDate) query.expenseDate.$gte = new Date(startDate);
        if (endDate) query.expenseDate.$lte = new Date(endDate);
      }

      const skip = (page - 1) * limit;
      
      const expenses = await Expense.find(query)
        .populate('approvals.approver', 'firstName lastName email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Expense.countDocuments(query);

      res.json({
        expenses,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalExpenses: total,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error('Get expenses error:', error);
      res.status(500).json({ message: 'Failed to fetch expenses' });
    }
  }

  static async getExpenseById(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      let query = { _id: id };

      // Role-based access control
      if (user.role === 'employee') {
        query.employee = user._id;
      } else if (user.role === 'manager') {
        // Managers can see expenses they need to approve or from their team
        query.$or = [
          { 'approvals.approver': user._id },
          { employee: { $in: await this.getTeamMemberIds(user._id) } }
        ];
      }
      // Admins can see all expenses in their company
      else if (user.role === 'admin') {
        query.company = user.company._id;
      }

      const expense = await Expense.findOne(query)
        .populate('employee', 'firstName lastName email department')
        .populate('approvals.approver', 'firstName lastName email role')
        .populate('company', 'name currency');

      if (!expense) {
        return res.status(404).json({ message: 'Expense not found' });
      }

      res.json({ expense });
    } catch (error) {
      console.error('Get expense by ID error:', error);
      res.status(500).json({ message: 'Failed to fetch expense' });
    }
  }

  static async updateExpense(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const user = req.user;

      const expense = await Expense.findOne({
        _id: id,
        employee: user._id,
        status: 'pending'
      });

      if (!expense) {
        return res.status(404).json({ 
          message: 'Expense not found or cannot be updated' 
        });
      }

      // Update allowed fields
      const allowedFields = ['amount', 'currency', 'category', 'description', 'expenseDate'];
      allowedFields.forEach(field => {
        if (updates[field] !== undefined) {
          if (field === 'amount') {
            expense.amount.value = updates[field];
          } else if (field === 'currency') {
            expense.amount.currency = updates[field];
          } else {
            expense[field] = updates[field];
          }
        }
      });

      // Recalculate converted amount if amount or currency changed
      if (updates.amount || updates.currency) {
        const convertedAmount = await CurrencyService.convertCurrency(
          expense.amount.value,
          expense.amount.currency,
          user.company.currency.code
        );
        expense.convertedAmount.value = convertedAmount;
      }

      await expense.save();

      await expense.populate([
        { path: 'employee', select: 'firstName lastName email' },
        { path: 'approvals.approver', select: 'firstName lastName email role' }
      ]);

      res.json({
        message: 'Expense updated successfully',
        expense
      });
    } catch (error) {
      console.error('Update expense error:', error);
      res.status(500).json({ message: 'Failed to update expense' });
    }
  }

  static async deleteExpense(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      const expense = await Expense.findOne({
        _id: id,
        employee: user._id,
        status: 'pending'
      });

      if (!expense) {
        return res.status(404).json({ 
          message: 'Expense not found or cannot be deleted' 
        });
      }

      await Expense.findByIdAndDelete(id);

      res.json({ message: 'Expense deleted successfully' });
    } catch (error) {
      console.error('Delete expense error:', error);
      res.status(500).json({ message: 'Failed to delete expense' });
    }
  }

  static async approveExpense(req, res) {
    try {
      const { id } = req.params;
      const { decision, comments } = req.body;
      const approver = req.user;

      if (!['approved', 'rejected'].includes(decision)) {
        return res.status(400).json({ message: 'Invalid decision' });
      }

      const expense = await ApprovalService.processApproval(
        id,
        approver._id,
        decision,
        comments
      );

      await expense.populate([
        { path: 'employee', select: 'firstName lastName email' },
        { path: 'approvals.approver', select: 'firstName lastName email role' },
        { path: 'finalApprover', select: 'firstName lastName email role' }
      ]);

      res.json({
        message: `Expense ${decision} successfully`,
        expense
      });
    } catch (error) {
      console.error('Approve expense error:', error);
      res.status(500).json({ message: error.message || 'Failed to process approval' });
    }
  }

  static async getPendingApprovals(req, res) {
    try {
      const approver = req.user;
      const { page = 1, limit = 10 } = req.query;

      const skip = (page - 1) * limit;

      const expenses = await Expense.find({
        'approvals.approver': approver._id,
        'approvals.status': 'pending',
        status: { $in: ['pending', 'in_review'] }
      })
        .populate('employee', 'firstName lastName email department')
        .populate('company', 'name currency')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Expense.countDocuments({
        'approvals.approver': approver._id,
        'approvals.status': 'pending',
        status: { $in: ['pending', 'in_review'] }
      });

      res.json({
        expenses,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalExpenses: total,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error('Get pending approvals error:', error);
      res.status(500).json({ message: 'Failed to fetch pending approvals' });
    }
  }

  static async getTeamMemberIds(managerId) {
    try {
      const teamMembers = await User.find({ manager: managerId }).select('_id');
      return teamMembers.map(member => member._id);
    } catch (error) {
      console.error('Error fetching team members:', error);
      return [];
    }
  }
}

module.exports = ExpenseController;