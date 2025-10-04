const User = require('../models/User');
const bcrypt = require('bcryptjs');

class UserController {
  static async createUser(req, res) {
    try {
      const { email, password, firstName, lastName, role, department, managerId } = req.body;
      const admin = req.user;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Validate manager if provided
      let manager = null;
      if (managerId) {
        manager = await User.findOne({
          _id: managerId,
          company: admin.company._id,
          role: { $in: ['admin', 'manager'] }
        });
        if (!manager) {
          return res.status(400).json({ message: 'Invalid manager selected' });
        }
      }

      const user = new User({
        email,
        password,
        firstName,
        lastName,
        role: role || 'employee',
        company: admin.company._id,
        department,
        manager: manager ? manager._id : null
      });

      const savedUser = await user.save();

      // Remove password from response
      const userResponse = savedUser.toObject();
      delete userResponse.password;

      await savedUser.populate('manager', 'firstName lastName email');

      res.status(201).json({
        message: 'User created successfully',
        user: savedUser
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ message: 'Failed to create user' });
    }
  }

  static async getUsers(req, res) {
    try {
      const admin = req.user;
      const { role, department, isActive, page = 1, limit = 10 } = req.query;

      let query = { company: admin.company._id };

      // Apply filters
      if (role) query.role = role;
      if (department) query.department = department;
      if (isActive !== undefined) query.isActive = isActive === 'true';

      const skip = (page - 1) * limit;

      const users = await User.find(query)
        .select('-password')
        .populate('manager', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await User.countDocuments(query);

      res.json({
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  }

  static async getUserById(req, res) {
    try {
      const { id } = req.params;
      const admin = req.user;

      const user = await User.findOne({
        _id: id,
        company: admin.company._id
      })
        .select('-password')
        .populate('manager', 'firstName lastName email')
        .populate('company', 'name currency');

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Get team members if user is a manager
      let teamMembers = [];
      if (user.role === 'manager' || user.role === 'admin') {
        teamMembers = await User.find({
          manager: user._id,
          company: admin.company._id
        }).select('firstName lastName email role department');
      }

      res.json({
        user,
        teamMembers
      });
    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  }

  static async updateUser(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const admin = req.user;

      const user = await User.findOne({
        _id: id,
        company: admin.company._id
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Validate manager if being updated
      if (updates.managerId) {
        const manager = await User.findOne({
          _id: updates.managerId,
          company: admin.company._id,
          role: { $in: ['admin', 'manager'] }
        });
        if (!manager) {
          return res.status(400).json({ message: 'Invalid manager selected' });
        }
        updates.manager = updates.managerId;
        delete updates.managerId;
      }

      // Handle password update
      if (updates.password) {
        const salt = await bcrypt.genSalt(12);
        updates.password = await bcrypt.hash(updates.password, salt);
      }

      // Update allowed fields
      const allowedFields = [
        'firstName', 'lastName', 'role', 'department', 
        'manager', 'isActive', 'password'
      ];
      
      allowedFields.forEach(field => {
        if (updates[field] !== undefined) {
          user[field] = updates[field];
        }
      });

      await user.save();

      await user.populate('manager', 'firstName lastName email');

      // Remove password from response
      const userResponse = user.toObject();
      delete userResponse.password;

      res.json({
        message: 'User updated successfully',
        user: userResponse
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ message: 'Failed to update user' });
    }
  }

  static async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const admin = req.user;

      const user = await User.findOne({
        _id: id,
        company: admin.company._id
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (user.role === 'admin') {
        return res.status(400).json({ 
          message: 'Cannot delete admin user' 
        });
      }

      // Check if user has pending expenses
      const Expense = require('../models/Expense');
      const pendingExpenses = await Expense.countDocuments({
        employee: user._id,
        status: { $in: ['pending', 'in_review'] }
      });

      if (pendingExpenses > 0) {
        return res.status(400).json({
          message: 'Cannot delete user with pending expenses'
        });
      }

      await User.findByIdAndDelete(id);

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ message: 'Failed to delete user' });
    }
  }

  static async getManagers(req, res) {
    try {
      const admin = req.user;

      const managers = await User.find({
        company: admin.company._id,
        role: { $in: ['admin', 'manager'] },
        isActive: true
      })
        .select('firstName lastName email role department')
        .sort({ firstName: 1 });

      res.json({ managers });
    } catch (error) {
      console.error('Get managers error:', error);
      res.status(500).json({ message: 'Failed to fetch managers' });
    }
  }

  static async updateProfile(req, res) {
    try {
      const user = req.user;
      const updates = req.body;

      // Only allow certain fields to be updated by users themselves
      const allowedFields = ['firstName', 'lastName', 'department'];
      
      allowedFields.forEach(field => {
        if (updates[field] !== undefined) {
          user[field] = updates[field];
        }
      });

      // Handle password change
      if (updates.currentPassword && updates.newPassword) {
        const isCurrentPasswordValid = await user.comparePassword(updates.currentPassword);
        if (!isCurrentPasswordValid) {
          return res.status(400).json({ message: 'Current password is incorrect' });
        }

        const salt = await bcrypt.genSalt(12);
        user.password = await bcrypt.hash(updates.newPassword, salt);
      }

      await user.save();
      await user.populate('manager', 'firstName lastName email');

      // Remove password from response
      const userResponse = user.toObject();
      delete userResponse.password;

      res.json({
        message: 'Profile updated successfully',
        user: userResponse
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  }
}

module.exports = UserController;