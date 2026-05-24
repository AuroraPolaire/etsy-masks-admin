import { jsPDF } from 'jspdf';

import { PRINT_FOOTER } from '../constants';
import { createGeneratedFile, createPngBlobFromImage, fileToDataUrl } from './files';
import { slugify } from './slugify';

import type { ManagedFile, Project } from '../types';

type PdfFormat = {
  label: 'A4' | 'US_Letter';
  jsPdfFormat: 'a4' | 'letter';
};

const PDF_FORMATS: PdfFormat[] = [
  { label: 'A4', jsPdfFormat: 'a4' },
  { label: 'US_Letter', jsPdfFormat: 'letter' },
];

const scaleRatio = {
  small: 0.62,
  medium: 0.76,
  large: 0.9,
} as const;

const addCalibrationPage = (doc: jsPDF, title: string, margin: number): void => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Print Calibration Page', margin, 28);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(title, margin, 39, { maxWidth: 170 });
  doc.setLineWidth(0.7);
  doc.line(margin, 65, margin + 100, 65);
  doc.setFontSize(10);
  doc.text('100mm', margin + 42, 73);
  doc.text('Print at 100% scale and measure this line. It should be 100mm.', margin, 88, {
    maxWidth: 170,
  });
};

const addMaskPage = async (
  doc: jsPDF,
  project: Project,
  imageFile: ManagedFile,
  subjectName: string,
): Promise<void> => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = project.pdfSettings.pageMarginMm;
  const labelHeight = project.pdfSettings.showSubjectLabel ? 13 : 0;
  const footerHeight = project.pdfSettings.showInstructionFooter ? 16 : 0;
  const imageAreaTop = margin + labelHeight;
  const imageAreaHeight = pageHeight - margin * 2 - labelHeight - footerHeight;
  const imageAreaWidth = pageWidth - margin * 2;
  const maxImageWidth = imageAreaWidth * scaleRatio[project.pdfSettings.maskScale];
  const maxImageHeight = imageAreaHeight * scaleRatio[project.pdfSettings.maskScale];
  const metadata = imageFile.imageMetadata ?? { width: 3000, height: 3000 };
  const aspectRatio = metadata.width / metadata.height || 1;
  let renderWidth = maxImageWidth;
  let renderHeight = renderWidth / aspectRatio;

  if (renderHeight > maxImageHeight) {
    renderHeight = maxImageHeight;
    renderWidth = renderHeight * aspectRatio;
  }

  const x = (pageWidth - renderWidth) / 2;
  const y = imageAreaTop + (imageAreaHeight - renderHeight) / 2;
  const pngBlob = await createPngBlobFromImage(imageFile.file);
  const dataUrl = await fileToDataUrl(pngBlob);

  if (project.pdfSettings.showSubjectLabel) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(subjectName, pageWidth / 2, margin + 4, { align: 'center' });
  }

  doc.addImage(dataUrl, 'PNG', x, y, renderWidth, renderHeight, undefined, 'FAST');

  if (project.pdfSettings.showInstructionFooter) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(PRINT_FOOTER, pageWidth / 2, pageHeight - margin + 2, {
      align: 'center',
      maxWidth: pageWidth - margin * 2,
    });
  }
};

export const generatePrintablePdfs = async (
  project: Project,
  approvedFiles: ManagedFile[],
): Promise<ManagedFile[]> => {
  const enabledFormats = PDF_FORMATS.filter((format) =>
    format.label === 'A4' ? project.pdfSettings.generateA4 : project.pdfSettings.generateUSLetter,
  );
  const subjectById = new Map(project.subjects.map((subject) => [subject.id, subject.name]));
  const themeSlug = slugify(project.settings.theme);
  const generatedFiles: ManagedFile[] = [];

  for (const format of enabledFormats) {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: format.jsPdfFormat,
      compress: true,
    });

    if (project.pdfSettings.includeCalibrationPage) {
      addCalibrationPage(doc, project.settings.title, project.pdfSettings.pageMarginMm);
    }

    for (let index = 0; index < approvedFiles.length; index += 1) {
      const imageFile = approvedFiles[index];
      if (!imageFile) {
        continue;
      }

      if (project.pdfSettings.includeCalibrationPage || index > 0) {
        doc.addPage(format.jsPdfFormat, 'portrait');
      }

      const subjectName =
        imageFile.mappedSubjectId && subjectById.get(imageFile.mappedSubjectId)
          ? subjectById.get(imageFile.mappedSubjectId)
          : imageFile.name;

      await addMaskPage(doc, project, imageFile, subjectName ?? imageFile.name);
    }

    const blob = doc.output('blob');
    generatedFiles.push(
      createGeneratedFile(blob, `${themeSlug}_${format.label}_printable.pdf`, 'generated-pdf'),
    );
  }

  return generatedFiles;
};
