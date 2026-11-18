// A working best-game-01 entry (Node 22, standard library only): the game is this directory's
// game/ folder, plain static files a desktop browser loads offline (game/index.html and its ES
// modules, no library and no network request), and the program hands it in. It copies game/ and
// screenshots/ from beside this file to /output and writes /output/dossier.json, the summary the
// judge reads, with the vendored make.fun library. A starting point, not a winner: Block Dodger, a
// plain 2D canvas game where a paddle dodges falling blocks and catches coins, with a title screen,
// score, lives and levels, game over and restart, flat colours and no sound. Build your own game
// (any genre, any library you vendor under game/, or none), put your 3 or 4 PNG or JPEG screenshots
// in screenshots/ (the first by name is the cover) and run it.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The game's boot identity lives here, in the entrypoint, not scattered
// through the page: the title panel, the status line and the browser tab
// all read it from the built index.html, so renaming the game or bumping
// its version is one edit in this file and the build stamps it everywhere.
const GAME = {
  title: 'Moonpetal Grove',
  version: '1.1.0',
  tagline: 'You keep the last garden on a drifting asteroid.',
};

// Stamp GAME into a built copy of index.html: the <title> the tab, the
// title panel and the status line read, plus the meta tags the title panel
// reads for its tagline and the version. A tag that is absent is left
// alone, so a page from before this change still builds untouched.
function stampBootIdentity(html: string): string {
  let stamped = html.replace(/<title>[^<]*<\/title>/, `<title>${GAME.title}</title>`);
  stamped = upsertMeta(stamped, 'game-version', GAME.version);
  stamped = upsertMeta(stamped, 'game-tagline', GAME.tagline);
  return stamped;
}

function upsertMeta(html: string, name: string, content: string): string {
  const tag = `<meta name="${name}" content="${content}">`;
  const pattern = new RegExp(`<meta name="${name}" content="[^"]*">`);
  if (pattern.test(html)) return html.replace(pattern, tag);
  const head = html.match(/<head[^>]*>/);
  if (!head) return html;
  return html.replace(head[0], `${head[0]}\n${tag}`);
}

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// Stamp the boot identity into the built page before the dossier is
// built, so the dossier describes the same title and version the player
// sees on the title screen.
const builtIndex = join(out, 'game', 'index.html');
writeFileSync(builtIndex, stampBootIdentity(readFileSync(builtIndex, 'utf8')));

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
