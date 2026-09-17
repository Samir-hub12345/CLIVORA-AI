import pytest
from app.services.risk_engine import risk_engine
from app.services.anonymizer import anonymizer
from app.services.ai.gemini_service import ai_service


def test_anonymizer_phone_and_email():
    raw = "Patient John Doe, call at 987-654-3210 or email john@example.com for fever."
    cleaned, redacted = anonymizer.sanitize_text(raw)
    assert redacted is True
    assert "987-654-3210" not in cleaned
    assert "john@example.com" not in cleaned
    assert "[PHONE_REMOVED]" in cleaned
    assert "[EMAIL_REDACTED]" in cleaned


def test_anonymizer_aadhaar():
    raw = "National ID 1234 5678 9012 presented at clinic desk."
    cleaned, redacted = anonymizer.sanitize_text(raw)
    assert redacted is True
    assert "1234 5678 9012" not in cleaned
    assert "[GOVT_ID_REDACTED]" in cleaned


def test_risk_engine_breathing_urgency():
    text = "Patient has acute shortness of breath and cannot breathe properly."
    signals, category, reason = risk_engine.evaluate(text)
    assert category == "urgent-review"
    assert any(s.rule_id == "TRIAGE-R01" for s in signals)
    assert "breathing-related urgency" in reason


def test_risk_engine_chest_pain_urgency():
    text = "Crushing chest pain radiating to left arm with sweating."
    signals, category, reason = risk_engine.evaluate(text)
    assert category == "urgent-review"
    assert any(s.rule_id == "TRIAGE-R04" for s in signals)


def test_risk_engine_routine_presentation():
    text = "Routine diabetic follow-up with stable vitals."
    signals, category, reason = risk_engine.evaluate(text)
    assert category == "routine"
    assert len(signals) == 0


@pytest.mark.asyncio
async def test_non_diagnostic_triage_note_structure():
    note = await ai_service.synthesize_triage_note(
        case_id="CLV-DEMO-TEST",
        symptoms="High fever for 3 days and headache",
        patient_age=25,
        gender="Male",
        facility_type="PHC",
        visit_type="Outpatient",
    )
    assert note["is_diagnostic"] is False
    assert note["requires_human_review"] is True
    assert "Educational prototype and triage-support purposes only" in note["disclaimer"]
    assert "timeline" in note
    assert len(note["timeline"]) > 0
    assert "missing_information" in note
    assert "follow_up_questions" in note
