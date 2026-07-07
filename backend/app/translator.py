from typing import List, Union
import logging
from deep_translator import GoogleTranslator
from lingua import Language, LanguageDetectorBuilder

logger = logging.getLogger(__name__)

# Map lingua detected languages to Google Translate codes
LINGUA_TO_GOOGLE = {
    Language.HINDI: "hi",
    Language.BENGALI: "bn",
    Language.MARATHI: "mr",
    Language.TELUGU: "te",
    Language.TAMIL: "ta",
    Language.GUJARATI: "gu",
    Language.URDU: "ur",
    Language.PUNJABI: "pa",
    Language.ENGLISH: "en",
}

# Map lingua detected languages to AI4Bharat tags
LINGUA_TO_AI4BHARAT = {
    Language.HINDI: "hin_Deva",
    Language.BENGALI: "ben_Beng",
    Language.MARATHI: "mar_Deva",
    Language.TELUGU: "tel_Telu",
    Language.TAMIL: "tam_Taml",
    Language.GUJARATI: "guj_Gujr",
    Language.URDU: "urd_Arab",
    Language.PUNJABI: "pan_Guru",
    Language.ENGLISH: "eng_Latn",
}

class TranslatorService:
    def __init__(self, mode: str = "online"):
        """
        mode: "online" (uses Google Translate) or "offline" (uses AI4Bharat IndicTrans2)
        """
        self.mode = mode
        
        # Initialize Lingua detector with Indian languages + English
        languages = [
            Language.HINDI, Language.BENGALI, Language.MARATHI, Language.TELUGU,
            Language.TAMIL, Language.GUJARATI, Language.URDU,
            Language.PUNJABI, Language.ENGLISH
        ]
        self.detector = LanguageDetectorBuilder.from_languages(*languages).build()

        self.offline_indic_en_model = None
        self.offline_indic_en_tokenizer = None
        self.offline_en_indic_model = None
        self.offline_en_indic_tokenizer = None
        self.indic_processor = None
        
        if self.mode == "offline":
            self._init_offline_models()

    def _init_offline_models(self):
        try:
            import torch
            from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
            from IndicTransToolkit.processor import IndicProcessor
            
            logger.info("Initializing offline IndicTrans2 models (this may take a while)...")
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            self.indic_processor = IndicProcessor(inference=True)
            
            # Using distilled 200M models to save RAM
            indic_en_model_name = "ai4bharat/indictrans2-indic-en-dist-200M"
            en_indic_model_name = "ai4bharat/indictrans2-en-indic-dist-200M"
            
            # Load Indic to English
            self.offline_indic_en_tokenizer = AutoTokenizer.from_pretrained(indic_en_model_name, trust_remote_code=True)
            self.offline_indic_en_model = AutoModelForSeq2SeqLM.from_pretrained(
                indic_en_model_name, 
                trust_remote_code=True
            ).to(self.device)
            
            # Load English to Indic
            self.offline_en_indic_tokenizer = AutoTokenizer.from_pretrained(en_indic_model_name, trust_remote_code=True)
            self.offline_en_indic_model = AutoModelForSeq2SeqLM.from_pretrained(
                en_indic_model_name, 
                trust_remote_code=True
            ).to(self.device)
            logger.info("Offline models loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load offline models: {e}")
            logger.info("Falling back to online mode.")
            self.mode = "online"

    def detect_language(self, text: str) -> Language:
        return self.detector.detect_language_of(text)

    def indic_to_en(self, text: str) -> tuple[str, str]:
        """
        Translates text from an Indian language to English.
        Returns: (translated_english_text, original_language_code)
        """
        if not text.strip():
            return text, "en"
            
        detected_lang = self.detect_language(text)
        if detected_lang == Language.ENGLISH or detected_lang is None:
            return text, "en"

        if self.mode == "online":
            try:
                translated = GoogleTranslator(source='auto', target='en').translate(text)
                return translated, LINGUA_TO_GOOGLE.get(detected_lang, "hi")
            except Exception as e:
                logger.error(f"Online translation failed: {e}")
                return text, "en"
        else:
            # Offline mode
            src_lang = LINGUA_TO_AI4BHARAT.get(detected_lang, "hin_Deva")
            try:
                import torch
                batch = self.indic_processor.preprocess_batch([text], src_lang=src_lang, tgt_lang="eng_Latn")
                inputs = self.offline_indic_en_tokenizer(batch, truncation=True, padding="longest", return_tensors="pt").to(self.device)
                
                with torch.no_grad():
                    generated_tokens = self.offline_indic_en_model.generate(**inputs, max_length=256)
                
                translated = self.offline_indic_en_tokenizer.batch_decode(generated_tokens, skip_special_tokens=True)[0]
                translated = self.indic_processor.postprocess_batch([translated], lang="eng_Latn")[0]
                return translated, src_lang
            except Exception as e:
                logger.error(f"Offline translation failed: {e}")
                return text, src_lang

    def en_to_indic(self, texts: Union[str, List[str]], target_lang: str) -> Union[str, List[str]]:
        """
        Translates English text(s) back to the specified target Indian language.
        target_lang should be the code returned by indic_to_en (e.g. 'hi' for online or 'hin_Deva' for offline)
        """
        is_single = isinstance(texts, str)
        text_list = [texts] if is_single else texts
        
        if not text_list or target_lang == "en" or target_lang == "eng_Latn":
            return texts
            
        lang_map = {
            "hindi": "hi", "bengali": "bn", "marathi": "mr", "telugu": "te",
            "tamil": "ta", "gujarati": "gu", "urdu": "ur", "punjabi": "pa",
            "odia": "or", "kannada": "kn", "malayalam": "ml"
        }
        target_lang = lang_map.get(target_lang.lower(), target_lang)
            
        if self.mode == "online":
            try:
                translator = GoogleTranslator(source='en', target=target_lang)
                translated = translator.translate_batch(text_list)
                return translated[0] if is_single else translated
            except Exception as e:
                logger.error(f"Online en_to_indic translation failed: {e}")
                return texts
        else:
            # Offline mode
            try:
                import torch
                batch = self.indic_processor.preprocess_batch(text_list, src_lang="eng_Latn", tgt_lang=target_lang)
                inputs = self.offline_en_indic_tokenizer(batch, truncation=True, padding="longest", return_tensors="pt").to(self.device)
                
                with torch.no_grad():
                    generated_tokens = self.offline_en_indic_model.generate(**inputs, max_length=256)
                
                translated = self.offline_en_indic_tokenizer.batch_decode(generated_tokens, skip_special_tokens=True)
                translated = self.indic_processor.postprocess_batch(translated, lang=target_lang)
                return translated[0] if is_single else translated
            except Exception as e:
                logger.error(f"Offline en_to_indic translation failed: {e}")
                return texts

# Global instance
translator_service = TranslatorService(mode="online")
