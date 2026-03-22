const RAW_PROFANITY_TERMS = [
  "fuck",
  "fck",
  "fucking",
  "fucker",
  "motherfucker",
  "shit",
  "sht",
  "shitty",
  "bullshit",
  "bitch",
  "btch",
  "bitches",
  "asshole",
  "bastard",
  "dick",
  "dickhead",
  "pussy",
  "slut",
  "whore",
  "cunt",
  "prick",
  "twat",
  "wanker",
  "jerkoff",
  "moron",
  "idiot",
  "stupid",
  "retard",
  "retarded",
  "dipshit",
  "shithead",
  "jackass",
  "dumbass",
  "son of a bitch",
  "piece of shit",
  "putangina",
  "ptangina",
  "putang ina",
  "puta",
  "tangina",
  "tngina",
  "gago",
  "gaga",
  "tanga",
  "bobo",
  "ulol",
  "tarantado",
  "tarantada",
  "lintik",
  "punyeta",
  "bwisit",
  "leche",
  "kupal",
  "inutil",
  "hayop ka",
  "demonyo ka",
  "hinayupak",
  "ungas",
  "ogag",
  "sira ulo",
  "abnoy",
  "walanghiya",
  "animal ka",
  "peste ka",
  "loko",
  "loka",
  "buang",
  "yawa",
  "pakshet",
  "pisti",
  "punyales",
];

const CHARACTER_SUBSTITUTIONS = {
  "@": "a",
  "4": "a",
  "3": "e",
  "1": "i",
  "!": "i",
  "0": "o",
  "5": "s",
  "$": "s",
  "7": "t",
  "+": "t",
  "8": "b",
  "9": "g",
};

const normalizeProfanityValue = (value, preserveSpaces = false) => {
  const normalized = String(value || "")
    .toLowerCase()
    .split("")
    .map((char) => CHARACTER_SUBSTITUTIONS[char] || char)
    .join("")
    .replace(/[^a-z\s]/g, preserveSpaces ? " " : "")
    .replace(/(.)\1{2,}/g, "$1")
    .replace(/\s+/g, preserveSpaces ? " " : "")
    .trim();

  return preserveSpaces ? normalized : normalized.replace(/\s+/g, "");
};

const PROFANITY_TERMS = RAW_PROFANITY_TERMS.map((term) => normalizeProfanityValue(term));

const maskToken = (token) => {
  let hasVisibleCharacter = false;

  return token.replace(/[A-Za-z0-9]/g, (char) => {
    if (!hasVisibleCharacter) {
      hasVisibleCharacter = true;
      return char;
    }

    return "*";
  });
};

const sanitizeReviewComment = (comment) => {
  const originalText = String(comment || "").trim();
  const pieces = originalText.split(/(\s+)/);
  const wordEntries = [];

  pieces.forEach((piece, pieceIndex) => {
    if (!piece || /^\s+$/.test(piece)) {
      return;
    }

    wordEntries.push({
      pieceIndex,
      normalized: normalizeProfanityValue(piece),
    });
  });

  const maskedWordIndexes = new Set();

  wordEntries.forEach((entry, wordIndex) => {
    if (!entry.normalized) {
      return;
    }

    if (PROFANITY_TERMS.some((term) => entry.normalized.includes(term))) {
      maskedWordIndexes.add(wordIndex);
    }
  });

  const maxWindowSize = 4;
  for (let start = 0; start < wordEntries.length; start += 1) {
    let combined = "";

    for (
      let end = start;
      end < wordEntries.length && end < start + maxWindowSize;
      end += 1
    ) {
      combined += wordEntries[end].normalized;

      if (!combined) {
        continue;
      }

      if (PROFANITY_TERMS.some((term) => combined.includes(term))) {
        for (let index = start; index <= end; index += 1) {
          maskedWordIndexes.add(index);
        }

        break;
      }
    }
  }

  const sanitizedPieces = [...pieces];
  maskedWordIndexes.forEach((wordIndex) => {
    const { pieceIndex } = wordEntries[wordIndex];
    sanitizedPieces[pieceIndex] = maskToken(sanitizedPieces[pieceIndex]);
  });

  return {
    hasProfanity: maskedWordIndexes.size > 0,
    sanitizedText: sanitizedPieces.join(""),
  };
};

module.exports = {
  sanitizeReviewComment,
};
