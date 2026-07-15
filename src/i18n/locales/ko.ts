import { josa, susa } from "es-hangul";
import type { PieceProgress, Player } from "../../game/rules";
import type { AiReason } from "../../game/ai-player";
import type { YutResultId } from "../../game/types";

// 한국어는 기준 카탈로그입니다. `Messages` 타입이 이 객체에서 추론되므로,
// 새 언어는 `const en: Messages = { ... }`로 선언하면 빠진 항목이 컴파일 오류가 됩니다.
// 문법(조사·수사)이 필요한 메시지는 함수로 두어 언어마다 자유롭게 조합할 수 있습니다.
export const ko = {
  appTitle: "윷놀이",

  team: (player: Player): string => (player === 0 ? "청팀" : "홍팀"),
  tokenTag: (player: Player, piece: number) =>
    `${player === 0 ? "청" : "홍"}${piece + 1}`,

  yut: {
    mo: "모",
    do: "도",
    gae: "개",
    geol: "걸",
    yut: "윷",
    backdo: "빽도",
  } satisfies Record<YutResultId, string>,

  lobby: {
    title: "윷놀이",
    modeListLabel: "플레이 모드 선택",
    modes: {
      local: {
        title: "로컬 대전",
        description: "두 사람이 번갈아 플레이합니다.",
      },
      online: {
        title: "온라인 대전",
        description: "친구를 초대하거나 다른 플레이어와 대전합니다.",
      },
      ai: { title: "AI 대전", description: "컴퓨터 상대와 혼자서 대전합니다." },
    },
    start: "시작하기",
    comingSoon: "준비 중",
    howToPlay: "게임 방법",
  },

  rules: {
    tag: "HOW TO PLAY",
    title: "윷놀이 게임 방법",
    close: "게임 방법 닫기",
    goal: {
      title: "말 4개를 먼저 완주시키세요",
      body: "윷을 던져 나온 수만큼 말을 움직이고, 자기 팀의 말 4개를 모두 도착시키면 승리합니다.",
    },
    throws: {
      title: "윷의 결과",
      steps: (steps: number) => `${steps}칸`,
      stepsExtra: (steps: number) => `${steps}칸 · 한 번 더`,
      backdo: "뒤로 1칸",
    },
    carryCapture: {
      title: "업기와 잡기",
      body: "같은 편 말이 있는 칸에 도착하면 함께 업고 이동합니다. 상대 말을 잡으면 그 말을 대기석으로 보내고 한 번 더 던집니다.",
    },
    shortcut: {
      title: "지름길을 선택하세요",
      body: "갈림길과 중앙에 정확히 도착하면 다음 이동에서 지름길을 선택할 수 있습니다. 예상 경로를 확인하고 유리한 길을 고르세요.",
    },
  },

  game: {
    canvasLabel: "3D 윷놀이 게임",
    finishedCount: (finished: number) => `${finished} / 4 도착`,
    sfx: "효과음",
    sfxOn: "효과음 켜기",
    sfxOff: "효과음 끄기",
    toLobby: "로비",
    toLobbyLabel: "로비로 돌아가기",
    newGame: "새 판",
    newGameLabel: "새 판 시작",
    footerHintRules:
      "갈림길에서는 길을 고르고, 같은 편은 업고, 상대편은 잡습니다. 말 4개를 먼저 모두 내면 승리합니다.",
    footerHintExtraThrow: "윷·모 또는 잡기에는 한 번 더 던집니다",
  },

  dock: {
    now: "지금은",
    aiChoice: (team: string) => `${team}의 선택`,
    aiThinking: "수를 읽는 중",
    tokenListLabel: "움직일 말 선택",
    confirmMove: "선택한 말 움직이기",
    backToTokenSelection: "말 선택으로 돌아가기",
    token: (piece: number) => `말 ${piece + 1}`,
    stackedWith: (leaderPiece: number) =>
      `${josa(`${leaderPiece + 1}번 말`, "와/과")} 업힘`,
    routeListLabel: "이동 경로 선택",
    shortcutFromCenter: {
      label: "빠른 지름길",
      description: "도착점 방향으로 바로 갑니다",
    },
    shortcutFromBranch: {
      label: "지름길",
      description: "가운데를 가로질러 갑니다",
    },
    outerFromCenter: {
      label: "돌아가는 길",
      description: "반대편 모서리를 거쳐 갑니다",
    },
    outerFromBranch: {
      label: "바깥길",
      description: "모서리를 따라 계속 갑니다",
    },
    playAgain: "한 판 더",
    throwButton: {
      ai: "AI 자동 진행",
      rolling: "결과 확인 중",
      moving: "말 이동 중",
      ready: "윷 던지기",
    },
  },

  status: {
    aiPreparingThrow: (team: string) => `${team} AI가 윷을 준비하는 중`,
    playerTurn: (team: string) => `${team}의 차례입니다`,
    aiJudgingThrow: (team: string) => `${team} AI가 던진 윷을 판정하는 중`,
    waitingForSticks: (team: string) =>
      `${josa(team, "이/가")} 던진 윷을 판정하는 중`,
    aiDecision: (reason: string) => `AI 판단 · ${reason}`,
    aiComputing: "AI가 최선의 수를 계산하는 중",
    backdoMove: "빽도 · 움직일 말을 골라 한 칸 뒤로 가세요",
    move: (yutName: string, steps: number) =>
      `${yutName} · ${steps}칸 움직이세요`,
    routeFromCenter: "중앙에서 어느 지름길로 갈까요?",
    routeFromBranch: "이 갈림길에서 어느 길로 갈까요?",
    winner: (team: string) => `${josa(team, "이/가")} 말 4개를 모두 냈습니다`,
  },

  notice: {
    backdoNoMoves: "빽도였지만 움직일 말이 없어 차례가 넘어갔습니다",
    aiNoMoves: "AI가 움직일 수 없어 차례가 넘어갔습니다",
    stacked: (count: number) =>
      `같은 편 ${josa(`${susa(count, true)} 말`, "을/를")} 업었습니다`,
    captured: "상대 말을 잡아 한 번 더 던집니다",
    extraThrow: (yutName: string) =>
      `${josa(yutName, "이/가")} 나와 한 번 더 던집니다`,
  },

  preview: {
    finished: "도착",
    toHome: "대기석으로",
    fastShortcutArrival: "빠른 길 도착",
    roundaboutArrival: "돌아가는 길 도착",
    shortcutArrival: "지름길 도착",
    outerArrival: "바깥길 도착",
    arrival: (yutName: string) => `${yutName} 도착`,
    capture: "잡기!",
    stack: "업기!",
  },

  pieceProgress: (progress: PieceProgress): string => {
    switch (progress.kind) {
      case "home":
        return "출발";
      case "finished":
        return "도착";
      case "junction":
        return "갈림길";
      case "center":
        return "한가운데";
      case "shortcut":
        return "지름길";
      case "outer":
        return `바깥길 ${progress.index}/20`;
    }
  },

  aiReason: {
    win: "승리를 완성하는 말 선택",
    finish: "완주할 수 있는 말 선택",
    capture: "상대 말 잡기",
    stack: "같은 편 말 업기",
    shortcut: "지름길 선택",
    prepareShortcut: "다음 지름길 준비",
    backdoRetreat: "빽도 최적 후퇴",
    expectedFinish: "완주 기대값이 높은 말 선택",
  } satisfies Record<AiReason, string>,

  victory: {
    tag: "승부 종료",
    winner: (team: string) => `${team} 승리`,
    subtitle: "말 4개를 모두 먼저 냈습니다",
  },

  throwEffect: {
    tag: "윷 결과",
    backdo: "한 칸 뒤로",
    stepsExtra: (steps: number) => `${steps}칸 · 한 번 더!`,
    steps: (steps: number) => `${steps}칸 전진`,
  },

  languageSwitcherLabel: "언어 선택",
};
