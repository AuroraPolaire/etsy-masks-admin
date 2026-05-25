# Etsy Masks Admin UI System

This app uses a small local design system instead of one-off Tailwind values.

- Tokens live in `tailwind.config.ts` and are backed by CSS variables in `src/styles/index.css`.
- Use semantic color families: `canvas`, `surface`, `ink`, `brand`, and `feedback`.
- Prefer primitives in this folder for repeated UI: `Card`, `Surface`, `Alert`, `Badge`, `Button`, `IconButton`, `AIButton`, form controls, `CheckboxCard`, `EmptyState`, `StatCard`, workflow step components, `ToastProvider`, and `ConfirmDialog`.
- Keep operational screens dense and scannable. Use `Card` for major tools, `Surface` for lower-emphasis repeated rows, and `Alert` for status or blocking guidance.
- Avoid hardcoded palette classes in feature components unless the value is truly unique to that feature.
