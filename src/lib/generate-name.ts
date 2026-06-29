// src/lib/generate-name.ts

import {
  softCreativeWords,
  codingTechWords,
  fantasyMagicalWords,
  darkElegantWords,
  natureWords,
  cosmicWords,
  btsInspiredWords,
  kpopGroupWords,
  kpopInspiredWords,
  btsUniverseWords,
} from "@/lib/name-dictionaries";

type WordCategory = {
  name: string;
  words: string[];
};

const wordCategories: WordCategory[] = [
  {
    name: "softCreative",
    words: softCreativeWords,
  },
  {
    name: "codingTech",
    words: codingTechWords,
  },
  {
    name: "fantasyMagical",
    words: fantasyMagicalWords,
  },
  {
    name: "darkElegant",
    words: darkElegantWords,
  },
  {
    name: "nature",
    words: natureWords,
  },
  {
    name: "cosmic",
    words: cosmicWords,
  },
  {
    name: "btsInspired",
    words: btsInspiredWords,
  },
  {
    name: "kpopGroups",
    words: kpopGroupWords,
  },
  {
    name: "kpopInspired",
    words: kpopInspiredWords,
  },
  {
    name: "btsUniverse",
    words: btsUniverseWords,
  },
];

function getRandomItem<T>(items: T[]) {
  const randomIndex = Math.floor(Math.random() * items.length);

  return items[randomIndex];
}

function isKnownWord(word: unknown): word is string {
  return typeof word === "string" && word.trim().length > 0;
}

export function generateRandomName(length = 2) {
  const availableCategories = wordCategories
    .map((category) => ({
      ...category,
      words: category.words.filter(isKnownWord),
    }))
    .filter((category) => category.words.length > 0);
  const selectedWords: string[] = [];

  const safeLength = Math.min(length, availableCategories.length);

  for (let i = 0; i < safeLength; i++) {
    const randomCategory = getRandomItem(availableCategories);
    const randomWord = getRandomItem(randomCategory.words);

    selectedWords.push(randomWord);

    const categoryIndex = availableCategories.findIndex(
      (category) => category.name === randomCategory.name
    );

    availableCategories.splice(categoryIndex, 1);
  }

  return selectedWords.join(" ");
}
