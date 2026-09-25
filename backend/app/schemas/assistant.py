from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class AssistantPreference(BaseModel):
    assistant_enabled: bool = True
    language: str = "en"
    voice_enabled: bool = True
    voice_response_enabled: bool = True


class AssistantCapabilities(BaseModel):
    role: str
    available_tools: List[str]
    supported_languages: List[Dict[str, str]]
    voice_input_available: bool = True
    tts_available: bool = True
    disclaimer: str = (
        "Educational prototype and triage-support purposes only. "
        "Not a substitute for professional diagnosis or treatment. "
        "All clinical actions require licensed human review."
    )


class AssistantMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    language: Optional[str] = "en"
    context_resource_type: Optional[str] = None  # "case", "intake", "queue", "patient"
    context_resource_id: Optional[str] = None
    voice_input: bool = False


class ProposedAction(BaseModel):
    tool_name: str
    description: str
    parameters: Dict[str, Any]
    risk_level: str = "HIGH_IMPACT"  # "READ_ONLY", "DRAFT", "HIGH_IMPACT"


class AssistantMessageResponse(BaseModel):
    text: str
    language: str = "en"
    original_statement: Optional[str] = None
    source_label: str = "AI-assisted"
    requires_confirmation: bool = False
    proposed_action: Optional[ProposedAction] = None
    structured_data: Optional[Dict[str, Any]] = None
    follow_up_suggestions: List[str] = []
    detected_language: Optional[str] = None


class AssistantToolExecuteRequest(BaseModel):
    tool_name: str
    parameters: Dict[str, Any] = {}
    confirmed: bool = False


class AssistantToolExecuteResponse(BaseModel):
    success: bool
    tool_name: str
    result: Any
    message: str
    audit_logged: bool = True
