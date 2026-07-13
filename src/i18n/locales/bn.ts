import type { Messages } from "..";

const BENGALI_DIGITS = "০১২৩৪৫৬৭৮৯";
const bnNum = (value: number) =>
  String(value).replace(/\d/g, (digit) => BENGALI_DIGITS[Number(digit)]);

// Bengali catalog. Typed as `Messages` (inferred from the Korean source
// catalog), so any missing or mistyped entry is a compile error.
export const bn: Messages = {
  appTitle: "ইউতনরি",

  team: (player) => (player === 0 ? "নীল দল" : "লাল দল"),
  tokenTag: (player, piece) =>
    `${player === 0 ? "নী" : "লা"}${bnNum(piece + 1)}`,

  yut: {
    mo: "মো",
    do: "দো",
    gae: "গ্যা",
    geol: "গল",
    yut: "ইউত",
    backdo: "ব্যাকদো",
  },

  lobby: {
    title: "ইউতনরি",
    modeListLabel: "খেলার মোড বেছে নিন",
    modes: {
      local: {
        title: "লোকাল ম্যাচ",
        description: "দুই খেলোয়াড় একই ডিভাইসে পালা করে খেলেন।",
      },
      online: {
        title: "অনলাইন ম্যাচ",
        description: "বন্ধুকে আমন্ত্রণ জানান বা অন্য খেলোয়াড়দের মুখোমুখি হন।",
      },
      ai: {
        title: "এআই ম্যাচ",
        description: "কম্পিউটারের বিরুদ্ধে একা খেলুন।",
      },
    },
    start: "খেলুন",
    comingSoon: "শীঘ্রই আসছে",
    howToPlay: "খেলার নিয়ম",
  },

  rules: {
    tag: "খেলার নিয়ম",
    title: "ইউতনরি যেভাবে খেলবেন",
    close: "খেলার নিয়ম বন্ধ করুন",
    goal: {
      title: "৪টি ঘুঁটি আগে ঘরে তুলুন",
      body: "ইউত কাঠি ছুঁড়ে যত ঘর ওঠে, ঘুঁটি তত ঘর এগিয়ে নিন। যে দল আগে ৪টি ঘুঁটিই শেষ ঘরে পৌঁছে দেয়, সেই দল জেতে।",
    },
    throws: {
      title: "ইউত ছোঁড়ার ফল",
      steps: (steps) => `${bnNum(steps)} ঘর`,
      stepsExtra: (steps) => `${bnNum(steps)} ঘর · আবার ছুঁড়ুন`,
      backdo: "১ ঘর পিছনে",
    },
    carryCapture: {
      title: "জোড়া লাগানো ও খাওয়া",
      body: "নিজের ঘুঁটির ঘরে পৌঁছালে ঘুঁটিগুলো জোড়া লেগে একসঙ্গে চলে। প্রতিপক্ষের ঘুঁটি খেলে সেটি অপেক্ষার ঘরে ফিরে যায় আর আপনি আবার ছোঁড়ার সুযোগ পান।",
    },
    shortcut: {
      title: "শর্টকাট বেছে নিন",
      body: "মোড়ে বা কেন্দ্রে ঠিক পৌঁছালে পরের চালে শর্টকাট খুলে যায়। সম্ভাব্য পথ দেখে সুবিধাজনক রাস্তা বেছে নিন।",
    },
  },

  tutorial: {
    title: "যেভাবে খেলবেন",
    canvasLabel: "ইউতনরি শেখার অ্যানিমেশন",
    skip: "এড়িয়ে যান",
    back: "আগেরটি",
    next: "পরেরটি",
    done: "বুঝেছি",
    detailedRules: "বিস্তারিত নিয়ম",
    stepLabel: (current, total) =>
      `${bnNum(total)}টির মধ্যে ধাপ ${bnNum(current)}`,
    steps: {
      goal: {
        title: "বোর্ড ঘুরে ঘুঁটি ঘরে তুলুন",
        body: "ছোঁড়ার ফল অনুযায়ী চালুন। যে দল আগে চারটি ঘুঁটিই শেষ করে, সে জেতে।",
      },
      throw: {
        title: "কাঠি ছুঁড়ে সমতল দিক গুনুন",
        body: "সমতল দিকের সংখ্যা বলে দেয় কত ঘর চলবেন। একটি সত্যিকারের ছোঁড়া দেখুন।",
      },
      shortcut: {
        title: "কোণা শর্টকাট খুলে দেয়",
        body: "মোড়ে ঠিক পৌঁছালে পরের চালে দ্রুত তির্যক পথ বেছে নিতে পারবেন।",
      },
      "capture-stack": {
        title: "প্রতিপক্ষকে খান, নিজের ঘুঁটি জোড়া দিন",
        body: "খেলে প্রতিপক্ষ ঘরে ফেরে ও আপনি আবার ছোঁড়েন। নিজের ঘুঁটি একসঙ্গে চলে।",
      },
      win: {
        title: "চারটি ঘুঁটি আগে শেষ করুন",
        body: "শেষ ঘুঁটিটি সীমা পার করলেই জয়।",
      },
    },
    throwReading: (flats, name, steps) =>
      `${bnNum(flats)} সমতল → ${name} → ${bnNum(steps)} ঘর`,
    throwWaiting: "কাঠি ছোঁড়া হচ্ছে…",
    throwFootnote: "ইউত/মো: আবার ছুঁড়ুন · ব্যাকদো: এক ঘর পিছনে।",
    throwAgainBadge: "আবার ছুঁড়ুন!",
    finishedBadge: "জয়!",
  },

  game: {
    canvasLabel: "থ্রিডি ইউতনরি খেলা",
    finishedCount: (finished) => `${bnNum(finished)} / ৪ পৌঁছেছে`,
    sfx: "শব্দ",
    sfxOn: "শব্দ চালু করুন",
    sfxOff: "শব্দ বন্ধ করুন",
    toLobby: "লবি",
    toLobbyLabel: "লবিতে ফিরে যান",
    newGame: "নতুন খেলা",
    newGameLabel: "নতুন খেলা শুরু করুন",
    footerHintRules:
      "মোড়ে পথ বেছে নিন, নিজের ঘুঁটি জোড়া লাগান, প্রতিপক্ষের ঘুঁটি খান। ৪টি ঘুঁটিই আগে ঘরে তুললে জয়।",
    footerHintExtraThrow: "ইউত, মো বা ঘুঁটি খেলে আরেকবার ছোঁড়া যায়",
  },

  dock: {
    now: "এখন",
    aiChoice: (team) => `${team}-এর পছন্দ`,
    aiThinking: "চাল ভাবছে",
    tokenListLabel: "কোন ঘুঁটি চালবেন বেছে নিন",
    token: (piece) => `ঘুঁটি ${bnNum(piece + 1)}`,
    stackedWith: (leaderPiece) =>
      `${bnNum(leaderPiece + 1)} নম্বর ঘুঁটির সঙ্গে জোড়া`,
    routeListLabel: "পথ বেছে নিন",
    shortcutFromCenter: {
      label: "দ্রুত শর্টকাট",
      description: "সোজা শেষ ঘরের দিকে যান",
    },
    shortcutFromBranch: {
      label: "শর্টকাট",
      description: "কেন্দ্র দিয়ে আড়াআড়ি যান",
    },
    outerFromCenter: {
      label: "ঘুরপথ",
      description: "দূরের কোণা ঘুরে যান",
    },
    outerFromBranch: {
      label: "বাইরের পথ",
      description: "কিনারা ধরে এগিয়ে যান",
    },
    playAgain: "আবার খেলুন",
    throwButton: {
      ai: "এআই খেলছে",
      rolling: "ফল দেখা হচ্ছে",
      moving: "ঘুঁটি চলছে",
      ready: "ইউত ছুঁড়ুন",
    },
  },

  status: {
    aiPreparingThrow: (team) => `${team} এআই ছোঁড়ার প্রস্তুতি নিচ্ছে`,
    playerTurn: (team) => `${team}-এর পালা`,
    aiJudgingThrow: (team) => `${team} এআই-এর ছোঁড়া যাচাই করা হচ্ছে`,
    waitingForSticks: (team) => `${team}-এর ছোঁড়া যাচাই করা হচ্ছে`,
    aiDecision: (reason) => `এআই-এর সিদ্ধান্ত · ${reason}`,
    aiComputing: "এআই সেরা চাল হিসাব করছে",
    backdoMove: "ব্যাকদো · কোন ঘুঁটি এক ঘর পিছোবে বেছে নিন",
    move: (yutName, steps) => `${yutName} · ${bnNum(steps)} ঘর চালুন`,
    routeFromCenter: "কেন্দ্র থেকে কোন শর্টকাটে যাবেন?",
    routeFromBranch: "এই মোড়ে কোন পথে যাবেন?",
    winner: (team) => `${team} ৪টি ঘুঁটিই ঘরে তুলেছে`,
  },

  notice: {
    backdoNoMoves: "ব্যাকদো উঠলেও চালার মতো ঘুঁটি ছিল না — পালা চলে গেল",
    aiNoMoves: "এআই-এর কোনো বৈধ চাল ছিল না — পালা চলে গেল",
    stacked: (count) => `নিজের ${bnNum(count)}টি ঘুঁটি জোড়া লাগালেন`,
    captured: "প্রতিপক্ষের ঘুঁটি খেয়েছেন — আবার ছুঁড়ুন",
    extraThrow: (yutName) => `${yutName}! আবার ছুঁড়ুন`,
  },

  preview: {
    finished: "শেষ ঘর",
    toHome: "অপেক্ষার ঘরে ফেরত",
    fastShortcutArrival: "দ্রুত পথে",
    roundaboutArrival: "ঘুরপথে",
    shortcutArrival: "শর্টকাটে",
    outerArrival: "বাইরের পথে",
    arrival: (yutName) => `${yutName} এখানে পড়বে`,
    capture: "খাওয়া!",
    stack: "জোড়া!",
  },

  pieceProgress: (progress) => {
    switch (progress.kind) {
      case "home":
        return "শুরু";
      case "finished":
        return "পৌঁছেছে";
      case "junction":
        return "মোড়";
      case "center":
        return "কেন্দ্র";
      case "shortcut":
        return "শর্টকাট";
      case "outer":
        return `বাইরের পথ ${bnNum(progress.index)}/২০`;
    }
  },

  aiReason: {
    win: "জয় সম্পূর্ণ করা",
    finish: "ঘুঁটি ঘরে তোলা",
    capture: "প্রতিপক্ষের ঘুঁটি খাওয়া",
    stack: "নিজের ঘুঁটি জোড়া লাগানো",
    shortcut: "শর্টকাট নেওয়া",
    prepareShortcut: "পরের শর্টকাটের প্রস্তুতি",
    backdoRetreat: "ব্যাকদোয় সেরা পিছু হটা",
    expectedFinish: "ঘরে তোলার সেরা সম্ভাবনা",
  },

  victory: {
    tag: "খেলা শেষ",
    winner: (team) => `${team} জয়ী`,
    subtitle: "৪টি ঘুঁটিই আগে ঘরে তুলেছে",
  },

  throwEffect: {
    tag: "ছোঁড়ার ফল",
    backdo: "এক ঘর পিছনে",
    stepsExtra: (steps) => `${bnNum(steps)} ঘর · আবার ছুঁড়ুন!`,
    steps: (steps) => `${bnNum(steps)} ঘর সামনে`,
  },

  languageSwitcherLabel: "ভাষা বেছে নিন",
};
