import { useState } from 'react';
import axios from 'axios';
import { Send, Calendar, Clock } from 'lucide-react';

export default function Composer() {
  const [content, setContent] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setStatus('sending');
    setErrorMessage('');

    try {
      let scheduledFor = null;
      if (isScheduled && scheduledDate && scheduledTime) {
        // Create an ISO date string
        scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
      }

      await axios.post('http://localhost:5000/api/messages', {
        content,
        isScheduled,
        scheduledFor
      });

      setStatus('success');
      setContent('');
      setIsScheduled(false);
      setScheduledDate('');
      setScheduledTime('');
      
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err.response?.data?.error || 'Failed to send message');
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 transition-colors">Message Composer</h1>
      
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors duration-200">
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Message Content
            </label>
            <textarea
              id="content"
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md p-3 transition-colors"
              placeholder="Hello everyone! Here is the latest update..."
              required
            />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Message will be sent to all active registered Telegram groups.
            </p>
          </div>

          <div className="mb-6 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-md border border-gray-200 dark:border-gray-600 transition-colors">
            <div className="flex items-center mb-4">
              <input
                id="schedule-toggle"
                type="checkbox"
                checked={isScheduled}
                onChange={(e) => setIsScheduled(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-500 dark:bg-gray-800 rounded"
              />
              <label htmlFor="schedule-toggle" className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Schedule for later
              </label>
            </div>

            {isScheduled && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    </div>
                    <input
                      type="date"
                      id="date"
                      required={isScheduled}
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md py-2 px-3 border transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="time" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Time</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    </div>
                    <input
                      type="time"
                      id="time"
                      required={isScheduled}
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md py-2 px-3 border transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {status === 'error' && (
            <div className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-100 dark:border-red-900/30">
              {errorMessage}
            </div>
          )}

          {status === 'success' && (
            <div className="mb-4 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-md border border-green-100 dark:border-green-900/30">
              Message {isScheduled ? 'scheduled' : 'queued for broadcasting'} successfully!
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              disabled={status === 'sending' || !content.trim()}
              className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
            >
              <Send className="mr-2 h-5 w-5" />
              {status === 'sending' ? 'Processing...' : isScheduled ? 'Schedule Message' : 'Broadcast Now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
