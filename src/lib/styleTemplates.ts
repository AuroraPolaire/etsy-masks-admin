export type InitialPromptStyleTemplate = {
  id: string;
  name: string;
  category: InitialPromptStyleCategory;
  description: string;
  exampleImageSrc: string;
  prompt: string;
};

export const defaultInitialPromptStyleCategory = 'Core styles';

export const initialPromptStyleTemplateCategories = [
  defaultInitialPromptStyleCategory,
  'Gaming & digital',
] as const;

export type InitialPromptStyleCategory = (typeof initialPromptStyleTemplateCategories)[number];

type InitialPromptStyleTemplateSeed = Omit<
  InitialPromptStyleTemplate,
  'category' | 'exampleImageSrc'
> & {
  category?: InitialPromptStyleCategory;
};

type GuidedStyleTemplateSeedInput = Omit<InitialPromptStyleTemplateSeed, 'prompt'> & {
  maskStyle: string;
  colorPainting: string;
  coloringPageLines: string;
};

const createGuidedStyleTemplateSeed = ({
  id,
  name,
  category,
  description,
  maskStyle,
  colorPainting,
  coloringPageLines,
}: GuidedStyleTemplateSeedInput): InitialPromptStyleTemplateSeed => ({
  id,
  name,
  ...(category ? { category } : {}),
  description,
  prompt: [
    `Create a printable kids mask bundle using a ${name} visual preference.`,
    `Mask style: ${maskStyle}`,
    `Color painting: ${colorPainting}`,
    `Coloring page lines: ${coloringPageLines}`,
    'Choose safe, original, brand-safe topics that fit this style unless I add specific topics.',
  ].join('\n'),
});

