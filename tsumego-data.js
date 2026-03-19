(function attachTsumegoData(globalScope) {
  globalScope.GO_APP_TSUMEGO_DATA = {
    boardSize: 6,
    defaultPrompt: "黒番です。1手で白を取ってください。",
    defaultNote:
      "第1問から第8問まで入れています。\n詰碁はすべて6路盤で作る予定です。\n最初の1手で正解・不正解を判定し、その後も続きを確認できます。",
    problems: [
      {
        id: "problem-1",
        title: "第1問",
        subtitle: "6路盤の1手詰めです。",
        rows: [
          "......",
          "..B...",
          ".BW...",
          "..B...",
          "......",
          "......"
        ],
        targetStones: [[2, 2]],
        solution: [2, 3]
      },
      {
        id: "problem-2",
        title: "第2問",
        subtitle: "端の2子を1手で取る問題です。",
        rows: [
          "......",
          "B.....",
          "WB....",
          "W.....",
          "B.....",
          "......"
        ],
        targetStones: [
          [2, 0],
          [3, 0]
        ],
        solution: [3, 1]
      },
      {
        id: "problem-3",
        title: "第3問",
        subtitle: "曲がった白の連を仕留める問題です。",
        rows: [
          "......",
          "..BB..",
          ".BWWB.",
          ".BW...",
          "..B...",
          "......"
        ],
        targetStones: [
          [2, 2],
          [2, 3],
          [3, 2]
        ],
        solution: [3, 3]
      },
      {
        id: "problem-4",
        title: "第4問",
        subtitle: "隅の白を1手で取る問題です。",
        rows: [
          "WB....",
          "......",
          "......",
          "......",
          "......",
          "......"
        ],
        targetStones: [[0, 0]],
        solution: [1, 0]
      },
      {
        id: "problem-5",
        title: "第5問",
        subtitle: "中に打って4子を取る問題です。",
        rows: [
          "..B...",
          ".BWB..",
          "BW.WB.",
          ".BWB..",
          "..B...",
          "......"
        ],
        targetStones: [
          [1, 2],
          [2, 1],
          [2, 3],
          [3, 2]
        ],
        solution: [2, 2]
      },
      {
        id: "problem-6",
        title: "第6問",
        subtitle: "中に打って曲がった白の連を取る問題です。",
        rows: [
          "..B...",
          ".BWB..",
          "BW.WB.",
          ".BWWB.",
          "..BB..",
          "......"
        ],
        targetStones: [
          [1, 2],
          [2, 1],
          [2, 3],
          [3, 2],
          [3, 3]
        ],
        solution: [2, 2]
      },
      {
        id: "problem-7",
        title: "第7問",
        subtitle: "中に打って白の輪を一気に取る問題です。",
        rows: [
          ".BBB..",
          "BWWWB.",
          "BW.WB.",
          "BWWWB.",
          ".BBB..",
          "......"
        ],
        targetStones: [
          [1, 1],
          [1, 2],
          [1, 3],
          [2, 1],
          [2, 3],
          [3, 1],
          [3, 2],
          [3, 3]
        ],
        solution: [2, 2]
      },
      {
        id: "problem-8",
        title: "第8問",
        subtitle: "左上の端で最小6石の2眼を作る問題です。",
        prompt: "黒番です。白に包まれた黒で最小6石の2眼を作ってください。",
        note:
          "第8問は左上の端で最小6石の2眼を作る黒生き問題です。\n白石は必要最小限だけ置いています。\n外すと0.5秒後に白が1手ずつ自動で応手します。",
        goalType: "live",
        rows: [
          "..W...",
          "BBW...",
          ".BW...",
          "BBW...",
          "WWW...",
          "......"
        ],
        targetStones: [
          [1, 0],
          [1, 1],
          [2, 1],
          [3, 0],
          [3, 1]
        ],
        solution: [0, 1]
      }
    ]
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
