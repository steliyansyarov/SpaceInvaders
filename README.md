# Space Invaders

A browser remake of the arcade classic, written in plain HTML, CSS and JavaScript with no libraries, build step or image/audio files. Sprites are drawn on a `<canvas>` and sound effects are synthesized with the Web Audio API.

## Running the game

**Option 1: open the file.** Double-click `index.html`, or drag it into a browser window.

**Option 2: serve it locally.**

```sh
python -m http.server 8000
```

Then open <http://localhost:8000>.

## How to play

Defend Earth from rows of invaders marching back and forth across the screen. Each time they reach the edge, they drop one row closer to you. Shoot them all to clear the wave and earn a bonus of 100 × the wave number. Each new wave starts lower, moves faster and shoots more.

### Controls

| Action | Keyboard | Touch |
|---|---|---|
| Start / play again | `Enter` | Tap the screen |
| Move | `←` `→` or `A` `D` | ◀ ▶ |
| Fire | `Space`, `↑` or `W` | FIRE |
| Pause / resume | `P` or `Esc` | II |
| Mute / unmute | `M` | n/a |

### Rules

- You start with **3 lives** and lose one each time an invader's bullet hits you.
- You can only have **one shot on screen at a time**, so aim carefully.
- The green **bunkers** absorb shots from both sides and crumble as they take hits.
- The fewer invaders are left, the faster they move.
- If the invaders reach your row, the game is over immediately.

### Scoring

| Target | Points |
|---|---|
| Top-row invader (squid) | 30 |
| Middle-row invader (crab) | 20 |
| Bottom-row invader (octopus) | 10 |
| Red mystery UFO | 50, 100, 150 or 300 at random |

You earn an **extra life** at 1,500 points and every 3,000 points after that, up to 6 lives. Your high score and mute setting are saved in the browser.

## Files

- `index.html` contains the page, title, pause and game-over screens, and the touch controls.
- `style.css` holds the arcade-cabinet styling.
- `game.js` holds all game logic, rendering and sound.

<img width="500" height="404" alt="image" src="https://github.com/user-attachments/assets/73e2f5ad-8eca-4467-8539-0b8b1b11229d" />
<img width="503" height="398" alt="image" src="https://github.com/user-attachments/assets/fa67bffd-5e13-4750-9321-bdbe1933ef18" />


