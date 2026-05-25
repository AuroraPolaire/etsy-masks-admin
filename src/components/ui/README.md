# Etsy Masks Admin UI System

This app uses a small local design system instead of one-off Tailwind values.

- Tokens live in `tailwind.config.ts` and are backed by CSS variables in `src/styles/index.css`.
- Use semantic color families: `canvas`, `surface`, `ink`, `brand`, and `feedback`.
- The palette is based on the "Charming Sunset" pastel range: lavender primary, pink danger, coral/peach warning, cream info, and a darker lavender-pink-coral AI gradient for readable AI calls to action. Change those roles at the token level before touching component classes.
- Prefer primitives in this folder for repeated UI: `Card`, `Surface`, `Alert`, `Badge`, `Button`, `IconButton`, `FileInputButton`, `AIButton`, form controls, `CheckboxCard`, `EmptyState`, `StatCard`, workflow step components, `ToastProvider`, and `ConfirmDialog`.
- Keep operational screens dense and scannable. Use `Card` for major tools, `Surface` for lower-emphasis repeated rows, and `Alert` for status or blocking guidance.
- Avoid hardcoded palette classes in feature components unless the value is truly unique to that feature.
