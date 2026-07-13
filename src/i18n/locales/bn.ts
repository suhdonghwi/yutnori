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

  tutorial: {
    title: "খেলার নিয়ম",
    canvasLabel: "থ্রিডি ইউতনরি খেলার নির্দেশনা",
    navigationLabel: "নির্দেশনার ধাপ বদলান",
    skip: "এড়িয়ে যান",
    back: "আগের ধাপ",
    next: "পরের ধাপ",
    done: "বুঝেছি · লবিতে ফিরুন",
    stepLabel: (current, total) =>
      `${bnNum(total)}টির মধ্যে ${bnNum(current)} নম্বর ধাপ`,
    steps: {
      goal: {
        title: "বোর্ড ঘুরে ঘুঁটি শেষ ঘরে নিন",
        body: "ছোঁড়ার ফল অনুযায়ী ঘুঁটি চালিয়ে বোর্ডের পথ ঘুরে আসুন। যে দল আগে ৪টি ঘুঁটিই শেষ করে, সেই দল জেতে।",
      },
      throw: {
        title: "সমতল পিঠ গুনে ছোঁড়ার ফল বুঝুন",
        body: "চারটি ইউত কাঠি ছুড়ে ওপরে থাকা সমতল পিঠ গুনুন। ফলটি বলে দেয় ঘুঁটি কত ঘর চলবে।",
      },
      shortcut: {
        title: "ঠিক কোণায় পড়লে শর্টকাট খুলবে",
        body: "মোড়ে ঠিকভাবে পৌঁছানোর পরের চালে তির্যক পথ বেছে নিয়ে কেন্দ্রের ওপর দিয়ে দ্রুত এগিয়ে যান।",
      },
      "capture-stack": {
        title: "প্রতিপক্ষকে খান, নিজের ঘুঁটি জোড়া লাগান",
        body: "প্রতিপক্ষের ঘরে পড়লে তাকে অপেক্ষার ঘরে পাঠিয়ে আবার ছুঁড়ুন। নিজের ঘুঁটির ওপর পড়লে জোড়া লেগে একসঙ্গে চলবে।",
      },
      win: {
        title: "৪টি ঘুঁটি আগে শেষ করলেই জয়",
        body: "শেষ ঘুঁটিটি শেষ রেখা পার হলেই সঙ্গে সঙ্গে জয়। শর্টকাট, জোড়া আর খাওয়া কাজে লাগিয়ে আগে পৌঁছান।",
      },
    },
    movePreview: (steps) => `${bnNum(steps)} ঘর চালুন`,
    throwWaiting: "কাঠির ফল দেখা হচ্ছে…",
    throwReading: (flats, name, steps) =>
      steps < 0
        ? `${bnNum(flats)}টি সমতল পিঠ → ${name} · ১ ঘর পিছনে`
        : `${bnNum(flats)}টি সমতল পিঠ → ${name} · ${bnNum(steps)} ঘর`,
    throwAgainBadge: "আবার ছুঁড়ুন!",
    finishedBadge: "শেষ!",
    backdoFootnote: "ব্যাকদোতে ১ ঘর পিছনে",
    extraThrowFootnote: "ইউত ও মোতে আবার ছোঁড়া যায়",
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
