# Main sign-in portal

Mode: Operate. Entry point: `apps/web/src/app/login/page.tsx`.

The user requested repository cleanup, project initialization, and the main sign-in portal. Their Excalidraw supplies the form structure. They confirmed: “Keep form structure; add branded panel.” This is a precisely scoped implementation of the supplied wireframe and existing Waypoint brand, not a new visual-world competition.

## Direction contract

THESIS: One clear entry into four operational roles. Preserve the familiar form; explain the connected delivery workflow alongside it.

OWN-WORLD: Waypoint navy and blue, light form surface, Public Sans, precise borders, restrained corners, labeled Lucide icons.

STORY: Recognize Waypoint, enter credentials, correct any error, and reach the assigned role. Demo access is visibly labeled.

FIRST VIEWPORT: Navy side panel with wordmark, delivery lifecycle, and network context; a centered light form column with heading, fields, remember-me, primary action, and compact demo role choices. Mobile prioritizes the form.

FORM: User-specified Excalidraw form with confirmed branded panel; no randomized seed applies to this precise structure. Reference: `reference/design/Dis_new.excalidraw`.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Behaviors and limits

Validate empty fields. Show/hide password without losing focus. Unknown demo credentials produce an actionable error. Password help explains the future backend boundary. Role shortcuts fill demonstration credentials; submit performs mock authentication and opens the corresponding role landing scaffold. Remember-me stores session metadata only. No password is persisted. Build phone, desktop, reduced-motion, pending, and failed-sign-in states. No external raster artwork is required.

## Finish record

Final bounded review: ship, with no remaining scored fixes. The sign-in heading, field-border contrast, and demo disclosure size were corrected and reviewed in final desktop and phone captures. See `docs/verification.md` for browser checks and their frontend-only scope. There are no shipping raster assets.
