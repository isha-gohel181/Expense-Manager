const User = require('../models/User');
const Company = require('../models/Company');
const Expense = require('../models/Expense');
const ApprovalRule = require('../models/ApprovalRule');

class AdminController {
  static async getDashboardStats(req, res) {
    try {
      const admin = req.user;
      const companyId = admin.company._id;

      // Get current month start and end dates
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const stats = await Promise.all([
        // Total users
        User.countDocuments({ company: companyId, isActive: true }),
        
        // Total expenses this month
        Expense.countDocuments({
          company: companyId,
          createdAt: { $gte: monthStart, $lte: monthEnd }
        }),
        
        // Pending expenses
        Expense.countDocuments({
          company: companyId,
          status: { $in: ['pending', 'in_review'] }
        }),
        
        // Total amount this month (in company currency)
        Expense.aggregate([
          {
            $match: {
              company: companyId,
              createdAt: { $gte: monthStart, $lte: monthEnd },
              status: 'approved'
            }
          },
          {
            $group: {
              _id: null,
              totalAmount: { $sum: '$convertedAmount.value' }
            }
          }
        ])
      ]);

      const [totalUsers, totalExpenses, pendingExpenses, amountResult] = stats;
      const totalAmount = amountResult.length > 0 ? amountResult[0].totalAmount : 0;

      // Get expenses by category for this month
      const expensesByCategory = await Expense.aggregate([
        {
          $match: {
            company: companyId,
            createdAt: { $gte: monthStart, $lte: monthEnd }
          }
        },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            totalAmount: { $sum: '$convertedAmount.value' }
          }
        }
      ]);

