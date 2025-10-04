const User = require('../models/User');
const ApprovalRule = require('../models/ApprovalRule');
const Expense = require('../models/Expense');

class ApprovalService {
  static async determineApprovers(expense) {
    try {
      const rules = await ApprovalRule.find({
        company: expense.company,
        isActive: true,
        'conditions.minAmount': { $lte: expense.convertedAmount.value },
        'conditions.maxAmount': { $gte: expense.convertedAmount.value }
      })
      .populate('approvers.user')
      .sort({ priority: -1 });

      if (rules.length === 0) {
        // Default approval flow: just manager
        const employee = await User.findById(expense.employee);
        if (employee.manager) {
          return [{
            approver: employee.manager,
            sequence: 1,
            status: 'pending'
          }];
        }
        return [];
      }

      const rule = rules[0]; // Use highest priority rule
      const approvers = [];

      // Add manager approval if required
      if (rule.rules.requireManagerApproval) {
        const employee = await User.findById(expense.employee);
        if (employee.manager) {
          approvers.push({
            approver: employee.manager,
            sequence: 0,
            status: 'pending'
          });
        }
      }

      // Add rule-based approvers
      rule.approvers.forEach(approver => {
        approvers.push({
          approver: approver.user._id,
          sequence: approver.sequence + (rule.rules.requireManagerApproval ? 1 : 0),
          status: 'pending'
        });
      });

      // Sort by sequence
      approvers.sort((a, b) => a.sequence - b.sequence);

      return approvers;
    } catch (error) {
      console.error('Error determining approvers:', error);
      throw new Error('Failed to determine approvers');
    }
  }

  static async processApproval(expenseId, approverId, decision, comments) {
    try {
      const expense = await Expense.findById(expenseId).populate('approvals.approver');
      
      if (!expense) {
        throw new Error('Expense not found');
      }

      // Find the approval entry
      const approvalIndex = expense.approvals.findIndex(
        approval => approval.approver._id.toString() === approverId.toString() && 
        approval.status === 'pending'
      );

      if (approvalIndex === -1) {
        throw new Error('Approval not found or already processed');
      }

      // Update the approval
      expense.approvals[approvalIndex].status = decision;
      expense.approvals[approvalIndex].comments = comments;
      expense.approvals[approvalIndex].approvedAt = new Date();

      if (decision === 'rejected') {
        expense.status = 'rejected';
        expense.rejectedAt = new Date();
        expense.rejectionReason = comments;
      } else if (decision === 'approved') {
        // Check if this completes the approval process
        const nextPendingApproval = expense.approvals.find(
          (approval, index) => index > approvalIndex && approval.status === 'pending'
        );

        if (!nextPendingApproval) {
          // All approvals complete
          expense.status = 'approved';
          expense.approvedAt = new Date();
          expense.finalApprover = approverId;
        } else {
          expense.currentApprovalLevel = nextPendingApproval.sequence;
        }
      }

      await expense.save();
      return expense;
    } catch (error) {
      console.error('Error processing approval:', error);
      throw error;
    }
  }

  static async getPendingApprovals(approverId) {
    try {
      return await Expense.find({
        'approvals.approver': approverId,
        'approvals.status': 'pending',
        status: { $in: ['pending', 'in_review'] }
      })
      .populate('employee', 'firstName lastName email')
      .populate('company', 'name currency')
      .sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      throw new Error('Failed to fetch pending approvals');
    }
  }
}

module.exports = ApprovalService;