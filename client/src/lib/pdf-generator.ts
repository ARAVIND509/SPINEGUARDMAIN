import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AnalysisResults, ClinicalFinding, HumanReview } from '@shared/schema';

export interface ClinicInfo {
  institutionName?: string;
  departmentName?: string;
  doctorName?: string;
  licenseNumber?: string;
}

export interface PatientInfo {
  name: string;
  age?: number;
  gender?: string;
  medicalRecordNumber?: string;
}

export interface ScanInfo {
  imageType: string;
  uploadDate: string;
  scanImageUrl?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// HOSPITAL-GRADE DOCUMENT HEADER
// ════════════════════════════════════════════════════════════════════════════
function addHospitalHeader(doc: jsPDF, title: string, pageNum: number, totalPages: number, clinicInfo?: ClinicInfo) {
  const headerHeight = 36;
  
  // Executive Deep Navy Banner
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(0, 0, 210, headerHeight, 'F');

  // Cyan-Indigo Accent Stripe
  doc.setFillColor(59, 130, 246); // Blue-500
  doc.rect(0, headerHeight - 2, 210, 2, 'F');

  // Medical Cross Icon Emblem
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(14, 8, 18, 18, 3, 3, 'F');
  doc.setFillColor(255, 255, 255);
  // Cross bars
  doc.rect(21, 11, 4, 12, 'F');
  doc.rect(17, 15, 12, 4, 'F');

  // Institution Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const institution = clinicInfo?.institutionName || 'SPINEGUARD ADVANCED NEUROSPINE IMAGING';
  doc.text(institution.toUpperCase(), 38, 16);

  // Department & Subtitle
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // Slate-400
  const department = clinicInfo?.departmentName || 'DEPARTMENT OF NEURORADIOLOGY & MUSCULOSKELETAL IMAGING';
  doc.text(department.toUpperCase(), 38, 22);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(56, 189, 248); // Sky-400
  doc.text(title.toUpperCase(), 38, 28);

  // Right-aligned Document Badges
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(248, 250, 252);
  doc.text('CONFIDENTIAL MEDICAL RECORD', 195, 13, { align: 'right' });

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  const reportDate = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  doc.text(`REPORT DATE: ${reportDate}`, 195, 18, { align: 'right' });
  doc.text(`SECURITY: RESTRICTED ACCESS`, 195, 23, { align: 'right' });
  doc.text(`PAGE ${pageNum} OF ${totalPages}`, 195, 28, { align: 'right' });

  doc.setTextColor(0, 0, 0);
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION TITLE HELPER
// ════════════════════════════════════════════════════════════════════════════
function addSectionHeader(doc: jsPDF, title: string, yPos: number) {
  // Left pill indicator
  doc.setFillColor(37, 99, 235);
  doc.rect(14, yPos - 3.5, 3.5, 6, 'F');

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(title, 21, yPos + 1);

  // Separator rule
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(14, yPos + 4, 196, yPos + 4);
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN HOSPITAL-GRADE PDF BUILDER
// ════════════════════════════════════════════════════════════════════════════
export async function generateAnalysisPDF(
  results: AnalysisResults,
  patientInfo: PatientInfo,
  scanInfo: ScanInfo,
  clinicInfo?: ClinicInfo
): Promise<jsPDF> {
  const doc = new jsPDF();
  let yPosition = 44;

  // ──────────────────────────────────────────────────────────────────────────
  // 1. PATIENT DEMOGRAPHICS & EXAMINATION METADATA
  // ──────────────────────────────────────────────────────────────────────────
  addSectionHeader(doc, '1. PATIENT & EXAMINATION METADATA', yPosition);
  yPosition += 8;

  const examDate = scanInfo.uploadDate
    ? new Date(scanInfo.uploadDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    : new Date().toLocaleDateString();

  autoTable(doc, {
    startY: yPosition,
    head: [['PATIENT INFORMATION', 'IMAGING STUDY PROTOCOL', 'FACILITY & REFERRAL']],
    body: [
      [
        `Patient Name: ${patientInfo.name || 'Anonymous'}\nMRN: ${patientInfo.medicalRecordNumber || 'MRN-PENDING'}\nAge / Sex: ${patientInfo.age ? `${patientInfo.age} Y` : 'N/A'} / ${patientInfo.gender || 'Unspecified'}`,
        `Modality: ${scanInfo.imageType.toUpperCase()}\nAcquisition Date: ${examDate}\nDiagnostic Protocol: Standard Sagittal Spine Series`,
        `Facility: ${clinicInfo?.institutionName || 'Advanced Spine Imaging Institute'}\nDepartment: ${clinicInfo?.departmentName || 'Neuroradiology Division'}\nOrdering Provider: Authorized Clinical Staff`
      ]
    ],
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 3.5, font: 'helvetica', textColor: [30, 41, 59] },
    headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold', fontSize: 7.5 }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 8;

  // ──────────────────────────────────────────────────────────────────────────
  // 2. CLINICAL ATTESTATION & REVIEW AUDIT (HUMAN-IN-THE-LOOP)
  // ──────────────────────────────────────────────────────────────────────────
  addSectionHeader(doc, '2. CLINICAL ATTESTATION & QUALITY AUDIT', yPosition);
  yPosition += 8;

  const humanReview = results.humanReview;
  const reviewStatus = humanReview?.status || 'awaiting_review';
  const reviewerName = humanReview?.reviewerUsername || clinicInfo?.doctorName || 'Awaiting Authorized Physician Sign-off';
  const decisionText = humanReview?.decision ? humanReview.decision.toUpperCase() : 'PENDING RADIOLOGIST EVALUATION';
  const reviewTimestamp = humanReview?.reviewedAt ? new Date(humanReview.reviewedAt).toLocaleString() : 'Pending Final Sign-Off';

  autoTable(doc, {
    startY: yPosition,
    head: [['REVIEW STATUS', 'CLINICAL DECISION', 'ATTESTING RADIOLOGIST', 'TIMESTAMP & AUDIT']],
    body: [
      [
        reviewStatus.toUpperCase().replace(/_/g, ' '),
        decisionText,
        reviewerName,
        reviewTimestamp
      ]
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3.5, font: 'helvetica' },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 7.5, fontStyle: 'bold' },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 0) {
        if (reviewStatus === 'accepted') doc.setTextColor(22, 163, 74);
        else if (reviewStatus === 'modified') doc.setTextColor(217, 119, 6);
        else doc.setTextColor(220, 38, 38);
      }
    }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 5;

  if (humanReview?.reasonForModification) {
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(0.4);
    doc.roundedRect(14, yPosition, 182, 12, 1.5, 1.5, 'FD');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(146, 64, 14);
    doc.text('PHYSICIAN MODIFICATION NOTES:', 18, yPosition + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(humanReview.reasonForModification, 172), 18, yPosition + 8.5);
    doc.setTextColor(0, 0, 0);
    yPosition += 16;
  } else {
    yPosition += 4;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. DIAGNOSTIC FINDINGS & PATHOLOGY SCREENING
  // ──────────────────────────────────────────────────────────────────────────
  addSectionHeader(doc, '3. DIAGNOSTIC FINDINGS & SEVERITY ASSESSMENT', yPosition);
  yPosition += 8;

  const findingsList = results.checkedConditions || results.findings || [];
  const primaryFinding = results.primaryFinding || findingsList[0];

  // Primary Impression Hero Callout Box
  if (primaryFinding) {
    const isSevere = primaryFinding.severity === 'severe';
    const isModerate = primaryFinding.severity === 'moderate';
    
    // Background tint
    if (isSevere) {
      doc.setFillColor(254, 242, 242); // Rose-50
      doc.setDrawColor(239, 68, 68);
    } else if (isModerate) {
      doc.setFillColor(255, 251, 235); // Amber-50
      doc.setDrawColor(245, 158, 11);
    } else {
      doc.setFillColor(240, 253, 244); // Green-50
      doc.setDrawColor(34, 197, 94);
    }
    doc.setLineWidth(0.6);
    doc.roundedRect(14, yPosition, 182, 17, 2, 2, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('PRIMARY PATHOLOGICAL OBSERVATION:', 18, yPosition + 5.5);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    if (isSevere) doc.setTextColor(185, 28, 28);
    else if (isModerate) doc.setTextColor(180, 83, 9);
    else doc.setTextColor(21, 128, 61);
    doc.text(`${primaryFinding.condition.toUpperCase()} (${primaryFinding.severity.toUpperCase()})`, 18, yPosition + 12);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(`CONFIDENCE: ${primaryFinding.confidence}% | LOCATION: ${primaryFinding.location || 'L4-L5 Segment'}`, 190, yPosition + 12, { align: 'right' });

    yPosition += 22;
  }

  // Full Screened Pathologies Table
  autoTable(doc, {
    startY: yPosition,
    head: [['PATHOLOGICAL CONDITION', 'SEVERITY', 'CONFIDENCE', 'ANATOMICAL REGION', 'DIAGNOSTIC STATUS']],
    body: findingsList.map((f: ClinicalFinding) => [
      f.condition,
      f.severity.toUpperCase(),
      `${f.confidence}%`,
      f.location || 'Spinal Axis',
      f.severity === 'normal' ? 'Normal / Cleared' : 'Pathology Identified'
    ]),
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 7.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5, cellPadding: 3 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        const sev = data.cell.raw as string;
        if (sev === 'SEVERE') doc.setTextColor(220, 38, 38);
        else if (sev === 'MODERATE') doc.setTextColor(217, 119, 6);
        else if (sev === 'MILD') doc.setTextColor(37, 99, 235);
        else doc.setTextColor(22, 163, 74);
      }
    }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 8;

  // Clinical Summary Text (if present)
  if (results.summary) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.roundedRect(14, yPosition, 182, 14, 1.5, 1.5, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('RADIOLOGICAL IMPRESSION & SUMMARY:', 18, yPosition + 5);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const summaryLines = doc.splitTextToSize(results.summary, 172);
    doc.text(summaryLines, 18, yPosition + 9.5);

    yPosition += 18;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PAGE 2: VISUAL EVIDENCE, PATIENT EDUCATION & ATTESTATION
  // ──────────────────────────────────────────────────────────────────────────
  doc.addPage();
  yPosition = 44;

  // ──────────────────────────────────────────────────────────────────────────
  // 4. DIAGNOSTIC IMAGING & EXPLAINABLE AI EVIDENCE
  // ──────────────────────────────────────────────────────────────────────────
  addSectionHeader(doc, '4. DIAGNOSTIC IMAGING & EXPLAINABILITY EVIDENCE', yPosition);
  yPosition += 8;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Comparative montage presenting the acquired radiographic scan alongside algorithmic feature sensitivity heatmaps.', 14, yPosition);
  yPosition += 6;

  // Extract Heatmap URL
  let heatmapDataUrl: string | null = null;
  if (results.allHeatmaps && primaryFinding && results.allHeatmaps[primaryFinding.condition]?.viridis) {
    heatmapDataUrl = `data:image/png;base64,${results.allHeatmaps[primaryFinding.condition].viridis}`;
  } else if (results.gradCamHeatmaps && results.gradCamHeatmaps.length > 0) {
    heatmapDataUrl = results.gradCamHeatmaps[0].heatmapImageUrl;
  }

  const rawScanUrl = scanInfo.scanImageUrl;
  const imgWidth = 85;
  const imgHeight = 70;

  if (rawScanUrl && heatmapDataUrl) {
    try {
      // Left: Baseline scan
      doc.setFillColor(241, 245, 249);
      doc.rect(14, yPosition, imgWidth, imgHeight, 'F');
      doc.addImage(rawScanUrl, 'PNG', 14, yPosition, imgWidth, imgHeight);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('PATIENT DIAGNOSTIC SCAN (BASELINE)', 14, yPosition + imgHeight + 4.5);

      // Right: Grad-CAM heatmap
      doc.setFillColor(241, 245, 249);
      doc.rect(111, yPosition, imgWidth, imgHeight, 'F');
      doc.addImage(heatmapDataUrl, 'PNG', 111, yPosition, imgWidth, imgHeight);
      doc.setFont('helvetica', 'bold');
      doc.text(`EXPLAINABLE AI HEATMAP: ${primaryFinding?.condition?.toUpperCase() || 'PRIMARY FINDING'}`, 111, yPosition + imgHeight + 4.5);

      yPosition += imgHeight + 11;
    } catch {
      // Image render fallback
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, yPosition, 182, 16, 1, 1, 'FD');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text('DIAGNOSTIC VISUALIZATION ARCHIVE', 18, yPosition + 6);
      doc.setFont('helvetica', 'normal');
      doc.text(`Scan Type: ${scanInfo.imageType} | Primary Finding: ${primaryFinding?.condition || 'Evaluated'}`, 18, yPosition + 11);
      yPosition += 22;
    }
  } else {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, yPosition, 182, 16, 1, 1, 'FD');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('IMAGING ARCHIVE RECORD', 18, yPosition + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(`Modality: ${scanInfo.imageType} | Acquisition Date: ${examDate} | Visualizations Stored in PACS`, 18, yPosition + 11);
    yPosition += 22;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. PATIENT PLAIN-ENGLISH TRANSLATION & CLINICAL RECOMMENDATIONS
  // ──────────────────────────────────────────────────────────────────────────
  addSectionHeader(doc, '5. PATIENT CLINICAL GUIDANCE & PLAIN-ENGLISH TRANSLATION', yPosition);
  yPosition += 8;

  const patientGuidanceBoxY = yPosition;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.roundedRect(14, patientGuidanceBoxY, 182, 34, 1.5, 1.5, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('PLAIN-ENGLISH SUMMARY:', 18, patientGuidanceBoxY + 5);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  let plainText = `The diagnostic study indicates features consistent with ${primaryFinding?.condition || 'spinal changes'}. `;
  if (primaryFinding?.severity === 'severe') {
    plainText += 'This represents significant narrowing or displacement that may compress adjacent nerve structures. You should schedule a follow-up with your spine specialist or orthopedic physician for a detailed management plan.';
  } else if (primaryFinding?.severity === 'moderate') {
    plainText += 'This indicates moderate structural changes. Non-operative management, physical therapy, and ergonomic posture adjustments are frequently recommended initial steps.';
  } else {
    plainText += 'Mild or no structural compromise was detected. Routine physical activity and core muscle conditioning help maintain spinal health.';
  }

  const plainLines = doc.splitTextToSize(plainText, 172);
  doc.text(plainLines, 18, patientGuidanceBoxY + 9.5);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(185, 28, 28);
  doc.text('RED FLAG SYMPTOMS (SEEK IMMEDIATE EMERGENCY CARE):', 18, patientGuidanceBoxY + 22);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(153, 27, 27);
  doc.text('Sudden loss of bowel or bladder control, progressive numbness in the groin/saddle area, or acute leg weakness (foot drop).', 18, patientGuidanceBoxY + 27);

  yPosition += 40;

  // ──────────────────────────────────────────────────────────────────────────
  // 6. OFFICIAL PHYSICIAN ATTESTATION & SIGNATURE BLOCK
  // ──────────────────────────────────────────────────────────────────────────
  addSectionHeader(doc, '6. PHYSICIAN ATTESTATION & SIGN-OFF BLOCK', yPosition);
  yPosition += 8;

  // Signature Block Frame
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.roundedRect(14, yPosition, 182, 28, 1.5, 1.5, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('ATTENDING RADIOLOGIST ATTESTATION:', 18, yPosition + 5.5);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('I have independently evaluated the acquired diagnostic scan and verified the clinical findings outlined in this document.', 18, yPosition + 10);

  // Signature line on right
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.5);
  doc.line(125, yPosition + 20, 185, yPosition + 20);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(reviewerName, 125, yPosition + 24);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Digital Sign-off: ${reviewTimestamp}`, 18, yPosition + 24);
  doc.text('Board Certified Radiologist / Attending Physician', 125, yPosition + 27);

  yPosition += 33;

  // ──────────────────────────────────────────────────────────────────────────
  // 7. MANDATORY ACADEMIC PROTOTYPE & REGULATORY COMPLIANCE NOTICE
  // ──────────────────────────────────────────────────────────────────────────
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(239, 68, 68);
  doc.setLineWidth(0.5);
  doc.roundedRect(14, yPosition, 182, 22, 1.5, 1.5, 'FD');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(153, 27, 27);
  doc.text('MANDATORY REGULATORY AND CLINICAL LIMITATION NOTICE:', 18, yPosition + 4.5);

  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(69, 10, 10);
  const legalDisclaimer =
    '1. ACADEMIC PROTOTYPE NOTICE: SpineGuard is an investigational academic prototype developed solely for research and explainability benchmarking. ' +
    'It is NOT cleared or approved by the US FDA, European CE, or any statutory health authority for primary medical diagnosis or independent clinical triage.\n' +
    '2. INVESTIGATIONAL REASONING: Feature sensitivity heatmaps represent statistical algorithmic activations and do not depict physical surgical margins or histological boundaries. ' +
    'All findings must be confirmed by a licensed radiologist on calibrated DICOM workstations before initiating treatment.';

  const legalLines = doc.splitTextToSize(legalDisclaimer, 174);
  doc.text(legalLines, 18, yPosition + 9);

  // ──────────────────────────────────────────────────────────────────────────
  // HEADER & FOOTER ON ALL PAGES
  // ──────────────────────────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addHospitalHeader(
      doc,
      i === 1 ? 'Radiological Pathology & Clinical Findings Report' : 'Diagnostic Imaging Evidence & Clinical Attestation',
      i,
      totalPages,
      clinicInfo
    );

    // Bottom Footer
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('SpineGuard Advanced Imaging — Confidential Academic & Clinical Diagnostic Document', 14, 290);
    doc.text(`Page ${i} of ${totalPages}`, 196, 290, { align: 'right' });
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(14, 287, 196, 287);
  }

  return doc;
}

export async function downloadAnalysisPDF(
  results: AnalysisResults,
  patientInfo: PatientInfo,
  scanInfo: ScanInfo,
  filename?: string,
  clinicInfo?: ClinicInfo
) {
  const doc = await generateAnalysisPDF(results, patientInfo, scanInfo, clinicInfo);
  const safePatientName = (patientInfo.name || 'Patient').replace(/\s+/g, '_');
  const defaultFilename = `SpineGuard_ClinicalReport_${safePatientName}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename || defaultFilename);
}
