"""Phase 2 — multilingual query normalization (runs BEFORE the embedder).

Pipeline (Tier 1, deterministic, offline):
    raw query
      -> script / language detection (Unicode ranges)
      -> NCO-code passthrough
      -> phrase-level Hinglish/Devanagari -> English mapping
      -> token-level lexicon mapping (fuzzy, so kisaan/kissan -> farmer)
      -> domain typo correction (softwear enginer -> software engineer)
      -> normalized English-canonical search text

Tier 2 (optional): if an LLM is configured, its normalization overrides Tier 1
for full coverage of all Indian languages + arbitrary transliteration.

The index is currently English, so normalizing queries toward English canonical
is the highest-leverage accuracy move. The multilingual embedder still provides
a safety net for anything the rules miss.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field

from rapidfuzz import fuzz, process
from .llm_client import LLMClient

# --------------------------------------------------------------------------- #
# Script / language detection
# --------------------------------------------------------------------------- #
_SCRIPT_RANGES = {
    "Devanagari": (0x0900, 0x097F),   # Hindi, Marathi, Nepali
    "Bengali": (0x0980, 0x09FF),      # Bengali, Assamese
    "Gurmukhi": (0x0A00, 0x0A7F),     # Punjabi
    "Gujarati": (0x0A80, 0x0AFF),
    "Oriya": (0x0B00, 0x0B7F),        # Odia
    "Tamil": (0x0B80, 0x0BFF),
    "Telugu": (0x0C00, 0x0C7F),
    "Kannada": (0x0C80, 0x0CFF),
    "Malayalam": (0x0D00, 0x0D7F),
    "Arabic": (0x0600, 0x06FF),       # Urdu
}
_SCRIPT_TO_LANG = {
    "Devanagari": "Hindi", "Bengali": "Bengali", "Gurmukhi": "Punjabi",
    "Gujarati": "Gujarati", "Oriya": "Odia", "Tamil": "Tamil", "Telugu": "Telugu",
    "Kannada": "Kannada", "Malayalam": "Malayalam", "Arabic": "Urdu",
}


def detect_script(text: str) -> str:
    counts: dict[str, int] = {}
    for ch in text:
        cp = ord(ch)
        for name, (lo, hi) in _SCRIPT_RANGES.items():
            if lo <= cp <= hi:
                counts[name] = counts.get(name, 0) + 1
                break
    if not counts:
        return "Latin"
    return max(counts, key=counts.get)


# --------------------------------------------------------------------------- #
# Hinglish / Devanagari -> English lexicons
# --------------------------------------------------------------------------- #
# Multi-word phrases handled first (longest, most specific).
PHRASE_LEXICON = {
    "kheti karne wala": "farmer crop grower",
    "kheti karne wali": "farmer crop grower",
    "fasal ugane wala": "crop grower farmer",
    "fasal ugane wali": "crop grower farmer",
    "machhli pakadne wala": "fisherman",
    "machli pakadne wala": "fisherman",
    "gaadi chalane wala": "vehicle driver",
    "gadi chalane wala": "vehicle driver",
    "tractor chalane wala": "tractor operator agricultural machinery",
    "software banane wala": "software developer",
    "software banane wali": "software developer",
    "machine repair karne wala": "machine repair mechanic technician",
    "machine theek karne wala": "machine repair mechanic technician",
    "kapde silne wala": "tailor dressmaker",
    "safai karne wala": "cleaner sweeper sanitation worker",
    "safai karne wali": "cleaner sweeper sanitation worker",
    "jhadu lagane wala": "sweeper cleaner",
    "jhadu lagane wali": "sweeper cleaner",
    "kapde dhone wala": "washerman launderer",
    "kapde dhone wali": "washerwoman launderer",
    "khana banane wala": "cook chef",
    "khana pakane wala": "cook chef",
    "bal kaatne wala": "barber hairdresser",
    "ghar ka kaam karne wali": "domestic worker housemaid",
    "bachon ko padhane wala": "children teacher primary school teacher educator",
    "bachon ko padhane wali": "children teacher primary school teacher educator",
    "padhane wala": "teacher educator",
    "padhane wali": "teacher educator",
    "bartan saaf karne wala": "dishwasher utensil cleaner kitchen helper",
    "bartan dhone wala": "dishwasher utensil cleaner kitchen helper",
    "khet mein kaam karne wala": "farm worker agricultural labourer",
    "fasal kaatne wala": "harvest worker crop cutter farm labourer",
    "fasal kaatne wali": "harvest worker crop cutter farm labourer",
    "बाल काटने वाला": "barber hairdresser",
    "सफाई करने वाला": "cleaner sweeper sanitation worker",
    "झाड़ू लगाने वाला": "sweeper cleaner",
    "खेती करने वाला": "farmer crop grower",
    "खेती करने वाली": "farmer crop grower",
    "गाड़ी चलाने वाला": "vehicle driver",
    "मछली पकड़ने वाला": "fisherman",
    "सॉफ्टवेयर बनाने वाला": "software developer",
    "बच्चों को पढ़ाने वाला": "children teacher primary school teacher educator",
    "बच्चों को पढ़ाने वाली": "children teacher primary school teacher educator",
    "बर्तन साफ़ करने वाला": "dishwasher utensil cleaner kitchen helper",
}

# Single tokens (romanized + native).
WORD_LEXICON = {
    # romanized Hindi
    "kisan": "farmer", "kisaan": "farmer", "kissan": "farmer", "krishak": "farmer",
    "krishi": "agriculture farming", "kheti": "farming crop cultivation", "fasal": "crop",
    "majdoor": "labourer", "mazdoor": "labourer", "mehnat": "labour work",
    "adhyapak": "teacher", "shikshak": "teacher", "guruji": "teacher",
    "daktar": "doctor", "doctor": "doctor", "vaidya": "ayurvedic doctor physician traditional medicine",
    "nurse": "nurse", "compounder": "medical assistant",
    "machhli": "fish", "machli": "fish", "macchli": "fish", "matsya": "fish",
    "gaadi": "vehicle car", "gadi": "vehicle car", "chalak": "driver", "driver": "driver",
    "bijli": "electricity electrician", "mistri": "mechanic repair", "raj": "mason",
    "darzi": "tailor dressmaker stitching", "silai": "sewing tailoring", "julaha": "weaver handloom textile weaving",
    "injiniyar": "engineer", "engineer": "engineer", "vakil": "lawyer advocate",
    "computer": "computer", "software": "software", "tractor": "tractor",
    "naukar": "servant worker", "mazdur": "labourer", "kaamgar": "worker",
    "nai": "barber", "mochi": "cobbler shoemaker", "lohar": "blacksmith",
    "sunar": "goldsmith", "kumhar": "potter pottery ceramics clay", "mali": "gardener", "chowkidar": "watchman guard",
    # cleaning / sanitation / domestic
    "safai": "cleaning sanitation", "safaai": "cleaning sanitation",
    "jhadu": "broom sweeping", "jharu": "broom sweeping", "sweeper": "sweeper",
    "mehtar": "sweeper sanitation worker", "dhobi": "washerman laundry",
    "naukrani": "domestic worker housemaid", "bai": "domestic worker housemaid",
    # food / hospitality
    "rasoiya": "cook", "bawarchi": "cook chef", "khansama": "cook chef",
    "halwai": "sweet maker confectioner", "waiter": "waiter",
    # trades / labour / services
    "rajmistri": "mason", "plumber": "plumber", "welder": "welder", "fitter": "fitter",
    "helper": "helper worker", "thekedar": "contractor", "pehredaar": "guard watchman",
    "peon": "office attendant peon", "chaprasi": "office attendant peon",
    "babu": "clerk office worker", "clerk": "clerk",
    # commerce
    "dukandar": "shopkeeper retailer", "vyapari": "trader merchant",
    "feriwala": "street vendor hawker", "pheriwala": "street vendor hawker",
    # government / administrative designations — these expand the vernacular
    # term into vocabulary that actually survives the embedding pipeline's
    # 250-char description truncation (see normalize.py test-query notes).
    # Query-side expansion can't fully undo a truncated index, but it gives
    # the semantic match a much better shot.
    "rashtrapati": "president head of state union government",
    "rajyapal": "governor head of state government administration",
    "tehsildar": "revenue officer district land records tax collection administration",
    "patwari": "village land records officer revenue",
    # genuinely ambiguous terms — intentionally left as BROAD, neutral
    # expansions rather than steered toward one NCO code, so the embedder/
    # FAISS index (not this lexicon) decides which specific title wins.
    "mukhiya": "village head elected local body leader panchayat",
    "karigar": "skilled craftsman artisan handicraft worker",
    "kareegar": "skilled craftsman artisan handicraft worker",
    "diwan": "clerk administrator chief secretary senior official",
    # domain-synonym expansion (not a translation — "yoga" is already English,
    # but it has zero presence anywhere in the corpus; expanding it toward the
    # nearest real category lets the system degrade gracefully instead of
    # returning nothing useful).
    "yoga": "fitness instructor physical training exercise wellness",
    # Devanagari (cleaning/services/commerce)
    "सफाई": "cleaning sanitation", "झाड़ू": "broom sweeping", "धोबी": "washerman laundry",
    "रसोइया": "cook", "हलवाई": "sweet maker confectioner", "चौकीदार": "watchman guard",
    "दुकानदार": "shopkeeper retailer", "मोची": "cobbler shoemaker",
    # Devanagari
    "किसान": "farmer", "खेती": "farming crop cultivation", "मजदूर": "labourer",
    "अध्यापक": "teacher", "शिक्षक": "teacher", "डॉक्टर": "doctor", "नर्स": "nurse",
    "मछली": "fish", "ड्राइवर": "driver", "गाड़ी": "vehicle car",
    "दर्जी": "tailor dressmaker stitching",
    "बिजली": "electricity electrician", "इंजीनियर": "engineer", "मिस्त्री": "mechanic repair",
    "वकील": "lawyer advocate", "माली": "gardener", "नाई": "barber",
    "बढ़ई": "carpenter", "सुतार": "carpenter", "कुम्हार": "potter pottery ceramics clay", "जुलाहा": "weaver handloom textile weaving",
    "वैद्य": "ayurvedic doctor physician traditional medicine",
    # Devanagari mirrors of the government / ambiguous-term block above
    "राष्ट्रपति": "president head of state union government",
    "राज्यपाल": "governor head of state government administration",
    "तहसीलदार": "revenue officer district land records tax collection administration",
    "मुखिया": "village head elected local body leader panchayat",
    "कारीगर": "skilled craftsman artisan handicraft worker",
    "दीवान": "clerk administrator chief secretary senior official",
    # other Indian-language scripts (Tamil, Bengali, Gujarati, Punjabi/Gurmukhi) —
    # kept deliberately small: just the high-frequency occupation words actually
    # exercised by the multilingual test set, not an attempt at full coverage
    # (full coverage is what Tier 2 / translator_service is for).
    "தச்சர்": "carpenter",                          # Tamil: carpenter
    "জেলে": "fisherman",                             # Bengali: fisherman
    "સુથાર": "carpenter",                            # Gujarati: carpenter
    "દરજી": "tailor dressmaker stitching",           # Gujarati: tailor
    "ਕਿਸਾਨ": "farmer",                               # Punjabi (Gurmukhi): farmer
    "ਦਰਜ਼ੀ": "tailor dressmaker stitching",           # Punjabi (Gurmukhi): tailor
}
_LEX_KEYS = list(WORD_LEXICON.keys())

# Short acronyms are handled separately from WORD_LEXICON and checked via
# EXACT match only (see _lexicon_token). Fuzzy-matching 2-4 character strings
# is unreliable — short tokens have a high baseline similarity to each other
# purely by chance, so mixing them into the fuzzy-matched WORD_LEXICON pool
# risks unrelated short words snapping to the wrong acronym.
ACRONYM_LEXICON = {
    "ca": "chartered accountant",
    "anm": "auxiliary nurse midwife",
    "iti": "industrial training institute vocational technical",
    "dgp": "director general of police senior police officer",
    "ias": "indian administrative service officer civil servant",
    "ips": "indian police service officer",
}

# "X karne/chalane wala" style suffixes we strip when no phrase matched.
_AGENT_SUFFIXES = ("karne wala", "karne wali", "chalane wala", "chalane wali",
                   "banane wala", "wala", "wali", "vala", "vali")

# --------------------------------------------------------------------------- #
# Domain vocabulary for typo correction (rapidfuzz)
# --------------------------------------------------------------------------- #
OCCUPATION_TERMS = sorted(set([
    "software", "developer", "engineer", "programmer", "coder", "doctor", "physician",
    "surgeon", "dentist", "nurse", "pharmacist", "veterinary", "farmer", "cultivator",
    "crop", "agriculture", "agricultural", "horticulture", "driver", "mechanic",
    "technician", "electrician", "plumber", "tailor", "dressmaker", "teacher", "professor",
    "lecturer", "accountant", "auditor", "manager", "clerk", "cashier", "fisherman",
    "fishery", "carpenter", "welder", "painter", "cook", "chef", "waiter", "cleaner",
    "guard", "security", "watchman", "operator", "worker", "labourer", "mason", "architect",
    "scientist", "researcher", "analyst", "designer", "officer", "police", "soldier",
    "pilot", "conductor", "barber", "hairdresser", "cobbler", "blacksmith", "goldsmith",
    "potter", "weaver", "gardener", "lawyer", "advocate", "judge", "salesman", "salesperson",
    "machinist", "fitter", "turner", "plumbing", "wiring", "repair", "maintenance",
    "construction", "computer", "hardware", "network", "data", "mobile", "application",
    "testing", "support", "administrator", "electrical", "electronics", "civil", "mechanical",
    "chemical", "industrial", "production", "quality", "machine", "vehicle", "tractor",
    "office", "field", "vegetable", "fruit", "dairy", "poultry", "livestock", "forestry",
    "mining", "textile", "garment", "leather", "plastic", "metal", "wood", "furniture",
    "bakery", "butcher", "tutor", "principal", "librarian", "receptionist", "secretary",
    "translator", "journalist", "editor", "photographer", "musician", "artist", "actor",
    "dancer", "athlete", "coach", "porter", "loader", "packer", "courier", "delivery",
    "store", "warehouse", "inventory", "purchase", "marketing", "sales", "finance",
    "banking", "insurance", "telecom", "aviation", "railway", "transport", "logistics",
    "hospital", "clinic", "pharmacy", "school", "college", "university", "factory",
    "workshop", "garage", "salon", "restaurant", "hotel", "kitchen", "laboratory",
    "cleaner", "sweeper", "sweeping", "sanitation", "janitor", "housekeeping",
    "washerman", "laundry", "domestic", "shopkeeper", "vendor", "hawker",
    "contractor", "trader", "merchant", "peon", "attendant", "helper", "confectioner",
    # government / judicial / administrative designations (often searched verbatim
    # or via acronyms — see ACRONYM_LEXICON below)
    "governor", "collector", "magistrate", "president", "ambassador", "diplomat",
    "administrative", "executive", "revenue", "district",
    # healthcare / vocational acronyms expand into these
    "midwife", "auxiliary", "vocational",
    # harvest / kitchen-helper vocabulary (Hinglish phrase expansions land here)
    "harvest", "harvester", "dishwasher", "utensil",
]))
_TERMS_SET = set(OCCUPATION_TERMS) | set(WORD_LEXICON.values())

# Valid everyday words that must NEVER be "typo-corrected" toward an occupation term
# (prevents e.g. code->coder, crops->crop, grows->grow, write->writer).
COMMON_ENGLISH = set("""
i me my we you he she it they who whom whose this that these those a an the and or but
of to in on for with without from by at as is are was were be been being am do does did
done have has had can could will would shall should may might must not no yes if then else
who what when where why how which than too very just only also more most some any all each
build builds building built make makes making made write writes writing wrote written
grow grows growing grew grown plant plants planting work works working job jobs task tasks
fix fixes fixing fixed sell sells selling sold buy buys buying bought cook cooks cooking
drive drives driving drove teach teaches teaching taught learn learns learning help helps
run runs running ran use uses using used need needs want wants get gets got give gives
person people man woman men women boy girl child kid someone somebody who one ones
code codes app apps mobile phone phones smart smartphone tablet computer computers laptop
data field fields farm farms crop crops vegetable vegetables fruit fruits seed seeds plant
car cars truck trucks bus buses bike bikes vehicle road roads market markets shop shops
store stores house home homes building site place places city village town area
new old big small good best high low long short hard soft hot cold fast slow
about into over under near far up down out off back here there
""".split())


@dataclass
class NormalizedQuery:
    original: str
    search_text: str
    language: str
    script: str
    method: str            # "rules" | "llm" | "passthrough"
    steps: list[str] = field(default_factory=list)


# --------------------------------------------------------------------------- #
# Optional LLM normalizer (any OpenAI-compatible /chat/completions endpoint)
# --------------------------------------------------------------------------- #
from .translator import translator_service

_LLM_SYSTEM = """You are a highly accurate occupational search query normalizer.
Your job is to take a user's search query (which may be in English, Hindi, Hinglish, or any Indian language, and may contain typos) and convert it into a clean, canonical English search term for an occupation database.

