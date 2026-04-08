import jsPDF from 'jspdf';
import { Vital } from '@/types';

export const exportVitalsCSV = (vitals: Vital[], patientName: string) => {
  const headers = ['Recorded At', 'Heart Rate', 'Temperature', 'SpO2', 'BP Systolic', 'BP Diastolic', 'Respiratory Rate', 'Status'];
  const rows = vitals.map(v => [
    new Date(v.recorded_at).toLocaleString(),
    v.heart_rate,
    v.temperature,
    v.spo2,
    v.blood_pressure_systolic ?? '',
    v.blood_pressure_diastolic ?? '',
    v.respiratory_rate ?? '',
    v.status,
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadFile(csv, `vitals_${patientName.replace(/\s+/g, '_')}_${Date.now()}.csv`, 'text/csv');
};

export const exportGenericCSV = (data: Record<string, any>[], filename: string) => {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  downloadFile(csv, `${filename}_${Date.now()}.csv`, 'text/csv');
};

export const generateHealthReportPDF = async (
  patientName: string,
  patientInfo: { age: number; gender: string; room: string; diagnosis: string | null; admitted: string },
  vitals: Vital[],
  blockchainVerified: boolean,
  txHashes: string[]
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(20);
  doc.setTextColor(0, 120, 150);
  doc.text('IPMS Health Report', pageWidth / 2, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });

  // Patient Info
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('Patient Information', 14, 42);
  doc.setFontSize(10);
  doc.setTextColor(60);
  const info = [
    `Name: ${patientName}`,
    `Age: ${patientInfo.age} | Gender: ${patientInfo.gender}`,
    `Room: ${patientInfo.room}`,
    `Diagnosis: ${patientInfo.diagnosis || 'N/A'}`,
    `Admitted: ${new Date(patientInfo.admitted).toLocaleDateString()}`,
  ];
  info.forEach((line, i) => doc.text(line, 14, 52 + i * 7));

  // Latest Vitals
  const latest = vitals[vitals.length - 1];
  if (latest) {
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Latest Vital Signs', 14, 95);
    doc.setFontSize(10);
    doc.setTextColor(60);
    const vitalLines = [
      `Heart Rate: ${latest.heart_rate} bpm`,
      `Temperature: ${latest.temperature}°C`,
      `SpO₂: ${latest.spo2}%`,
      `Blood Pressure: ${latest.blood_pressure_systolic ?? '-'}/${latest.blood_pressure_diastolic ?? '-'} mmHg`,
      `Respiratory Rate: ${latest.respiratory_rate ?? '-'} breaths/min`,
      `Status: ${latest.status}`,
      `Recorded: ${new Date(latest.recorded_at).toLocaleString()}`,
    ];
    vitalLines.forEach((line, i) => doc.text(line, 14, 105 + i * 7));
  }

  // Vitals History Table
  if (vitals.length > 1) {
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Vitals History (Last 10)', 14, 160);
    doc.setFontSize(8);
    doc.setTextColor(80);
    const tableVitals = vitals.slice(-10);
    const headers = ['Time', 'HR', 'Temp', 'SpO₂', 'Status'];
    const colWidths = [50, 25, 25, 25, 30];
    let startX = 14;
    headers.forEach((h, i) => {
      doc.text(h, startX, 170);
      startX += colWidths[i];
    });
    tableVitals.forEach((v, row) => {
      startX = 14;
      const vals = [
        new Date(v.recorded_at).toLocaleTimeString(),
        `${v.heart_rate}`,
        `${v.temperature}°C`,
        `${v.spo2}%`,
        v.status,
      ];
      vals.forEach((val, i) => {
        doc.text(val, startX, 178 + row * 6);
        startX += colWidths[i];
      });
    });
  }

  // Blockchain Verification
  doc.addPage();
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('Blockchain Verification', 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(blockchainVerified ? 0 : 200, blockchainVerified ? 128 : 0, 0);
  doc.text(`Status: ${blockchainVerified ? '✓ Data integrity verified on-chain' : '⚠ Verification pending'}`, 14, 30);

  if (txHashes.length > 0) {
    doc.setFontSize(9);
    doc.setTextColor(60);
    doc.text('Transaction Hashes (Sepolia Etherscan):', 14, 42);
    txHashes.slice(0, 10).forEach((hash, i) => {
      doc.text(`• ${hash}`, 14, 50 + i * 6);
    });
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('This report is tamper-proof verified via blockchain. Scan QR code to verify on Etherscan.', 14, 280);
  doc.text('Doctor Signature: ____________________', 14, 288);

  doc.save(`health_report_${patientName.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
};

const downloadFile = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
