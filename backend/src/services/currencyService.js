const axios = require('axios');
const config = require('../config/config');

class CurrencyService {
  static async getCountriesWithCurrencies() {
    try {
      const response = await axios.get('https://restcountries.com/v3.1/all?fields=name,currencies');
      return response.data.map(country => ({
        name: country.name.common,
        currencies: country.currencies
      }));
    } catch (error) {
      console.error('Error fetching countries:', error);
      throw new Error('Failed to fetch countries data');
    }
  }

  static async convertCurrency(amount, fromCurrency, toCurrency) {
    try {
      if (fromCurrency === toCurrency) {
        return amount;
      }

      const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`);
      const rate = response.data.rates[toCurrency];
      
      if (!rate) {
        throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
      }

      return amount * rate;
    } catch (error) {
      console.error('Currency conversion error:', error);
      throw new Error('Failed to convert currency');
    }
  }

  static async getExchangeRates(baseCurrency) {
    try {
      const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`);
      return response.data.rates;
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      throw new Error('Failed to fetch exchange rates');
    }
  }
}

module.exports = CurrencyService;