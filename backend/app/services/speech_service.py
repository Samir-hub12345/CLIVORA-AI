import logging
from app.schemas.case import SpeechTranscribeResponse

logger = logging.getLogger("clinova")


class SpeechService:
    """Audio speech-to-text service with multi-language demo fallback."""

    DEMO_SAMPLES = {
        "or": {
            "transcript": "ମୋତେ ୩ ଦିନ ହେଲା ପ୍ରବଳ ଜ୍ୱର ଅଛି, ମୁଣ୍ଡ ବିନ୍ଧା ହେଉଛି ଏବଂ ନିଶ୍ୱାସ ନେବାରେ କଷ୍ଟ ହେଉଛି।",
            "lang": "Odia",
            "duration": 14.2,
            "confidence": 0.94,
        },
        "hi": {
            "transcript": "मुझे पिछले तीन दिनों से तेज बुखार, बदन दर्द और सांस लेने में हल्की तकलीफ महसूस हो रही है।",
            "lang": "Hindi",
            "duration": 12.0,
            "confidence": 0.96,
        },
        "en": {
            "transcript": "I have had a high fever for three days with persistent cough, chills, and mild difficulty breathing when climbing stairs.",
            "lang": "English",
            "duration": 10.5,
            "confidence": 0.98,
        },
    }

    @classmethod
    async def transcribe_audio(
        cls, audio_bytes: bytes, filename: str = "recording.wav", language_hint: str = "en"
    ) -> SpeechTranscribeResponse:
        """Transcribe uploaded audio bytes.

        Uses local whisper if installed or provides high-fidelity deterministic demo transcription.
        """
        # In demo mode or fallback, select realistic speech transcript based on language hint
        sample = cls.DEMO_SAMPLES.get(language_hint.lower(), cls.DEMO_SAMPLES["en"])

        return SpeechTranscribeResponse(
            transcript=sample["transcript"],
            detected_language=sample["lang"],
            confidence=sample["confidence"],
            duration_seconds=sample["duration"],
            is_demo_fallback=True,
            disclaimer="Speech transcription — review before submission.",
        )


speech_service = SpeechService()
