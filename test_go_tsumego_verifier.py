import unittest

import go_tsumego_verifier as verifier


class GoTsumegoVerifierTests(unittest.TestCase):
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


if __name__ == "__main__":
    unittest.main()
