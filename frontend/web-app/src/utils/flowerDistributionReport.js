import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function formatDateOnly(dateValue) {
  if (!dateValue) return 'N/A';
  return new Date(dateValue).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(dateValue) {
  if (!dateValue) return 'N/A';
  return new Date(dateValue).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function analyzeDistribution(scans) {
  const maleCount = scans.filter((s) => s.prediction === 'male').length;
  const femaleCount = scans.filter((s) => s.prediction === 'female').length;
  const total = maleCount + femaleCount;

  const maleRatio = total > 0 ? (maleCount / total) * 100 : 0;
  const femaleRatio = total > 0 ? (femaleCount / total) * 100 : 0;

  // Variety-level breakdown
  const byVariety = {};
  scans.forEach((scan) => {
    const variety = scan.variety || 'Unknown';
    if (!byVariety[variety]) {
      byVariety[variety] = { male: 0, female: 0, total: 0 };
    }
    byVariety[variety][scan.prediction] += 1;
    byVariety[variety].total += 1;
  });

  // Insight and risk
  let balanceInsight = 'Balanced male/female flower ratio.';
  let riskLevel = 'Low';
  let riskColor = '#059669';

  if (femaleRatio < 25) {
    balanceInsight =
      'Low female flower ratio detected. Consider hand pollination or adjusting plant nutrition to promote female flowers.';
    riskLevel = 'High';
    riskColor = '#dc2626';
  } else if (femaleRatio < 35) {
    balanceInsight =
      'Female flower ratio is below optimal. Monitor pollination success and consider supplemental pollination.';
    riskLevel = 'Moderate';
    riskColor = '#d97706';
  } else if (maleRatio < 20) {
    balanceInsight =
      'Low male flower ratio may limit pollination opportunities. Ensure proper vine health and sunlight.';
    riskLevel = 'Moderate';
    riskColor = '#d97706';
  }

  return {
    maleCount,
    femaleCount,
    total,
    maleRatio,
    femaleRatio,
    byVariety,
    balanceInsight,
    riskLevel,
    riskColor,
  };
}

function generateCsv({ user, startDate, endDate, scans, distribution }) {
  const rows = [
    ['Male vs Female Flower Distribution Report'],
    [`Generated for: ${user?.firstName || 'Farmer'} ${user?.lastName || ''}`.trim()],
    [`Period: ${formatDateOnly(startDate)} - ${formatDateOnly(endDate)}`],
    [`Generated at: ${formatDateTime(new Date())}`],
    [],
    ['Summary'],
    ['Total Flower Scans', distribution.total],
    ['Male Flowers', distribution.maleCount],
    ['Female Flowers', distribution.femaleCount],
    ['Male Ratio (%)', distribution.maleRatio.toFixed(1)],
    ['Female Ratio (%)', distribution.femaleRatio.toFixed(1)],
    ['Balance Insight', distribution.balanceInsight],
    ['Yield Risk', distribution.riskLevel],
    [],
    ['Distribution by Variety'],
    ['Variety', 'Male', 'Female', 'Total', 'Female Ratio (%)'],
    ...Object.entries(distribution.byVariety).map(([variety, data]) => [
      variety,
      data.male,
      data.female,
      data.total,
      data.total > 0 ? ((data.female / data.total) * 100).toFixed(1) : '0.0',
    ]),
    [],
    ['Scan-level Records'],
    ['Date', 'Variety', 'Prediction', 'Confidence (%)'],
    ...scans.map((scan) => [
      formatDateTime(scan.date),
      scan.variety || 'Unknown',
      scan.prediction ? scan.prediction.charAt(0).toUpperCase() + scan.prediction.slice(1) : 'N/A',
      Number(scan.confidence || 0).toFixed(1),
    ]),
  ];

  const csvContent = rows
    .map((row) =>
      row
        .map((cell) => {
          const str = String(cell ?? '');
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    )
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.setAttribute(
    'download',
    `Flower_Distribution_Report_${formatDateOnly(startDate)}_to_${formatDateOnly(
      endDate
    )}.csv`.replace(/\s/g, '_')
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function generatePdf({ user, startDate, endDate, scans, distribution }) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Header
  doc.setFillColor(45, 106, 79);
  doc.rect(0, 0, pageWidth, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Male vs Female Flower Distribution Report', margin, 13);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated for: ${user?.firstName || 'Farmer'} ${user?.lastName || ''}`.trim(), margin, 21);
  doc.text(`Period: ${formatDateOnly(startDate)} - ${formatDateOnly(endDate)}`, margin, 27);

  // Summary cards
  let y = 42;
  doc.setTextColor(26, 26, 26);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', margin, y);

  y += 8;
  const cardWidth = (pageWidth - margin * 2 - 12) / 4;
  const cardHeight = 20;
  const summary = [
    { label: 'Total Scans', value: distribution.total },
    { label: 'Male', value: distribution.maleCount, color: '#1976d2' },
    { label: 'Female', value: distribution.femaleCount, color: '#c2185b' },
    { label: 'Avg Confidence', value: `${getAvgConfidence(scans).toFixed(1)}%`, color: '#2d6a4f' },
  ];

  summary.forEach((item, index) => {
    const x = margin + index * (cardWidth + 4);
    doc.setFillColor(248, 250, 248);
    doc.setDrawColor(229, 229, 229);
    doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');

    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.setFont('helvetica', 'normal');
    doc.text(item.label, x + 4, y + 6);

    doc.setFontSize(13);
    doc.setTextColor(item.color || 26, 26, 26);
    doc.setFont('helvetica', 'bold');
    doc.text(String(item.value), x + 4, y + 14);
  });

  y += cardHeight + 10;

  // Ratio bar
  doc.setFontSize(12);
  doc.setTextColor(26, 26, 26);
  doc.setFont('helvetica', 'bold');
  doc.text('Gender Ratio', margin, y);

  y += 6;
  const barWidth = pageWidth - margin * 2;
  const barHeight = 10;
  const maleWidth = (distribution.maleRatio / 100) * barWidth;

  doc.setFillColor(229, 229, 229);
  doc.roundedRect(margin, y, barWidth, barHeight, 2, 2, 'F');

  if (maleWidth > 0) {
    doc.setFillColor(25, 118, 210);
    doc.roundedRect(margin, y, maleWidth, barHeight, 2, 2, 'F');
  }

  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  if (maleWidth > 20) {
    doc.text(`M ${distribution.maleRatio.toFixed(1)}%`, margin + 4, y + 6.5);
  }
  if (barWidth - maleWidth > 20) {
    doc.text(
      `F ${distribution.femaleRatio.toFixed(1)}%`,
      margin + barWidth - 4,
      y + 6.5,
      { align: 'right' }
    );
  }

  y += barHeight + 10;

  // Insight and risk
  doc.setFontSize(11);
  doc.setTextColor(26, 26, 26);
  doc.setFont('helvetica', 'bold');
  doc.text('Pollination Balance Insight', margin, y);

  y += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);
  const splitInsight = doc.splitTextToSize(distribution.balanceInsight, pageWidth - margin * 2);
  doc.text(splitInsight, margin, y);

  y += splitInsight.length * 4.5 + 8;
  doc.setFontSize(11);
  doc.setTextColor(26, 26, 26);
  doc.setFont('helvetica', 'bold');
  doc.text('Yield Risk Indicator: ', margin, y);

  const riskColorHex = distribution.riskColor;
  const riskRgb = hexToRgb(riskColorHex);
  doc.setTextColor(riskRgb.r, riskRgb.g, riskRgb.b);
  doc.text(distribution.riskLevel, margin + 48, y);

  // Variety distribution table
  y += 12;
  doc.setTextColor(26, 26, 26);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Distribution by Variety', margin, y);

  const tableRows = Object.entries(distribution.byVariety).map(([variety, data]) => [
    variety,
    data.male,
    data.female,
    data.total,
    `${data.total > 0 ? ((data.female / data.total) * 100).toFixed(1) : 0}%`,
  ]);

  autoTable(doc, {
    startY: y + 4,
    margin: { left: margin, right: margin },
    head: [['Variety', 'Male', 'Female', 'Total', 'Female Ratio']],
    body: tableRows,
    headStyles: {
      fillColor: [45, 106, 79],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 248],
    },
    didDrawPage: function (data) {
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

  const filename = `Flower_Distribution_Report_${formatDateOnly(startDate)}_to_${formatDateOnly(
    endDate
  )}.pdf`.replace(/\s/g, '_');
  doc.save(filename);
}

function getAvgConfidence(scans) {
  if (!scans.length) return 0;
  return scans.reduce((sum, s) => sum + (Number(s.confidence) || 0), 0) / scans.length;
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

export function generateFlowerDistributionReport({ user, startDate, endDate, scans, format }) {
  const distribution = analyzeDistribution(scans);

  if (format === 'csv') {
    generateCsv({ user, startDate, endDate, scans, distribution });
  } else {
    generatePdf({ user, startDate, endDate, scans, distribution });
  }
}