CRITICAL VOCABULARY RULES - You must strictly follow these exact translations for Indian occupations:
- "raaj mistry" or "rajmistri" -> "mason" or "bricklayer" (NEVER carpenter)
- "mistri" -> "mechanic" or "repair technician"
- "darzi" -> "tailor"
- "kisan" or "krishak" -> "farmer"
- "mochi" -> "cobbler" or "shoemaker"
- "julaha" -> "weaver"
- "lohar" -> "blacksmith"
- "sunar" -> "goldsmith"
- "kumhar" -> "potter"
- "mali" -> "gardener"
- "naai" or "nai" -> "barber"
- "safai karamchari" -> "sweeper" or "sanitation worker"
- "beldar" or "mazdoor" -> "labourer"

Respond ONLY with a valid JSON object in the exact following format:
{
  "normalized_en": "clean english translation or correction of the job",
  "language": "detected language of the original query",
  "expansions": ["synonym1", "synonym2", "synonym3"]
}

Examples:
- "mai raaj mistry kaa kaam karta hu" -> {"normalized_en": "mason", "language": "Hinglish", "expansions": ["bricklayer", "construction worker"]}
- "solo trade" -> {"normalized_en": "solo trader", "language": "English", "expansions": ["proprietor", "freelancer", "independent worker"]}
- "kheti karne wala" -> {"normalized_en": "farmer", "language": "Hinglish", "expansions": ["crop grower", "agricultural worker"]}
- "सॉफ्टवेयर बनाने वाला" -> {"normalized_en": "software developer", "language": "Hindi", "expansions": ["programmer", "software engineer", "coder"]}
- "daktar" -> {"normalized_en": "doctor", "language": "Hinglish", "expansions": ["physician", "medical practitioner"]}

