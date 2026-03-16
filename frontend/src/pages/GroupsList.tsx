import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Search, Plus, RefreshCw, MessageSquare } from 'lucide-react';

interface Group {
  id: string;
  title: string;
  type: 'group' | 'channel' | 'user' | 'unknown';
  isActive: boolean;
}

export default function GroupsList() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    group: true,
    channel: true,
    user: true,
  });
  const [joinLink, setJoinLink] = useState('');

  // Global Telegram Search State
  const [globalQuery, setGlobalQuery] = useState('');
  const [globalResults, setGlobalResults] = useState<any[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [fetchError, setFetchError] = useState('');

  const fetchGroups = async (refresh = false) => {
    try {
      setLoading(true);
      setFetchError('');
      const res = await axios.get(`http://localhost:5000/api/groups${refresh ? '?refresh=true' : ''}`);
      setGroups(res.data);
    } catch (err: any) {
      console.error('Failed to fetch groups', err);
      setFetchError(err.response?.data?.error || err.message || 'Failed to load groups. The backend might be busy.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinLink.trim()) return;

    let url = joinLink.trim();
    
    // Handle @username
    if (url.startsWith('@')) {
      url = `https://t.me/${url.substring(1)}`;
    } 
    // Handle plain usernames/hashes without http
    else if (!url.startsWith('http')) {
       // If it's t.me/something, prepend https://
       // Otherwise prepend https://t.me/
       url = url.startsWith('t.me/') ? `https://${url}` : `https://t.me/${url}`;
    }

    // Open Telegram URL
    window.open(url, '_blank', 'noopener,noreferrer');
    
    setJoinLink('');
  };

  const handleGlobalSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalQuery.trim()) return;

    setIsSearchingGlobal(true);
    setSearchError('');
    setGlobalResults([]);
    try {
      const res = await axios.post('http://localhost:5000/api/groups/search', { query: globalQuery });
      setGlobalResults(res.data);
    } catch (err: any) {
      console.error('Global search error:', err);
      const errorMsg = err.response?.data?.error || err.message;
      if (errorMsg.includes('FROZEN_METHOD_INVALID') || errorMsg.includes('420')) {
        setSearchError('Telegram has restricted Global Search for this account. Please use Direct Join Links below.');
      } else {
        setSearchError(errorMsg);
      }
    } finally {
      setIsSearchingGlobal(false);
    }
  };

  const filteredGroups = groups.filter(g => {
    const matchesSearch = g.title?.toLowerCase().includes(searchTerm.toLowerCase()) || g.id?.includes(searchTerm);
    
    // Fallback active filter if type is somehow unknown or missing
    const typeFilter = g.type ? filters[g.type as keyof typeof filters] ?? true : true; 

    return matchesSearch && typeFilter;
  });

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center transition-colors">
          <Users className="mr-3 h-6 w-6 text-indigo-500 dark:text-indigo-400" />
          Registered Groups ({groups.length})
          <button 
            onClick={() => fetchGroups(true)}
            className="ml-4 p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all"
            title="Refresh groups from Telegram"
            disabled={loading}
          >
            <RefreshCw className={loading ? "h-4 w-4 animate-spin text-indigo-500" : "h-4 w-4"} />
          </button>
        </h1>
        
        <div className="mt-4 sm:mt-0 relative rounded-md shadow-sm max-w-xs w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          </div>
          <input
            type="text"
            className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md py-2 px-3 border transition-colors"
            placeholder="Search name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-md border border-gray-100 dark:border-gray-700 transition-colors duration-200 p-4 mb-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Discover & Join New Groups</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Direct Join Link */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Join via Invite Link or Username</h3>
            <form onSubmit={handleJoin} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                className="flex-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md py-2 px-3 border transition-colors"
                placeholder="e.g. t.me/username, or t.me/+invitehash"
                value={joinLink}
                onChange={(e) => setJoinLink(e.target.value)}
              />
              <button
                type="submit"
                disabled={!joinLink.trim()}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
              >
                <Plus className="mr-2 h-4 w-4" />
                Open in Telegram
              </button>
            </form>
          </div>

          {/* Global Search */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Search Telegram Directory</h3>
            <form onSubmit={handleGlobalSearch} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                className="flex-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md py-2 px-3 border transition-colors"
                placeholder="Search keywords (e.g. iptv, news)"
                value={globalQuery}
                onChange={(e) => setGlobalQuery(e.target.value)}
              />
              <button
                type="submit"
                disabled={isSearchingGlobal || !globalQuery.trim()}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 transition-colors"
              >
                {isSearchingGlobal ? 'Searching...' : 'Search'}
              </button>
            </form>
            {searchError && (
              <div className="mt-3 p-3 rounded-md text-sm bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-800">
                {searchError}
              </div>
            )}
          </div>
        </div>

        {/* Global Search Results Rendering */}
        {globalResults.length > 0 && (
          <div className="mt-6 border-t border-gray-100 dark:border-gray-700 pt-4">
            <div className="mb-3">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Search Results ({globalResults.length})
              </h3>
              {globalResults.length >= 8 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Note: Telegram limits global search to a maximum of ~10 top results to prevent scraping. Try using different keywords if you can't find what you're looking for.
                </p>
              )}
            </div>
            <div className="max-h-60 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-600 divide-y divide-gray-200 dark:divide-gray-600">
              {globalResults.map((res: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">{res.title}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {res.username ? `@${res.username}` : 'Private Entity'} • {res.type}
                    </p>
                  </div>
                  {res.username && (
                    <button
                      onClick={() => {
                        window.open(`https://t.me/${res.username}`, '_blank', 'noopener,noreferrer');
                      }}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-full transition-colors"
                    >
                      Open in Telegram
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-12 sm:flex sm:items-center sm:justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white transition-colors">Your Library</h2>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <label className="flex items-center text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={filters.group}
            onChange={(e) => setFilters(f => ({ ...f, group: e.target.checked }))}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-2"
          />
          Groups
        </label>
        <label className="flex items-center text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={filters.channel}
            onChange={(e) => setFilters(f => ({ ...f, channel: e.target.checked }))}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-2"
          />
          Channels
        </label>
        <label className="flex items-center text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={filters.user}
            onChange={(e) => setFilters(f => ({ ...f, user: e.target.checked }))}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-2"
          />
          Users & Bots
        </label>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md border border-gray-100 dark:border-gray-700 transition-colors duration-200">
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
          </div>
        ) : fetchError ? (
          <div className="p-8 text-center text-red-500 dark:text-red-400">
            {fetchError}
            <button onClick={() => fetchGroups(true)} className="ml-4 underline text-indigo-500 hover:text-indigo-600">Try Again</button>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No results found matching your filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-200 dark:bg-gray-700">
            {filteredGroups.map((group) => (
              <div key={group.id} className="bg-white dark:bg-gray-800 p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {group.title || "Unknown"}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 font-mono">ID: {group.id}</p>
                    <div className="mt-3 flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
                            group.type === 'channel' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                            group.type === 'group' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                            {group.type}
                        </span>
                        <span className="flex items-center text-[10px] text-green-600 dark:text-green-400 font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
                            Active
                        </span>
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <div className="h-10 w-10 rounded-lg bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 transition-colors">
                        <MessageSquare className="h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
