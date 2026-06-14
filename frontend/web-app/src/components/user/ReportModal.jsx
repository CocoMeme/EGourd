import React, { useState, useEffect } from 'react';
import { X, Download, Calendar, Loader2, FileText } from 'lucide-react';
import userApi from '../../services/userApi';
import { generatePlantHealthScanReport } from '../../utils/scanReportPdf';
import './ReportModal.css';

const ReportModal = ({ isOpen, onClose, user }) => {
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setStartDate(thirtyDaysAgo);
      setEndDate(today);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates.');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError('Start date cannot be later than end date.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const userId = user?._id || user?.id;
      if (!userId) {
        setError('User information is missing.');
        return;
      }

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

      await generatePlantHealthScanReport({
        user,
        startDate,
        endDate,
        scans,
      });

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
              <h3>Download Plant Health Report</h3>
              <p>Export an aggregate PDF of your scan records</p>
            </div>
          </div>
          <button className="report-modal-close" onClick={onClose} disabled={loading}>
            <X size={20} />
          </button>
        </div>

        <div className="report-modal-body">
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

          {error && <div className="report-modal-error">{error}</div>}

          <div className="report-modal-info">
            <p>
              The report will include all plant health scans within the selected date range, with
              health status, detected issues, confidence scores, and recommendations.
            </p>
          </div>
        </div>

        <div className="report-modal-footer">
          <button className="report-btn secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="report-btn primary"
            onClick={handleDownload}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="spinning" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Download size={18} />
                <span>Download PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
