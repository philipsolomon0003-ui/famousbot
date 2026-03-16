import { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, CheckCircle, XCircle, Trash2, RefreshCw } from 'lucide-react';

interface Log {
  id: number;
  messageId: number;
  groupId: string;
  status: string;
  error: string | null;
  sentAt: string;
  message: {
    content: string;
  };
}

export default function ActivityLog() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:5000/api/logs', {
        headers: { 'x-admin-token': 'userbot_session_active' }
      });
      setLogs(res.data);
    } catch (err) {
      console.error('Failed to fetch logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleClearLogs = async () => {
    if (!window.confirm('Are you sure you want to delete all activity logs?')) return;
    
    try {
      await axios.delete('http://localhost:5000/api/logs', {
        headers: { 'x-admin-token': 'userbot_session_active' }
      });
      setLogs([]);
    } catch (err) {
      console.error('Failed to clear logs', err);
      alert('Failed to clear logs. Please try again.');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center transition-colors">
          <Activity className="mr-3 h-6 w-6 text-indigo-500 dark:text-indigo-400" />
          Activity Log
        </h1>
        <div className="flex gap-4">
          <button
            onClick={handleClearLogs}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow-sm"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Logs
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md border border-gray-100 dark:border-gray-700 transition-colors duration-200">
        {loading && logs.length === 0 ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No activity recorded yet.
          </div>
        ) : (
          <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-700">
            {logs.map((log) => (
              <li key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 truncate max-w-lg">
                      {log.message.content}
                    </p>
                    <div className="ml-2 flex-shrink-0 flex">
                      <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full items-center ${
                        log.status === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                      }`}>
                        {log.status === 'success' ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <XCircle className="w-3 h-3 mr-1" />
                        )}
                        {log.status}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        Group ID: {log.groupId}
                      </p>
                      {log.error && (
                        <p className="mt-2 flex items-center text-sm text-red-500 dark:text-red-400 sm:mt-0 sm:ml-6">
                          Error: {log.error}
                        </p>
                      )}
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400 sm:mt-0">
                      <p>
                        {new Date(log.sentAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
