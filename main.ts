// Skyline Run — the program that hands the game in.
//
// This file runs on Node 22 (standard library only, nothing installed) in a
// fresh container with no network: it copies the static game (game/) and the
// screenshots (screenshots/) beside this file into /output, then writes
// /output/dossier.json with the vendored make.fun library, which is the
// summary the judge reads (screenshots, first-load bytes, source outline).
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The run is deterministic: same input files, same output bytes, every time.
// It takes well under the 10-second budget.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The repository root is the directory holding this file.
const root = fileURLToPath(new URL('.', import.meta.url));
// The grader writes to /output; a local run writes wherever the env var says.
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(root, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(root, 'screenshots'))) {
  cpSync(join(root, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The caps mirror the sealed scorer's (see the kit's RULES.txt): at most
// 4 screenshots of 256 KiB each, game/ at most 993 files and 48 MiB, and the
// dossier text capped at 160 KiB so the judge's view stays readable.
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