      // Get recent expenses
      const recentExpenses = await Expense.find({
        company: companyId
      })
        .populate('employee', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('amount convertedAmount category status createdAt');

      res.json({
        stats: {
          totalUsers,
          totalExpenses,
          pendingExpenses,
          totalAmount,
          currency: admin.company.currency
        },
        expensesByCategory,
        recentExpenses
      });
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({ message: 'Failed to fetch dashboard stats' });
    }
  }

  static async createApprovalRule(req, res) {
    try {
      const admin = req.user;
      const {
        name,
        conditions,
        approvers,
        rules,
        priority
      } = req.body;

      // Validate approvers exist in company
      const approverIds = approvers.map(a => a.user);
      const validApprovers = await User.find({
        _id: { $in: approverIds },
        company: admin.company._id,
        role: { $in: ['admin', 'manager'] }
      });

      if (validApprovers.length !== approverIds.length) {
        return res.status(400).json({
          message: 'Some approvers are invalid'
        });
      }

      const approvalRule = new ApprovalRule({
        company: admin.company._id,
        name,
        conditions,
        approvers,
        rules,
        priority: priority || 1
      });

      await approvalRule.save();
      await approvalRule.populate('approvers.user', 'firstName lastName email role');

      res.status(201).json({
        message: 'Approval rule created successfully',
        approvalRule
      });
    } catch (error) {
      console.error('Create approval rule error:', error);
      res.status(500).json({ message: 'Failed to create approval rule' });
    }
  }

  static async getApprovalRules(req, res) {
    try {
      const admin = req.user;
      const { page = 1, limit = 10 } = req.query;

      const skip = (page - 1) * limit;

      const rules = await ApprovalRule.find({
        company: admin.company._id
      })
        .populate('approvers.user', 'firstName lastName email role')
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await ApprovalRule.countDocuments({
        company: admin.company._id
      });

      res.json({
        rules,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalRules: total,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error('Get approval rules error:', error);
      res.status(500).json({ message: 'Failed to fetch approval rules' });
    }
  }

  static async updateApprovalRule(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const admin = req.user;

      const rule = await ApprovalRule.findOne({
        _id: id,
        company: admin.company._id
      });

      if (!rule) {
        return res.status(404).json({ message: 'Approval rule not found' });
      }

      // Validate approvers if being updated
      if (updates.approvers) {
        const approverIds = updates.approvers.map(a => a.user);
        const validApprovers = await User.find({
          _id: { $in: approverIds },
          company: admin.company._id,
          role: { $in: ['admin', 'manager'] }
        });

        if (validApprovers.length !== approverIds.length) {
          return res.status(400).json({
            message: 'Some approvers are invalid'
          });
        }
      }

      // Update allowed fields
      const allowedFields = ['name', 'conditions', 'approvers', 'rules', 'priority', 'isActive'];
      allowedFields.forEach(field => {
        if (updates[field] !== undefined) {
          rule[field] = updates[field];
        }
      });

      await rule.save();
      await rule.populate('approvers.user', 'firstName lastName email role');

      res.json({
        message: 'Approval rule updated successfully',
        approvalRule: rule
      });
    } catch (error) {
      console.error('Update approval rule error:', error);
      res.status(500).json({ message: 'Failed to update approval rule' });
    }
  }

  static async deleteApprovalRule(req, res) {
    try {
      const { id } = req.params;
      const admin = req.user;

      const rule = await ApprovalRule.findOne({
        _id: id,
        company: admin.company._id
      });

      if (!rule) {
        return res.status(404).json({ message: 'Approval rule not found' });
      }

      await ApprovalRule.findByIdAndDelete(id);

      res.json({ message: 'Approval rule deleted successfully' });
    } catch (error) {
      console.error('Delete approval rule error:', error);
      res.status(500).json({ message: 'Failed to delete approval rule' });
    }
  }

  static async getAllExpenses(req, res) {
    try {
      const admin = req.user;
      const {
        status,
        employee,
        startDate,
        endDate,
        category,
        page = 1,
        limit = 10
      } = req.query;

      let query = { company: admin.company._id };

      // Apply filters
      if (status) query.status = status;
      if (employee) query.employee = employee;
      if (category) query.category = category;
      if (startDate || endDate) {
        query.expenseDate = {};
        if (startDate) query.expenseDate.$gte = new Date(startDate);
        if (endDate) query.expenseDate.$lte = new Date(endDate);
      }

      const skip = (page - 1) * limit;

      const expenses = await Expense.find(query)
        .populate('employee', 'firstName lastName email department')
        .populate('approvals.approver', 'firstName lastName email role')
        .populate('finalApprover', 'firstName lastName email role')
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
      console.error('Get all expenses error:', error);
      res.status(500).json({ message: 'Failed to fetch expenses' });
    }
  }

  static async overrideApproval(req, res) {
    try {
      const { id } = req.params;
      const { decision, comments } = req.body;
      const admin = req.user;

      if (!['approved', 'rejected'].includes(decision)) {
        return res.status(400).json({ message: 'Invalid decision' });
      }

      const expense = await Expense.findOne({
        _id: id,
        company: admin.company._id
      });

      if (!expense) {
        return res.status(404).json({ message: 'Expense not found' });
      }

      // Override the approval process
      expense.status = decision;
      expense.finalApprover = admin._id;
      
      if (decision === 'approved') {
        expense.approvedAt = new Date();
      } else {
        expense.rejectedAt = new Date();
        expense.rejectionReason = comments;
      }

      // Mark all pending approvals as overridden
      expense.approvals.forEach(approval => {
        if (approval.status === 'pending') {
          approval.status = 'overridden';
          approval.comments = 'Overridden by admin';
          approval.approvedAt = new Date();
        }
      });

      await expense.save();

      await expense.populate([
        { path: 'employee', select: 'firstName lastName email' },
        { path: 'approvals.approver', select: 'firstName lastName email role' },
        { path: 'finalApprover', select: 'firstName lastName email role' }
      ]);

      res.json({
        message: `Expense ${decision} successfully (admin override)`,
        expense
      });
    } catch (error) {
      console.error('Override approval error:', error);
      res.status(500).json({ message: 'Failed to override approval' });
    }
  }

  static async updateCompanySettings(req, res) {
    try {
      const admin = req.user;
      const updates = req.body;

      const company = await Company.findById(admin.company._id);
      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }

      // Update allowed settings
      if (updates.settings) {
        Object.keys(updates.settings).forEach(key => {
          if (company.settings[key] !== undefined) {
            company.settings[key] = updates.settings[key];
          }
        });
      }

      await company.save();

      res.json({
        message: 'Company settings updated successfully',
        company
      });
    } catch (error) {
      console.error('Update company settings error:', error);
      res.status(500).json({ message: 'Failed to update company settings' });
    }
  }
}

module.exports = AdminController;