//create expense.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { expensesAPI, companyAPI } from '@/utils/api';
import { validateFile } from '@/utils/helpers';
import { EXPENSE_CATEGORIES } from '@/utils/constants';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  Receipt,
  Upload,
  ArrowLeft,
  DollarSign,
  Loader,
  ScanLine,
} from 'lucide-react';
import toast from 'react-hot-toast';

const schema = yup.object({
  amount: yup.number().positive('Amount must be positive').required('Amount is required'),
  currency: yup.string().required('Currency is required'),
  category: yup.string().required('Category is required'),
  description: yup.string().required('Description is required'),
  expenseDate: yup.date().required('Date is required').max(new Date(), 'Date cannot be in the future'),
});

const CreateExpense = () => {
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [currencies, setCurrencies] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      expenseDate: new Date().toISOString().split('T')[0],
    },
  });

  useEffect(() => {
    // Fetch available currencies
    const fetchCurrencies = async () => {
      try {
        const response = await companyAPI.getExchangeRates('USD');
        const currencyList = Object.keys(response.data.rates).map(code => ({
          code,
          name: code,
        }));
        setCurrencies([{ code: 'USD', name: 'USD' }, ...currencyList.filter(c => c.code !== 'USD')]);
      } catch (error) {
        console.error('Failed to fetch currencies:', error);
      }
    };

    fetchCurrencies();
  }, []);

  const handleReceiptUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    setReceipt(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setReceiptPreview(e.target.result);
    };
    reader.readAsDataURL(file);

    try {
      setIsScanning(true);
      toast.loading('Scanning receipt...');
      const response = await expensesAPI.processReceipt(file);
      const { ocrData } = response.data;

      if (ocrData) {
        if (ocrData.amount) setValue('amount', ocrData.amount, { shouldValidate: true });
        if (ocrData.date) {
          const formattedDate = new Date(ocrData.date).toISOString().split('T')[0];
          setValue('expenseDate', formattedDate, { shouldValidate: true });
        }
        if (ocrData.merchant) setValue('description', ocrData.merchant, { shouldValidate: true });
        if (ocrData.category) setValue('category', ocrData.category, { shouldValidate: true });
        toast.dismiss();
        toast.success('Receipt scanned and form auto-filled!');
      } else {
        toast.dismiss();
        toast.error('Could not extract data from receipt.');
      }
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to scan receipt.');
    } finally {
      setIsScanning(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      setSubmitting(true);
      
      const cleanedData = {
        ...data,
        amount: parseFloat(data.amount) || 0,
      };

      if (cleanedData.amount <= 0) {
        toast.error('Amount must be greater than 0');
        return;
      }

      const date = new Date(cleanedData.expenseDate);
      const formattedDate = date.toISOString().split('T')[0];

      const expenseData = {
        ...cleanedData,
        expenseDate: formattedDate,
        receipt,
      };

      await expensesAPI.createExpense(expenseData);
      
      toast.success('Expense created successfully!');
      navigate('/expenses');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create expense');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/expenses')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Expense</h1>
          <p className="text-gray-600">Submit a new expense for approval</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      {...register('amount')}
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className={`input-field pl-10 ${errors.amount ? 'border-red-300 focus:ring-red-500' : ''}`}
                    />
                  </div>
                  {errors.amount && (
                    <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency *
                  </label>
                  <select
                    {...register('currency')}
                    className={`input-field ${errors.currency ? 'border-red-300 focus:ring-red-500' : ''}`}
                  >
                    <option value="">Select currency</option>
                    {currencies.map(currency => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code}
                      </option>
                    ))}
                  </select>
                  {errors.currency && (
                    <p className="mt-1 text-sm text-red-600">{errors.currency.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  {...register('category')}
                  className={`input-field ${errors.category ? 'border-red-300 focus:ring-red-500' : ''}`}
                >
                  <option value="">Select category</option>
                  {EXPENSE_CATEGORIES.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  placeholder="Enter expense description..."
                  className={`input-field ${errors.description ? 'border-red-300 focus:ring-red-500' : ''}`}
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expense Date *
                </label>
                <input
                  {...register('expenseDate')}
                  type="date"
                  className={`input-field ${errors.expenseDate ? 'border-red-300 focus:ring-red-500' : ''}`}
                />
                {errors.expenseDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.expenseDate.message}</p>
                )}
              </div>

              <div className="flex items-center justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => navigate('/expenses')}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={submitting}
                  className="btn-primary flex items-center"
                >
                  {submitting ? (
                    <>
                      <Loader className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Receipt className="h-4 w-4 mr-2" />
                      Create Expense
                    </>
                  )}
                </motion.button>
              </div>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Receipt Upload
            </h3>
            
            {!receiptPreview ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleReceiptUpload}
                  className="hidden"
                  id="receipt-upload"
                />
                <label htmlFor="receipt-upload" className="cursor-pointer">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-600 mb-2">
                    Click to upload receipt
                  </p>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF up to 5MB
                  </p>
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <img
                    src={receiptPreview}
                    alt="Receipt preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  {isScanning && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                      <div className="text-white text-center">
                        <ScanLine className="h-8 w-8 mx-auto animate-pulse" />
                        <p className="text-sm mt-2">Scanning...</p>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setReceipt(null);
                      setReceiptPreview(null);
                    }}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CreateExpense;