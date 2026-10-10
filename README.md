# One Year of Us

A personal anniversary website with a private, browser-based editor. It's a static React + Vite site you can host for free on GitHub Pages. All content (names, dates, photos, texts and music) is stored in [Supabase](https://supabase.com) and edited at `/admin`.

**The repository ships empty.** It contains no names, dates, photos or texts. After you clone it and connect your own Supabase project, the site shows a "nothing here yet" screen until you fill it in from the editor. Each section stays hidden until it has content.

> The interface text (section headings, buttons, admin labels) is in **Ukrainian**. See [Customising the template](#customising-the-template) to change the built-in text.

---

## Contents

- [Features](#features)
- [How it works](#how-it-works)
- [Quick start (local)](#quick-start-local)
- [Setting up Supabase](#setting-up-supabase)
- [Deploying to GitHub Pages](#deploying-to-github-pages)
- [Using the editor](#using-the-editor)
- [Content model](#content-model)
- [Project structure](#project-structure)
- [Customising the template](#customising-the-template)
- [Security model](#security-model)
- [Upgrading an existing installation](#upgrading-an-existing-installation)
- [Troubleshooting](#troubleshooting)
- [Scripts](#scripts)

---

## Features

**Public page**

| Section | What it shows | Shown when |
| --- | --- | --- |
| Boot screen | A playful "terminal boot" intro with a start button | always |
| Hero | Headline, subtitle, date range and a live days/hours/minutes counter | always; the counter needs a start date |
| Our journey (`milestones`) | A timeline of chapters, each with an optional photo | it has at least one item |
| Places (`places`) | Places that matter to you, each with a photo | it has at least one item |
| Memories (`months`) | A horizontal strip of photo cards, e.g. one per month | it has at least one item |
| Achievements (`achievements`) | "Unlocked" cards plus one locked "next level" card | it has at least one item |
| Reasons (`reasons`) | A random "why you" generator, with an option to list them all | it has at least one non-empty reason |
| Terminal (`terminal`) | A joke "relationship diagnostics" terminal | its switch is on |
| Git log (`commits`) | Important dates written as commits | it has at least one item |
| Letter (`letter`) | A sealed envelope that opens to show a personal letter | the letter is not empty |
| Final | "Level N completed" with a closing question | always |
| Music | A floating player with an optional start/end fragment and loop | a track is set and enabled |

You can switch off any section in the admin, even one that has content.

Numbers on the page come from your dates, so nothing assumes a one-year anniversary. That includes the day counts, the "level" (completed years), the chapter numbering and the "next release v3.0" in the git log. Ukrainian plural forms are handled correctly (`1 день`, `2 дні`, `5 днів`).

**Editor (`/admin`)**

- Email/password sign-in through Supabase Auth, limited to an explicit **editor allowlist**.
- One tab per section: add, edit, reorder and delete items.
- Photo and audio uploads to Supabase Storage. A replaced or removed file is deleted from storage automatically.
- A music fragment picker: start/end time, loop, and a preview player.
- A warning before you leave the page with unsaved changes.

## How it works

```
 Browser ──► GitHub Pages (static HTML/JS/CSS)
    │
    └──► Supabase
           ├─ table   site_content   one row (id = 'main') holding the whole site as JSON
           ├─ table   site_editors   user ids allowed to edit
           ├─ bucket  anniversary-media   uploaded photos and audio (public URLs)
           └─ Auth    email/password accounts
```

- The page reads `site_content` with the public **anon** key. Row Level Security lets anyone read it but only editors write it.
- Every document read from the database passes through `normalizeContent()` (`src/content/model.ts`). Missing or invalid fields become empty defaults, so a partial or older document never breaks the page.
- The public page reloads content when the browser tab gets focus again. Edits made in another tab appear without a manual refresh.

## Quick start (local)

Requirements: **Node.js 20.19+** (22 recommended) and a free Supabase project.

```bash
git clone https://github.com/<you>/<your-repo>.git
cd <your-repo>
npm install
cp .env.example .env        # then fill in the two values (see below)
npm run dev                 # http://localhost:5173
```

1. Complete [Setting up Supabase](#setting-up-supabase) and put the URL and anon key into `.env`.
2. Open `http://localhost:5173/admin`, sign in and fill in **Налаштування** (Settings) first: names and dates.
3. Fill in the other tabs and click **ЗБЕРЕГТИ ЗМІНИ** (Save).
4. Open `http://localhost:5173/` to see the result.

Without `.env` the app still runs. It shows a "CMS not connected" message with these instructions.

## Setting up Supabase

1. Create a project at <https://supabase.com/dashboard>.
2. **SQL Editor:** paste the whole of [`supabase/schema.sql`](./supabase/schema.sql) and run it. This creates:
   - the `site_content` table and its policies;
   - the `site_editors` allowlist;
   - the public `anniversary-media` storage bucket (50 MB per file, images and audio only) and its policies.

   You can safely run the script again.
3. **Authentication → Users → Add user:** create an account with your email and a strong password. Tick "Auto confirm user" so you don't need to confirm the email.
4. **Give that account edit rights.** In the SQL Editor, run this with your own email:

   ```sql
   insert into public.site_editors (user_id)
   select id from auth.users where email = 'you@example.com'
   on conflict do nothing;
   ```

   Repeat for each person who should be able to edit. If you sign in before doing this, the editor shows the exact SQL to run, with your user id filled in.
5. **Recommended:** turn off **Authentication → Sign In / Providers → Allow new users to sign up**. Editing is already protected by the allowlist; this also stops strangers from creating accounts.
6. **Project Settings → API (Data API / API Keys):** copy the **Project URL** and the **anon / public** key into `.env`:

   ```dotenv
   VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

   Never use the `service_role` key in this project. It bypasses all security rules and would be exposed in the browser.

## Deploying to GitHub Pages

The workflow in [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) tests, builds and deploys on every push to `main`.

1. Push the repository to GitHub.
2. **Settings → Secrets and variables → Actions → Secrets:** add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. **Settings → Pages → Build and deployment → Source:** choose **GitHub Actions**.
4. Push to `main`, or run the workflow by hand from the **Actions** tab.

The site is published at `https://<user>.github.io/<repository>/`, and the editor at `https://<user>.github.io/<repository>/admin`.

**Base path.** The workflow works out the URL path for you:

| Repository | Base path |
| --- | --- |
| `<user>/<anything>` | `/<anything>/` |
| `<user>/<user>.github.io` | `/` |
| custom domain | set the repository **variable** `VITE_BASE_PATH` to `/` |

The variable `VITE_BASE_PATH` (under **Settings → Secrets and variables → Actions → Variables**) always takes precedence.

**Deep links.** GitHub Pages has no single-page-app rewrites, so the workflow copies `index.html` to `404.html`. That makes `/admin` work. The admin page itself is served with HTTP status 404, which is harmless.

**Other hosts** (Netlify, Vercel, Cloudflare Pages, etc.): build with `npm run build` and publish `dist/`. Set the two `VITE_SUPABASE_*` variables in the host's build settings, and add a rewrite of all paths to `/index.html`.

A separate [`ci.yml`](./.github/workflows/ci.yml) runs the tests and a production build on every pull request.

## Using the editor

- **Saving.** Text edits stay in your browser until you click **ЗБЕРЕГТИ ЗМІНИ**. The status bar shows whether you have unsaved changes.
- **Saved instantly.** Uploading or removing a photo or audio file, and the section visibility switches, save straight away, together with any other pending edits. This way the stored document never points to a file that no longer exists.
- **Photos** are shown at their natural aspect ratio. Any common image format works; HEIC is best converted to JPEG first because most browsers can't display it.
- **Music** starts when a visitor clicks the start button on the boot screen; browsers block autoplay before that. Set an end time of `00:00` to play to the end of the track.
- **Dates.** The *start date* drives the live counter. The *anniversary date* is the date being celebrated; it is used for day totals, the "level", the letter's date and the hero date range. If it's empty, today's date is used instead.
- **Headline texts** are optional. Empty fields fall back to neutral defaults ("НАША / ІСТОРІЯ.", "Готові до рівня 02?").

## Content model

The whole site is one JSON document (`site_content.content`). Its TypeScript definition, `SiteContent`, is in [`src/content/model.ts`](./src/content/model.ts):

```jsonc
{
  "couple": {
    "partnerOne": "",          // first name
    "partnerTwo": "",          // second name
    "startDate": "",           // YYYY-MM-DD; the live counter counts from here
    "anniversaryDate": ""      // YYYY-MM-DD; the date being celebrated (optional)
  },
  "texts": {
    "heroTitle": "", "heroAccent": "", "heroSubtitle": "",
    "finalQuestion": "", "finalReply": ""
  },
  "milestones":   [{ "icon": "✦", "title": "", "date": "", "text": "", "image": "" }],
  "places":       [{ "place": "", "date": "", "note": "", "image": "" }],
  "months":       [{ "month": "", "caption": "", "image": "" }],
  "achievements": [["01", "Title", "Description"]],
  "reasons":      ["…"],
  "commits":      [["2025-01-01", "commit_message"]],
  "letter":       "Multi-line text",
  "visibleBlocks": {
    "milestones": true, "places": true, "months": true, "achievements": true,
    "reasons": true, "terminal": true, "commits": true, "letter": true
  },
  "music": {
    "url": "", "title": "",
    "startSeconds": 0, "endSeconds": 0,   // endSeconds 0 = until the end of the file
    "loop": true, "enabled": true
  }
}
```

`date` fields inside list items are free text, such as `ОСІНЬ 2025`. Only `couple.*Date` and commit dates must be ISO dates.

You can also edit the document directly in the Supabase Table Editor, or export it there as a backup. Anything you paste in is normalised the next time it loads.

## Project structure

```
├─ index.html                  HTML shell
├─ vite.config.ts              Vite + Vitest config (base path from VITE_BASE_PATH)
├─ supabase/schema.sql         tables, storage bucket and RLS policies (idempotent)
├─ .github/workflows/          deploy.yml (Pages) and ci.yml (PR checks)
└─ src/
   ├─ main.tsx                 entry point; routes /admin → editor, everything else → site
   ├─ styles.css               all styles (site + admin)
   ├─ content/model.ts         content types, empty defaults, normalizeContent()
   ├─ lib/
   │  ├─ supabase.ts           client, table/bucket names, load/save/upload helpers
   │  ├─ dates.ts              ISO date parsing, day/year math, formatting
   │  └─ format.ts             pad2, mm:ss, Ukrainian plurals, error messages
   ├─ hooks/useAudioSegment.ts start/end/loop playback shared by site and admin
   ├─ site/
   │  ├─ App.tsx               loading, setup/empty/error screens, boot screen
   │  ├─ Site.tsx              all public sections
   │  ├─ story.ts              values derived from names & dates (days, level…)
   │  ├─ components.tsx        Photo, ScrollReveal, Counter, Notice
   │  └─ MusicPlayer.tsx       floating player
   └─ admin/
      ├─ Admin.tsx             auth, editor allowlist check, load/save, uploads
      ├─ editors.tsx           one editor component per section
      ├─ MusicEditor.tsx       music settings and preview
      └─ ui.tsx                ListEditor, ImageField, toggles, list helpers
```

Unit tests (`*.test.ts`) sit next to the code they cover.

## Customising the template

- **Built-in text and language.** Section headings, button labels and the terminal and boot-screen lines are written directly in `src/site/Site.tsx` and `src/site/App.tsx`. Admin labels are in `src/admin/`. Edit them there to translate or rephrase. Ukrainian plurals go through `pluralUk()` in `src/lib/format.ts`; replace it if you translate. Also update `lang` and the `<title>` in `index.html`.
- **Colours and fonts** are in `src/styles.css`. The accent colour is `#c8bc7b`, and the fonts (Space Grotesk, Playfair Display, DM Mono) are loaded from Google Fonts at the top of the file.
- **New fields.** Add the field to `SiteContent`, `emptyContent()` and `normalizeContent()` in `src/content/model.ts`, then add an input in `src/admin/editors.tsx` and render it in `src/site/Site.tsx`. Cover the normaliser change with a test in `src/content/model.test.ts`.
- **Table or bucket names** are defined in both `src/lib/supabase.ts` and `supabase/schema.sql`. Change them in both places together.

## Security model

- The anon key is public by design. All protection comes from the Row Level Security policies in `schema.sql`:
  - anyone can **read** `site_content`;
  - only users listed in `site_editors` can **insert or update** it, and **upload, update, delete or list** files in the media bucket;
  - nobody can change `site_editors` through the API, only through SQL.
- Uploaded files are publicly readable through their URLs, and the paths contain random UUIDs. Don't upload anything you wouldn't want to be public.
- Everything on the public page is public, including the letter. The CMS keeps people from *editing* the site, not from *reading* it.

## Upgrading an existing installation

If you deployed an earlier version of this project:

1. **Run the new `supabase/schema.sql` again.** It replaces the old policies, which let *any* signed-in user write. It also adds the `site_editors` table and stops anonymous listing of the bucket.
2. **Add your account to `site_editors`** (step 4 of [Setting up Supabase](#setting-up-supabase)). Until you do, the editor shows "Немає прав редактора" (no editor rights).
3. Your existing content keeps working. The old `couple.husband / wife / date / anniversary` keys are read automatically and saved under the new names (`partnerOne / partnerTwo / startDate / anniversaryDate`) the next time you save.
4. Remove the base-path override from your workflow if you had one; it's now worked out automatically.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| "CMS ще не підключено" (CMS not connected) | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` were not set **at build time**. Check `.env` locally, or the repository secrets on GitHub, then rebuild. |
| "Тут поки порожньо" (nothing here yet) | Expected on a fresh install. Open `/admin` and save some content. |
| "Немає прав редактора" (no editor rights) in the admin | Add your user to `site_editors`. The admin shows the exact SQL. |
| `relation "public.site_editors" does not exist` | Run `supabase/schema.sql` again. |
| Saving fails with `new row violates row-level security policy` | Same as above: the account isn't in `site_editors`, or the schema is outdated. |
| Blank page or missing assets on GitHub Pages | The base path is wrong. For custom domains, set the repository variable `VITE_BASE_PATH=/`. |
| `/admin` returns GitHub's 404 page | Make sure the deploy workflow ran; it creates `404.html`. Pages **Source** must be "GitHub Actions". |
| Upload fails with `mime type not supported` / `payload too large` | Only images and audio up to 50 MB are allowed. Change the limits in `schema.sql` and `MAX_UPLOAD_BYTES` together. |
| Music doesn't start | Browsers allow sound only after a click. Make sure the track URL is a direct link to an audio file. |

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Type-check only |
| `npm test` | Run the unit tests once (Vitest) |
| `npm run test:watch` | Run the tests in watch mode |
