import { useState, useMemo } from 'react';
import axios from 'axios';
import { Bot, Phone, KeyRound, AlertCircle } from 'lucide-react';
import Select from 'react-select';
import countriesData from '../data/countries.json';

// Create formatted options for react-select
const countryOptions = countriesData.map(c => ({
  value: c.dialCode,
  label: `${c.name} (${c.dialCode})`,
  code: c.code.toLowerCase()
}));

const formatOptionLabel = ({ value, label, code }: any, { context }: any) => {
  if (context === 'value') {
    return (
      <div className="flex items-center text-gray-900 dark:text-white">
        <img src={`https://flagcdn.com/w20/${code}.png`} alt="flag" className="mr-2 h-3 w-4 object-cover" />
        <span className="font-semibold">{value}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center text-gray-900 dark:text-gray-100">
      <img src={`https://flagcdn.com/w20/${code}.png`} alt="flag" className="mr-2 h-3 w-4 object-cover" />
      <span>{label}</span>
    </div>
  );
};

export default function Login({ setAuth }: { setAuth: (val: boolean) => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<any>(countryOptions.find(c => c.value === '+1') || null);
  const [code, setCode] = useState('');
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const [fullPhone, setFullPhone] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCountry) {
        setError('Please select a country code.');
        return;
    }
    
    setError('');
    setLoading(true);

    const formattedPhone = `${selectedCountry.value}${phoneNumber.replace(/\D/g, '')}`;
    setFullPhone(formattedPhone);

    try {
      const res = await axios.post('http://localhost:5000/api/auth/send-code', { phoneNumber: formattedPhone });
      if (res.data.phoneCodeHash) {
        setPhoneCodeHash(res.data.phoneCodeHash);
        setStep(2);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send code. Ensure API_ID and API_HASH are set in the backend .env');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post('http://localhost:5000/api/auth/sign-in', { 
          phoneNumber: fullPhone, 
          phoneCodeHash, 
          code 
      });
      if (res.data.token) {
        localStorage.setItem('adminToken', res.data.token);
        axios.defaults.headers.common['x-admin-token'] = res.data.token;
        setAuth(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid code or sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-16 w-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center">
            <Bot className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          TeleBroadcast
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Login via Telegram Account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100 dark:border-gray-700 transition-colors duration-200">
          
          {step === 1 ? (
            <form className="space-y-6" onSubmit={handleSendCode}>
                <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Phone Number (International Format)
                </label>
                
                <div className="mt-1 flex rounded-md shadow-sm">
                    {/* Country Selector */}
                    <div className="w-1/3 min-w-[140px] relative rounded-l-md border border-r-0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 z-10 transition-colors">
                        <Select
                            options={countryOptions}
                            formatOptionLabel={formatOptionLabel}
                            value={selectedCountry}
                            onChange={(option) => setSelectedCountry(option)}
                            classNamePrefix="react-select"
                            styles={{
                                control: (base) => ({
                                    ...base,
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    boxShadow: 'none',
                                    minHeight: '40px'
                                }),
                                menu: (base) => ({
                                    ...base,
                                    backgroundColor: 'var(--color-gray-800, white)',
                                    zIndex: 50
                                }),
                                option: (base, state) => ({
                                    ...base,
                                    backgroundColor: state.isFocused ? 'var(--color-gray-700, #f3f4f6)' : 'transparent',
                                    color: 'inherit',
                                    cursor: 'pointer'
                                }),
                                singleValue: (base) => ({
                                    ...base,
                                    color: 'inherit'
                                })
                            }}
                            className="text-sm dark:text-white" 
                        />
                    </div>
                    
                    {/* Phone Number Input */}
                    <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Phone className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-1.5" />
                            <span className="text-gray-600 dark:text-gray-300 font-medium sm:text-sm">
                                {selectedCountry ? selectedCountry.value : ''}
                            </span>
                        </div>
                        <input
                            id="phoneNumber"
                            name="phoneNumber"
                            type="tel"
                            required
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            // Use a larger left padding so text doesn't overlap the absolute positioned prefix
                            className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-20 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white py-2 px-3 border rounded-none rounded-r-md min-h-[42px]"
                            placeholder="5551234567"
                        />
                    </div>
                </div>
                </div>

                {error && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                    <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800 dark:text-red-200">{error}</h3>
                    </div>
                    </div>
                </div>
                )}

                <div>
                <button
                    type="submit"
                    disabled={loading || !phoneNumber}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
                >
                    {loading ? 'Sending Code...' : 'Send Login Code'}
                </button>
                </div>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleSignIn}>
                <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    5-Digit Telegram Code
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-2">Check your Telegram app for the code sent by the official Telegram account.</p>
                <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <input
                    id="code"
                    name="code"
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md py-2 px-3 border"
                    placeholder="e.g. 12345"
                    />
                </div>
                </div>

                {error && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                    <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800 dark:text-red-200">{error}</h3>
                    </div>
                    </div>
                </div>
                )}

                <div>
                <button
                    type="submit"
                    disabled={loading || !code}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
                >
                    {loading ? 'Verifying...' : 'Sign In'}
                </button>
                </div>
                
                <div className="text-center">
                    <button 
                        type="button" 
                        onClick={() => setStep(1)}
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
                    >
                        Back to phone number
                    </button>
                </div>
            </form>
          )}
          
        </div>
      </div>
    </div>
  );
}
