const User = require('../models/User');
const Company = require('../models/Company');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const CurrencyService = require('../services/currencyService');

class AuthController {
  static async signup(req, res) {
    try {
      const { email, password, firstName, lastName, companyName, country } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Get country currency information
      const countries = await CurrencyService.getCountriesWithCurrencies();
      const selectedCountry = countries.find(c => c.name.toLowerCase() === country.toLowerCase());
      
      if (!selectedCountry) {
        return res.status(400).json({ message: 'Invalid country selected' });
      }

      const currencyCode = Object.keys(selectedCountry.currencies)[0];
      const currency = selectedCountry.currencies[currencyCode];

      // Create admin user first
      const user = new User({
        email,
        password,
        firstName,
        lastName,
        role: 'admin',
        company: null // Will be set after company creation
      });

      const savedUser = await user.save({ validateBeforeSave: false });

      // Create company
      const company = new Company({
        name: companyName,
        country: country,
        currency: {
          code: currencyCode,
          symbol: currency.symbol,
          name: currency.name
        },
        admin: savedUser._id
      });

      const savedCompany = await company.save();

      // Update user with company reference
      savedUser.company = savedCompany._id;
      await savedUser.save();

      // Generate JWT token
      const token = jwt.sign(
        { userId: savedUser._id },
        config.jwtSecret,
        { expiresIn: '24h' }
      );

      res.status(201).json({
        message: 'User and company created successfully',
        token,
        user: {
          id: savedUser._id,
          email: savedUser.email,
          firstName: savedUser.firstName,
          lastName: savedUser.lastName,
          role: savedUser.role
        },
        company: {
          id: savedCompany._id,
          name: savedCompany.name,
          country: savedCompany.country,
          currency: savedCompany.currency
        }
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user and populate company
      const user = await User.findOne({ email }).populate('company');
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate JWT token
      const token = jwt.sign(
        { userId: user._id },
        config.jwtSecret,
        { expiresIn: '24h' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          company: user.company
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async getProfile(req, res) {
    try {
      const user = await User.findById(req.user._id)
        .populate('company')
        .populate('manager', 'firstName lastName email')
        .select('-password');

      res.json({ user });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}

module.exports = AuthController;