const initialPromptStyleTemplateSeeds: InitialPromptStyleTemplateSeed[] = [
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
  {
    id: 'kawaii-pastel',
    name: 'Kawaii pastel',
    description: 'Sweet rounded masks with soft candy colors.',
    prompt: [
      'Create a printable kids mask bundle using a kawaii pastel visual preference.',
      'Mask style: front-view masks with tiny cute expressions, rounded cheek shapes, simple charming silhouettes, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
      'Color painting: pastel candy colors, soft blush accents, clean glossy highlights kept subtle, crisp white print background.',
      'Coloring page lines: smooth cute contours, a few large decorative shapes, no tiny eyelashes, no dense patterning, no shading.',
      'Choose safe, original topics that fit this style unless I add specific topics.',
    ].join('\n'),
  },
  {
    id: 'botanical-garden',
    name: 'Botanical garden',
    description: 'Leafy nature masks with clean floral detail.',
    prompt: [
      'Create a printable kids mask bundle using a botanical garden visual preference.',
      'Mask style: front-view masks with nature-inspired silhouettes, friendly floral or leafy accents, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
      'Color painting: fresh garden colors, soft painted leaves and flowers, clear product shapes, clean white print background.',
      'Coloring page lines: preserve main leaf and flower motifs as open line art, avoid tiny veins, no shading, no background plants.',
      'Choose safe, original topics that fit this style unless I add specific topics.',
    ].join('\n'),
  },
  {
    id: 'space-explorer',
    name: 'Space explorer',
    description: 'Cosmic masks with bold readable sci-fi shapes.',
    prompt: [
      'Create a printable kids mask bundle using a space explorer visual preference.',
      'Mask style: front-view masks with bold cosmic character shapes, friendly helmet-free sci-fi details, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
      'Color painting: bright nebula accents, clean planet or star motifs, polished illustrated surfaces, clean white print background.',
      'Coloring page lines: large space-themed shapes, simple stars or planet bands, no dark filled backgrounds, no tiny galaxy texture.',
      'Choose safe, original topics that fit this style unless I add specific topics.',
    ].join('\n'),
  },
  {
    id: 'origami-craft',
    name: 'Origami craft',
    description: 'Folded-paper inspired masks with sharp simple planes.',
    prompt: [
      'Create a printable kids mask bundle using an origami craft visual preference.',
      'Mask style: front-view masks with folded-paper inspired planes, clean angular but friendly silhouettes, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
      'Color painting: flat paper colors, subtle fold-plane changes, minimal texture, crisp white print background.',
      'Coloring page lines: simple fold divisions and strong outer contours, no paper shadows, no tiny crease clutter, no shading.',
      'Choose safe, original topics that fit this style unless I add specific topics.',
    ].join('\n'),
  },
  {
    id: 'jungle-adventure',
    name: 'Jungle adventure',
    description: 'Lively tropical masks with friendly explorer energy.',
    prompt: [
      'Create a printable kids mask bundle using a jungle adventure visual preference.',
      'Mask style: front-view masks with lively tropical animal or plant silhouettes, friendly rounded features, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
      'Color painting: saturated jungle greens, warm animal colors, clear painted texture, clean white print background.',
      'Coloring page lines: bold tropical shapes, simple stripes or leaf details, no dense foliage, no background scenery, no shading.',
      'Choose safe, original topics that fit this style unless I add specific topics.',
    ].join('\n'),
  },
  {
    id: 'royal-party',
    name: 'Royal party',
    description: 'Crowns, jewels, and elegant party-mask decoration.',
    prompt: [
      'Create a printable kids mask bundle using a royal party visual preference.',
      'Mask style: front-view masks with elegant crown-like silhouettes and friendly noble character details, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
      'Color painting: soft jewel tones, tasteful gold accents, clean ornamental shapes, crisp white print background.',
      'Coloring page lines: keep main crown and jewel shapes large and printable, no tiny gem clusters, no metallic shading, no gradients.',
      'Choose safe, original topics that fit this style unless I add specific topics.',
    ].join('\n'),
  },
  {
    id: 'winter-cozy',
    name: 'Winter cozy',
    description: 'Snowy classroom-party masks with warm gentle detail.',
    prompt: [
      'Create a printable kids mask bundle using a winter cozy visual preference.',
      'Mask style: front-view masks with soft winter-themed silhouettes, gentle child-friendly expressions, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
      'Color painting: icy blues, warm scarf-like accent colors, soft snowflake motifs, clean white print background.',
      'Coloring page lines: simple snowflakes and cozy shapes, large open areas, no dense frost texture, no grey shading.',
      'Choose safe, original topics that fit this style unless I add specific topics.',
    ].join('\n'),
  },
  {
    id: 'bright-classroom',
    name: 'Bright classroom',
    description: 'Teacher-friendly masks with simple printable clarity.',
    prompt: [
      'Create a printable kids mask bundle using a bright classroom visual preference.',
      'Mask style: front-view masks with clear classroom-friendly shapes, cheerful expressions, strong readable silhouettes, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
      'Color painting: bright marker-like colors, tidy worksheet clarity, minimal texture, clean white print background.',
      'Coloring page lines: thick simple outlines, large color blocks, no tiny decorative marks, no shadows, no background elements.',
      'Choose safe, original topics that fit this style unless I add specific topics.',
    ].join('\n'),
  },
  createGuidedStyleTemplateSeed({
    id: 'voxel-block-builder',
    name: 'Voxel block builder',
    category: 'Gaming & digital',
    description: 'Blocky pixel-style masks inspired by open-ended building play.',
    maskStyle:
      'front-view masks built from chunky square planes and friendly blocky silhouettes, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline, no game logos or copied characters.',
    colorPainting:
      'bright voxel color blocks, simple grass, stone, wood, and sky-inspired panels, crisp edges, clean white print background.',
    coloringPageLines:
      'large square regions, simple block seams, no tiny inventory grids, no shading, no dense texture.',
  }),
  createGuidedStyleTemplateSeed({
    id: 'avatar-creator',
    name: 'Avatar creator',
    category: 'Gaming & digital',
    description: 'Customizable game-avatar masks with friendly accessory details.',
    maskStyle:
      'centered front-view avatar masks with modular hair, hats, glasses, bows, badges, and other original accessories, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
    colorPainting:
      'bright character-creator colors, clean accessory layers, polished toy-like finish, white print background.',
    coloringPageLines:
      'clear accessory outlines and big editable zones, no tiny facial texture, no screen UI, no shading.',
  }),
  createGuidedStyleTemplateSeed({
    id: 'pixel-arcade',
    name: 'Pixel arcade',
    category: 'Gaming & digital',
    description: '8-bit retro masks with chunky pixel edges and arcade energy.',
    maskStyle:
      'front-view masks with stepped pixel silhouettes, square cheek shapes, playful arcade character details, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
    colorPainting:
      'limited bright 8-bit palette, hard pixel edges, small coin or star motifs, clean white print background.',
    coloringPageLines:
      'blocky pixel contours and large square color areas, no anti-aliased micro detail, no background maze, no shading.',
  }),
  createGuidedStyleTemplateSeed({
    id: '16-bit-adventure',
    name: '16-bit adventure',
    category: 'Gaming & digital',
    description: 'Colorful retro console RPG masks with heroic little details.',
    maskStyle:
      'front-view adventure masks with readable retro RPG shapes, friendly hero accents, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline, no copied game characters.',
    colorPainting:
      'saturated 16-bit-inspired colors, small hearts, gems, shields, and map-like accent shapes, crisp white print background.',
    coloringPageLines:
      'bold adventure icons and simple contour blocks, no tiny pixel noise, no scene background, no shading.',
  }),
  createGuidedStyleTemplateSeed({
    id: 'neon-gamer',
    name: 'Neon gamer',
    category: 'Gaming & digital',
    description: 'Cyber masks with LED accents, headphones, and arcade glow.',
    maskStyle:
      'front-view cyber gamer masks with friendly headphones, LED strips, and soft tech panels, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
    colorPainting:
      'deep dark accent panels balanced by neon cyan, magenta, lime, and electric blue highlights, clean white print background.',
    coloringPageLines:
      'thick readable tech-panel lines, simple headphone arcs, no glow shading, no dark filled backgrounds, no tiny circuitry.',
  }),
  createGuidedStyleTemplateSeed({
    id: 'obby-parkour',
    name: 'Obby parkour',
    category: 'Gaming & digital',
    description: 'Bright obstacle-course masks with arrows, stars, and movement cues.',
    maskStyle:
      'front-view masks with playful obstacle-course motifs, arrows, jump pads, stars, and upbeat motion shapes, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
    colorPainting:
      'primary playground colors, crisp geometric blocks, cheerful motion accents, clean white print background.',
    coloringPageLines:
      'large arrows, stars, platform shapes, and simple obstacle stripes, no dense course layout, no shading.',
  }),
  createGuidedStyleTemplateSeed({
    id: 'sandbox-survival',
    name: 'Sandbox survival',
    category: 'Gaming & digital',
    description: 'Explorer masks with wood, stone, grass, and tool motifs.',
    maskStyle:
      'front-view explorer masks with original survival-crafting motifs, friendly rugged proportions, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline, no copied game assets.',
    colorPainting:
      'natural wood, stone, grass, leaf, rope, and simple tool-inspired color blocks, clean white print background.',
    coloringPageLines:
      'simple plank seams, leaf shapes, stone facets, and tool silhouettes, no tiny resource icons, no shading.',
  }),
  createGuidedStyleTemplateSeed({
    id: 'cozy-crafting',
    name: 'Cozy crafting',
    category: 'Gaming & digital',
    description: 'Grid-based craft-table masks with simple resource icons.',
    maskStyle:
      'front-view masks with tidy crafting-grid accents, soft handmade proportions, yarn, scissors, buttons, stars, and resource icons, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
    colorPainting:
      'warm craft-room colors, soft paper and fabric textures, simple organized icon panels, clean white print background.',
    coloringPageLines:
      'clear grid sections and large craft icons, no tiny item slots, no text labels, no shading.',
  }),
  createGuidedStyleTemplateSeed({
    id: 'speedrunner',
    name: 'Speedrunner',
    category: 'Gaming & digital',
    description: 'Energetic masks with motion lines, medals, and lightning shapes.',
    maskStyle:
      'front-view masks with dynamic but printable silhouettes, lightning bolts, medals, speed stripes, and finish-line cues, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
    colorPainting:
      'high-energy reds, yellows, blues, and white motion accents, crisp illustrated finish, clean white print background.',
    coloringPageLines:
      'big motion lines, medal shapes, and lightning icons, no blurred effects, no tiny speed text, no shading.',
  }),
  createGuidedStyleTemplateSeed({
    id: 'streamer-mascot',
    name: 'Streamer mascot',
    category: 'Gaming & digital',
    description: 'Cute mascot masks with headset and mic details.',
    maskStyle:
      'front-view cute animal or character mascot masks with friendly headset, microphone boom, and simple broadcast badges, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
    colorPainting:
      'bright stream-overlay inspired colors, clean headset detail, glossy mascot accents, white print background.',
    coloringPageLines:
      'large headset arcs, mic shape, and simple mascot features, no tiny UI overlays, no logos, no shading.',
  }),
  createGuidedStyleTemplateSeed({
    id: 'glitchcore',
    name: 'Glitchcore',
    category: 'Gaming & digital',
    description: 'Playful digital distortion with broken pixels and scanlines.',
    maskStyle:
      'front-view masks with kid-safe digital distortion, offset pixel blocks, broken edge accents, and scanline motifs, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
    colorPainting:
      'bright cyan, coral, violet, lime, and black accent fragments, clean white print background with no full dark fill.',
    coloringPageLines:
      'bold broken-pixel contours and a few scanline bands, no visual noise, no unreadable micro glitches, no shading.',
  }),
  createGuidedStyleTemplateSeed({
    id: 'vr-explorer',
    name: 'VR explorer',
    category: 'Gaming & digital',
    description: 'Futuristic visor masks for kids with soft sci-fi detail.',
    maskStyle:
      'front-view futuristic explorer masks with rounded visor-inspired shapes, soft tech panels, stars, and map pins, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
    colorPainting:
      'cool blues, mint, white, and soft violet gradients kept printable, clean white print background.',
    coloringPageLines:
      'simple visor bands, panel seams, stars, and map cues, no dark visor fill over eye holes, no tiny circuitry, no shading.',
  }),
  createGuidedStyleTemplateSeed({
    id: 'robot-buddy',
    name: 'Robot buddy',
    category: 'Gaming & digital',
    description: 'Friendly modular robot and AI-pet masks.',
    maskStyle:
      'front-view robot buddy masks with rounded modular panels, antennae, soft bolts, digital pet cheeks, and happy non-human faces, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
    colorPainting:
      'soft metal grays with cheerful teal, yellow, coral, and lavender accent panels, clean white print background.',
    coloringPageLines:
      'large robot panels, antennae, and button shapes, no dense wires, no realistic machinery, no shading.',
  }),
  createGuidedStyleTemplateSeed({
    id: 'hologram-hero',
    name: 'Hologram hero',
    category: 'Gaming & digital',
    description: 'Translucent-looking neon hero masks with sci-fi energy.',
    maskStyle:
      'front-view masks with original holographic hero shapes, layered translucent-looking panels, stars, and soft badge motifs, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
    colorPainting:
      'icy cyan, violet, hot pink, and white neon edge accents, transparent-look effects kept printable, clean white print background.',
    coloringPageLines:
      'clear layered panel outlines and star accents, no actual transparency requirement, no glow-only details, no shading.',
  }),
  createGuidedStyleTemplateSeed({
    id: 'emoji-face',
    name: 'Emoji face',
    category: 'Gaming & digital',
    description: 'Expressive masks based on big emoji-style feelings.',
    maskStyle:
      'front-view expressive face masks with big readable emotions, heart cheeks, star eyes, sleepy lids, surprised brows, and silly smiles, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
    colorPainting:
      'sunny yellows, peach, pink, blue, and clean high-contrast facial accents, crisp white print background.',
    coloringPageLines:
      'large emotion shapes and simple facial symbols, no tiny emoji grid, no text, no shading.',
  }),
  createGuidedStyleTemplateSeed({
    id: 'sticker-game-ui',
    name: 'Sticker game UI',
    category: 'Gaming & digital',
    description: 'Badges, buttons, coins, XP stars, and playful game-interface motifs.',
    maskStyle:
      'front-view masks decorated with original sticker-like game UI badges, coins, hearts, shields, buttons, and XP star shapes, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
    colorPainting:
      'bold app-game colors, shiny sticker borders, readable icon badges, clean white print background.',
    coloringPageLines:
      'large sticker outlines and simple icons, no readable UI text, no tiny counters, no shading.',
  }),
  createGuidedStyleTemplateSeed({
    id: 'quest-hero',
    name: 'Quest hero',
    category: 'Gaming & digital',
    description: 'Fantasy game adventurer masks with friendly quest details.',
    maskStyle:
      'front-view adventurer masks with original fantasy quest motifs, feathers, shields, pouches, map corners, and soft heroic silhouettes, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
    colorPainting:
      'warm quest-map colors, leather, teal, gold, and forest accent blocks, clean white print background.',
    coloringPageLines:
      'simple shield, feather, pouch, and map shapes, no weapons, no tiny map text, no shading.',
  }),
  createGuidedStyleTemplateSeed({
    id: 'mini-boss-monster',
    name: 'Mini boss monster',
    category: 'Gaming & digital',
    description: 'Cute level-boss creature masks that stay playful, not scary.',
    maskStyle:
      'front-view mini monster masks with soft horns, rounded teeth, happy eyes, and harmless boss-badge shapes, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline, no horror details.',
    colorPainting:
      'playful teal, purple, orange, lime, and candy colors, smooth creature texture, clean white print background.',
    coloringPageLines:
      'large horns, spots, teeth, and badge shapes, no scary faces, no dense scales, no shading.',
  }),
  createGuidedStyleTemplateSeed({
    id: 'digital-pet',
    name: 'Digital pet',
    category: 'Gaming & digital',
    description: 'Collectible virtual-pet masks with soft pixel charm.',
    maskStyle:
      'front-view virtual pet masks with cute rounded creature features, pixel hearts, tiny food icons, and handheld-toy charm, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
    colorPainting:
      'pastel pixel-pet colors, small bright icons, soft glossy accents, clean white print background.',
    coloringPageLines:
      'simple pet features and a few blocky icons, no device screen frame, no tiny stats, no shading.',
  }),
];

export const initialPromptStyleTemplates: InitialPromptStyleTemplate[] =
  initialPromptStyleTemplateSeeds.map((template) => ({
    ...template,
    category: template.category ?? defaultInitialPromptStyleCategory,
    exampleImageSrc: `/style-examples/${template.id}.png`,
  }));
