import { DRAFT_TEMPLATE_SETTINGS } from '../constants';

import type { ProjectDraft } from '../types';

const KNOWN_SUBJECTS = [
  'robot',
  'dinosaur',
  'unicorn',
  'dragon',
  'astronaut',
  'pirate',
  'butterfly',
  'flower',
  'sun',
  'moon',
  'alien',
  'rocket',
  'planet',
  'star',
  'rainbow',
  'cloud',
  'pumpkin',
  'ghost',
  'witch',
  'wizard',
  'fairy',
  'mermaid',
  'crown',
  'princess',
  'knight',
  'castle',
  'firefighter',
  'doctor',
  'nurse',
  'chef',
  'clown',
  'snowman',
  'santa',
  'elf',
  'heart',
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
  'octopus',
  'turtle',
  'crab',
  'seahorse',
  'bee',
  'ladybug',
  'penguin',
  'eagle',
  'parrot',
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

const extractSubjectNames = (idea: string): string[] => {
  const normalized = idea.toLowerCase();
  const matched = KNOWN_SUBJECTS.filter((subject) => normalized.includes(subject));

  if (matched.length > 0) {
    return [...new Set(matched.map(titleCase))].slice(0, 20);
  }

  const listMatch =
    /(?:subjects?|topics?|designs?)\s*:\s*([^.;]+)|(?:include|including|with|featuring)\s+([^.;]+)/i.exec(
      idea,
    );
  const matchedList = listMatch?.[1] ?? listMatch?.[2];

  if (!matchedList) {
    return [];
  }

  return matchedList
    .split(/,| and /i)
    .map(titleCase)
    .filter(Boolean)
    .slice(0, 20);
};

const inferTheme = (idea: string): string => {
  const cleaned = cleanIdea(idea);
  if (!cleaned) {
    return DRAFT_TEMPLATE_SETTINGS.theme;
  }

  if (/mask/i.test(cleaned)) {
    return titleCase(cleaned);
  }

  return `${titleCase(cleaned)} Masks`;
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

  return DRAFT_TEMPLATE_SETTINGS.audience;
};

const inferStyle = (idea: string): string => {
  if (/watercolor/i.test(idea)) {
    return DRAFT_TEMPLATE_SETTINGS.style.replace('Realistic', 'Watercolor');
  }

  if (/cartoon|cute|kawaii/i.test(idea)) {
    return DRAFT_TEMPLATE_SETTINGS.style.replace('Realistic', 'Cute illustrated');
  }

  if (/fantasy|dragon|unicorn|fairy|wizard/i.test(idea)) {
    return DRAFT_TEMPLATE_SETTINGS.style.replace('Realistic', 'Detailed fantasy');
  }

  return DRAFT_TEMPLATE_SETTINGS.style;
};

export const createProjectDraftFromInitialPrompt = (initialPrompt: string): ProjectDraft => {
  const cleaned = cleanIdea(initialPrompt);
  const theme = inferTheme(cleaned);
  const subjectNames = extractSubjectNames(cleaned);
  const maskCount = subjectNames.length;
  const title = [
    `${theme} Printable Bundle for Kids`,
    maskCount > 0 ? `${maskCount} PNG Paper Masks` : 'PNG Paper Masks',
    'Party Craft',
    'Classroom Activity',
    'Digital Download',
  ]
    .join(', ')
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
    ...subjectNames.slice(0, 3).map((subject) => `${subject.toLowerCase()} mask`),
  ]
    .slice(0, 13)
    .join(', ');

  return {
    settings: {
      ...DRAFT_TEMPLATE_SETTINGS,
      title,
      theme,
      audience: inferAudience(cleaned),
      style: inferStyle(cleaned),
      description: `Create fun themed activities with this printable ${theme.toLowerCase()} bundle for kids. Perfect for birthday parties, classroom crafts, storytelling, pretend play, and DIY costume activities. This is a digital download only. No physical item will be shipped.`,
      tags,
    },
    subjects: subjectNames.map((name) => ({
      id: crypto.randomUUID(),
      name,
    })),
  };
};
