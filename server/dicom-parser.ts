import * as dcmjs from 'dcmjs';
import sharp from 'sharp';

/**
 * DICOM Parser for SpineGuardAI
 * Extracts metadata and converts pixel data to displayable images.
 */

export interface DicomData {
    patientName: string;
    patientID: string;
    studyDate: string;
    modality: string;
    imageBuffer: Buffer; // PNG buffer for display
    metadata: Record<string, any>;
}

export async function parseDICOM(buffer: Buffer): Promise<DicomData> {
    try {
        const dicomData = dcmjs.data.DicomMessage.readFile(buffer.buffer);
        const dataset = dcmjs.data.DicomMetaDictionary.naturalizeDataset(dicomData.dict);

        // Extract metadata strictly preserving DICOM clinical tags
        const metadata: Record<string, any> = {
            isDicom: true,
            format: "DICOM",
            PatientName: dataset.PatientName?.Alphabetic || "Unknown",
            PatientID: dataset.PatientID || "N/A",
            StudyDate: dataset.StudyDate || "N/A",
            Modality: dataset.Modality || "N/A",
            Manufacturer: dataset.Manufacturer || "N/A",
            InstanceNumber: dataset.InstanceNumber || 0,
            SliceThickness: dataset.SliceThickness || null,
            PixelSpacing: dataset.PixelSpacing ? (Array.isArray(dataset.PixelSpacing) ? dataset.PixelSpacing : [dataset.PixelSpacing, dataset.PixelSpacing]) : null,
            WindowCenter: Array.isArray(dataset.WindowCenter) ? dataset.WindowCenter[0] : (dataset.WindowCenter || null),
            WindowWidth: Array.isArray(dataset.WindowWidth) ? dataset.WindowWidth[0] : (dataset.WindowWidth || null),
            RescaleIntercept: dataset.RescaleIntercept ?? null,
            RescaleSlope: dataset.RescaleSlope ?? null,
            PhotometricInterpretation: dataset.PhotometricInterpretation || "MONOCHROME2",
            ImageOrientationPatient: dataset.ImageOrientationPatient || null,
            Rows: dataset.Rows || null,
            Columns: dataset.Columns || null
        };

        // Extract pixel data and convert to image
        let imageBuffer: Buffer;

        if (dataset.PixelData) {
            // dcmjs provides pixel data as an array of frames
            // For now, we take the first frame for 2D display
            const rows = dataset.Rows;
            const columns = dataset.Columns;
            const pixelData = dataset.PixelData;

            // Use sharp to create a displayable PNG
            imageBuffer = await sharp(Buffer.from(pixelData), {
                raw: {
                    width: columns,
                    height: rows,
                    channels: 1 // DICOM is usually single channel (grayscale)
                }
            })
                .png()
                .toBuffer();
        } else {
            throw new Error("No pixel data found in DICOM file");
        }

        return {
            patientName: metadata.PatientName,
            patientID: metadata.PatientID,
            studyDate: metadata.StudyDate,
            modality: metadata.Modality,
            imageBuffer,
            metadata
        };
    } catch (error) {
        console.error("Error parsing DICOM:", error);
        throw new Error(`DICOM parsing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}
