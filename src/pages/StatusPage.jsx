// src/pages/StatusPage.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

const initialServices = [
  { name: 'API', status: 'operational', details: 'All endpoints responding normally' },
  { name: 'Poll Creation', status: 'operational', details: 'Creators can publish new polls' },
  { name: 'Voting System', status: 'operational', details: 'Votes are recorded in real time' },
  { name: 'AI Generator', status: 'operational', details: 'AI poll generation works' },
  { name: 'Analytics', status: 'operational', details: 'Dashboard and exports are up' },
  { name: 'Database', status: 'operational', details: 'Firestore connections stable' },
  { name: 'Image Uploads', status: 'operational', details: 'Storage and CDN working' }
];

export default function StatusPage() {
  const [services, setServices] = useState(initialServices);
  const [lastChecked, setLastChecked] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const refresh = () => {
    setRefreshing(true);
    // Simulate API call – replace with actual health check endpoints later
    setTimeout(() => {
      // In production, you would fetch real health status from your backend
      setServices(initialServices);
      setLastChecked(new Date());
      setRefreshing(false);
    }, 800);
  };

  useEffect(() => {
    // Auto refresh every 5 minutes
    const interval = setInterval(refresh, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const allOperational = services.every(s => s.status === 'operational');

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
            <Activity className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">System Status</h1>
          {allOperational ? (
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
              <CheckCircle size={14} /> All systems operational
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm">
              <AlertCircle size={14} /> Some services degraded
            </div>
          )}
        </motion.div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          {services.map((service) => (
            <div key={service.name} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-3">
                {service.status === 'operational' ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
                <div>
                  <span className="font-medium text-gray-800">{service.name}</span>
                  <p className="text-xs text-gray-400">{service.details}</p>
                </div>
              </div>
              <span className={`text-sm font-medium ${service.status === 'operational' ? 'text-green-600' : 'text-red-600'}`}>
                {service.status === 'operational' ? 'Operational' : 'Degraded'}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-between items-center text-sm text-gray-400">
          <span>Last checked: {lastChecked.toLocaleString()}</span>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="flex items-center gap-1 text-primary hover:underline disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh now'}
          </button>
        </div>
      </div>
    </div>
  );
}