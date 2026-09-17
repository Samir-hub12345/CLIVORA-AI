import logging
from typing import List, Optional
from app.schemas.case import OCRFieldSchema, ReportOCRResponse

logger = logging.getLogger("clinova")


class OCRService:
    """Medical Report OCR extraction service with synthetic sample fallback."""

    SYNTHETIC_CBC_FIELDS = [
        OCRFieldSchema(
            field_name="Hemoglobin (Hb)",
            value="12.4",
            unit="g/dL",
            confidence=0.94,
            bounding_box=[140, 210, 360, 245],
            verification_status="pending",
            source_reference="Complete Blood Count (CBC) Panel",
        ),
        OCRFieldSchema(
            field_name="Total Leukocyte Count (WBC)",
            value="7.2",
            unit="x10^3/uL",
            confidence=0.91,
            bounding_box=[140, 255, 360, 290],
            verification_status="pending",
            source_reference="Complete Blood Count (CBC) Panel",
        ),
        OCRFieldSchema(
            field_name="Platelet Count",
            value="220",
            unit="x10^3/uL",
            confidence=0.95,
            bounding_box=[140, 300, 360, 335],
            verification_status="pending",
            source_reference="Complete Blood Count (CBC) Panel",
        ),
        OCRFieldSchema(
            field_name="Red Blood Cell Count (RBC)",
            value="4.5",
            unit="x10^6/uL",
            confidence=0.93,
            bounding_box=[140, 345, 360, 380],
            verification_status="pending",
            source_reference="Complete Blood Count (CBC) Panel",
        ),
    ]

    @classmethod
    async def process_report(
        cls, file_bytes: bytes, filename: str = "report.png"
    ) -> ReportOCRResponse:
        """Process an uploaded medical lab report and extract key clinical fields."""
        # High fidelity synthetic extraction for demonstration
        fields = cls.SYNTHETIC_CBC_FIELDS.copy()
        raw_text = (
            "CENTRAL PATHOLOGY LABORATORY - PUBLIC HEALTH FACILITY\n"
            "PATIENT MRN: CLV-DEMO-SAMPLE | TEST: COMPLETE BLOOD COUNT (CBC)\n"
            "Hemoglobin: 12.4 g/dL (Ref: 12.0 - 16.0)\n"
            "Total WBC: 7.2 x10^3/uL (Ref: 4.0 - 11.0)\n"
            "Platelet Count: 220 x10^3/uL (Ref: 150 - 450)\n"
            "RBC Count: 4.5 x10^6/uL (Ref: 4.0 - 5.5)\n"
            "STATUS: COMPLETED | OCR CONFIDENCE: HIGH (AVERAGE 93.2%)\n"
            "NOTICE: SYNTHETIC DATA SAMPLE FOR TRIAGE SUPPORT PROTOTYPE ONLY"
        )

        return ReportOCRResponse(
            report_filename=filename,
            fields=fields,
            raw_extracted_text=raw_text,
            confidence_average=0.932,
            is_synthetic_sample=True,
            status="success",
            disclaimer="Synthetic sample — not a real medical record. Requires qualified reviewer verification.",
        )


ocr_service = OCRService()
