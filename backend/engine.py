import json
import os
import re
from typing import Dict, Any, List, Optional, Tuple

class SchemeEngine:
    def __init__(self, data_path: Optional[str] = None):
        if data_path is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            data_path = os.path.join(base_dir, "data", "schemes.json")
        self.data_path = data_path
        self.load_data()
        self._init_lexicons()

    def load_data(self):
        with open(self.data_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.categories = {c["id"]: c for c in data.get("categories", [])}
        self.schemes = data.get("schemes", [])
        self.schemes_by_id = {s["id"]: s for s in self.schemes}

    def _init_lexicons(self):
        # Comprehensive lexicons supporting Devanagari, Hinglish, and Bhojpuri/Awadhi vernacular
        self.category_keywords = {
            "farmer": {
                "keywords": [
                    "kheti", "kheti karta", "kisan", "kisaan", "fasal", "khet", "krishi", "bima", 
                    "muavza", "beej", "khad", "tractor", "jamin", "zameen", "patwari", "khatauni",
                    "खेती", "किसान", "फसल", "खेत", "कृषि", "बीमा", "मुआवजा", "बीज", "खाद", "जमीन",
                    "खतौनी", "बोआई", "pm kisan", "pm-kisan", "karat baani kheti", "kheti karat",
                    "batai", "annadata", "fasal nuksan", "sukha", "baadh"
                ],
                "weight": 1.2,
                "default_scheme_id": "pm-kisan"
            },
            "student": {
                "keywords": [
                    "student", "college", "school", "vidyarthi", "chhatra", "chhatravritti", 
                    "scholarship", "padhai", "fees", "fee", "course", "degree", "diploma", 
                    "marksheet", "admission", "dakhila", "padhna", "exam", "college student",
                    "छात्र", "छात्रा", "छात्रवृत्ति", "विद्यार्थी", "स्कॉलरशिप", "कॉलेज", "स्कूल",
                    "पढ़ाई", "फीस", "दाखिला", "yasasvi", "nsp", "matric", "post-matric",
                    "student baani", "padhat baani", "larka padhat", "ladka padh raha"
                ],
                "weight": 1.2,
                "default_scheme_id": "nsp-scholarship"
            },
            "senior": {
                "keywords": [
                    "65 saal", "60 saal", "70 saal", "80 saal", "umar", "buzurg", "vriddha", 
                    "pension", "budha", "budhape", "old age", "senior citizen", "senior",
                    "बुजुर्ग", "वृद्ध", "वृद्धावस्था", "पेंशन", "बूढ़े", "उम्र", "65 साल", "60 साल",
                    "70 साल", "80 साल", "साल है", "sal hai", "umar ba", "budhauti",
                    "atal pension", "nsap", "ignaps"
                ],
                "weight": 1.3,
                "default_scheme_id": "senior-pension"
            },
            "women": {
                "keywords": [
                    "mahila", "aurat", "nari", "beti", "ladli", "kanya", "pregnant", "garbhvati",
                    "stree", "grihini", "swarojgar", "shg", "swayam sahayata", "samuh", "sukanya",
                    "mahila hoon", "महिला", "औरत", "नारी", "बेटी", "कन्या", "गर्भवती", "धात्री",
                    "मातृ वंदना", "सुकन्या", "लाडली", "स्वयं सहायता", "aurat baani", "maai",
                    "matru vandana", "pmmvy", "lakhpati didi"
                ],
                "weight": 1.2,
                "default_scheme_id": "pm-matru-vandana"
            },
            "health": {
                "keywords": [
                    "ilaj", "bimar", "bimari", "hospital", "dawa", "ayushman", "card", "operation",
                    "doctor", "swasthya", "chikitsa", "pmjay", "elaj",
                    "इलाज", "बीमार", "बीमारी", "अस्पताल", "दवा", "आयुष्मान", "कार्ड", "डॉक्टर",
                    "स्वास्थ्य", "चिकित्सा", "कैशलेस"
                ],
                "weight": 1.1,
                "default_scheme_id": "ayushman-bharat"
            },
            "housing": {
                "keywords": [
                    "ghar", "makaan", "awas", "chhat", "kaccha ghar", "pm awas", "pmay", "colony",
                    "घर", "मकान", "आवास", "कच्चा घर", "छत", "कालोनी", "इंदिरा आवास"
                ],
                "weight": 1.1,
                "default_scheme_id": "pm-awas"
            }
        }

    def detect_dialect(self, query: str) -> str:
        lower = query.lower()
        # Dialect indicators
        if any(w in lower for w in ["baani", "karat", "hamaar", "humke", "raua", "bhojpuri", "kaise ho"]):
            return "Bhojpuri / Regional Hindi"
        elif any(w in lower for w in ["hamaar", "mor", "tohar", "awadhi"]):
            return "Awadhi / Eastern Hindi"
        elif re.search(r'[\u0900-\u097F]', query):
            return "Standard Hindi (Devanagari)"
        elif any(w in lower for w in ["hoon", "hai", "karta", "meri", "chahiye", "karein"]):
            return "Conversational Hinglish"
        else:
            return "General Hindi / English"

    def match_intent(self, query: str, dialect_preference: Optional[str] = None) -> Dict[str, Any]:
        cleaned_query = query.strip()
        lower_query = cleaned_query.lower()
        dialect = self.detect_dialect(cleaned_query)

        # Check for direct age pattern (e.g. 60-99 years old or 60+ saal)
        age_match = re.search(r'(\b[6-9]\d\b)\s*(saal|sal|varsh|साल|वर्ष)?', lower_query)
        age_detected = None
        if age_match:
            try:
                age_val = int(age_match.group(1))
                if 55 <= age_val <= 110:
                    age_detected = age_val
            except ValueError:
                pass

        scores: Dict[str, float] = {cat: 0.0 for cat in self.category_keywords}

        # Boost senior if age >= 60 detected
        if age_detected and age_detected >= 60:
            scores["senior"] += 4.0

        # Specific user story exact matching boost:
        # 1. "Main kheti karta hoon" / "kheti karta hoon" -> Farmer
        if "kheti" in lower_query or "खेती" in lower_query or "kisan" in lower_query or "किसान" in lower_query:
            scores["farmer"] += 3.5

        # 2. "Main college student hoon" / "college student" / "student hoon" -> Student
        if "student" in lower_query or "college" in lower_query or "scholarship" in lower_query or "छात्र" in lower_query or "स्कॉलरशिप" in lower_query:
            scores["student"] += 3.5

        # 3. "Meri umar 65 saal hai" / "65 saal" / "pension" -> Senior
        if "65" in lower_query or "pension" in lower_query or "पेंशन" in lower_query or "buzurg" in lower_query:
            scores["senior"] += 3.5

        # 4. "Mahila hoon" / "women" / "aurat" -> Women
        if "mahila" in lower_query or "महिला" in lower_query or "aurat" in lower_query or "beti" in lower_query or "गर्भवती" in lower_query:
            scores["women"] += 3.5

        # Word & phrase token scanning
        for cat_id, cfg in self.category_keywords.items():
            for kw in cfg["keywords"]:
                if kw in lower_query:
                    # Longer matching keywords carry higher confidence
                    increment = (1.5 if len(kw.split()) > 1 else 1.0) * cfg["weight"]
                    scores[cat_id] += increment

        # Find best category
        sorted_categories = sorted(scores.items(), key=lambda item: item[1], reverse=True)
        best_category, highest_score = sorted_categories[0]

        # Scheme resolution
        matched_scheme = None
        confidence = 0.0

        if highest_score > 0.5:
            confidence = min(0.98, round(0.55 + (highest_score * 0.12), 2))
            default_id = self.category_keywords[best_category]["default_scheme_id"]
            
            # Refine scheme within category if sub-keywords exist
            if best_category == "farmer":
                if "bima" in lower_query or "बीमा" in lower_query or "nuksan" in lower_query:
                    matched_scheme = self.schemes_by_id.get("pm-fasal-bima")
                else:
                    matched_scheme = self.schemes_by_id.get(default_id)
            elif best_category == "student":
                if "yasasvi" in lower_query or "यशस्वी" in lower_query:
                    matched_scheme = self.schemes_by_id.get("pm-yasasvi")
                else:
                    matched_scheme = self.schemes_by_id.get(default_id)
            elif best_category == "senior":
                if "atal" in lower_query or "अटल" in lower_query:
                    matched_scheme = self.schemes_by_id.get("atal-pension")
                else:
                    matched_scheme = self.schemes_by_id.get(default_id)
            elif best_category == "women":
                if "sukanya" in lower_query or "सुकन्या" in lower_query or "beti" in lower_query:
                    matched_scheme = self.schemes_by_id.get("sukanya-samriddhi")
                else:
                    matched_scheme = self.schemes_by_id.get(default_id)
            else:
                matched_scheme = self.schemes_by_id.get(default_id)
        else:
            # Fallback default: suggest student/farmer popular schemes with low confidence
            best_category = "farmer"
            confidence = 0.35
            matched_scheme = self.schemes_by_id.get("pm-kisan")

        # Find alternatives
        alternatives = [
            s for s in self.schemes 
            if s["category"] == best_category and s["id"] != matched_scheme["id"]
        ]
        if not alternatives:
            alternatives = [s for s in self.schemes if s["id"] != matched_scheme["id"]][:2]

        category_meta = self.categories.get(best_category, {
            "id": best_category,
            "name_hi": best_category.capitalize(),
            "icon": "📋"
        })

        # Generate voice response text
        voice_response = matched_scheme.get("voice_summary_hi", "")
        if not voice_response:
            voice_response = (
                f"Aapke liye {matched_scheme['name_hi']} upyukt ho sakti hai. "
                f"Kripya aavedan ke liye teen aasan kadamon ka palan karein."
            )

        return {
            "query": cleaned_query,
            "detected_category": best_category,
            "category_meta": category_meta,
            "confidence": confidence,
            "dialect_detected": dialect,
            "matched_scheme": matched_scheme,
            "alternative_schemes": alternatives,
            "voice_response": voice_response,
            "score_breakdown": {k: round(v, 2) for k, v in scores.items() if v > 0}
        }