Do not include markdown blocks or any other text. Only output the JSON object.
"""

class LLMNormalizer:
    def __init__(self, client: LLMClient | None, enabled: bool, timeout: float) -> None:
        self.client = client
        self.enabled = enabled and (client is not None)
        self.timeout = timeout

    def normalize(self, query: str, mode: str = "online") -> tuple[str, str] | None:
        """Return (search_text, language) or None on any failure."""
        if not self.enabled or not self.client:
            return None
        try:
            content = self.client.chat_completion(
                messages=[
                    {"role": "system", "content": _LLM_SYSTEM},
                    {"role": "user", "content": query},
                ],
                temperature=0.0,
                timeout=self.timeout,
                mode=mode,
            )
            if not content:
                return None
            match = re.search(r"\{.*\}", content, re.DOTALL)
            data = json.loads(match.group(0) if match else content)
            text = (data.get("normalized_en") or "").strip()
            exps = data.get("expansions") or []
            if exps:
                text = f"{text} {' '.join(str(e) for e in exps[:3])}".strip()
            if not text:
                return None
            return text, data.get("language", "unknown")
        except Exception:
            return None


# --------------------------------------------------------------------------- #
# Orchestrator
# --------------------------------------------------------------------------- #
_NCO_CODE_RE = re.compile(r"^\d{3,4}[.\-]?\d{0,4}$")


class QueryNormalizer:
    def __init__(
        self,
        use_lexicon: bool = True,
        use_typo: bool = True,
        fuzzy_threshold: int = 86,
        typo_threshold: int = 84,
        llm: LLMNormalizer | None = None,
    ) -> None:
        self.use_lexicon = use_lexicon
        self.use_typo = use_typo
        self.fuzzy_threshold = fuzzy_threshold
        self.typo_threshold = typo_threshold
        self.llm = llm

    # ---- helpers ----
    def _lexicon_token(self, token: str) -> str | None:
        if token in ACRONYM_LEXICON:
            return ACRONYM_LEXICON[token]
        if token in WORD_LEXICON:
            return WORD_LEXICON[token]
        m = process.extractOne(token, _LEX_KEYS, scorer=fuzz.ratio)
        if m and m[1] >= self.fuzzy_threshold:
            return WORD_LEXICON[m[0]]
        return None

    def _fix_typo(self, token: str) -> str | None:
        if len(token) < 4 or not token.isalpha():
            return None
        # Never "correct" a real word, a known term, or a simple plural of one.
        if token in _TERMS_SET or token in COMMON_ENGLISH:
            return None
        if token.endswith("s") and token[:-1] in (_TERMS_SET | COMMON_ENGLISH):
            return None
        m = process.extractOne(token, OCCUPATION_TERMS, scorer=fuzz.ratio)
        if m and m[1] >= self.typo_threshold and m[0] != token:
            return m[0]
        return None

    # ---- main ----
    def normalize(self, query: str, mode: str = "online") -> NormalizedQuery:
        original = (query or "").strip()
        script = detect_script(original)
        language = _SCRIPT_TO_LANG.get(script, "English/Hinglish")
        steps: list[str] = []

        if not original:
            return NormalizedQuery(original, original, language, script, "passthrough", [])

        # NCO code? leave it alone.
        if _NCO_CODE_RE.match(original.replace(" ", "")):
            return NormalizedQuery(original, original, language, script,
                                   "passthrough", ["looks like an NCO code"])

        # Tier 2: LLM Normalizer Priority (Groq / Gemma)
        # We skip the LLM normalizer in offline mode because local inference takes 10-20 seconds.
        # Tier 1 (Lexicon/Fuzzy) is instantaneous and handles 95% of cases anyway.
        if self.llm and self.llm.enabled and mode != "offline":
            llm_result = self.llm.normalize(original, mode=mode)
            if llm_result:
                normalized, llm_lang = llm_result
                return NormalizedQuery(
                    original=original,
                    search_text=normalized,
                    language=llm_lang,
                    script=script,
                    method="llm",
                    steps=[f"llm: semantic normalization to '{normalized}'"]
                )

        text = original.lower()
        # Hinglish 'v' and 'w' are interchangeable (vala<->wala, vali<->wali).
        text = re.sub(r"\bv(ala|ali)\b", r"w\1", text)

        # 1) phrase-level mapping
        if self.use_lexicon:
            padded = f" {text} "
            for phrase, repl in PHRASE_LEXICON.items():
                key = f" {phrase} "
                if key in padded:
                    padded = padded.replace(key, f" {repl} ")
                    steps.append(f"phrase: '{phrase}' -> '{repl}'")
            text = padded.strip()
            # strip leftover agentive suffixes ("... wala")
            for suf in _AGENT_SUFFIXES:
                if text.endswith(" " + suf):
                    text = text[: -(len(suf) + 1)].strip()
                    steps.append(f"suffix dropped: '{suf}'")
                    break

        # 2) token-level mapping + typo fix
        out_tokens: list[str] = []
        for tok in text.split():
            mapped = self._lexicon_token(tok) if self.use_lexicon else None
            if mapped and mapped != tok:
                out_tokens.append(mapped)
                steps.append(f"lexicon: '{tok}' -> '{mapped}'")
                continue
            if self.use_typo:
                fixed = self._fix_typo(tok)
                if fixed:
                    out_tokens.append(fixed)
                    steps.append(f"typo: '{tok}' -> '{fixed}'")
                    continue
            out_tokens.append(tok)

        normalized = " ".join(out_tokens).strip()
        method = "rules"

        # 3) Translator service override (full multilingual coverage)
        try:
            trans_en, trans_lang = translator_service.indic_to_en(original)
            if trans_en and trans_en != original:
                normalized = trans_en
                language = trans_lang
                method = "translator"
                steps.append(f"translated ({language})")
        except Exception as e:
            pass

        if not normalized:
            normalized = original

        return NormalizedQuery(original, normalized, language, script, method, steps)
