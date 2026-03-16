import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, Calendar, Clock, Users, CheckSquare, Square } from 'lucide-react';

interface Group {
  id: string;
  title: string;
  type: string;
}

export default function Composer() {
  const [content, setContent] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);

  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [progress, setProgress] = useState<{ total: number, sent: number, failed: number, status: string } | null>(null);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/groups', {
          headers: { 'x-admin-token': 'userbot_session_active' }
        });
        
        // Filter out channels and users/bots so the user can only accidentally broadcast to groups
        const onlyGroups = res.data.filter((g: Group) => g.type === 'group');
        
        setGroups(onlyGroups);
        // Default to all selected
        setSelectedGroups(onlyGroups.map((g: Group) => g.id));
      } catch (err) {
        console.error('Failed to fetch groups for composer', err);
      } finally {
        setGroupsLoading(false);
      }
    };

    fetchGroups();

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleSelectAll = (select: boolean) => {
    if (select) {
      setSelectedGroups(groups.map(g => g.id));
    } else {
      setSelectedGroups([]);
    }
  };

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

      const res = await axios.post('http://localhost:5000/api/messages', {
        content,
        isScheduled,
        scheduledFor,
        targetGroups: selectedGroups
      }, {
        headers: { 'x-admin-token': 'userbot_session_active' }
      });

      if (!isScheduled) {
        // Start polling for progress
        const messageId = res.data.id;
        setProgress({ total: 0, sent: 0, failed: 0, status: 'broadcasting' });
        
        pollingRef.current = setInterval(async () => {
          try {
            const progRes = await axios.get(`http://localhost:5000/api/progress/${messageId}`);
            setProgress(progRes.data);
            
            if (progRes.data.status === 'completed') {
              if (pollingRef.current) clearInterval(pollingRef.current);
              setStatus('success');
              setTimeout(() => {
                setStatus('idle');
                setProgress(null);
              }, 5000);
            }
          } catch (err) {
            console.error('Polling error', err);
          }
        }, 1000);
      } else {
        setStatus('success');
        setTimeout(() => setStatus('idle'), 3000);
      }

      setContent('');
      setIsScheduled(false);
      setScheduledDate('');
      setScheduledTime('');
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
              Message will only be sent to the {selectedGroups.length} selected groups below.
            </p>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Target Groups ({selectedGroups.length}/{groups.length})
              </label>
              <div className="space-x-2">
                <button 
                  type="button" 
                  onClick={() => handleSelectAll(true)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
                >
                  Select All
                </button>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <button 
                  type="button" 
                  onClick={() => handleSelectAll(false)}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium"
                >
                  Deselect All
                </button>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-md overflow-hidden flex flex-col h-60">
              {groupsLoading ? (
                <div className="flex-1 flex justify-center items-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
                </div>
              ) : groups.length === 0 ? (
                <div className="flex-1 flex justify-center items-center text-sm text-gray-500 dark:text-gray-400 p-4 text-center">
                  No groups found. Please ensure your Telegram account is connected and you've joined some groups.
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {groups.map((group) => {
                    const isSelected = selectedGroups.includes(group.id);
                    return (
                      <div 
                        key={group.id}
                        onClick={() => toggleGroupSelection(group.id)}
                        className={`flex items-center p-3 rounded-md cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800/50' 
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent'
                        }`}
                      >
                        <div className="flex-shrink-0 mr-3 text-indigo-600 dark:text-indigo-400">
                          {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-gray-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                            {group.title || 'Unknown Group'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {group.type}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {selectedGroups.length === 0 && !groupsLoading && (
              <p className="mt-2 text-sm text-red-500 dark:text-red-400">
                You must select at least one group to broadcast to.
              </p>
            )}
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
              Message {isScheduled ? 'scheduled' : 'broadcasted'} successfully!
            </div>
          )}

          {progress && !isScheduled && (
            <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                        {progress.status === 'completed' ? 'Broadcast Complete' : 'Broadcasting in Progress...'}
                    </span>
                    <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
                        {progress.sent + progress.failed} / {progress.total}
                    </span>
                </div>
                <div className="w-full bg-indigo-200 dark:bg-indigo-900/50 rounded-full h-2.5 overflow-hidden">
                    <div 
                        className="bg-indigo-600 dark:bg-indigo-500 h-2.5 rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(79,70,229,0.5)]"
                        style={{ width: `${progress.total > 0 ? ((progress.sent + progress.failed) / progress.total) * 100 : 0}%` }}
                    ></div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-4">
                    <div className="text-center p-2 bg-white/50 dark:bg-gray-800/50 rounded border border-indigo-100/50 dark:border-indigo-900/50">
                        <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Delivered</p>
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">{progress.sent}</p>
                    </div>
                    <div className="text-center p-2 bg-white/50 dark:bg-gray-800/50 rounded border border-indigo-100/50 dark:border-indigo-900/50">
                        <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Failed</p>
                        <p className="text-lg font-bold text-red-600 dark:text-red-400">{progress.failed}</p>
                    </div>
                </div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              disabled={status === 'sending' || !content.trim() || selectedGroups.length === 0}
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
