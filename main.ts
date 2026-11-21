// LANTERNFALL — hand-in program (Node 22, standard library only).
//
// The game itself lives in game/ as plain static files a desktop browser
// loads offline: an HTML page and its ES modules, no library, no network.
// This program prepares the entry: it copies game/ and screenshots/ into
// the output directory and writes dossier.json there with the vendored
// make.fun library, under the scorer's own caps (only text_max_bytes
// shapes the dossier's bytes; the rest refuse anything the scorer would).
//
//   MAKEFUN_OUTPUT_DIR=out node main.ts     # /output is the default

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

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

console.log(`LANTERNFALL handed in to ${out}`);
