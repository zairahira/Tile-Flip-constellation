# Matching Tiles Implementation Checklist

## Project Setup

- [x] Build the game using only `index.html`, `styles.css`, and `script.js`.
- [x] Use plain vanilla JavaScript with no frameworks and no build step.
- [x] Keep tile faces color-based for the MVP and do not use images.
- [x] Make the game work on both desktop and mobile.

## HTML Structure

- [x] Add a level select screen with title, helper text, and `#level-list`.
- [x] Add a game screen with level info, moves display, optional timer display, status message, board, and control buttons.
- [x] Add a level complete screen with message, next-level button, replay button, and back button.
- [x] Add a retry screen with failure message, retry button, and back button.
- [x] Use a shared hidden-screen pattern so only one screen is visible at a time.

## CSS Basics

- [x] Hide inactive screens with a reusable `.hidden` class.
- [x] Render the board as a responsive CSS grid using a configurable column count.
- [x] Keep the board centered and prevent it from getting too wide on desktop.
- [x] Make tiles large enough for mobile tapping.
- [x] Style tile states for hidden, face-up, matched, and disabled.
- [x] Support a simple functional flip-state presentation.
- [x] Provide a clear locked/disabled appearance for unavailable level buttons.

## Game Data

- [x] Add a fixed `levels` configuration array with 10 levels.
- [x] Include for each level: `id`, `pairs`, `columns`, `previewSeconds`, `maxMoves`, and `timeLimitSeconds`.
- [x] Use a color pool with at least 16 colors.
- [x] Add a central `gameState` object for level, phase, tiles, selected tiles, board lock, moves, matches, timer, and unlocked progress.
- [x] Use these phases: `levelSelect`, `preview`, `playing`, `won`, and `failed`.
- [x] Model each tile with `id`, `pairId`, color, `isFlipped`, and `isMatched`.
- [x] Compare tiles by `pairId`, not by color.

## Progress Persistence

- [x] Add a `localStorage` key for highest unlocked level.
- [x] Load saved progress on startup.
- [x] Save progress when a new level is unlocked.
- [x] Preserve unlocked progress across page refreshes.
- [x] Do not reduce progress when replaying older levels.
- [x] Keep levels open for testing for now if that behavior is still desired by the implementation.

## Initialization And DOM Wiring

- [x] Cache all required DOM elements in one place.
- [x] Attach all button and game interaction event listeners during initialization.
- [x] Render the level select screen on initial load.
- [x] Start the app on `DOMContentLoaded`.

## Screen And Level Selection Flow

- [x] Implement screen switching between level select, game, complete, and retry screens.
- [x] Render all 10 level buttons in the level select screen.
- [x] Enable unlocked levels and disable locked ones.
- [x] Show locked levels clearly.
- [x] Start the chosen level when an unlocked level button is pressed.

## Level Start And Board Generation

- [x] Stop any running timer before starting or restarting a level.
- [x] Reset per-attempt state when a level starts.
- [x] Generate exactly two tiles per pair for the current level.
- [x] Shuffle tiles with Fisher-Yates.
- [x] Render the board with the level's configured number of columns.
- [x] Render one button per tile and bind clicks to the tile handler.
- [x] Update the game header with level number, moves, move limit, and timer visibility.

## Preview Phase

- [x] Start every level attempt with a preview phase.
- [x] Start every retry with the preview phase again.
- [x] Show all tiles face up during preview.
- [x] Prevent tile interaction during preview.
- [x] Hide unmatched tiles when preview ends.
- [x] Switch into the playing phase after preview.
- [x] Start the timer only after preview ends on timed levels.

## Tile Interaction And Matching

- [x] Ignore clicks unless the phase is `playing`.
- [x] Ignore clicks while the board is locked.
- [x] Ignore clicks on matched or already flipped tiles.
- [x] Flip the first selected tile and store it.
- [x] Flip the second selected tile, count one move, and then evaluate the pair.
- [x] Leave matching pairs face up and mark them as matched.
- [x] Flip non-matching pairs back after a short delay.
- [x] Lock the board during mismatch delay so no other tiles can be tapped.
- [x] Clear selected-tile references after resolving a match or mismatch.
- [x] Re-render board state after each relevant game-state change.

## Win, Failure, And Navigation Flow

- [x] Detect level completion when all pairs are matched.
- [x] Stop the timer on win.
- [x] Show the completion screen with the correct message.
- [x] Unlock the next level after a win, without exceeding Level 10.
- [x] Hide or disable next-level progression after completing Level 10.
- [x] Fail immediately when the player exceeds an applicable move limit.
- [x] Fail immediately when time reaches zero before completion.
- [x] Stop the timer on failure.
- [x] Show the retry screen immediately on failure.
- [x] Make retry restart the same level.
- [x] Make replay restart the same level from the complete screen.
- [x] Make back-to-levels buttons return to level select cleanly.

## Move Limits And Timer Rules

- [x] Show move limits only on levels that have `maxMoves`.
- [x] Do not fail levels that have no move limit.
- [x] If the last allowed move completes the final pair, treat it as a win.
- [x] Show the timer only on levels that have `timeLimitSeconds`.
- [x] Do not show a timer on untimed levels.
- [x] Reset timer state on restart and retry.
- [x] Stop timer updates when leaving an active timed level.

## Required Level Config Coverage

- [x] Include relaxed early levels for teaching the mechanic.
- [x] Include move-limit levels in the middle of the progression.
- [x] Include timed late levels.
- [x] Ensure all 10 levels render correctly with their configured board sizes.

## Edge Cases To Verify

- [x] Taps during preview are ignored.
- [x] Tapping the same tile twice does not count as a move or break state.
- [x] Tapping an already matched tile is ignored.
- [x] Tapping an already flipped tile is ignored.
- [x] Taps during mismatch delay are ignored.
- [x] Restarting a timed level resets the timer correctly.
- [x] Returning to level select from a timed level stops the timer.
- [x] Refreshing after unlocking a level keeps progress.
- [x] Replaying an earlier completed level does not remove unlocked progress.
- [x] Completing Level 10 does not attempt to unlock a nonexistent Level 11.
- [x] Finishing on the last allowed move succeeds.
- [x] Finishing exactly as the timer reaches zero resolves correctly.

## Acceptance Checks

- [x] The app runs directly in the browser with no framework or build step.
- [x] The game board works across all 10 levels.
- [x] Level unlock progression works and persists via `localStorage`.
- [x] Preview, matching, failure, and completion flows all work end to end.
- [x] Desktop and mobile interactions are both usable.
