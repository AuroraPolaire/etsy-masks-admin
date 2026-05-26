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
  {
    id: 'watercolor-wash',
    name: 'Watercolor wash',
    description: 'Light painterly masks with soft color blooms and airy details.',
    prompt: [
      'Create a printable kids mask bundle using a watercolor wash visual preference.',
      'Mask style: centered front-view masks with graceful simple silhouettes, soft child-friendly features, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
      'Color painting: transparent watercolor washes, soft pigment edges, gentle paper texture, clear face shapes, clean white print background.',
      'Coloring page lines: smooth light line art with open colorable spaces, preserve only the main decorative shapes, no wash texture, no shading.',
      'Choose safe, original topics that fit this style unless I add specific topics.',
    ].join('\n'),
  },
  {
    id: 'realistic-creature',
    name: 'Realistic creature',
    description: 'Detailed animal or fantasy masks with believable texture.',
    prompt: [
      'Create a printable kids mask bundle using a realistic creature visual preference.',
      'Mask style: front-view creature masks with accurate but friendly anatomy, rounded kid-safe expressions, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
      'Color painting: realistic scales, fur, feathers, or skin texture with controlled detail, natural highlights, readable facial planes, clean white print background.',
      'Coloring page lines: confident anatomical contours, simplified texture clusters, large printable color regions, no dense hatching or grayscale shading.',
      'Choose safe, original topics that fit this style unless I add specific topics.',
    ].join('\n'),
  },
  {
    id: 'paper-collage',
    name: 'Paper collage',
    description: 'Layered cut-paper shapes with handmade craft texture.',
    prompt: [
      'Create a printable kids mask bundle using a paper collage visual preference.',
      'Mask style: front-view masks built from layered paper-like shapes, playful symmetry, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
      'Color painting: cut-paper collage look, subtle paper fibers, layered colored shapes, crisp printable edges, clean white print background.',
      'Coloring page lines: clear layer boundaries and bold outer shapes, no paper texture, no shadows, no tiny torn-edge noise.',
      'Choose safe, original topics that fit this style unless I add specific topics.',
    ].join('\n'),
  },
  {
    id: 'sculpted-clay',
    name: 'Sculpted clay',
    description: 'Rounded handmade masks with soft 3D clay-toy surfaces.',
    prompt: [
      'Create a printable kids mask bundle using a sculpted clay visual preference.',
      'Mask style: centered front-view masks with rounded molded forms, soft handcrafted edges, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
      'Color painting: matte polymer-clay surface, soft 3D highlights, gentle fingerprints or handmade texture kept subtle, clean white print background.',
      'Coloring page lines: bold smooth contours that describe the molded shapes, minimal internal detail, no realistic shadows or texture noise.',
      'Choose safe, original topics that fit this style unless I add specific topics.',
    ].join('\n'),
  },
  {
    id: 'comic-sticker',
    name: 'Comic sticker',
    description: 'Bright, graphic, energetic masks with clean ink shapes.',
    prompt: [
      'Create a printable kids mask bundle using a comic sticker visual preference.',
      'Mask style: front-view masks with bold expressive shapes, cheerful comic timing, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
      'Color painting: saturated comic-book colors, clean inked interior shapes, simple cel-style highlights, crisp white print background.',
      'Coloring page lines: thick confident outlines, readable expression details, large colorable regions, no halftone dots or tiny background effects.',
      'Choose safe, original topics that fit this style unless I add specific topics.',
    ].join('\n'),
  },
  {
    id: 'enchanted-fantasy',
    name: 'Enchanted fantasy',
    description: 'Magical masks with ornate but printable decoration.',
    prompt: [
      'Create a printable kids mask bundle using an enchanted fantasy visual preference.',
      'Mask style: front-view magical character masks with elegant child-safe silhouettes, friendly expressions, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
      'Color painting: luminous fantasy colors, tasteful sparkles, gem-like accents, painterly ornament kept readable, clean white print background.',
      'Coloring page lines: preserve main magical ornaments as smooth line art, simplify tiny jewels and sparkles, no gradients, glow, or shading.',
      'Choose safe, original topics that fit this style unless I add specific topics.',
    ].join('\n'),
  },
  {
    id: 'cute-spooky',
    name: 'Cute spooky',
    description: 'Halloween-friendly masks that stay playful, not scary.',
    prompt: [
      'Create a printable kids mask bundle using a cute spooky visual preference.',
      'Mask style: front-view masks with soft spooky silhouettes, sweet expressions, no horror details, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
      'Color painting: playful Halloween color accents, soft painted shapes, friendly classroom-party mood, clean white print background.',
      'Coloring page lines: bold readable spooky shapes, simple decorations, no scary gore, no dense texture, no background clutter.',
      'Choose safe, original topics that fit this style unless I add specific topics.',
    ].join('\n'),
  },
  {
    id: 'folk-art',
    name: 'Folk art',
    description: 'Symmetric handmade masks with simple decorative motifs.',
    prompt: [
      'Create a printable kids mask bundle using a folk art visual preference.',
      'Mask style: front-view masks with balanced folk-art symmetry, friendly handmade character, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
      'Color painting: warm folk-art palette, simple painted floral or geometric motifs, handcrafted brush edges, clean white print background.',
      'Coloring page lines: keep the main motifs as clean repeatable shapes, avoid tiny pattern density, no shading or texture.',
      'Choose safe, original topics that fit this style unless I add specific topics.',
    ].join('\n'),
  },
  {
    id: 'storybook-baby',
    name: 'Storybook baby',
    description: 'Extra gentle masks for toddlers and preschool projects.',
    prompt: [
      'Create a printable kids mask bundle using a storybook baby visual preference.',
      'Mask style: very gentle front-view masks with oversized soft features, calm expressions, simple silhouettes, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
      'Color painting: pastel storybook colors, minimal texture, soft rounded shapes, high readability for young children, clean white print background.',
      'Coloring page lines: extra-large open regions, few interior details, thick smooth contours, no small patterning or complex decoration.',
      'Choose safe, original topics that fit this style unless I add specific topics.',
    ].join('\n'),
  },
  {
    id: 'adventure-badge',
    name: 'Adventure badge',
    description: 'Outdoorsy badge-like masks with crisp illustrated planes.',
    prompt: [
      'Create a printable kids mask bundle using an adventure badge visual preference.',
      'Mask style: front-view masks with strong badge-like silhouettes, clear explorer-themed character shapes, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
      'Color painting: national-park poster colors, crisp illustrated planes, subtle paper-print texture, clean white print background.',
      'Coloring page lines: strong silhouette and simple plane divisions, no poster texture, no tiny map or badge text, no shading.',
      'Choose safe, original topics that fit this style unless I add specific topics.',
    ].join('\n'),
  },
];
