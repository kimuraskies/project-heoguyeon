# Pitch view

The live relay now delegates its existing `relayScene(game, pitches, offId,
defId, batName, pitName)` HTML-string contract to `design/pitchview.js`.
The script is loaded beside `design/badges.js`. No simulation files changed.

## Art provenance

All art was authored directly as SVG paths, gradients, patterns and deterministic
spectator geometry in `pitchview.js`. No image generator, downloaded image, real
club logo, sponsor artwork, broadcaster branding, web font or external resource
was used. Signs say only `KBO MANAGER` and `PROJECT 허구연`.

The 960 × 760 illustration layers a dusk sky, four light towers, two seating
tiers, a live scoreboard, a curved outfield wall, mowing bands, an infield,
fielders, a pitcher and a detailed batter. Uniform colors come from the current
clubs. The hitter mirrors for left-handed batting; switch hitters continue to
use the existing `batSide` helper. The pitcher's release hand also mirrors.

The park and batter are cached as SVG data-URI images, keyed by home color and
batting color/side respectively. Browsers can reuse these image resources across
relay rerenders. Only the small dynamic overlay and HTML panel are regenerated.
There are no runtime raster assets and no build or dependency requirement.

Locations and the 3 × 3 grid share one projection; the simulation's zone remains
exactly x .33–.67, y .30–.70. Tracks depict a visual route to the supplied location,
not a physics model. Pitch numbers and result colors match the newest-first table.
The latest pitch has a double ring and a 480 ms flight animation. Rerendering the
same pitch for commentary or pause does not replay it; reduced-motion CSS disables
the animation.

## Information and layout

The panel shows batter (or runner for a steal), resolved result, the user's club's
existing win estimate, and change from `ab.wp0` only after the play commits.
Changes are percentage points (`%p`), including a rounded zero. Pending plate
appearances never disclose their prepared outcome. The table keeps final counts,
does not add strikes for two-strike fouls, and shows no plotted or counted pitch
for an intentional walk. The existing commentary is available below the table.

The scene has an intrinsic aspect ratio and fits its container. Material styles
provide one column at phone width and a scene/sidebar layout on desktop. The
pitch table scrolls vertically, has a sticky header and can receive keyboard focus.
SVG descriptions and the table provide text equivalents for the graphics.

## Verification and review

```text
node tools/test.js
node qa/run.js --suite smoke
node qa/pitchview-check.js --preview
```

The first two checks passed with 23 tests and smoke `violations: {}`, `failures: 0`.
The feature check uses real live-game entry points, checks outcome timing, state
immutability, zone corners, mirroring, cached art, animation deduplication,
intentional walks and counts. Its render timing measures cached string generation,
not browser image decoding, painting or frame rate.

`--preview` writes actual `relayHTML` snapshots to the ignored directory
`qa/results/pitchview/`. Open `review.html` directly to compare a 375px left-handed
view with a 1280px desktop view. These are static review fixtures; match controls
are disabled. The left-handed fixture changes only the displayed batter for art
inspection and is not a saved game.

Browser visual verification remains outstanding: the browser host was unavailable,
and automatic approval review rejected native Chrome access with
“Computer Use was not approved to use Google Chrome.” No browser performance or
375px overflow result is claimed. Claude should inspect both review widths and
the live page, including reduced motion, before merging.

`tools/build_play.js` does not exist in this checkout. A later package copy list
must include `design/pitchview.js` along with the existing Material CSS and badge
script. No commit was created; changes remain in the working tree.
