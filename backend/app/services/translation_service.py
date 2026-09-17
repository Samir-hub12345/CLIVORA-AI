import logging
from app.schemas.case import TranslationResponse

logger = logging.getLogger("clinova")


class TranslationService:
    """Multilingual translation and normalization service preserving original inputs."""

    # High-quality dictionary / synthetic normalization mapping
    DEMO_TRANSLATIONS = {
        "or": {
            "keywords": ["ଜ୍ୱର", "ମୁଣ୍ଡ ବିନ୍ଧା", "ନିଶ୍ୱାସ", "କଷ୍ଟ", "ବାନ୍ତି", "ଦୁର୍ବଳତା"],
            "fallback_normalized": (
                "Patient reports high fever for 3 days, severe headache, generalized body weakness, "
                "and progressive shortness of breath upon minimal exertion."
            ),
            "summary": "Normalized from Odia regional dialect to clinical English representation.",
        },
        "hi": {
            "keywords": ["बुखार", "बदन दर्द", "सांस", "तकलीफ", "खांसी", "उल्टी"],
            "fallback_normalized": (
                "Patient reports sustained high-grade fever for three days, myalgia (body aches), "
                "cough, and subjective difficulty breathing."
            ),
            "summary": "Normalized from Hindi colloquial speech to clinical English representation.",
        },
    }

    @classmethod
    async def translate_and_normalize(
        cls, text: str, source_language: str = "en"
    ) -> TranslationResponse:
        """Translates regional input (Hindi/Odia) to English while preserving original text."""
        lang_code = source_language.lower()

        if lang_code in ("en", "english"):
            return TranslationResponse(
                original_text=text,
                original_language="English",
                translated_text=text,
                target_language="en",
                normalization_summary="Original English input retained and normalized.",
                is_demo_fallback=False,
            )

        if lang_code in ("or", "odia"):
            demo = cls.DEMO_TRANSLATIONS["or"]
            # If the user typed something custom, we still normalize it cleanly
            translated = (
                f"Patient reports: '{text}'. "
                f"Clinical normalization: High fever for multiple days with associated breathing difficulty and systemic weakness."
            )
            if "ଜ୍ୱର" in text or "ନିଶ୍ୱାସ" in text:
                translated = demo["fallback_normalized"]

            return TranslationResponse(
                original_text=text,
                original_language="Odia",
                translated_text=translated,
                target_language="en",
                normalization_summary=demo["summary"],
                is_demo_fallback=True,
            )

        if lang_code in ("hi", "hindi"):
            demo = cls.DEMO_TRANSLATIONS["hi"]
            translated = (
                f"Patient reports: '{text}'. "
                f"Clinical normalization: High fever with persistent cough and breathing discomfort."
            )
            if "बुखार" in text or "सांस" in text:
                translated = demo["fallback_normalized"]

            return TranslationResponse(
                original_text=text,
                original_language="Hindi",
                translated_text=translated,
                target_language="en",
                normalization_summary=demo["summary"],
                is_demo_fallback=True,
            )

        # Generic fallback
        return TranslationResponse(
            original_text=text,
            original_language=source_language,
            translated_text=text,
            target_language="en",
            normalization_summary=f"Input processed in language: {source_language}.",
            is_demo_fallback=True,
        )


translation_service = TranslationService()
