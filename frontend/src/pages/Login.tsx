import { useState } from 'react';
import axios from 'axios';
import { Bot, Phone, KeyRound, AlertCircle } from 'lucide-react';

export default function Login({ setAuth }: { setAuth: (val: boolean) => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [phoneCodeHash, setPhoneCodeHash] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post('http://localhost:5000/api/auth/send-code', { phoneNumber });
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
          phoneNumber, 
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
                <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md py-2 px-3 border"
                    placeholder="+1234567890"
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
