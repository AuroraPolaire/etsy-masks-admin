export type InitialPromptStyleTemplate = {
  id: string;
  name: string;
  description: string;
  prompt: string;
};

export const initialPromptStyleTemplates: InitialPromptStyleTemplate[] = [
  {
    id: 'watercolor-forest',
    name: 'Watercolor forest',
    description: 'Soft woodland masks with warm hand-painted washes.',
    prompt: [
      'Bundle: 10 woodland animal printable masks for a calm kids birthday party and classroom craft.',
      'Topics: fox, owl, bear, deer, rabbit, wolf, raccoon, hedgehog, squirrel, and badger.',
      'Mask style: realistic front-view paper masks with gentle storybook proportions, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
      'Color painting: transparent watercolor washes, soft fur texture, warm earth colors, subtle hand-painted edges, clean white print background.',
      'Coloring page: simplified kid-friendly line art with bold outer borders, big colorable shapes, and no tiny texture lines.',
    ].join('\n'),
  },
  {
    id: 'poster-pop',
    name: 'Poster pop',
    description: 'Bright party masks with clean color blocks.',
    prompt: [
      'Bundle: 12 cheerful party printable masks for classroom stations, birthday games, and pretend play.',
      'Topics: sun, moon, rainbow, cloud, star, rocket, planet, robot, alien, comet, astronaut helmet, and party crown.',
      'Mask style: crisp front-view printable masks with symmetrical kid-friendly faces, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
      'Color painting: bold poster-paint color blocks, playful contrast, smooth highlights, clear shape separation, white print background.',
      'Coloring page: extra clean black outlines, large open areas, minimal internal detail, easy for young kids to color.',
    ].join('\n'),
  },
  {
    id: 'folk-safari',
    name: 'Folk safari',
    description: 'Decorative animal masks with simple painted patterns.',
    prompt: [
      'Bundle: 10 safari and zoo printable masks for an animal parade, school performance, or party table activity.',
      'Topics: lion, elephant, giraffe, zebra, tiger, panda, monkey, hippo, rhino, and crocodile.',
      'Mask style: front-view printable paper masks inspired by folk-art symmetry, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
      'Color painting: gouache-like painted shapes, limited warm palette, decorative spots and stripes painted on the surface, high contrast on white background.',
      'Coloring page: keep the main folk-art shapes as thick printable line work and remove texture, shading, and tiny ornament noise.',
    ].join('\n'),
  },
  {
    id: 'storybook-fantasy',
    name: 'Storybook fantasy',
    description: 'Whimsical creatures with jewel-tone painted details.',
    prompt: [
      'Bundle: 8 fantasy printable masks for storytelling, library craft time, and magical birthday play.',
      'Topics: dragon, unicorn, fairy, wizard, mermaid, phoenix, griffin, and forest sprite.',
      'Mask style: detailed but child-friendly fantasy masks, centered front view, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
      'Color painting: jewel-tone painted scales, soft glowing accents, pearly gradients, ornate but printable decorative shapes, white print background.',
      'Coloring page: preserve the magical silhouette and key decorative elements as clean line art with no shading, gradients, or color.',
    ].join('\n'),
  },
  {
    id: 'retro-classroom',
    name: 'Retro classroom',
    description: 'Vintage craft-sheet look with gentle muted colors.',
    prompt: [
      'Bundle: 9 community helper printable masks for preschool role play, career day, and classroom dramatic play.',
      'Topics: firefighter, doctor, nurse, chef, astronaut, pilot, gardener, artist, and detective.',
      'Mask style: friendly front-view paper masks with a vintage classroom worksheet feel, only eye holes, no side punch holes, no extra circular cutouts, no black cutting outline.',
      'Color painting: muted mid-century poster colors, simple painted uniforms and accessories, neat edges, white print background.',
      'Coloring page: clean educational worksheet line art with simple readable shapes and no dense decoration.',
    ].join('\n'),
  },
];
