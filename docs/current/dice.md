# Dice Hall

Dice Hall is served at `/dice/`. It supports d4, d6, d8, d10, d12, and d20
throws with one to ten dice.

Desktop users can throw from the tray or throw control. Touch devices also
support flick input and optional device-motion shake input. WebGL renders
physical dice when available; deterministic UI flow and random-number fallback
remain available when WebGL fails or reduced motion is requested.

Each result shows the total and individual values. The ten most recent throws
are stored in `localStorage` and can be cleared. Motion permission is requested
only through an explicit user action. The application has no network or server
state dependency after its static assets load. The header exposes the shared
full-screen control.
