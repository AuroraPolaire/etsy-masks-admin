export type InitialPromptStyleTemplate = {
  id: string;
  name: string;
  description: string;
  prompt: string;
};

export const initialPromptStyleTemplates: InitialPromptStyleTemplate[] = [
  {
    id: 'fluffy-plush',
    name: 'Fluffy plush',
    description: 'Soft, cozy, rounded masks with toy-like texture.',
    prompt: [
      'Create a printable kids mask bundle using a fluffy plush visual preference.',
      'Mask style: front-view masks with rounded friendly proportions, soft plush-inspired shapes, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
      'Color painting: cozy soft fur or fabric texture, gentle highlights, warm friendly expressions, clean white print background.',
      'Coloring page lines: bold outer silhouette, simple fur tufts, large colorable areas, no dense texture or shading.',
      'Choose safe, original topics that fit this style unless I add specific topics.',
    ].join('\n'),
  },
  {
    id: 'retro-party',
    name: 'Retro party',
    description: 'Bold mid-century shapes, warm colors, playful craft-sheet feel.',
    prompt: [
      'Create a printable kids mask bundle using a retro party visual preference.',
      'Mask style: crisp front-view masks with mid-century poster shapes, friendly symmetry, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
      'Color painting: muted retro colors, clean painted blocks, simple highlights, slightly vintage classroom worksheet energy, white print background.',
      'Coloring page lines: thick simple outlines, readable geometric details, no gradients, no tiny decoration noise.',
      'Choose safe, original topics that fit this style unless I add specific topics.',
    ].join('\n'),
  },
  {
    id: 'game-avatar',
    name: 'Game avatar',
    description: 'Readable, high-contrast masks that feel like playful character skins.',
    prompt: [
      'Create a printable kids mask bundle using a game-avatar visual preference.',
      'Mask style: centered front-view character masks with clear silhouettes, expressive but non-scary faces, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
      'Color painting: bright high-contrast color zones, polished toy-like finish, simple icon-like detail, clean white print background.',
      'Coloring page lines: strong black contour lines, simplified game-character shapes, large open coloring areas.',
      'Choose safe, original topics that fit this style unless I add specific topics.',
    ].join('\n'),
  },
  {
    id: 'paper-theater',
    name: 'Paper theater',
    description: 'Stage-prop masks with decorative painted details.',
    prompt: [
      'Create a printable kids mask bundle using a paper-theater visual preference.',
      'Mask style: front-view stage prop masks with dramatic but kid-friendly silhouettes, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
      'Color painting: handcrafted gouache look, decorative painted motifs, crisp edges, theatrical contrast, clean white print background.',
      'Coloring page lines: preserve the main decorative motifs as clean printable line work, remove all shading and texture.',
      'Choose safe, original topics that fit this style unless I add specific topics.',
    ].join('\n'),
  },
  {
    id: 'cute-minimal',
    name: 'Cute minimal',
    description: 'Simple, preschool-friendly masks with big shapes.',
    prompt: [
      'Create a printable kids mask bundle using a cute minimal visual preference.',
      'Mask style: very simple front-view masks with big readable shapes, gentle expressions, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
      'Color painting: clean flat colors, minimal highlights, no busy texture, easy to cut visually, white print background.',
      'Coloring page lines: extra-large colorable regions, bold smooth outlines, minimal internal details for young kids.',
      'Choose safe, original topics that fit this style unless I add specific topics.',
    ].join('\n'),
  },
  {
    id: 'storybook-detail',
    name: 'Storybook detail',
    description: 'Richer illustrated masks while staying printable and kid-safe.',
    prompt: [
      'Create a printable kids mask bundle using a storybook-detail visual preference.',
      'Mask style: detailed front-view illustrated masks with whimsical child-friendly features, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
      'Color painting: storybook illustration finish, layered painted details, clear readable shapes, clean white print background.',
      'Coloring page lines: keep key decorative elements as smooth line art, simplify fine details, no shading, gradients, or color.',
      'Choose safe, original topics that fit this style unless I add specific topics.',
    ].join('\n'),
  },
];
