import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const STATUS = {
  HEALTHY: 'Healthy',
  AT_RISK: 'At risk',
  DISEASED: 'Diseased',
};

function getScanHealth(scan) {
  const gemini = scan.aiPrediction?.gemini;

  if (scan.scanType === 'leaf' && gemini?.leafHealth?.healthScore !== undefined) {
    return categorize(gemini.leafHealth.healthScore);
  }

  if (gemini?.qualityMetrics?.healthScore !== undefined) {
    return categorize(gemini.qualityMetrics.healthScore);
  }

  if (gemini?.flowerQuality?.overallScore !== undefined) {
    return categorize(gemini.flowerQuality.overallScore);
  }

  // Fallback to scan confidence
  return categorize(scan.confidence);
}

function categorize(score) {
  if (score >= 80) return STATUS.HEALTHY;
  if (score >= 50) return STATUS.AT_RISK;
  return STATUS.DISEASED;
}

function getDetectedIssue(scan) {
  const gemini = scan.aiPrediction?.gemini;
  const concerns = gemini?.observations?.concerns;

  if (Array.isArray(concerns) && concerns.length > 0) {
    return concerns.join('; ');
  }

  if (scan.scanType === 'leaf' && gemini?.leafHealth?.visibleIssues) {
    return gemini.leafHealth.visibleIssues;
  }

  if (scan.diseaseInfo && (scan.diseaseInfo.disease || scan.diseaseInfo.issue)) {
    return scan.diseaseInfo.disease || scan.diseaseInfo.issue;
  }

  return 'No issue detected';
}

function getRecommendation(scan) {
  const gemini = scan.aiPrediction?.gemini;
  const recommendations = gemini?.observations?.recommendations;

  if (Array.isArray(recommendations) && recommendations.length > 0) {
    return recommendations.join('; ');
  }

  if (scan.scanType === 'leaf' && gemini?.leafHealth?.nutrientDeficiencies) {
    return `Address nutrient deficiency: ${gemini.leafHealth.nutrientDeficiencies}`;
  }

  return 'Continue regular monitoring';
}

function formatDate(dateValue) {
  if (!dateValue) return 'N/A';
  return new Date(dateValue).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateOnly(dateValue) {
  if (!dateValue) return 'N/A';
  return new Date(dateValue).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getConfidence(scan) {
  const gemini = scan.aiPrediction?.gemini;
  if (gemini?.confidence !== undefined) return gemini.confidence;
  return scan.confidence;
}

export async function generatePlantHealthScanReport({ user, startDate, endDate, scans }) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Enrich scans with derived health status
  const enrichedScans = scans.map((scan) => ({
    ...scan,
    healthStatus: getScanHealth(scan),
    issue: getDetectedIssue(scan),
    recommendation: getRecommendation(scan),
    confidenceValue: getConfidence(scan),
  }));

  const totalScans = enrichedScans.length;
  const healthyCount = enrichedScans.filter((s) => s.healthStatus === STATUS.HEALTHY).length;
  const atRiskCount = enrichedScans.filter((s) => s.healthStatus === STATUS.AT_RISK).length;
  const diseasedCount = enrichedScans.filter((s) => s.healthStatus === STATUS.DISEASED).length;
  const avgConfidence =
    totalScans > 0
      ? enrichedScans.reduce((sum, s) => sum + (Number(s.confidenceValue) || 0), 0) / totalScans
      : 0;

  // Header
  doc.setFillColor(45, 106, 79);
  doc.rect(0, 0, pageWidth, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Plant Health Scan Report', margin, 14);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated for: ${user?.firstName || 'Farmer'} ${user?.lastName || ''}`.trim(), margin, 21);
  doc.text(
    `Period: ${formatDateOnly(startDate)} - ${formatDateOnly(endDate)}`,
    margin,
    27
  );

  // Summary cards
  let y = 42;
  doc.setTextColor(26, 26, 26);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', margin, y);

  y += 8;
  const cardWidth = (pageWidth - margin * 2 - 12) / 4;
  const cardHeight = 18;
  const summary = [
    { label: 'Total Scans', value: totalScans },
    { label: 'Healthy', value: healthyCount, color: '#059669' },
    { label: 'At Risk', value: atRiskCount, color: '#d97706' },
    { label: 'Diseased', value: diseasedCount, color: '#dc2626' },
  ];

  summary.forEach((item, index) => {
    const x = margin + index * (cardWidth + 4);
    doc.setFillColor(248, 250, 248);
    doc.setDrawColor(229, 229, 229);
    doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');

    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.setFont('helvetica', 'normal');
    doc.text(item.label, x + 4, y + 6);

    doc.setFontSize(14);
    doc.setTextColor(item.color || 26, 26, 26);
    doc.setFont('helvetica', 'bold');
    doc.text(String(item.value), x + 4, y + 14);
  });

  y += cardHeight + 10;
  doc.setFontSize(10);
  doc.setTextColor(45, 106, 79);
  doc.setFont('helvetica', 'bold');
  doc.text(`Average AI Confidence: ${avgConfidence.toFixed(1)}%`, margin, y);

  // Scan details table
  y += 12;
  doc.setTextColor(26, 26, 26);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Scan Records', margin, y);

  const tableRows = enrichedScans.map((scan, index) => [
    index + 1,
    formatDate(scan.date),
    scan.scanType ? scan.scanType.charAt(0).toUpperCase() + scan.scanType.slice(1) : 'Scan',
    scan.variety || 'Unknown',
    scan.healthStatus,
    scan.issue.length > 45 ? scan.issue.substring(0, 45) + '...' : scan.issue,
    `${Number(scan.confidenceValue || 0).toFixed(1)}%`,
    scan.recommendation.length > 45
      ? scan.recommendation.substring(0, 45) + '...'
      : scan.recommendation,
  ]);

  autoTable(doc, {
    startY: y + 4,
    margin: { left: margin, right: margin },
    head: [['#', 'Date', 'Type', 'Variety', 'Status', 'Detected Issue', 'Confidence', 'Recommendation']],
    body: tableRows,
    headStyles: {
      fillColor: [45, 106, 79],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2,
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 28 },
      2: { cellWidth: 18 },
      3: { cellWidth: 28 },
      4: { cellWidth: 20 },
      5: { cellWidth: 42 },
      6: { cellWidth: 18 },
      7: { cellWidth: 'auto' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 248],
    },
    didParseCell: function (data) {
      if (data.section === 'body' && data.column.index === 4) {
        const status = data.cell.raw;
        if (status === STATUS.HEALTHY) data.cell.styles.textColor = [5, 150, 105];
        if (status === STATUS.AT_RISK) data.cell.styles.textColor = [217, 119, 6];
        if (status === STATUS.DISEASED) data.cell.styles.textColor = [220, 38, 38];
      }
    },
    didDrawPage: function (data) {
      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(136, 136, 136);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount} | Generated by EGourd`,
        pageWidth - margin,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'right' }
      );
    },
  });

  // Save
  const filename = `Plant_Health_Scan_Report_${formatDateOnly(startDate)}_to_${formatDateOnly(
    endDate
  )}.pdf`.replace(/\s/g, '_');
  doc.save(filename);
}
