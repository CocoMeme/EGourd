import React, { useState, useEffect } from 'react';
import { X, Download, Calendar, Loader2, FileText, Sprout } from 'lucide-react';
import userApi from '../../services/userApi';
import { generatePlantHealthScanReport } from '../../utils/scanReportPdf';
import { generateFlowerDistributionReport } from '../../utils/flowerDistributionReport';
import { generateGrowthProgressReport } from '../../utils/growthProgressReport';
import './ReportModal.css';

const REPORT_CONFIG = {
  'plant-health': {
    title: 'Plant Health Scan Report',
    subtitle: 'Export an aggregate PDF of your scan records',
    formats: ['pdf'],
    defaultFormat: 'pdf',
    info: 'Includes health status, detected issues, confidence scores, and recommendations.',
  },
  'flower-distribution': {
    title: 'Male vs Female Flower Distribution Report',
    subtitle: 'Export flower gender distribution and insights',
    formats: ['pdf', 'csv'],
    defaultFormat: 'pdf',
    info: 'Includes male/female counts, ratio analysis, balance insight, and yield risk indicator.',
  },
  'growth-progress': {
    title: 'Field Growth Progress Report',
    subtitle: 'Export plant growth timeline and trends',
    formats: ['pdf'],
    defaultFormat: 'pdf',
    info: 'Includes growth stage timeline, vine/leaf trends, health score, and comparison vs previous records.',
  },
};

function gourdDisplayName(gourdType) {
  if (!gourdType) return 'Unknown';
  return gourdType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatPlantLabel(plant) {
  const name = plant.plantName || 'Unnamed Plant';
  const type = gourdDisplayName(plant.gourdType);
  const age = plant.ageInDays != null ? `${plant.ageInDays}d` : null;
  return age ? `${name} (${type}, ${age})` : `${name} (${type})`;
}

const ReportModal = ({ isOpen, onClose, user, plants = [], reportType = 'plant-health' }) => {
  const config = REPORT_CONFIG[reportType] || REPORT_CONFIG['plant-health'];
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);
  const [format, setFormat] = useState(config.defaultFormat);
  const [selectedPlantId, setSelectedPlantId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setStartDate(thirtyDaysAgo);
      setEndDate(today);
      setFormat(config.defaultFormat);
      setSelectedPlantId('');
      setError(null);
    }
  }, [isOpen, reportType]);

  if (!isOpen) return null;

  const validateInputs = () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates.');
      return false;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError('Start date cannot be later than end date.');
      return false;
    }
    if (reportType === 'growth-progress' && !selectedPlantId) {
      setError('Please select a plant.');
      return false;
    }
    return true;
  };

  const handleDownload = async () => {
    if (!validateInputs()) return;

    try {
      setLoading(true);
      setError(null);

      const userId = user?._id || user?.id;
      if (!userId) {
        setError('User information is missing.');
        return;
      }

      if (reportType === 'plant-health') {
        const params = new URLSearchParams({
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          limit: '500',
        });
        const response = await userApi.get(`/scans/history/${userId}?${params.toString()}`);
        const scans = response?.data || [];

        if (scans.length === 0) {
          setError('No scan records found for the selected date range.');
          return;
        }

        await generatePlantHealthScanReport({ user, startDate, endDate, scans });
      }

      if (reportType === 'flower-distribution') {
        const params = new URLSearchParams({
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          limit: '500',
        });
        const response = await userApi.get(`/scans/history/${userId}?${params.toString()}`);
        const scans = response?.data || [];
        const flowerScans = scans.filter((s) => s.scanType === 'flower');

        if (flowerScans.length === 0) {
          setError('No flower scan records found for the selected date range.');
          return;
        }

        generateFlowerDistributionReport({
          user,
          startDate,
          endDate,
          scans: flowerScans,
          format,
        });
      }

      if (reportType === 'growth-progress') {
        const params = new URLSearchParams({
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
        });
        const response = await userApi.get(
          `/plants/${selectedPlantId}/growth-report?${params.toString()}`
        );
        const reportData = response?.data;

        if (!reportData || reportData.history.length === 0) {
          setError('No growth records found for the selected plant and date range.');
          return;
        }

        await generateGrowthProgressReport({
          user,
          startDate,
          endDate,
          reportData,
        });
      }

      onClose();
    } catch (err) {
      console.error('Error generating report:', err);
      setError(err?.message || 'Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="report-modal-overlay" onClick={onClose}>
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="report-modal-header">
          <div className="report-modal-title">
            <FileText size={22} />
            <div>
              <h3>{config.title}</h3>
              <p>{config.subtitle}</p>
            </div>
          </div>
          <button className="report-modal-close" onClick={onClose} disabled={loading}>
            <X size={20} />
          </button>
        </div>

        <div className="report-modal-body">
          {reportType === 'growth-progress' && (
            <div className="report-plant-field">
              <label htmlFor="report-plant-select">
                <Sprout size={14} />
                Select Plant
              </label>
              <select
                id="report-plant-select"
                value={selectedPlantId}
                onChange={(e) => setSelectedPlantId(e.target.value)}
                disabled={loading}
              >
                <option value="">Choose a plant...</option>
                {plants.map((plant) => (
                  <option key={plant._id} value={plant._id}>
                    {formatPlantLabel(plant)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="report-date-range">
            <div className="report-date-field">
              <label htmlFor="report-start-date">
                <Calendar size={14} />
                Start Date
              </label>
              <input
                id="report-start-date"
                type="date"
                value={startDate}
                max={endDate || today}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="report-date-field">
              <label htmlFor="report-end-date">
                <Calendar size={14} />
                End Date
              </label>
              <input
                id="report-end-date"
                type="date"
                value={endDate}
                min={startDate}
                max={today}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {config.formats.length > 1 && (
            <div className="report-format-selector">
              <label>Export Format</label>
              <div className="report-format-options">
                {config.formats.map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    className={`report-format-option ${format === fmt ? 'active' : ''}`}
                    onClick={() => setFormat(fmt)}
                    disabled={loading}
                  >
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <div className="report-modal-error">{error}</div>}

          <div className="report-modal-info">
            <p>{config.info}</p>
          </div>
        </div>

        <div className="report-modal-footer">
          <button className="report-btn secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="report-btn primary" onClick={handleDownload} disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className="spinning" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Download size={18} />
                <span>Download {format.toUpperCase()}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
