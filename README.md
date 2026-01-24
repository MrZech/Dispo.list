# DispoList

Internal inventory + eBay listing pipeline.

-------------------------------------------------------------------------------

## What this is
DispoList is a web app for tracking intake, testing, and listing prep for items
that will eventually be listed on eBay. The database is the source of truth and
the eBay CSV export is generated from it, not hand-edited spreadsheets.

## Workflow (the human flow)
Intake -> Test/Specs -> Draft Listing -> Review -> CSV Export -> eBay Upload

## Highlights
- Fast, mobile-friendly intake for SKUs, source, and quick triage
- Structured testing/spec fields so listings are consistent and complete
- Photo capture and storage for listing-ready images
- eBay CSV export utilities for template-accurate uploads
- Clear separation between intake data and listing data

## Tech stack
- React + Vite + Tailwind on the client
- Express + TypeScript on the server
- PostgreSQL + Drizzle ORM for data storage
- Uppy for uploads
- Optional OpenAI integration for listing copy

## Environment
Set these before running:
- `DATABASE_URL` (required)
- `SESSION_SECRET` (required in production)
- `UPLOAD_DIR` (optional, default `./uploads`)
- `AI_INTEGRATIONS_OPENAI_API_KEY` (optional)
- `AI_INTEGRATIONS_OPENAI_BASE_URL` (optional)
- `PORT` (optional)
- `HOST` (optional)

## Local dev
```bash
npm install
npm run db:push
npm run dev
```

## Production build
```bash
npm run build
npm run start
```

## Intentional boundaries (for now)
- eBay upload is manual
- No live sync with eBay
- No accounting or financial tooling

## Roadmap sparks
- Template upload + mapping UI
- Stronger validation before export
- More granular roles and permissions

-------------------------------------------------------------------------------

If you are looking for the "why": this exists to remove spreadsheet chaos and
turn a messy listing process into a repeatable pipeline.
