import unittest
from backend.engine import SchemeEngine

class TestSchemeEngine(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = SchemeEngine()

    def test_student_intent(self):
        # PRD Story 1
        res = self.engine.match_intent("Main college student hoon")
        self.assertEqual(res["detected_category"], "student")
        self.assertEqual(res["matched_scheme"]["id"], "nsp-scholarship")
        self.assertGreater(res["confidence"], 0.7)
        self.assertTrue(len(res["matched_scheme"]["steps_hi"]) == 3)
        self.assertIn("छात्रवृत्ति", res["voice_response"])

    def test_farmer_intent(self):
        # PRD Story 2
        res = self.engine.match_intent("Main kheti karta hoon")
        self.assertEqual(res["detected_category"], "farmer")
        self.assertEqual(res["matched_scheme"]["id"], "pm-kisan")
        self.assertGreater(res["confidence"], 0.7)
        self.assertIn("पीएम-किसान", res["voice_response"])

    def test_senior_intent(self):
        # PRD Story 3
        res = self.engine.match_intent("Meri umar 65 saal hai")
        self.assertEqual(res["detected_category"], "senior")
        self.assertEqual(res["matched_scheme"]["id"], "senior-pension")
        self.assertGreater(res["confidence"], 0.7)
        self.assertIn("वृद्धावस्था पेंशन", res["voice_response"])

    def test_women_intent(self):
        res = self.engine.match_intent("Main mahila hoon mujhe madad chahiye")
        self.assertEqual(res["detected_category"], "women")
        self.assertEqual(res["matched_scheme"]["id"], "pm-matru-vandana")
        self.assertGreater(res["confidence"], 0.7)

    def test_devanagari_input(self):
        res_dev_farmer = self.engine.match_intent("मैं खेती करता हूँ")
        self.assertEqual(res_dev_farmer["detected_category"], "farmer")
        self.assertEqual(res_dev_farmer["matched_scheme"]["id"], "pm-kisan")

        res_dev_student = self.engine.match_intent("मैं कॉलेज छात्र हूँ")
        self.assertEqual(res_dev_student["detected_category"], "student")

        res_dev_senior = self.engine.match_intent("मेरी उम्र 65 साल है")
        self.assertEqual(res_dev_senior["detected_category"], "senior")

    def test_bhojpuri_dialect_input(self):
        res_bhojpuri = self.engine.match_intent("Hum kheti karat baani")
        self.assertEqual(res_bhojpuri["detected_category"], "farmer")
        self.assertIn("Bhojpuri", res_bhojpuri["dialect_detected"])

        res_bhojpuri_senior = self.engine.match_intent("Hamaar umar 65 saal ba")
        self.assertEqual(res_bhojpuri_senior["detected_category"], "senior")

    def test_three_step_instructions_present(self):
        # FR-5: System shall generate simple instructions (3 steps)
        for scheme in self.engine.schemes:
            self.assertIn("steps_hi", scheme)
            self.assertEqual(len(scheme["steps_hi"]), 3, f"Scheme {scheme['id']} should have 3 steps")
            self.assertTrue(len(scheme["required_documents_hi"]) > 0)

if __name__ == "__main__":
    unittest.main()
