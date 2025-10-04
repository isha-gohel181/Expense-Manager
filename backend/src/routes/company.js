const express = require('express');
const CurrencyService = require('../services/currencyService');

const router = express.Router();

// Public route to get countries and currencies
router.get('/countries', async (req, res) => {
  try {
    const countries = await CurrencyService.getCountriesWithCurrencies();
    res.json({ countries });
  } catch (error) {
    console.error('Get countries error:', error);
    res.status(500).json({ message: 'Failed to fetch countries' });
  }
});

// Public route to get exchange rates
router.get('/exchange-rates/:currency', async (req, res) => {
  try {
    const { currency } = req.params;
    const rates = await CurrencyService.getExchangeRates(currency);
    res.json({ rates });
  } catch (error) {
    console.error('Get exchange rates error:', error);
    res.status(500).json({ message: 'Failed to fetch exchange rates' });
  }
});

module.exports = router;