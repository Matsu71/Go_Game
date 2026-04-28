import unittest

import go_tsumego_verifier as verifier


class GoTsumegoVerifierTests(unittest.TestCase):
    REGRESSION_CAPTURE_CASE = {
        "rows": [
            ".BWWB.",
            ".BWB..",
            ".BW...",
            ".B....",
            ".B....",
            ".B....",
        ],
        "turn": "black",
        "goalType": "kill",
        "targetColor": "W",
        "target": ["C1"],
        "winningFirstMoves": ["D3"],
        "principalVariation": ["D3", "C4", "D4", "C5", "D5", "C6", "D6"],
        "successCondition": "capture-target",
        "expectedFinalRows": [
            ".B..B.",
            ".B.B..",
            ".B.B..",
            ".B.B..",
            ".B.B..",
            ".B.B..",
        ],
        "maxDepth": 7,
        "searchRadius": 2,
        "maxNodes": 50000,
    }

    def test_coordinate_conversion(self):
        self.assertEqual(verifier.coord_to_point("A1"), (0, 0))
        self.assertEqual(verifier.coord_to_point("F6"), (5, 5))
        self.assertEqual(verifier.point_to_coord((2, 3)), "C4")

    def test_rows_validation(self):
        self.assertTrue(verifier.validate_rows(["......"] * 5))
        self.assertTrue(verifier.validate_rows(["......"] * 5 + [".....X"]))
        self.assertEqual(verifier.validate_rows(["......"] * 6), [])

    def test_group_and_liberties(self):
        board = verifier.parse_rows(
            [
                "......",
                "..B...",
                ".BB...",
                "......",
                "......",
                "......",
            ]
        )
        single = verifier.get_group(board, (1, 2))
        group = verifier.get_group(board, (2, 1))
        self.assertEqual(single, {(1, 2), (2, 2), (2, 1)})
        self.assertEqual(group, {(1, 2), (2, 2), (2, 1)})
        self.assertEqual(verifier.count_liberties(board, group), 7)

    def test_capture_single_stone(self):
        board = verifier.parse_rows(
            [
                "......",
                "..B...",
                ".BW...",
                "..B...",
                "......",
                "......",
            ]
        )
        result = verifier.play_move(board, verifier.BLACK, "D3")
        self.assertTrue(result.legal)
        self.assertEqual(result.captured, [(2, 2)])
        self.assertEqual(result.board[2][2], verifier.EMPTY)

    def test_capture_multi_stone_group(self):
        board = verifier.parse_rows(
            [
                "BBBB..",
                "BWWB..",
                "BB.B..",
                "BBBB..",
                "......",
                "......",
            ]
        )
        result = verifier.play_move(board, verifier.BLACK, "C3")
        self.assertTrue(result.legal)
        self.assertEqual(set(result.captured), {(1, 1), (2, 1)})

    def test_suicide_is_illegal(self):
        board = verifier.parse_rows(
            [
                ".W....",
                "W.W...",
                ".W....",
                "......",
                "......",
                "......",
            ]
        )
        result = verifier.play_move(board, verifier.BLACK, "B2")
        self.assertFalse(result.legal)
        self.assertTrue(result.suicide)

    def test_capture_in_suicide_shape_is_legal(self):
        board = verifier.parse_rows(
            [
                "BWB...",
                "W.WB..",
                "BWB...",
                ".B....",
                "......",
                "......",
            ]
        )
        result = verifier.play_move(board, verifier.BLACK, "B2")
        self.assertTrue(result.legal)
        self.assertEqual(set(result.captured), {(0, 1), (1, 0), (1, 2), (2, 1)})

    def test_replay_principal_variation_valid(self):
        data = {
            "rows": [
                "......",
                "..B...",
                ".BW...",
                "..B...",
                "......",
                "......",
            ],
            "turn": "black",
            "goalType": "kill",
            "targetColor": "W",
            "target": ["C3"],
            "principalVariation": ["D3"],
        }
        result = verifier.replay_principal_variation(data)
        self.assertTrue(result["principalVariationValid"])
        self.assertTrue(result["targetCapturedInPV"])

    def test_replay_principal_variation_invalid(self):
        data = {
            "rows": ["......"] * 6,
            "turn": "black",
            "goalType": "kill",
            "targetColor": "W",
            "target": ["C3"],
            "principalVariation": ["A1", "A1"],
        }
        result = verifier.replay_principal_variation(data)
        self.assertFalse(result["principalVariationValid"])
        self.assertTrue(result["errors"])

    def test_target_not_captured_in_pv(self):
        data = {
            "rows": [
                "......",
                "..B...",
                ".BW...",
                "..B...",
                "......",
                "......",
            ],
            "turn": "black",
            "goalType": "kill",
            "targetColor": "W",
            "target": ["C3"],
            "principalVariation": ["A1"],
        }
        result = verifier.replay_principal_variation(data)
        self.assertTrue(result["principalVariationValid"])
        self.assertFalse(result["targetCapturedInPV"])

    def test_unique_first_move_detection(self):
        data = {
            "rows": [
                "......",
                "..B...",
                ".BW...",
                "..B...",
                "......",
                "......",
            ],
            "turn": "black",
            "goalType": "kill",
            "targetColor": "W",
            "target": ["C3"],
            "winningFirstMoves": ["D3"],
            "maxDepth": 1,
        }
        result = verifier.find_winning_first_moves(data)
        self.assertEqual(result["winningFirstMovesVerified"], ["D3"])
        self.assertFalse(result["hasAlternativeFirstMove"])

    def test_alternative_first_move_detection(self):
        data = {
            "rows": [
                "......",
                "..B...",
                ".BW...",
                "..B...",
                "......",
                "......",
            ],
            "turn": "black",
            "goalType": "kill",
            "targetColor": "W",
            "target": ["C3"],
            "winningFirstMoves": ["A1"],
            "maxDepth": 1,
        }
        result = verifier.find_winning_first_moves(data)
        self.assertEqual(result["alternativeWinningFirstMoves"], ["D3"])
        self.assertTrue(result["hasAlternativeFirstMove"])

    def test_regression_candidate_replay_target_history_and_final_rows(self):
        result = verifier.replay_principal_variation(dict(self.REGRESSION_CAPTURE_CASE))
        self.assertTrue(result["principalVariationValid"])
        self.assertTrue(result["targetCapturedInPV"])
        self.assertTrue(result["successConditionMet"])
        self.assertTrue(result["expectedFinalRowsMatched"])
        self.assertEqual(set(result["initialTargetGroup"]), {"C1", "D1", "C2", "C3"})
        self.assertEqual(result["targetCapturedMove"], "B D6")
        self.assertIn("W C4", result["targetExpandedByWhiteMoves"])

    def test_expected_final_rows_mismatch_fails_ok(self):
        data = dict(self.REGRESSION_CAPTURE_CASE)
        data["maxDepth"] = 1
        data["expectedFinalRows"] = [
            ".B..B.",
            ".B.B..",
            ".B.W..",
            ".B.B..",
            ".B.B..",
            ".B.B..",
        ]
        result = verifier.verify_tsumego(data)
        self.assertFalse(result["ok"])
        self.assertFalse(result["expectedFinalRowsMatched"])
        self.assertTrue(result["finalRowsDiff"])

    def test_pruning_warning_makes_ok_false(self):
        data = dict(self.REGRESSION_CAPTURE_CASE)
        data.update({"fastMode": True, "maxBranchingMoves": 1, "maxNodes": 300, "maxDepth": 3})
        result = verifier.verify_tsumego(data)
        categories = {warning["category"] for warning in result["warningDetails"]}
        self.assertFalse(result["ok"])
        self.assertIn("PRUNING", categories)
        self.assertTrue(result["searchCompleteness"]["candidateMovesPruned"])

    def test_search_radius_exclusion_makes_ok_false(self):
        data = dict(self.REGRESSION_CAPTURE_CASE)
        data.update({"fastMode": True, "searchRadius": 0, "maxNodes": 300, "maxDepth": 3})
        result = verifier.verify_tsumego(data)
        self.assertFalse(result["ok"])
        self.assertTrue(result["searchCompleteness"]["searchRadiusExcluded"])
        self.assertTrue(result["searchCompleteness"]["excludedLegalMoves"])

    def test_two_eye_analysis_detects_living_target(self):
        board = verifier.parse_rows(
            [
                ".W.WBB",
                "WWWWWB",
                "BBBBBB",
                "......",
                "......",
                "......",
            ]
        )
        analysis = verifier.analyze_target_eyes(board, ["B1"], "W")
        self.assertGreaterEqual(analysis["trueEyeCount"], 2)
        self.assertTrue(analysis["hasTwoEyes"])

    def test_prevent_target_two_eyes_success_without_capture(self):
        data = {
            "rows": [
                "BBBBBB",
                "BWWWBB",
                "BW..BB",
                "BWWWBB",
                "BBBBBB",
                "......",
            ],
            "turn": "black",
            "goalType": "kill",
            "targetColor": "W",
            "target": ["B2"],
            "winningFirstMoves": ["C3"],
            "principalVariation": ["C3"],
            "successCondition": "prevent-target-two-eyes",
            "expectedFinalRows": [
                "BBBBBB",
                "BWWWBB",
                "BWB.BB",
                "BWWWBB",
                "BBBBBB",
                "......",
            ],
            "maxDepth": 1,
        }
        result = verifier.verify_tsumego(data)
        self.assertTrue(result["successConditionMet"])
        self.assertEqual(result["successMethod"], "prevent-two-eyes")
        self.assertFalse(result["targetCapturedInPV"])
        self.assertFalse(result["targetEyeAnalysis"]["hasTwoEyes"])

    def test_prevent_target_two_eyes_fails_when_two_eyes_remain(self):
        data = {
            "rows": [
                ".W.WBB",
                "WWWWWB",
                "BBBBBB",
                "......",
                "......",
                "......",
            ],
            "turn": "black",
            "goalType": "kill",
            "targetColor": "W",
            "target": ["B1"],
            "winningFirstMoves": [],
            "principalVariation": [],
            "successCondition": "prevent-target-two-eyes",
            "maxDepth": 1,
        }
        result = verifier.verify_tsumego(data)
        self.assertFalse(result["ok"])
        self.assertFalse(result["successConditionMet"])
        self.assertTrue(result["targetEyeAnalysis"]["hasTwoEyes"])


if __name__ == "__main__":
    unittest.main()
