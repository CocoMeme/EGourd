import React, { useEffect, useState, useRef } from 'react';
import { adminService } from '../services/api';
import { Users, UserCheck, UserX, MessageSquare, TrendingUp, RefreshCw } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { toast } from 'react-toastify';
import './Dashboard.css';

const Dashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pollingIntervalRef = useRef(null);
  const POLLING_INTERVAL = 15000; // 15 seconds

  useEffect(() => {
    // Initial fetch
    fetchDashboardData();
    
    // Set up polling for real-time updates
    pollingIntervalRef.current = setInterval(() => {
      fetchDashboardData(true); // true = silent refresh (no loading state)
    }, POLLING_INTERVAL);

    // Cleanup polling on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const fetchDashboardData = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setRefreshing(true);
      const response = await adminService.getDashboard();
      if (response.success) {
        setDashboard(response.data);
      }
    } catch (error) {
      if (!silent) {
        toast.error('Failed to load dashboard data');
      }
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (!dashboard) {
    return <div className="error-message">Failed to load dashboard data</div>;
  }

  const {
    overview = {},
    usersByRole = {},
    usersByProvider = {},
    forumStats = {},
    newsStats = {},
    scanStats = {},
    verificationStats = {},
  } = dashboard;

  const statCards = [
    {
      title: 'Total Users',
      value: overview.totalUsers || 0,
      icon: Users,
      color: '#4CAF50',
      bgColor: '#e8f5e9',
    },
    {
      title: 'Active Users',
      value: overview.activeUsers || 0,
      icon: UserCheck,
      color: '#2196F3',
      bgColor: '#e3f2fd',
    },
    {
      title: 'Inactive Users',
      value: overview.inactiveUsers || 0,
      icon: UserX,
      color: '#ff9800',
      bgColor: '#fff3e0',
    },
    {
      title: 'Total Scans',
      value: scanStats.totalScans || 0,
      icon: TrendingUp,
      color: '#e91e63',
      bgColor: '#fce4ec',
    },
    {
      title: 'Forum Posts',
      value: forumStats.totalPosts || 0,
      icon: MessageSquare,
      color: '#9c27b0',
      bgColor: '#f3e5f5',
    },
  ];

  const roleData = Object.entries(usersByRole || {}).map(([role, count]) => ({
    name: role.charAt(0).toUpperCase() + role.slice(1),
    value: count,
  }));

  const providerData = Object.entries(usersByProvider || {}).map(([provider, count]) => ({
    name: provider === 'local' ? 'Email' : provider.charAt(0).toUpperCase() + provider.slice(1),
    value: count,
  }));

  const COLORS = ['#4CAF50', '#2196F3', '#ff9800', '#9c27b0', '#f44336'];

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h1>Dashboard</h1>
            <p>Overview of your application statistics</p>
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: refreshing ? '#e0e0e0' : '#4CAF50',
              color: refreshing ? '#999' : 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'background-color 0.3s ease',
            }}
            title="Refresh analytics data"
          >
            <RefreshCw size={16} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            {refreshing ? 'Updating...' : 'Refresh'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Stat Cards */}
      <div className="stats-grid">
        {statCards.map((stat, index) => (
          <div key={index} className="stat-card" style={{ borderLeftColor: stat.color }}>
            <div className="stat-icon" style={{ backgroundColor: stat.bgColor, color: stat.color }}>
              <stat.icon size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-label">{stat.title}</div>
              <div className="stat-value">{stat.value.toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="card chart-card">
          <h3>Users by Role</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={roleData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {roleData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card">
          <h3>Users by Provider</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={providerData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#4CAF50" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="info-grid">
        <div className="card info-card">
          <h3>Scan Activity</h3>
          <div className="info-items">
            <div className="info-item">
              <span>Total Scans</span>
              <strong>{scanStats.totalScans || 0}</strong>
            </div>
            <div className="info-item">
              <span>Last 7 days</span>
              <strong className="text-success">{scanStats.scans7Days || 0}</strong>
            </div>
            <div className="info-item">
              <span>Last 30 days</span>
              <strong className="text-info">{scanStats.scans30Days || 0}</strong>
            </div>
          </div>
        </div>

        <div className="card info-card">
          <h3>User Growth</h3>
          <div className="info-items">
            <div className="info-item">
              <span>Last 7 days</span>
              <strong>{overview.newUsers7Days || 0}</strong>
            </div>
            <div className="info-item">
              <span>Last 30 days</span>
              <strong>{overview.newUsers30Days || 0}</strong>
            </div>
          </div>
        </div>

        <div className="card info-card">
          <h3>Email Verification</h3>
          <div className="info-items">
            <div className="info-item">
              <span>Verified</span>
              <strong className="text-success">{overview.verifiedUsers || 0}</strong>
            </div>
            <div className="info-item">
              <span>Unverified</span>
              <strong className="text-warning">{overview.unverifiedUsers || 0}</strong>
            </div>
          </div>
        </div>

        <div className="card info-card">
          <h3>Forum Posts</h3>
          <div className="info-items">
            <div className="info-item">
              <span>Total</span>
              <strong>{forumStats.totalPosts || 0}</strong>
            </div>
            <div className="info-item">
              <span>Active</span>
              <strong className="text-success">{forumStats.activePosts || 0}</strong>
            </div>
            <div className="info-item">
              <span>Pending</span>
              <strong className="text-warning">{forumStats.pendingPosts || 0}</strong>
            </div>
            <div className="info-item">
              <span>Flagged</span>
              <strong className="text-danger">{forumStats.flaggedPosts || 0}</strong>
            </div>
          </div>
        </div>

        <div className="card info-card">
          <h3>News Articles</h3>
          <div className="info-items">
            <div className="info-item">
              <span>Total</span>
              <strong>{newsStats.totalNews || 0}</strong>
            </div>
            <div className="info-item">
              <span>Published</span>
              <strong className="text-success">{newsStats.publishedNews || 0}</strong>
            </div>
            <div className="info-item">
              <span>Draft</span>
              <strong className="text-warning">{newsStats.draftNews || 0}</strong>
            </div>
            <div className="info-item">
              <span>Archived</span>
              <strong className="text-secondary">{newsStats.archivedNews || 0}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
