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

function gourdDisplayName(gourdType) {
  if (!gourdType) return 'Unknown';
  return gourdType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function getHealthColor(score) {
  if (score >= 80) return '#059669';
  if (score >= 50) return '#d97706';
  return '#dc2626';
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

export async function generateGrowthProgressReport({ user, startDate, endDate, reportData }) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  const plant = reportData.plant;
  const history = reportData.history;
  const summary = reportData.summary;

  // Header
  doc.setFillColor(45, 106, 79);
  doc.rect(0, 0, pageWidth, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Field Growth Progress Report', margin, 13);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated for: ${user?.firstName || 'Farmer'} ${user?.lastName || ''}`.trim(), margin, 21);
  doc.text(`Period: ${formatDateOnly(startDate)} - ${formatDateOnly(endDate)}`, margin, 27);

  // Plant info
  let y = 42;
  doc.setTextColor(26, 26, 26);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Plant Information', margin, y);

  y += 8;
  doc.setFillColor(248, 250, 248);
  doc.setDrawColor(229, 229, 229);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 28, 3, 3, 'FD');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text('Plant Name', margin + 8, y + 8);
  doc.text('Gourd Type', margin + 80, y + 8);
  doc.text('Age (days)', margin + 150, y + 8);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 26, 26);
  doc.text(plant.plantName || 'Unnamed', margin + 8, y + 16);
  doc.text(gourdDisplayName(plant.gourdType), margin + 80, y + 16);
  doc.text(String(plant.ageInDays || 0), margin + 150, y + 16);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text(`Planted: ${formatDateOnly(plant.datePlanted)}`, margin + 8, y + 23);
  doc.text(`Current Stage: ${plant.currentStatus || 'N/A'}`, margin + 80, y + 23);

  // Summary cards
  y += 38;
  doc.setTextColor(26, 26, 26);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Growth Summary', margin, y);

  y += 8;
  const cardWidth = (pageWidth - margin * 2 - 12) / 4;
  const cardHeight = 22;
  const growthSummary = [
    { label: 'Records', value: summary.totalRecords },
    { label: 'Avg Health', value: summary.avgHealthScore, suffix: '/5' },
    { label: 'Health Score', value: `${summary.growthHealthScore}%` },
    {
      label: 'Growth Health',
      value: Number(summary.growthHealthScore) >= 80 ? 'Good' : Number(summary.growthHealthScore) >= 50 ? 'Fair' : 'Poor',
      color: getHealthColor(Number(summary.growthHealthScore)),
    },
  ];

  growthSummary.forEach((item, index) => {
    const x = margin + index * (cardWidth + 4);
    doc.setFillColor(248, 250, 248);
    doc.setDrawColor(229, 229, 229);
    doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');

    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.setFont('helvetica', 'normal');
    doc.text(item.label, x + 4, y + 6);

    doc.setFontSize(12);
    const itemColor = item.color ? hexToRgb(item.color) : { r: 26, g: 26, b: 26 };
    doc.setTextColor(itemColor.r, itemColor.g, itemColor.b);
    doc.setFont('helvetica', 'bold');
    doc.text(`${String(item.value)}${item.suffix || ''}`, x + 4, y + 15);
  });

  // Trend charts (simple line/bar using jsPDF primitives)
  y += cardHeight + 14;
  doc.setTextColor(26, 26, 26);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Growth Trends', margin, y);

  const chartMargin = margin;
  const chartWidth = pageWidth - margin * 2;
  const chartHeight = 40;
  const chartY = y + 8;

  doc.setDrawColor(229, 229, 229);
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(chartMargin, chartY, chartWidth, chartHeight, 2, 2, 'FD');

  // Draw vine length trend
  const vineValues = history.map((h) => h.vineLength || 0);
  const maxVine = Math.max(...vineValues, 1);
  const stepX = history.length > 1 ? chartWidth / (history.length - 1) : chartWidth;

  doc.setDrawColor(64, 145, 108);
  doc.setLineWidth(0.8);
  history.forEach((entry, index) => {
    const x = chartMargin + index * stepX;
    const value = entry.vineLength || 0;
    const barHeight = (value / maxVine) * (chartHeight - 10);
    const barY = chartY + chartHeight - 5 - barHeight;

    doc.setFillColor(64, 145, 108);
    doc.rect(x - 3, barY, 6, barHeight, 'F');
  });

  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.setFont('helvetica', 'normal');
  doc.text('Vine Length (cm)', chartMargin + 4, chartY + 8);

  // Leaf count chart below
  y = chartY + chartHeight + 10;
  doc.setFontSize(12);
  doc.setTextColor(26, 26, 26);
  doc.setFont('helvetica', 'bold');
  doc.text('Leaf Count Over Time', margin, y);

  const leafChartY = y + 6;
  doc.setDrawColor(229, 229, 229);
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(chartMargin, leafChartY, chartWidth, chartHeight, 2, 2, 'FD');

  const leafValues = history.map((h) => h.leafCount || 0);
  const maxLeaf = Math.max(...leafValues, 1);

  doc.setDrawColor(25, 118, 210);
  history.forEach((entry, index) => {
    const x = chartMargin + index * (history.length > 1 ? chartWidth / (history.length - 1) : chartWidth);
    const value = entry.leafCount || 0;
    const barHeight = (value / maxLeaf) * (chartHeight - 10);
    const barY = leafChartY + chartHeight - 5 - barHeight;

    doc.setFillColor(25, 118, 210);
    doc.rect(x - 3, barY, 6, barHeight, 'F');
  });

  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text('Leaf Count', chartMargin + 4, leafChartY + 8);

  // Growth history table
  y = leafChartY + chartHeight + 16;
  doc.setFontSize(14);
  doc.setTextColor(26, 26, 26);
  doc.setFont('helvetica', 'bold');
  doc.text('Growth History', margin, y);

  const tableRows = history.map((entry) => [
    formatDateTime(entry.date),
    entry.status ? entry.status.charAt(0).toUpperCase() + entry.status.slice(1) : 'N/A',
    entry.vineLength != null ? `${entry.vineLength} cm` : 'N/A',
    entry.leafCount != null ? entry.leafCount : 'N/A',
    entry.plantHealth != null ? `${entry.plantHealth}/5` : 'N/A',
    entry.note || '',
  ]);

  autoTable(doc, {
    startY: y + 4,
    margin: { left: margin, right: margin },
    head: [['Date', 'Stage', 'Vine Length', 'Leaf Count', 'Health', 'Note']],
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

  const filename = `Growth_Progress_Report_${plant.plantName}_${formatDateOnly(
    startDate
  )}_to_${formatDateOnly(endDate)}.pdf`.replace(/\s/g, '_');
  doc.save(filename);
}
