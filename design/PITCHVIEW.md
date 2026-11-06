# Pitch view

The live relay delegates its existing `relayScene(game, pitches, offId,
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
use the existing `batSide` helper. From the catcher's view, a right-handed hitter
stands on screen left and a left-handed hitter on screen right. The pitcher faces
the camera, so his right throwing hand is on screen left; the illustrated hand
and the track origin use the same mound position and scale.

The park and batter are cached as SVG data-URI images, keyed by home color and
batting color/side respectively. Browsers can reuse these image resources across
relay rerenders. Only the small dynamic overlay and HTML panel are regenerated.
There are no runtime raster assets and no build or dependency requirement.

Locations and the 3 × 3 grid share one projection; the simulation's zone remains
exactly x .33–.67, y .30–.70. Beyond the outer shadow border, vertical margins are
compressed and extreme horizontal locations are kept inside the frame so the
close crop retains complete numbered markers. This affects only screen positions.
Tracks depict a visual route to the supplied location, not a physics model. Pitch
numbers and result colors match the newest-first table. The latest pitch has a
double ring and a 480 ms flight animation. Rerendering the same pitch for commentary
or pause does not replay it; reduced-motion CSS disables the animation.

## Round 2: composition and readability

1. **Closer camera.** The zone is now about 310–323 units wide in the 960-unit
   frame (32–34%), with its upper edge raised from y=448 to y=343. The batter is
   scaled 1.7× and moved into the foreground: helmet to bottom crop occupies about
   70% of the frame height, ending at the shins. The enlarged plate, chalk boxes
   and foreground dirt follow the closer framing while the stadium, fielders,
   mowing bands and base paths retain depth behind it.
2. **Clear handedness and layering.** Right-handed batters stand on the left;
   left-handed batters mirror to the right. The body, hands and bat stay beside
   the zone with a visible gap. SVG paint order is park/scoreboard, pitcher,
   batter, zone, all tracks, all numbered markers. An outside pitch may cross the
   hitter, but its track and marker always paint above him.
3. **Visible latest track and numbers.** The newest track has a colored ribbon
   that tapers to the release hand, a blurred halo and a bright centerline.
   Earlier tracks use thin strokes at 28% opacity. Marker disc diameters are
   54 units (earlier) and 58 units (latest), with high-contrast numbers. At a
   375px viewport the calculated scene width is 324–341px, depending on the
   scrollbar, giving a minimum disc diameter of 18.2–19.2px. These are layout
   calculations, not browser measurements.
4. **Readable pitcher.** The pitcher is 45% larger, with a club-colored jersey
   and cap, contrasting piping, pants, glove, face and separate legs. The release
   point follows the enlarged throwing hand for both pitching sides.
5. **Zone and landing cell.** The 3 × 3 grid retains its perspective and gets a
   faint outer border. Only the newest pitch's cell is tinted and outlined in its
   result color, with row/column text in the SVG description. Boundary pitches
   belong to their edge cell; outside pitches and intentional walks clear the
   highlight.
6. **Desktop width.** At 1000px and above the scene column takes the remaining
   width beside a 280–320px sidebar, replacing the 600px scene cap. The SVG fills
   that column without a maximum width. At 1280px, the current wrapper gives a
   calculated 742px artwork width instead of 598px; phone layout stays one column.

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
node qa/pitchview-check.js
node qa/run.js --suite smoke
node qa/pitchview-check.js --preview
```

Round 2 checks passed: 23 unit tests; feature checks; smoke `violations: {}`,
`failures: 0`, `sourceFilesUnchanged: true`. The feature check uses real live-game
entry points and covers outcome timing, state immutability, projected zone corners,
mirroring, cached art, animation deduplication, intentional walks and counts. It
also checks paint order, all nine landing cells, highlight clearing and complete
markers at extreme locations. Its render timing measures cached string generation,
not browser image decoding, painting or frame rate.

`--preview` writes actual `relayHTML` snapshots to the ignored directory
`qa/results/pitchview/`. Open `review.html` directly to compare both handedness
variants at 375px with a 1280px desktop view. `phone-right.html` and `phone.html`
select right- and left-handed batters only for art inspection; they are not saved
games. These are static review fixtures; match controls are disabled.

Round 2 SVG artwork was rasterized locally with the already-installed Sharp
renderer and inspected at 341px and 742px, including both batting sides. No
network, downloaded assets or project dependency was used. The ignored preview
directory also contains `phone-right-art.png`, `phone-art.png` and
`desktop-art.png` from that inspection. These show the artwork only, without HTML
headers/footers or the surrounding page.

Browser visual verification remains outstanding: the browser host was unavailable,
and automatic approval review rejected native Chrome access with
“Computer Use was not approved to use Google Chrome.” No browser performance,
375px overflow or browser animation result is claimed. Review both widths and the
live page, including reduced motion, before merging.

`tools/build_play.js` does not exist in this checkout. A later package copy list
must include `design/pitchview.js` along with the existing Material CSS and badge
script. No commit was created; changes remain in the working tree.
