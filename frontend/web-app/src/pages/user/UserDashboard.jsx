import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUserAuth } from '../../contexts/UserAuthContext';
import UserLayout from '../../components/user/UserLayout';
import userApi from '../../services/userApi';
import './UserDashboard.css';

// Icons
import {
  BarChart3,
  Leaf,
  Flower2,
  TrendingUp,
  Calendar,
  Activity,
  PieChart,
  Zap,
  RefreshCw,
  ChevronRight,
  Scan,
  Target,
  Clock,
  CheckCircle2,
  Sprout,
  AlertTriangle,
  TreeDeciduous,
} from 'lucide-react';

const UserDashboard = () => {
  const { user } = useUserAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [pollinationStats, setPollinationStats] = useState(null);
  const [flowerPredictionStats, setFlowerPredictionStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user?._id || user?.id) {
      fetchAllData();
    }
  }, [user]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      const userId = user?._id || user?.id;

      // Fetch scan analytics, pollination stats, and flower prediction stats in parallel
      const [scanResponse, pollinationResponse, flowerPredResponse] = await Promise.all([
        userApi.get(`/scans/analytics/${userId}`).catch(() => null),
        userApi.get('/pollination/dashboard/stats').catch(() => null),
        userApi.get('/pollination/predictions/stats').catch(() => null),
      ]);

      setAnalytics(scanResponse);
      setPollinationStats(pollinationResponse?.data || null);
      setFlowerPredictionStats(flowerPredResponse?.data || null);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Unable to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good morning', icon: '🌅', period: 'morning' };
    if (hour < 18) return { text: 'Good afternoon', icon: '☀️', period: 'afternoon' };
    return { text: 'Good evening', icon: '🌙', period: 'evening' };
  };

  const greeting = getGreeting();

  // Format percentage
  const formatPercent = (value) => {
    return `${parseFloat(value || 0).toFixed(1)}%`;
  };

  return (
    <UserLayout>
      <div className="dashboard-page">
        {/* Dashboard Header - Unique Style */}
        <div className="dashboard-header">
          <div className="header-background">
            <div className="bg-pattern"></div>
            <div className="bg-gradient"></div>
          </div>
          <div className="header-content">
            <div className="header-left">
              <div className="greeting-badge">
                <span className="greeting-icon">{greeting.icon}</span>
                <span className="greeting-text">{greeting.text}</span>
              </div>
              <h1 className="header-title">
                Welcome back, <span className="user-name">{user?.firstName || 'Farmer'}</span>
              </h1>
              <p className="header-subtitle">
                Track your gourd and leaf classifications, monitor scan performance, and view
                insights from your farming journey.
              </p>
              <div className="header-actions">
                <Link to="/user/scan" className="action-btn primary">
                  <Scan size={20} />
                  <span>New Scan</span>
                </Link>
                <button
                  className="action-btn secondary"
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  <RefreshCw size={20} className={refreshing ? 'spinning' : ''} />
                  <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
                </button>
              </div>
            </div>
            <div className="header-visual">
              <div className="visual-card">
                <div className="visual-icon">
                  <BarChart3 size={48} />
                </div>
                <div className="visual-stats">
                  <span className="stat-value">{analytics?.summary?.totalScans || 0}</span>
                  <span className="stat-label">Total Scans</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Content */}
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading your analytics...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <h3>Unable to Load Analytics</h3>
            <p>{error}</p>
            <button onClick={handleRefresh} className="retry-btn">
              <RefreshCw size={18} />
              Try Again
            </button>
          </div>
        ) : analytics ? (
          <>
            {/* Quick Stats Grid */}
            <div className="stats-grid">
              <div className="stat-card scan-type">
                <div className="stat-icon flower">
                  <Flower2 size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-number">
                    {analytics.distributions?.scanType?.flower || 0}
                  </span>
                  <span className="stat-title">Flower Scans</span>
                </div>
                <div className="stat-trend positive">
                  <TrendingUp size={14} />
                  <span>Active</span>
                </div>
              </div>

              <div className="stat-card scan-type">
                <div className="stat-icon leaf">
                  <Leaf size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-number">
                    {analytics.distributions?.scanType?.leaf || 0}
                  </span>
                  <span className="stat-title">Leaf Scans</span>
                </div>
                <div className="stat-trend positive">
                  <TrendingUp size={14} />
                  <span>Active</span>
                </div>
              </div>

              <div className="stat-card confidence">
                <div className="stat-icon accuracy">
                  <Target size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-number">
                    {formatPercent(analytics.summary?.avgConfidence)}
                  </span>
                  <span className="stat-title">Avg Confidence</span>
                </div>
                <div
                  className={`stat-trend ${parseFloat(analytics.summary?.avgConfidence) >= 80 ? 'positive' : 'neutral'}`}
                >
                  <Activity size={14} />
                  <span>
                    {parseFloat(analytics.summary?.avgConfidence) >= 80 ? 'High' : 'Moderate'}
                  </span>
                </div>
              </div>

              <div className="stat-card weekly">
                <div className="stat-icon calendar">
                  <Calendar size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-number">
                    {analytics.summary?.weeklyComparison?.thisWeek || 0}
                  </span>
                  <span className="stat-title">This Week</span>
                </div>
                <div
                  className={`stat-trend ${(analytics.summary?.weeklyComparison?.change || 0) >= 0 ? 'positive' : 'negative'}`}
                >
                  <TrendingUp size={14} />
                  <span>
                    {analytics.summary?.weeklyComparison?.change >= 0 ? '+' : ''}
                    {analytics.summary?.weeklyComparison?.change || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Pollination Stats Section */}
            {pollinationStats && (
              <div className="pollination-section">
                <div className="section-header">
                  <div className="header-title">
                    <Sprout size={20} />
                    <h3>Plant & Pollination Tracking</h3>
                  </div>
                </div>
                <div className="stats-grid pollination-stats">
                  <div className="stat-card plants">
                    <div className="stat-icon plant">
                      <TreeDeciduous size={24} />
                    </div>
                    <div className="stat-info">
                      <span className="stat-number">{pollinationStats.counts?.total || 0}</span>
                      <span className="stat-title">Total Plants</span>
                    </div>
                    <div className="stat-trend positive">
                      <Activity size={14} />
                      <span>{pollinationStats.counts?.active || 0} Active</span>
                    </div>
                  </div>

                  <div className="stat-card flowering">
                    <div className="stat-icon flower">
                      <Flower2 size={24} />
                    </div>
                    <div className="stat-info">
                      <span className="stat-number">
                        {pollinationStats.statusBreakdown?.find((s) => s._id === 'flowering')
                          ?.count || 0}
                      </span>
                      <span className="stat-title">Flowering</span>
                    </div>
                    <div className="stat-trend positive">
                      <TrendingUp size={14} />
                      <span>Ready</span>
                    </div>
                  </div>

                  <div className="stat-card pollinated">
                    <div className="stat-icon success">
                      <CheckCircle2 size={24} />
                    </div>
                    <div className="stat-info">
                      <span className="stat-number">
                        {pollinationStats.statusBreakdown?.find((s) => s._id === 'pollinated')
                          ?.count || 0}
                      </span>
                      <span className="stat-title">Pollinated</span>
                    </div>
                    <div className="stat-trend positive">
                      <TrendingUp size={14} />
                      <span>Growing</span>
                    </div>
                  </div>

                  <div className="stat-card attention">
                    <div className="stat-icon warning">
                      <AlertTriangle size={24} />
                    </div>
                    <div className="stat-info">
                      <span className="stat-number">
                        {pollinationStats.counts?.needsAttention || 0}
                      </span>
                      <span className="stat-title">Needs Attention</span>
                    </div>
                    <div
                      className={`stat-trend ${pollinationStats.counts?.needsAttention > 0 ? 'warning' : 'positive'}`}
                    >
                      <Activity size={14} />
                      <span>
                        {pollinationStats.counts?.needsAttention > 0 ? 'Check Now' : 'All Good'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Plant Type Breakdown */}
                {pollinationStats.plantTypeBreakdown &&
                  pollinationStats.plantTypeBreakdown.length > 0 && (
                    <div className="plant-types-card">
                      <h4>Plant Types</h4>
                      <div className="plant-types-list">
                        {pollinationStats.plantTypeBreakdown.slice(0, 5).map((type, index) => (
                          <div key={type._id || index} className="plant-type-item">
                            <span className="plant-type-name">{type._id || 'Unknown'}</span>
                            <div className="plant-type-bar-container">
                              <div
                                className="plant-type-bar"
                                style={{
                                  width: `${(type.count / pollinationStats.counts?.total) * 100}%`,
                                  backgroundColor:
                                    index === 0 ? '#40916c' : index === 1 ? '#52b788' : '#95d5b2',
                                }}
                              ></div>
                            </div>
                            <span className="plant-type-count">{type.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Plants Needing Attention */}
                {pollinationStats.needsAttention && pollinationStats.needsAttention.length > 0 && (
                  <div className="attention-plants-card">
                    <h4>Plants Needing Attention</h4>
                    <div className="attention-list">
                      {pollinationStats.needsAttention.slice(0, 3).map((plant, index) => (
                        <div key={plant._id || index} className="attention-item">
                          <div className="attention-icon">
                            <AlertTriangle size={16} />
                          </div>
                          <div className="attention-info">
                            <span className="attention-name">{plant.name || 'Unnamed Plant'}</span>
                            <span className="attention-status">{plant.status}</span>
                          </div>
                          <span className="attention-reason">
                            {plant.attentionReason || 'Check required'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Flower Production Predictions Section */}
            {flowerPredictionStats && flowerPredictionStats.totalPredictions > 0 && (
              <div className="flower-predictions-section">
                <div className="section-header">
                  <div className="header-title">
                    <Flower2 size={20} />
                    <h3>Flower Production Predictions</h3>
                  </div>
                  <span className="prediction-count">
                    {flowerPredictionStats.totalPredictions} predictions
                  </span>
                </div>

                {/* Gender Distribution Donut */}
                <div className="flower-gender-distribution">
                  <div className="distribution-visual">
                    <div className="donut-chart large">
                      <svg viewBox="0 0 36 36">
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#e5e5e5"
                          strokeWidth="3"
                        />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#4A90E2"
                          strokeWidth="3"
                          strokeDasharray={`${flowerPredictionStats.genderRatio?.male || 50}, 100`}
                        />
                      </svg>
                      <div className="chart-center">
                        <span className="center-value">
                          {flowerPredictionStats.averageConfidence}%
                        </span>
                        <span className="center-label">Avg Confidence</span>
                      </div>
                    </div>
                  </div>
                  <div className="gender-stats">
                    <div className="gender-stat male">
                      <div className="gender-icon">♂</div>
                      <div className="gender-info">
                        <span className="gender-label">Male Flowers</span>
                        <span className="gender-value">
                          {flowerPredictionStats.totalMaleFlowers?.average || 0}
                        </span>
                        <span className="gender-range">
                          ({flowerPredictionStats.totalMaleFlowers?.min || 0}-
                          {flowerPredictionStats.totalMaleFlowers?.max || 0} range)
                        </span>
                      </div>
                      <span className="gender-percent">
                        {flowerPredictionStats.genderRatio?.male || 50}%
                      </span>
                    </div>
                    <div className="gender-stat female">
                      <div className="gender-icon">♀</div>
                      <div className="gender-info">
                        <span className="gender-label">Female Flowers</span>
                        <span className="gender-value">
                          {flowerPredictionStats.totalFemaleFlowers?.average || 0}
                        </span>
                        <span className="gender-range">
                          ({flowerPredictionStats.totalFemaleFlowers?.min || 0}-
                          {flowerPredictionStats.totalFemaleFlowers?.max || 0} range)
                        </span>
                      </div>
                      <span className="gender-percent">
                        {flowerPredictionStats.genderRatio?.female || 50}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* By Plant Type */}
                {flowerPredictionStats.byPlantType &&
                  Object.keys(flowerPredictionStats.byPlantType).length > 0 && (
                    <div className="plant-type-predictions">
                      <h4>By Plant Type</h4>
                      <div className="plant-type-grid">
                        {Object.entries(flowerPredictionStats.byPlantType).map(
                          ([type, data], index) => (
                            <div key={type} className="plant-type-prediction-card">
                              <span className="plant-type-label">{type.replace('_', ' ')}</span>
                              <div className="prediction-details">
                                <div className="detail-row">
                                  <span className="detail-label">Predictions:</span>
                                  <span className="detail-value">{data.count}</span>
                                </div>
                                <div className="detail-row male">
                                  <span className="detail-label">♂ Avg Male:</span>
                                  <span className="detail-value">{data.avgMale}</span>
                                </div>
                                <div className="detail-row female">
                                  <span className="detail-label">♀ Avg Female:</span>
                                  <span className="detail-value">{data.avgFemale}</span>
                                </div>
                                <div className="detail-row">
                                  <span className="detail-label">Confidence:</span>
                                  <span className="detail-value">{data.avgConfidence}%</span>
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {/* Weekly Stats */}
                <div className="weekly-prediction-stats">
                  <div className="weekly-stat">
                    <span className="weekly-label">This Week</span>
                    <span className="weekly-value">
                      {flowerPredictionStats.weeklyStats?.thisWeek || 0}
                    </span>
                  </div>
                  <div className="weekly-stat">
                    <span className="weekly-label">Last Week</span>
                    <span className="weekly-value">
                      {flowerPredictionStats.weeklyStats?.lastWeek || 0}
                    </span>
                  </div>
                  <div
                    className={`weekly-stat change ${(flowerPredictionStats.weeklyStats?.change || 0) >= 0 ? 'positive' : 'negative'}`}
                  >
                    <span className="weekly-label">Change</span>
                    <span className="weekly-value">
                      {(flowerPredictionStats.weeklyStats?.change || 0) >= 0 ? '+' : ''}
                      {flowerPredictionStats.weeklyStats?.change || 0}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Main Analytics Grid */}
            <div className="analytics-grid">
              {/* Gender Distribution */}
              <div className="analytics-card">
                <div className="card-header">
                  <div className="card-title">
                    <PieChart size={20} />
                    <h3>Gender Distribution</h3>
                  </div>
                </div>
                <div className="card-content">
                  <div className="distribution-chart">
                    <div className="chart-visual">
                      <div className="donut-chart">
                        <svg viewBox="0 0 36 36">
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#e5e5e5"
                            strokeWidth="3"
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#40916c"
                            strokeWidth="3"
                            strokeDasharray={`${((analytics.distributions?.gender?.male || 0) / (analytics.summary?.totalScans || 1)) * 100}, 100`}
                          />
                        </svg>
                        <div className="chart-center">
                          <span className="center-value">{analytics.summary?.totalScans || 0}</span>
                          <span className="center-label">Total</span>
                        </div>
                      </div>
                    </div>
                    <div className="chart-legend">
                      <div className="legend-item">
                        <span className="legend-color male"></span>
                        <span className="legend-label">Male</span>
                        <span className="legend-value">
                          {analytics.distributions?.gender?.male || 0}
                        </span>
                      </div>
                      <div className="legend-item">
                        <span className="legend-color female"></span>
                        <span className="legend-label">Female</span>
                        <span className="legend-value">
                          {analytics.distributions?.gender?.female || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Variety Distribution */}
              <div className="analytics-card">
                <div className="card-header">
                  <div className="card-title">
                    <Leaf size={20} />
                    <h3>Variety Distribution</h3>
                  </div>
                </div>
                <div className="card-content">
                  {analytics.distributions?.variety &&
                  Object.keys(analytics.distributions.variety).length > 0 ? (
                    <div className="variety-list">
                      {Object.entries(analytics.distributions.variety)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([variety, count], index) => (
                          <div key={variety} className="variety-item">
                            <div className="variety-info">
                              <span className="variety-rank">{index + 1}</span>
                              <span className="variety-name">{variety}</span>
                            </div>
                            <div className="variety-bar-container">
                              <div
                                className="variety-bar"
                                style={{
                                  width: `${(count / analytics.summary?.totalScans) * 100}%`,
                                  backgroundColor:
                                    index === 0 ? '#40916c' : index === 1 ? '#52b788' : '#95d5b2',
                                }}
                              ></div>
                            </div>
                            <span className="variety-count">{count}</span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="empty-chart">
                      <Leaf size={32} />
                      <p>No variety data yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Confidence Distribution */}
              <div className="analytics-card">
                <div className="card-header">
                  <div className="card-title">
                    <Zap size={20} />
                    <h3>Confidence Levels</h3>
                  </div>
                </div>
                <div className="card-content">
                  <div className="confidence-bars">
                    <div className="confidence-item">
                      <div className="confidence-header">
                        <span className="confidence-label">High (85%+)</span>
                        <span className="confidence-count">
                          {analytics.distributions?.confidence?.high || 0}
                        </span>
                      </div>
                      <div className="confidence-bar-bg">
                        <div
                          className="confidence-bar high"
                          style={{
                            width: `${((analytics.distributions?.confidence?.high || 0) / (analytics.summary?.totalScans || 1)) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="confidence-item">
                      <div className="confidence-header">
                        <span className="confidence-label">Medium (70-84%)</span>
                        <span className="confidence-count">
                          {analytics.distributions?.confidence?.medium || 0}
                        </span>
                      </div>
                      <div className="confidence-bar-bg">
                        <div
                          className="confidence-bar medium"
                          style={{
                            width: `${((analytics.distributions?.confidence?.medium || 0) / (analytics.summary?.totalScans || 1)) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="confidence-item">
                      <div className="confidence-header">
                        <span className="confidence-label">Low (&lt;70%)</span>
                        <span className="confidence-count">
                          {analytics.distributions?.confidence?.low || 0}
                        </span>
                      </div>
                      <div className="confidence-bar-bg">
                        <div
                          className="confidence-bar low"
                          style={{
                            width: `${((analytics.distributions?.confidence?.low || 0) / (analytics.summary?.totalScans || 1)) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Validation Status */}
              <div className="analytics-card">
                <div className="card-header">
                  <div className="card-title">
                    <CheckCircle2 size={20} />
                    <h3>Validation Status</h3>
                  </div>
                </div>
                <div className="card-content">
                  <div className="validation-grid">
                    <div className="validation-item tflite">
                      <span className="validation-count">
                        {analytics.distributions?.validation?.tflite_only || 0}
                      </span>
                      <span className="validation-label">TFLite Only</span>
                    </div>
                    <div className="validation-item validated">
                      <span className="validation-count">
                        {analytics.distributions?.validation?.validated || 0}
                      </span>
                      <span className="validation-label">Validated</span>
                    </div>
                    <div className="validation-item manual">
                      <span className="validation-count">
                        {analytics.distributions?.validation?.manual_override || 0}
                      </span>
                      <span className="validation-label">Manual</span>
                    </div>
                    <div className="validation-item conflict">
                      <span className="validation-count">
                        {analytics.distributions?.validation?.conflict || 0}
                      </span>
                      <span className="validation-label">Conflict</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming Harvests */}
            {analytics.upcomingHarvests && analytics.upcomingHarvests.length > 0 && (
              <div className="harvests-section">
                <div className="section-header">
                  <div className="header-title">
                    <Clock size={20} />
                    <h3>Upcoming Harvests</h3>
                  </div>
                  <span className="harvest-count">{analytics.upcomingHarvests.length} pending</span>
                </div>
                <div className="harvests-list">
                  {analytics.upcomingHarvests.slice(0, 4).map((harvest, index) => (
                    <div key={harvest.id || index} className="harvest-card">
                      <div className="harvest-image">
                        {harvest.imageUrl ? (
                          <img src={harvest.imageUrl} alt={harvest.variety} />
                        ) : (
                          <div className="harvest-placeholder">🥒</div>
                        )}
                      </div>
                      <div className="harvest-info">
                        <span className="harvest-variety">{harvest.variety || 'Unknown'}</span>
                        <span className="harvest-name">{harvest.name || 'Unnamed'}</span>
                        <span className="harvest-stage">{harvest.currentStage}</span>
                      </div>
                      <div className="harvest-countdown">
                        <span className="countdown-value">{harvest.daysToHarvest}</span>
                        <span className="countdown-label">days</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Insights Section */}
            {analytics.insights && analytics.insights.length > 0 && (
              <div className="insights-section">
                <div className="section-header">
                  <div className="header-title">
                    <Zap size={20} />
                    <h3>AI Insights</h3>
                  </div>
                </div>
                <div className="insights-list">
                  {analytics.insights.map((insight, index) => (
                    <div key={index} className={`insight-card ${insight.type || 'info'}`}>
                      <div className="insight-icon">
                        {insight.type === 'success' && '✅'}
                        {insight.type === 'warning' && '⚠️'}
                        {insight.type === 'info' && '💡'}
                        {!insight.type && '💡'}
                      </div>
                      <p className="insight-text">{insight.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="quick-actions-section">
              <h3>Quick Actions</h3>
              <div className="quick-actions-grid">
                <Link to="/user/scan" className="quick-action-card">
                  <div className="qa-icon scan">
                    <Scan size={24} />
                  </div>
                  <span className="qa-title">Scan Gourd</span>
                  <span className="qa-desc">Analyze flower or leaf</span>
                  <ChevronRight size={18} className="qa-arrow" />
                </Link>
                <Link to="/user/history" className="quick-action-card">
                  <div className="qa-icon history">
                    <Clock size={24} />
                  </div>
                  <span className="qa-title">Scan History</span>
                  <span className="qa-desc">View past scans</span>
                  <ChevronRight size={18} className="qa-arrow" />
                </Link>
                <Link to="/user/forum" className="quick-action-card">
                  <div className="qa-icon forum">
                    <Activity size={24} />
                  </div>
                  <span className="qa-title">Community</span>
                  <span className="qa-desc">Join discussions</span>
                  <ChevronRight size={18} className="qa-arrow" />
                </Link>
                <Link to="/user/learn" className="quick-action-card">
                  <div className="qa-icon learn">
                    <Leaf size={24} />
                  </div>
                  <span className="qa-title">Learn</span>
                  <span className="qa-desc">Farming guides</span>
                  <ChevronRight size={18} className="qa-arrow" />
                </Link>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-analytics">
            <div className="empty-icon">📊</div>
            <h3>No Analytics Data Yet</h3>
            <p>Start scanning gourds and leaves to see your analytics here!</p>
            <Link to="/user/scan" className="empty-cta">
              <Scan size={20} />
              Start Scanning
            </Link>
          </div>
        )}
      </div>
    </UserLayout>
  );
};

export default UserDashboard;
