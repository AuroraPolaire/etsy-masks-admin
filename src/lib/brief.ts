import { DEFAULT_SETTINGS } from '../constants';
import type { AnimalItem, ProjectSettings } from '../types';

const KNOWN_ANIMALS = [
  'lion',
  'tiger',
  'elephant',
  'giraffe',
  'zebra',
  'panda',
  'fox',
  'wolf',
  'bear',
  'rabbit',
  'deer',
  'owl',
  'monkey',
  'koala',
  'sloth',
  'leopard',
  'cheetah',
  'hippo',
  'rhino',
  'crocodile',
  'alligator',
  'dinosaur',
  'unicorn',
  'cat',
  'dog',
  'horse',
  'cow',
  'pig',
  'sheep',
  'goat',
  'duck',
  'chicken',
  'frog',
  'shark',
  'whale',
  'dolphin',
  'penguin',
  'eagle',
  'parrot',
  'butterfly',
];

const titleCase = (value: string): string =>
  value
    .trim()
    .split(/\s+/)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(' ');

const cleanIdea = (idea: string): string =>
  idea
    .replace(/\s+/g, ' ')
    .replace(/[.?!]+$/g, '')
    .trim();

const extractAnimalNames = (idea: string): string[] => {
  const normalized = idea.toLowerCase();
  const matched = KNOWN_ANIMALS.filter((animal) => normalized.includes(animal));

  if (matched.length > 0) {
    return [...new Set(matched.map(titleCase))].slice(0, 20);
  }

  const listMatch = idea.match(/(?:animals?|masks?|include|with)\s*:\s*([^.;]+)/i);
  if (!listMatch?.[1]) {
    return [];
  }

  return listMatch[1]
    .split(/,| and /i)
    .map(titleCase)
    .filter(Boolean)
    .slice(0, 20);
};

const inferTheme = (idea: string): string => {
  const cleaned = cleanIdea(idea);
  if (!cleaned) {
    return DEFAULT_SETTINGS.theme;
  }

  if (/mask/i.test(cleaned)) {
    return titleCase(cleaned);
  }

  return `${titleCase(cleaned)} Animal Masks`;
};

const inferAudience = (idea: string): string => {
  if (/teacher|classroom|school|students/i.test(idea)) {
    return 'Teachers and kids';
  }

  if (/toddler|preschool|kindergarten/i.test(idea)) {
    return 'Preschool kids';
  }

  if (/adult|family/i.test(idea)) {
    return 'Families';
  }

  return DEFAULT_SETTINGS.audience;
};

export const createProjectDraftFromInitialPrompt = (
  initialPrompt: string,
): { settings: ProjectSettings; animals: AnimalItem[] } => {
  const cleaned = cleanIdea(initialPrompt);
  const theme = inferTheme(cleaned);
  const animals = extractAnimalNames(cleaned);
  const animalNames =
    animals.length > 0
      ? animals
      : ['Lion', 'Tiger', 'Elephant', 'Giraffe', 'Zebra', 'Panda', 'Fox', 'Wolf', 'Bear', 'Rabbit', 'Deer', 'Owl'];
  const maskCount = animalNames.length;
  const title =
    `${theme} Printable Bundle for Kids, ${maskCount} PNG Paper Masks, Party Craft, Classroom Activity, Digital Download`
      .replace(/\s+/g, ' ')
      .trim();
  const tags = [
    `${theme.toLowerCase()}`,
    'printable masks',
    'kids party masks',
    'paper masks',
    'classroom craft',
    'birthday party',
    'teacher resources',
    'digital download',
    'kids activity',
    'pretend play',
    'costume craft',
    ...animalNames.slice(0, 3).map((animal) => `${animal.toLowerCase()} mask`),
  ]
    .slice(0, 13)
    .join(', ');

  return {
    settings: {
      ...DEFAULT_SETTINGS,
      title,
      theme,
      audience: inferAudience(cleaned),
      style: cleaned || DEFAULT_SETTINGS.style,
      description: `Create fun themed activities with this printable ${theme.toLowerCase()} bundle for kids. Perfect for birthday parties, classroom crafts, storytelling, pretend play, and DIY costume activities. This is a digital download only. No physical item will be shipped.`,
      tags,
    },
    animals: animalNames.map((name) => ({
      id: crypto.randomUUID(),
      name,
    })),
  };
};
