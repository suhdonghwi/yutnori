import type { Messages } from "..";

// English catalog. Typed as `Messages` (inferred from the Korean source
// catalog), so any missing or mistyped entry is a compile error.
export const en: Messages = {
  appTitle: "Yutnori",

  team: (player) => (player === 0 ? "Blue Team" : "Red Team"),
  tokenTag: (player, piece) => `${player === 0 ? "B" : "R"}${piece + 1}`,

  yut: {
    mo: "Mo",
    do: "Do",
    gae: "Gae",
    geol: "Geol",
    yut: "Yut",
    backdo: "Backdo",
  },

  lobby: {
    title: "Yutnori",
    modeListLabel: "Choose a play mode",
    modes: {
      local: {
        title: "Local Match",
        description: "Two players take turns on one device.",
      },
      online: {
        title: "Online Match",
        description: "Invite a friend or face other players.",
      },
      ai: { title: "AI Match", description: "Play solo against the computer." },
    },
    start: "Play",
    comingSoon: "Coming soon",
    howToPlay: "How to Play",
  },

  tutorial: {
    title: "How to Play",
    canvasLabel: "3D Yutnori how-to-play demonstration",
    navigationLabel: "Tutorial step navigation",
    skip: "Skip",
    back: "Back",
    next: "Next",
    done: "Got it · back to lobby",
    stepLabel: (current, total) => `Step ${current} of ${total}`,
    steps: {
      goal: {
        title: "Race around the board and home",
        body: "Move a piece by your throw and follow the route around the board. The first team to finish all 4 pieces wins.",
      },
      throw: {
        title: "Count the flat sides to read your throw",
        body: "Throw all four yut sticks and count the flat sides facing up. The result tells you how many steps to move.",
      },
      shortcut: {
        title: "Land on a corner to unlock a shortcut",
        body: "After landing exactly on a junction, choose the diagonal route on your next move to cut across the center.",
      },
      "capture-stack": {
        title: "Capture rivals and stack allies",
        body: "Land on a rival to send it back to the bench and throw again. Land on your own piece to stack and move together.",
      },
      win: {
        title: "Finish all 4 pieces first to win",
        body: "Cross the finish with your final piece to win immediately. Use shortcuts, stacks, and captures to get there first.",
      },
    },
    movePreview: (steps) =>
      steps === 1 ? "Move 1 step" : `Move ${steps} steps`,
    throwWaiting: "Reading the sticks…",
    throwReading: (flats, name, steps) =>
      steps < 0
        ? `${flats} flat ${flats === 1 ? "side" : "sides"} → ${name} · move 1 step back`
        : `${flats} flat ${flats === 1 ? "side" : "sides"} → ${name} · move ${steps}`,
    throwAgainBadge: "Throw again!",
    finishedBadge: "Finished!",
    backdoFootnote: "Backdo moves one step back",
    extraThrowFootnote: "Yut and Mo earn another throw",
  },

  game: {
    canvasLabel: "3D Yutnori game",
    finishedCount: (finished) => `${finished} / 4 finished`,
    sfx: "Sound",
    sfxOn: "Turn sound on",
    sfxOff: "Turn sound off",
    toLobby: "Lobby",
    toLobbyLabel: "Back to lobby",
    newGame: "New game",
    newGameLabel: "Start a new game",
    footerHintRules:
      "Pick a route at junctions, stack your own pieces, capture your opponent's. Bring all 4 pieces home first to win.",
    footerHintExtraThrow: "Yut, mo, and captures earn an extra throw",
  },

  dock: {
    now: "Now",
    aiChoice: (team) => `${team}'s choice`,
    aiThinking: "Reading the board",
    tokenListLabel: "Choose a piece to move",
    token: (piece) => `Piece ${piece + 1}`,
    stackedWith: (leaderPiece) => `Stacked with piece ${leaderPiece + 1}`,
    routeListLabel: "Choose a route",
    shortcutFromCenter: {
      label: "Fast shortcut",
      description: "Head straight for the finish",
    },
    shortcutFromBranch: {
      label: "Shortcut",
      description: "Cut across the center",
    },
    outerFromCenter: {
      label: "Long way",
      description: "Go around the far corner",
    },
    outerFromBranch: {
      label: "Outer path",
      description: "Keep following the edge",
    },
    playAgain: "Play again",
    throwButton: {
      ai: "AI is playing",
      rolling: "Checking the result",
      moving: "Piece moving",
      ready: "Throw the yut",
    },
  },

  status: {
    aiPreparingThrow: (team) => `${team} AI is getting ready to throw`,
    playerTurn: (team) => `${team}'s turn`,
    aiJudgingThrow: (team) => `Judging the ${team} AI's throw`,
    waitingForSticks: (team) => `Judging ${team}'s throw`,
    aiDecision: (reason) => `AI's call · ${reason}`,
    aiComputing: "AI is computing the best move",
    backdoMove: "Backdo · pick a piece to move one step back",
    move: (yutName, steps) =>
      `${yutName} · move ${steps === 1 ? "1 step" : `${steps} steps`}`,
    routeFromCenter: "Which shortcut from the center?",
    routeFromBranch: "Which way at this junction?",
    winner: (team) => `${team} brought all 4 pieces home`,
  },

  notice: {
    backdoNoMoves: "Backdo, but no piece could move — turn passed",
    aiNoMoves: "The AI had no legal move — turn passed",
    stacked: (count) => `Stacked ${count} of your pieces together`,
    captured: "Captured an opponent's piece — throw again",
    extraThrow: (yutName) => `${yutName}! Throw again`,
  },

  preview: {
    finished: "Finish",
    toHome: "Back to the bench",
    fastShortcutArrival: "Via fast route",
    roundaboutArrival: "Via long way",
    shortcutArrival: "Via shortcut",
    outerArrival: "Via outer path",
    arrival: (yutName) => `${yutName} lands here`,
    capture: "Capture!",
    stack: "Stack!",
  },

  pieceProgress: (progress) => {
    switch (progress.kind) {
      case "home":
        return "Start";
      case "finished":
        return "Finished";
      case "junction":
        return "Junction";
      case "center":
        return "Center";
      case "shortcut":
        return "Shortcut";
      case "outer":
        return `Outer ${progress.index}/20`;
    }
  },

  aiReason: {
    win: "Completing the win",
    finish: "Finishing a piece",
    capture: "Capturing a piece",
    stack: "Stacking allies",
    shortcut: "Taking the shortcut",
    prepareShortcut: "Setting up a shortcut",
    backdoRetreat: "Best backdo retreat",
    expectedFinish: "Best finishing odds",
  },

  victory: {
    tag: "MATCH OVER",
    winner: (team) => `${team} wins`,
    subtitle: "All 4 pieces home first",
  },

  throwEffect: {
    tag: "THROW RESULT",
    backdo: "One step back",
    stepsExtra: (steps) => `${steps} steps · throw again!`,
    steps: (steps) =>
      steps === 1 ? "1 step forward" : `${steps} steps forward`,
  },

  languageSwitcherLabel: "Choose language",
};
