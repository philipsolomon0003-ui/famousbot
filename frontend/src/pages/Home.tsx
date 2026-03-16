import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, MessageSquare, Clock, Send, Activity, Zap, Shield, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Stats {
  groups: number;
  sentMessages: number;
  scheduledMessages: number;
}

interface ActivityLogItem {
    id: number;
    status: string;
    sentAt: string;
    message: {
        content: string;
    };
    groupId: string;
}

export default function Home() {
  const [stats, setStats] = useState<Stats>({ groups: 0, sentMessages: 0, scheduledMessages: 0 });
  const [activities, setActivities] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, logsRes] = await Promise.all([
            axios.get('http://localhost:5000/api/stats'),
            axios.get('http://localhost:5000/api/logs')
        ]);
        
        setStats({
          groups: statsRes.data.groups,
          sentMessages: statsRes.data.sentMessages,
          scheduledMessages: statsRes.data.scheduledMessages
        });
        setActivities(logsRes.data.slice(0, 10)); // Take last 10
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  const statCards = [
    { name: 'Total Groups', value: stats.groups, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { name: 'Messages Sent', value: stats.sentMessages, icon: MessageSquare, color: 'text-green-600', bg: 'bg-green-100' },
    { name: 'Pending Scheduled', value: stats.scheduledMessages, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-100' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 transition-colors">Dashboard Overview</h1>
      
      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="space-y-8">
          <dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {statCards.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.name}
                  className="relative bg-white dark:bg-gray-800 pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700 transition-colors duration-200"
                >
                  <dt>
                    <div className={`absolute rounded-md p-3 ${item.bg} dark:bg-opacity-20`}>
                      <Icon className={`h-6 w-6 ${item.color} dark:brightness-125`} aria-hidden="true" />
                    </div>
                    <p className="ml-16 text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{item.name}</p>
                  </dt>
                  <dd className="ml-16 pb-6 flex items-baseline sm:pb-7">
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">{item.value}</p>
                  </dd>
                </div>
              );
            })}
          </dl>

          {/* New Design Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            {/* Quick Actions */}
            <div className="space-y-8">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors duration-200">
                <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white flex items-center">
                    <Zap className="h-5 w-5 mr-2 text-indigo-500" />
                    Quick Actions
                  </h3>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700 block text-center">
                  <div className="grid grid-cols-2 gap-px bg-gray-100 dark:bg-gray-700">
                    <Link to="/composer" className="bg-white dark:bg-gray-800 p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group block">
                      <Send className="h-8 w-8 text-blue-500 group-hover:scale-110 transition-transform mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Broadcast</p>
                    </Link>
                    <Link to="/groups" className="bg-white dark:bg-gray-800 p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group block">
                      <Users className="h-8 w-8 text-purple-500 group-hover:scale-110 transition-transform mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Groups</p>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Activity Feed */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors duration-200">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                   <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center">
                     <Activity className="h-4 w-4 mr-2 text-green-500" />
                     Live Activity
                   </h3>
                   <Link to="/activity" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">View All</Link>
                </div>
                <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700/50">
                   {activities.length === 0 ? (
                       <div className="p-8 text-center text-sm text-gray-500">No recent activity</div>
                   ) : (
                       activities.map((item) => (
                           <div key={item.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                               <div className="flex justify-between items-start">
                                   <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                                       {item.message.content || 'No content'}
                                   </p>
                                   <span className={`px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold uppercase ${
                                       item.status === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                   }`}>
                                       {item.status}
                                   </span>
                               </div>
                               <div className="mt-1 flex items-center text-[10px] text-gray-500 dark:text-gray-400 space-x-2">
                                   <span>{new Date(item.sentAt).toLocaleTimeString()}</span>
                                   <span>•</span>
                                   <span className="truncate">Group: {item.groupId}</span>
                               </div>
                           </div>
                       ))
                   )}
                </div>
              </div>
            </div>

            {/* System Status / Welcome Card */}
            <div className="relative rounded-xl shadow-sm overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 p-8 text-white">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-white opacity-10 blur-2xl"></div>
              <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-24 w-24 rounded-full bg-white opacity-10 blur-xl"></div>
              
              <div className="relative z-10 flex flex-col h-full justify-center">
                <div className="bg-white/20 w-12 h-12 rounded-lg flex items-center justify-center mb-6 backdrop-blur-sm shadow-sm ring-1 ring-white/20">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-2 flex items-center">
                  System Active <Sparkles className="h-5 w-5 ml-2 text-yellow-300" />
                </h2>
                <p className="text-indigo-100 text-sm leading-relaxed mb-6">
                  Your MTProto session is securely connected. The userbot is running in the background and is ready to broadcast your messages to all registered groups and channels automatically.
                </p>
                
                <div className="mt-auto">
                   <div className="bg-black/20 rounded-lg p-4 backdrop-blur-sm border border-white/10 flex items-center justify-between">
                     <div className="flex items-center">
                       <span className="relative flex h-3 w-3 mr-3">
                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                         <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                       </span>
                       <span className="text-sm font-medium">Core Engine</span>
                     </div>
                     <span className="text-xs font-mono bg-white/20 px-2 py-1 rounded">Online</span>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
