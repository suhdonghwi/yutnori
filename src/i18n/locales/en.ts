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

  rules: {
    tag: "HOW TO PLAY",
    title: "How to Play Yutnori",
    close: "Close how to play",
    goal: {
      title: "Finish all 4 pieces first",
      body: "Throw the yut sticks and move a piece by the number shown. The first team to bring all 4 pieces across the finish wins.",
    },
    throws: {
      title: "Yut throws",
      steps: (steps) => (steps === 1 ? "1 step" : `${steps} steps`),
      stepsExtra: (steps) => `${steps} steps · throw again`,
      backdo: "1 step back",
    },
    carryCapture: {
      title: "Stacking and capturing",
      body: "Land on your own piece to stack up and move together. Capture an opponent's piece to send it back to the bench and throw again.",
    },
    shortcut: {
      title: "Choose your shortcut",
      body: "Land exactly on a junction or the center to unlock a shortcut on your next move. Check the preview path and pick the better route.",
    },
  },

  tutorial: {
    title: "How to Play",
    canvasLabel: "Animated Yutnori tutorial",
    skip: "Skip",
    back: "Back",
    next: "Next",
    done: "Got it",
    detailedRules: "Detailed rules",
    stepLabel: (current, total) => `Step ${current} of ${total}`,
    steps: {
      goal: {
        title: "Race around the board and home",
        body: "Move by your throw. The first team to bring all four pieces across the finish wins.",
      },
      throw: {
        title: "Throw the sticks and count flat sides",
        body: "The number of flat sides tells you how many spaces to move. Watch a real throw below.",
      },
      shortcut: {
        title: "Corners unlock shortcuts",
        body: "Land exactly on a junction to choose a faster diagonal route on your next move.",
      },
      "capture-stack": {
        title: "Capture rivals and stack allies",
        body: "Captures send rivals home and earn another throw. Your own pieces stack and move together.",
      },
      win: {
        title: "Finish all four pieces first",
        body: "Cross the finish with your last piece to win the match.",
      },
    },
    throwReading: (flats, name, steps) =>
      `${flats} flat → ${name} → move ${steps}`,
    throwWaiting: "Throwing the sticks…",
    throwFootnote: "Yut/Mo: throw again · Backdo: move back one.",
    throwAgainBadge: "Throw again!",
    finishedBadge: "You win!",
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
