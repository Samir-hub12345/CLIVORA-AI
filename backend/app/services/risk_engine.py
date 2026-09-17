from datetime import datetime, timezone
from typing import List, Tuple
from app.schemas.case import RiskSignalSchema


class DeterministicRiskEngine:
    """Transparent, deterministic rule-based urgency flagging engine for reviewer attention.

    Label: Prototype rules — not clinically validated. For reviewer attention only.
    """

    RULES = [
        {
            "id": "TRIAGE-R01",
            "signal": "Potential breathing-related urgency signal detected",
            "severity": "URGENT REVIEW",
            "keywords": [
                "shortness of breath",
                "difficulty breathing",
                "breathless",
                "cannot breathe",
                "wheezing",
                "gasping",
                "dyspnea",
                "breathing problem",
                "shwas",
                "saans lene mein takleef",
                "dam phula",
            ],
        },
        {
            "id": "TRIAGE-R02",
            "signal": "Potential severe bleeding or hemorrhage signal detected",
            "severity": "URGENT REVIEW",
            "keywords": [
                "severe bleeding",
                "coughing blood",
                "vomiting blood",
                "blood in stool",
                "hemoptysis",
                "active hemorrhage",
                "khun nikalna",
                "rakta srava",
            ],
        },
        {
            "id": "TRIAGE-R03",
            "signal": "Potential altered-consciousness or neurological urgency signal",
            "severity": "URGENT REVIEW",
            "keywords": [
                "unconscious",
                "passed out",
                "fainted",
                "syncope",
                "unresponsive",
                "seizure",
                "convulsion",
                "sudden confusion",
                "behoshi",
                "chetana hariba",
            ],
        },
        {
            "id": "TRIAGE-R04",
            "signal": "Potential acute chest-pain or cardiovascular urgency signal",
            "severity": "URGENT REVIEW",
            "keywords": [
                "chest pain",
                "crushing chest pressure",
                "radiating to left arm",
                "chest tightness with sweating",
                "seene mein dard",
                "chhati re jantrana",
            ],
        },
        {
            "id": "TRIAGE-R05",
            "signal": "High sustained fever or infectious disease signal",
            "severity": "PRIORITY",
            "keywords": [
                "high fever",
                "fever for 3 days",
                "fever for 4 days",
                "fever for 5 days",
                "chills",
                "shivering",
                "tez bukhar",
                "prabal jwara",
            ],
        },
        {
            "id": "TRIAGE-R06",
            "signal": "Severe acute abdominal pain signal",
            "severity": "PRIORITY",
            "keywords": [
                "severe abdominal pain",
                "acute stomach pain",
                "intense belly cramps",
                "pet mein tez dard",
                "peta re asahya jantrana",
            ],
        },
    ]

    @classmethod
    def evaluate(cls, text: str) -> Tuple[List[RiskSignalSchema], str, str]:
        """Evaluates patient text against deterministic rules.

        Returns:
            (signals, queue_category, primary_reason)
        """
        if not text:
            return [], "routine", "Standard intake queue"

        lower_text = text.lower()
        signals: List[RiskSignalSchema] = []
        highest_severity = "routine"
        primary_reason = "Standard non-emergent outpatient intake"

        now_str = datetime.now(timezone.utc).strftime("%H:%M:%S")

        for rule in cls.RULES:
            for kw in rule["keywords"]:
                if kw in lower_text:
                    signal = RiskSignalSchema(
                        rule_id=rule["id"],
                        signal=rule["signal"],
                        source_text=kw,
                        severity=rule["severity"],
                        timestamp=now_str,
                        reviewer_confirmation_required=True,
                        status="pending_confirmation",
                    )
                    signals.append(signal)

                    if rule["severity"] == "URGENT REVIEW":
                        highest_severity = "urgent-review"
                        primary_reason = f"{rule['id']}: {rule['signal']}"
                    elif rule["severity"] == "PRIORITY" and highest_severity != "urgent-review":
                        highest_severity = "priority"
                        primary_reason = f"{rule['id']}: {rule['signal']}"
                    break

        return signals, highest_severity, primary_reason


risk_engine = DeterministicRiskEngine()
