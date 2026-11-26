# flight-game

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/zcxself/flight-game/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/zcxself/flight-game/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

Skyline Run — Ring Runner: an original flight game. Fly a small jet in chase view over a river valley, through target rings, collect stars along the river, then land on the runway. Throttle, turn and pitch discipline matter: fuel burns, the hull takes damage on ground strikes, and a landing needs to be slow, level and centred. Keyboard and mouse controls, a lit cockpit HUD with altitude, speed, heading, fuel and an artificial horizon, and three missions with a score.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. Or serve `game/` with any static HTTP server — `game/index.html` is the front page. To build the submission output (what `main.ts` hands in):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Controls

W/S throttle, A/D turn, ↑/↓ climb and descend, mouse steers, Space brake, P pause, R restart, Enter take off.

---

<sub>Entered on [make.fun](https://make.fun/?ref=hnzwb0g9&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
