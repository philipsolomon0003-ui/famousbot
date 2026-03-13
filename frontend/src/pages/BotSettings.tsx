import { useState, useEffect } from 'react';
import axios from 'axios';
import { Bot, Save, CheckCircle } from 'lucide-react';

export default function BotSettings() {
  const [token, setToken] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/bot/config');
        if (res.data && res.data.token) {
          setToken(res.data.token);
          setIsActive(res.data.isActive);
        }
      } catch (err) {
        console.error('Failed to fetch config', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');

    try {
      await axios.post('http://localhost:5000/api/bot/config', { token });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      setIsActive(true); // Assuming saving successfully activates it
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Bot Settings</h1>
      
      <div className="bg-white shadow rounded-lg border border-gray-100 overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center mb-6">
            <div className={`h-3 w-3 rounded-full mr-2 ${isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium text-gray-700">
              Status: {isActive ? 'Active & Polling' : 'Inactive'}
            </span>
          </div>

          <form onSubmit={handleSave}>
            <div className="mb-4">
              <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-1">
                Telegram Bot Token
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                  <Bot className="h-5 w-5" />
                </span>
                <input
                  type="text"
                  name="token"
                  id="token"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border-gray-300 border"
                  placeholder="123456789:ABCDEF_ghIjkLMnoPqRstwXYZ"
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                You can get this token from @BotFather on Telegram.
              </p>
            </div>

            {error && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="mt-6 flex items-center gap-4">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {saving ? (
                  'Saving...'
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save & Restart Bot
                  </>
                )}
              </button>
              
              {saved && (
                <span className="inline-flex items-center text-sm text-green-600">
                  <CheckCircle className="mr-1 h-4 w-4" />
                  Saved successfully
                </span>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
