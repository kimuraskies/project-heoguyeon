/* Original, self-contained ballpark illustration. No downloaded art or fonts.
   Static SVG images are memoized; only the scoreboard, zone and pitches are rebuilt.
   Coordinates are presentation only: the simulation's x/y and outcomes are untouched. */
(function (root) {
  'use strict';
  const W = 960, H = 760;
  const MOUND = {x:480, y:385, scale:1.45};
  const backgrounds = new Map(), hitters = new Map(), deliveries = new WeakMap();
  let serial = 0;
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const color = value => /^#[\da-f]{6}$/i.test(value || '') ? value : '#536579';
  const f = value => Number(value).toFixed(1);
  const svgImage = body => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">${body}</svg>`);
  const image = uri => `<image width="${W}" height="${H}" href="${uri}"/>`;

  function ballpark(clubColor) {
    if (backgrounds.has(clubColor)) return backgrounds.get(clubColor);
    // Deterministic spectators, batched into eight paths rather than thousands of nodes.
    const palette = ['#69818a','#c2c4b6','#778998','#b99a84','#ddd9c9','#36536a','#a16b65','#d2b483'];
    const crowd = palette.map(() => []);
    for (let tier = 0; tier < 2; tier++) for (let row = 0; row < 10; row++) {
      for (let seat = 0; seat < 122; seat++) {
        if (seat % 20 < 2) continue; // radial aisles
        const x = seat * 8 - 5 + (row % 2) * 3;
        const bow = 1 - Math.pow((x - 480) / 525, 2);
        const y = (tier ? 240 : 158) + row * (tier ? 5.7 : 4.5) + bow * (tier ? -9 : 27);
        const hash = (seat * 17 + row * 31 + tier * 23) % 29;
        if (hash < 3) continue;
        crowd[hash % palette.length].push(`M${f(x)} ${f(y)}v${tier ? 2.8 : 1.8}`);
      }
    }
    const crowdArt = crowd.map((d, i) => `<path d="${d.join('')}" stroke="${palette[i]}" stroke-width="${i % 2 ? 2.9 : 2.1}" stroke-linecap="round" opacity=".76"/>`).join('');
    let rows = '', aisles = '', stripes = '', seams = '';
    for (let n = 0; n < 10; n++) rows += `<path d="M-30 ${241+n*6}Q480 ${219+n*6} 990 ${241+n*6}"/>`;
    for (let n = 0; n < 9; n++) {
      const x = -25+n*128;
      aisles += `<path d="M${x} 151L${480+(x-480)*1.22} 324"/>`;
    }
    // Mowing bands get wider toward the camera, following the field's vanishing point.
    for (let n = -8; n < 9; n++) stripes += `<path d="M${480+n*58} 260L${480+(n+1)*58} 260L${480+(n+1)*230} 760L${480+n*230} 760Z" fill="${n%2 ? '#89aa65' : '#213f2b'}" opacity="${n%2 ? '.14' : '.12'}"/>`;
    for (let x = 0; x < 960; x += 42) seams += `<path d="M${x} ${300-37*(1-Math.pow((x-480)/480,2))}v35"/>`;
    const tower = (x, y, scale) => `<g transform="translate(${x} ${y}) scale(${scale})">
      <path d="M-8 150L-5 12H5L9 150M-7 40L7 65L-7 90L8 115L-8 140M7 40L-7 65L7 90L-8 115L8 140" fill="none" stroke="#7c8d96" stroke-width="2"/>
      <path d="M-42 0H42L38 25H-38Z" fill="#3b4f5a" stroke="#a4b3b6"/>
      <rect x="-36" y="5" width="72" height="13" rx="2" fill="url(#lamps)"/>
      <ellipse cy="12" rx="94" ry="65" fill="url(#bloom)"/>
      <path d="M-70 12H70M0 -18V42" stroke="#f1f9e8" opacity=".22"/>
      <path d="M-30 23L-110 220H190L30 23Z" fill="url(#beam)"/>
    </g>`;
    const art = `<defs>
      <linearGradient id="sky" x2="0" y2="1"><stop stop-color="#071424"/><stop offset=".6" stop-color="#294656"/><stop offset="1" stop-color="#718282"/></linearGradient>
      <radialGradient id="dusk" cx=".12" cy=".8" r=".8"><stop stop-color="#bdad94" stop-opacity=".36"/><stop offset="1" stop-color="#708b9c" stop-opacity="0"/></radialGradient>
      <linearGradient id="stands" x2="0" y2="1"><stop stop-color="#1b2935"/><stop offset=".6" stop-color="#35434a"/><stop offset="1" stop-color="#142b32"/></linearGradient>
      <linearGradient id="grass" x2="0" y2="1"><stop stop-color="#55795b"/><stop offset=".35" stop-color="#3c6944"/><stop offset="1" stop-color="#22482f"/></linearGradient>
      <linearGradient id="clay" x1=".1" y1="0" x2=".75" y2="1"><stop stop-color="#a78d69"/><stop offset=".4" stop-color="#947553"/><stop offset=".75" stop-color="#ac8560"/><stop offset="1" stop-color="#654a36"/></linearGradient>
      <linearGradient id="wall" x2="0" y2="1"><stop stop-color="#2b4b49"/><stop offset="1" stop-color="#183737"/></linearGradient>
      <linearGradient id="beam" x2="0" y2="1"><stop stop-color="#e0f3ec" stop-opacity=".08"/><stop offset="1" stop-color="#e0f3ec" stop-opacity="0"/></linearGradient>
      <radialGradient id="bloom"><stop stop-color="#fcffe9" stop-opacity=".38"/><stop offset=".22" stop-color="#cce6eb" stop-opacity=".14"/><stop offset="1" stop-color="#cce6eb" stop-opacity="0"/></radialGradient>
      <radialGradient id="vignette" r=".7"><stop offset=".35" stop-color="#04101c" stop-opacity="0"/><stop offset="1" stop-color="#04101c" stop-opacity=".57"/></radialGradient>
      <pattern id="lamps" width="12" height="7" patternUnits="userSpaceOnUse"><rect width="9" height="5" rx="1" fill="#f6ffe7"/></pattern>
      <pattern id="grain" width="37" height="23" patternUnits="userSpaceOnUse"><path d="M3 7h2m17 8h1M30 2h2m-23 17h3m15-9h1" stroke="#f1ddab" stroke-opacity=".1"/><path d="M0 1h2m12 10h3m16 9h2" stroke="#132e24" stroke-opacity=".14"/></pattern>
      <clipPath id="field"><path d="M0 331Q480 224 960 331V760H0Z"/></clipPath>
    </defs>
    <path d="M0 0H960V360H0Z" fill="url(#sky)"/><path d="M0 0H960V340H0Z" fill="url(#dusk)"/>
    <path d="M0 144H35V129H49V144H81V120H97V145H140V131H159V151H211V137H239V160H711V141H748V126H766V149H808V117H832V143H887V133H908V148H960V235H0Z" fill="#182c3a" opacity=".65"/>
    ${tower(113,80,1)}${tower(836,80,1)}${tower(309,126,.58)}${tower(650,126,.58)}
    <path d="M-30 146Q480 228 990 146V335Q480 242-30 335Z" fill="url(#stands)"/>
    <path d="M-30 142Q480 223 990 142L990 155Q480 237-30 155Z" fill="#0e202e"/>
    <path d="M-30 146Q480 228 990 146" fill="none" stroke="#8c9d9c" stroke-width="2" opacity=".7"/>
    <g fill="none" stroke="#78908d" stroke-opacity=".2">${rows}</g>
    <g stroke="#87928c" stroke-width="7" opacity=".28">${aisles}</g>${crowdArt}
    <path d="M-30 207Q480 263 990 207L990 232Q480 274-30 232Z" fill="#111f2b"/>
    <path d="M-30 210Q480 265 990 210" fill="none" stroke="#a1b9b2" stroke-width="2" opacity=".65"/>
    <path d="M-30 222Q480 272 990 222" fill="none" stroke="${clubColor}" stroke-width="4" opacity=".85"/>
    <g stroke="#698387" stroke-width="2" opacity=".5"><path d="M76 221V240M226 238V251M733 238V251M883 221V240"/></g>
    <path d="M0 298Q480 224 960 298V339Q480 267 0 339Z" fill="url(#wall)"/>
    <path d="M0 299Q480 225 960 299" fill="none" stroke="#d7b96c" stroke-width="3"/>
    <g stroke="#071e26" stroke-width="2" opacity=".4">${seams}</g>
    <g clip-path="url(#field)"><path d="M0 260H960V760H0Z" fill="url(#grass)"/>${stripes}
      <path d="M-40 344Q480 243 1000 344" fill="none" stroke="#b8aa7d" stroke-width="17" opacity=".65"/>
      <path d="M-50 760L197 456Q290 364 480 340Q670 364 763 456L1010 760Z" fill="url(#clay)"/>
      <path d="M480 354L711 455L480 638L249 455Z" fill="url(#grass)"/>
      <path d="M480 354L540 380L350 535L313 507ZM610 411L651 428L441 607L401 576Z" fill="#a3b779" opacity=".13"/>
      <path d="M480 820L89 321M480 820L871 321" fill="none" stroke="#e0ddc5" stroke-width="4" opacity=".84"/>
      <path d="M480 820L248 455L480 354L712 455Z" fill="none" stroke="#c1ae88" stroke-width="5" opacity=".42"/>
      <ellipse cx="480" cy="790" rx="480" ry="150" fill="url(#clay)"/>
      <path d="M0 260H960V760H0Z" fill="url(#grain)"/>
    </g>
    <ellipse cx="480" cy="391" rx="50" ry="13" fill="#172e25" opacity=".18"/>
    <path d="M431 387Q478 360 529 387Q478 404 431 387Z" fill="#bca27e"/>
    <path d="M431 387Q478 400 529 387" fill="none" stroke="#dcc7a0" stroke-opacity=".36" stroke-width="2"/>
    <path d="M471 378H492L494 381H469Z" fill="#e0dfcf"/>
    <g fill="#eeeadd" stroke="#c3bca5"><path d="M237 453L250 447L264 453L250 460Z"/><path d="M472 351L480 348L489 351L480 355Z"/><path d="M698 453L712 447L725 453L712 460Z"/></g>
    <g fill="none" stroke="#e5dbc1" stroke-width="4" opacity=".45"><path d="M85 650L286 662L260 860L-15 840Z"/><path d="M674 662L875 650L975 840L700 860Z"/></g>
    <g fill="none" stroke="#5f4934" opacity=".28" stroke-width="4"><path d="M75 718q70 18 153 9m-115-31q50 13 97 10m526 0q50 0 97-10m-105 33q54 2 107-12"/></g>
    <path d="M376 708H584L605 735L480 805L355 735Z" fill="#e6e4d5" stroke="#ad9f83" stroke-width="3"/>
    <path d="M381 714H579L590 730H369Z" fill="#fffdf0" opacity=".7"/>
    <g fill="#ffffff" font-family="system-ui,sans-serif" font-size="17" font-weight="900" letter-spacing="1.2"><g transform="rotate(-4 290 276)"><rect x="195" y="263" width="190" height="26" rx="3" fill="#0b2426" stroke="#d7b96c" stroke-width="1.5"/><text x="290" y="282" text-anchor="middle">KBO MANAGER</text></g><g transform="rotate(4 670 276)"><rect x="575" y="263" width="190" height="26" rx="3" fill="#0b2426" stroke="#d7b96c" stroke-width="1.5"/><text x="670" y="282" text-anchor="middle">PROJECT 허구연</text></g></g>
    <path d="M0 0H960V760H0Z" fill="url(#vignette)"/>`;
    const uri = svgImage(art);
    backgrounds.set(clubColor, uri);
    return uri;
  }

  // Original rear three-quarter batting stance: helmet, face profile, gripping hands,
  // tailored jersey, folds, belt, bent legs and shin guard. The close camera crops
  // the shins. From behind the catcher, a right-handed hitter stands on screen LEFT.
  function batter(clubColor, lefty) {
    const key = clubColor + lefty;
    if (hitters.has(key)) return hitters.get(key);
    const art = `<defs>
      <linearGradient id="kit" x1="0" y1="0" x2="1" y2=".5"><stop stop-color="#ecf4e5" stop-opacity=".35"/><stop offset=".32" stop-color="#c8d6dc" stop-opacity=".06"/><stop offset=".7" stop-color="#071522" stop-opacity=".25"/><stop offset="1" stop-color="#030d17" stop-opacity=".75"/></linearGradient>
      <linearGradient id="pants"><stop stop-color="#8d9c9f"/><stop offset=".25" stop-color="#dfe2dc"/><stop offset=".48" stop-color="#c5ceca"/><stop offset=".8" stop-color="#93a2a3"/><stop offset="1" stop-color="#526875"/></linearGradient>
      <linearGradient id="skin"><stop stop-color="#e5bd99"/><stop offset=".5" stop-color="#b88768"/><stop offset="1" stop-color="#725140"/></linearGradient>
      <linearGradient id="bat"><stop stop-color="#b3915f"/><stop offset=".35" stop-color="#ecd2a0"/><stop offset=".7" stop-color="#d0b27c"/><stop offset="1" stop-color="#876542"/></linearGradient>
    </defs><g ${lefty ? 'transform="translate(960 0) scale(-1 1)"' : ''}><g transform="translate(-410 -334) scale(1.7)">
      <ellipse cx="322" cy="706" rx="98" ry="13" fill="#0a1820" opacity=".36"/>
      <path d="M284 689L194 752L346 735L387 699Z" fill="#16211f" opacity=".14"/>
      <path d="M300 486Q278 510 282 550L270 600L265 674L292 682L313 609L330 565L341 530Z" fill="url(#pants)"/>
      <path d="M324 510Q352 507 359 547L377 595L380 678L354 682L341 610L315 569L306 535Z" fill="url(#pants)"/>
      <path d="M293 530Q302 550 292 579M282 595L297 604M288 613L274 666M339 550L324 565M354 599L370 607M356 612L367 670" fill="none" stroke="#617582" stroke-width="3" opacity=".55"/>
      <path d="M280 565L268 669M352 563L374 673" fill="none" stroke="${clubColor}" stroke-width="3" opacity=".8"/>
      <path d="M264 670L293 675L290 690L261 689Z" fill="#142334"/><path d="M352 672L381 672L383 691L356 690Z" fill="#142334"/>
      <path d="M263 685Q272 681 290 688L299 699Q298 706 283 706L244 703Q241 695 253 691Z" fill="#101d29"/><path d="M356 686L380 684L393 695L408 699Q412 707 398 708L355 706Z" fill="#101d29"/>
      <path d="M247 700L286 703M358 702L404 704" stroke="#afbcbc" stroke-width="3"/><path d="M266 691l16 4m-19-1 15 4m87-5 13 4m-13-1 14 4" stroke="#e6e7dc" stroke-width="1.8"/>
      <path d="M350 615Q360 607 374 614L379 659Q370 671 356 660Z" fill="#1a2b3b"/><path d="M355 617L361 655L375 657M354 625L375 625M358 648L377 648" fill="none" stroke="#627686" stroke-width="2"/>
      <path d="M273 410Q278 395 302 393L333 399Q351 416 351 442L345 495Q325 514 283 500L277 460Z" fill="${clubColor}"/>
      <path d="M273 410Q278 395 302 393L333 399Q351 416 351 442L345 495Q325 514 283 500L277 460Z" fill="url(#kit)"/>
      <path d="M281 413Q300 423 337 413M280 426L286 482M286 481Q303 475 317 481M310 494L338 482M334 438L328 466" fill="none" stroke="#eef2e0" stroke-width="2" opacity=".18"/>
      <path d="M281 490Q314 503 346 490L346 505Q312 516 281 502Z" fill="#132332"/>
      <path d="M282 493Q317 505 344 495" fill="none" stroke="#f7eed2" stroke-opacity=".35" stroke-width="2"/><path d="M329 498h8v7h-8Z" fill="#a4b6ba"/>
      <path d="M296 395L296 382L316 377L325 399L312 407Z" fill="url(#skin)"/>
      <path d="M300 346Q320 344 328 359L329 371L337 378L331 384L328 395L311 395L299 385L294 365Z" fill="url(#skin)"/>
      <path d="M325 367l5 3m-2 16 5-2" stroke="#51473b" stroke-width="2"/>
      <path d="M284 363Q279 343 296 333Q316 323 330 342L334 357Q317 353 301 362L301 383Q287 387 284 370Z" fill="${clubColor}"/>
      <path d="M284 363Q279 343 296 333Q316 323 330 342L334 357Q317 353 301 362L301 383Q287 387 284 370Z" fill="url(#kit)"/>
      <path d="M314 350L337 352L346 359Q331 366 312 360Z" fill="${clubColor}"/><path d="M289 349Q294 333 312 335" fill="none" stroke="#dbe8e3" stroke-width="2.5" opacity=".45"/>
      <ellipse cx="295" cy="368" rx="3" ry="5" fill="#111f2a"/>
      <path d="M329 406Q346 405 351 423L362 442L343 452L328 432Z" fill="${clubColor}"/><path d="M329 406Q346 405 351 423L362 442L343 452L328 432Z" fill="url(#kit)"/>
      <path d="M349 438L361 432L375 410L361 400L338 426Z" fill="url(#skin)"/><path d="M358 438Q364 427 369 419" fill="none" stroke="#efd1a5" stroke-width="2" opacity=".6"/>
      <path d="M279 411Q291 405 303 417L316 438L301 451L280 436Z" fill="${clubColor}"/><path d="M279 411Q291 405 303 417L316 438L301 451L280 436Z" fill="url(#kit)"/>
      <path d="M301 439Q320 450 328 440L356 403L367 411L340 455Q325 472 306 456L297 450Z" fill="url(#skin)"/>
      <path d="M301 441L309 446L306 458L296 452Z" fill="#192a3a"/>
      <path d="M360 406L253 274Q250 265 256 261Q263 259 268 266L371 400Z" fill="url(#bat)"/>
      <path d="M350 386L367 407" stroke="#293638" stroke-width="7"/><path d="M351 387l6-2m-2 6 6-2m-2 6 6-2m-2 6 6-2" stroke="#d8d8c9" stroke-width="1.5"/>
      <path d="M352 402L360 392Q367 390 374 399L377 411L368 421L358 415Z" fill="#dce2d9" stroke="#93a2a6" stroke-width="1.5"/><path d="M344 409L352 399Q359 398 367 409L365 420L357 427L349 422Z" fill="#e0e7df" stroke="#93a2a6" stroke-width="1.5"/>
      <path d="M351 406l9 9m-5-12 10 9m-6-15 11 10M349 418l8 6" fill="none" stroke="#86999f" stroke-width="1.5"/>
      <path d="M302 407Q307 410 315 408" fill="none" stroke="#e6e5d6" stroke-width="3" opacity=".6"/>
    </g></g>`;
    const uri = svgImage(art);
    hitters.set(key, uri);
    return uri;
  }

  function pitcher(clubColor, lefty) {
    // He faces the camera: his right throwing hand is on screen left.
    return `<g class="pv-pitcher" transform="translate(${MOUND.x} ${MOUND.y}) scale(${lefty ? MOUND.scale : -MOUND.scale} ${MOUND.scale})">
      <ellipse cy="3" rx="24" ry="5" fill="#25322c" opacity=".4"/>
      <path d="M-8 -38L-12 -18L-18 0L-9 1L2 -18L6 -33M4 -34L12 -17L18 0H26L19 -23L13 -39" fill="#d0d9d5" stroke="#789095" stroke-width="1.4"/>
      <path d="M-19 -3L-9 -2L-8 3H-23ZM18 -3L25 -2L30 3H19Z" fill="#142333"/>
      <path d="M-12 -66L4 -68L13 -55L13 -35L-6 -32L-13 -46Z" fill="${clubColor}" stroke="#e5eddf" stroke-width=".8"/>
      <path d="M-11 -63L-22 -51L-15 -42L-5 -53M5 -64L16 -56L21 -64" fill="none" stroke="${clubColor}" stroke-width="8" stroke-linejoin="round"/>
      <path d="M20 -61L21 -68" stroke="#c8a383" stroke-width="5" stroke-linecap="round"/>
      <path d="M-19 -49L-12 -53L-8 -44L-16 -39Z" fill="#72533c"/>
      <path d="M-5 -36L13 -39" stroke="#223143" stroke-width="3"/>
      <path d="M-3 -66L-5 -73L3 -76L7 -67Z" fill="#ad896d"/>
      <circle cx="-1" cy="-78" r="7" fill="#c6a483"/>
      <path d="M-8 -79Q-7 -90 2 -86L7 -81L12 -79L3 -77Z" fill="${clubColor}"/>
      <path d="M-10 -60L-5 -43M0 -63L5 -43M-9 -56L7 -58" fill="none" stroke="#f0f1e6" stroke-width="1.5" opacity=".6"/>
      <path d="M8 -50L10 -41L-4 -38" fill="none" stroke="#071522" stroke-width="2" opacity=".3"/>
    </g>`;
  }

  // Shared projection for the zone AND locations. Zone boundaries remain exactly
  // x=.33/.67 and y=.30/.70; the near edge widens slightly with perspective.
  // Beyond the shadow border, compress the vertical margins so low/high balls
  // remain readable in the close crop. This changes only their screen position.
  function project(x, y) {
    const py = y < .27 ? 321.7 + (y - .27) * 550 :
      y > .73 ? 648.3 + (y - .73) * 200 : 485 + (y - .5) * 710;
    const width = 930 + (y - .5) * 95;
    return [Math.max(44, Math.min(W-44, 480 + (x - .5) * width)), py];
  }
  const point = (x, y) => project(x, y).map(f).join(',');
  const zonePath = (x1, y1, x2, y2) => `M${point(x1,y1)}L${point(x2,y1)}L${point(x2,y2)}L${point(x1,y2)}Z`;

  function scene(game, pitches, opts) {
    const {batName, pitName, side, pitSide, colors, labels, count} = opts;
    const batColor = color(opts.batColor), pitColor = color(opts.pitColor), parkColor = color(opts.parkColor);
    const id = 'pv' + (++serial), lefty = side === '좌';
    const release = [MOUND.x + (pitSide === '좌' ? 21 : -21) * MOUND.scale, MOUND.y - 68 * MOUND.scale];
    const lastIndex = pitches.length - 1, last = pitches[lastIndex];
    // The same pitch object survives commentary/pause rerenders. It only flies once.
    const fly = !!last && deliveries.get(game) !== last;
    deliveries.set(game, last);
    let grid = '', tracks = '', markers = '', highlight = '', cellText = '';
    if (last && last.res !== 'IBB' && Number.isFinite(last.x) && Number.isFinite(last.y) &&
        last.x >= .33 && last.x <= .67 && last.y >= .3 && last.y <= .7) {
      const col = Math.min(2, Math.floor((last.x - .33) / (.34 / 3)));
      const row = Math.min(2, Math.floor((last.y - .3) / (.4 / 3)));
      const x = .33 + col * .34 / 3, y = .3 + row * .4 / 3;
      highlight = `<path class="pv-zone-cell" data-cell="${row+1}-${col+1}" d="${zonePath(x,y,x+.34/3,y+.4/3)}" fill="${color(colors[last.res])}" fill-opacity=".24" stroke="${color(colors[last.res])}" stroke-opacity=".65" stroke-width="2.5"/>`;
      cellText = ` 최신 투구는 스트라이크 존 ${row+1}행 ${col+1}열.`;
    }
    for (let i = 1; i < 3; i++) {
      const x = .33 + .34 * i / 3, y = .3 + .4 * i / 3;
      grid += `<path d="M${point(x,.3)}L${point(x,.7)}M${point(.33,y)}L${point(.67,y)}"/>`;
    }
    pitches.forEach((p, i) => {
      if (p.res === 'IBB') return;
      const x = Number.isFinite(p.x) ? Math.max(0,Math.min(1,p.x)) : .5;
      const y = Number.isFinite(p.y) ? Math.max(0,Math.min(1,p.y)) : .5;
      const [ex,ey] = project(x,y), latest = i === lastIndex, c = color(colors[p.res]);
      const cx = release[0]+(ex-release[0])*.2, cy = release[1]+(ey-release[1])*.62;
      const curve = `M${release.map(f).join(' ')}Q${f(cx)} ${f(cy)} ${f(ex)} ${f(ey)}`;
      if (latest) {
        // A tapered ribbon follows the same quadratic as the bright centerline.
        // It begins at the actual hand, widening from a point to 22 scene units.
        const length = Math.hypot(ex-cx, ey-cy) || 1, nx = -(ey-cy)/length, ny = (ex-cx)/length;
        const ribbon = `M${release.map(f).join(' ')}Q${f(cx+nx*4)} ${f(cy+ny*4)} ${f(ex+nx*11)} ${f(ey+ny*11)}L${f(ex-nx*11)} ${f(ey-ny*11)}Q${f(cx-nx*4)} ${f(cy-ny*4)} ${release.map(f).join(' ')}Z`;
        tracks += `<g class="pv-track-latest">
          <defs><linearGradient id="${id}-trail" gradientUnits="userSpaceOnUse" x1="${f(release[0])}" y1="${f(release[1])}" x2="${f(ex)}" y2="${f(ey)}"><stop stop-color="${c}" stop-opacity=".12"/><stop offset=".35" stop-color="${c}" stop-opacity=".55"/><stop offset="1" stop-color="${c}" stop-opacity=".95"/></linearGradient></defs>
          <path d="${ribbon}" fill="${c}" stroke="${c}" stroke-width="12" opacity=".6" filter="url(#${id}-glow)"/>
          <path d="${ribbon}" fill="url(#${id}-trail)"/>
          <path d="${curve}" fill="none" stroke="#fff8da" stroke-width="3.5" stroke-linecap="round" opacity=".95"/>
        </g>`;
      } else {
        tracks += `<path class="pv-track-earlier" d="${curve}" fill="none" stroke="${c}" stroke-width="2.5" stroke-linecap="round" opacity=".28"/>`;
      }
      if (latest && fly) tracks += `<circle class="pv-flight" r="7" fill="#fffdeb" style="offset-path:path('${curve}')"/>`;
      markers += `<g class="pv-marker${latest ? ' pv-marker-latest' : ''}" data-pitch="${i+1}">
        <title>${i+1}구 · ${esc(labels[p.res] || p.res)} · ${esc(p.type)} · ${p.velo || 0} km/h</title>
        ${latest ? `<circle cx="${f(ex)}" cy="${f(ey)}" r="40" fill="${c}" opacity=".16"/><circle cx="${f(ex)}" cy="${f(ey)}" r="36" fill="none" stroke="${c}" stroke-width="2" opacity=".9"/>` : ''}
        <circle class="pv-marker-disc" cx="${f(ex)}" cy="${f(ey)}" r="${latest ? 29 : 27}" fill="#10202d" stroke="${c}" stroke-width="${latest ? 4 : 3}"/>
        <text x="${f(ex)}" y="${f(ey+1)}" text-anchor="middle" dominant-baseline="central" font-size="${i+1 > 9 ? 29 : 34}" font-weight="750" fill="#fff">${i+1}</text>
      </g>`;
    });
    const board = `<g font-family="system-ui,sans-serif">
      <path d="M355 136V251M605 136V251" stroke="#273b47" stroke-width="8"/>
      <rect x="342" y="109" width="276" height="126" rx="3" fill="#0b1721" stroke="#5d7279" stroke-width="3"/>
      <path d="M346 113H614V132H346Z" fill="${parkColor}"/>
      <text x="480" y="126" text-anchor="middle" font-size="10" font-weight="700" letter-spacing="3" fill="#f2f2e3">KBO MANAGER</text>
      <text x="359" y="158" font-size="14" fill="#b6c9ce">${esc(game.a)}</text><text x="597" y="159" text-anchor="end" font-size="22" font-weight="700" fill="#f0db9a">${game.score[game.a]}</text>
      <text x="359" y="187" font-size="14" fill="#b6c9ce">${esc(game.h)}</text><text x="597" y="188" text-anchor="end" font-size="22" font-weight="700" fill="#f0db9a">${game.score[game.h]}</text>
      <path d="M357 198H603" stroke="#31434d"/>
      <text x="359" y="220" font-size="14" fill="#dde8df">${game.inning}${game.half==='top'?'▲':'▼'}</text>
      <text x="430" y="219" font-size="12" fill="#c9dbce">B ${count.b}　 S ${count.s}　 O ${game.outs}</text>
    </g>`;
    const visiblePitches = pitches.filter(p => p.res !== 'IBB');
    const latestText = last ? (last.res === 'IBB' ? '고의4구' : `${last.velo || '—'} km/h · ${last.type}`) : '첫 투구 대기';
    return `<div class="pv-scene" data-side="${side}">
      <svg class="pv-art" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="960" height="760" role="img" aria-labelledby="${id}-title ${id}-desc">
        <title id="${id}-title">${esc(batName)} 타석 · ${esc(side)}타 · 투구 위치</title>
        <desc id="${id}-desc">홈플레이트 뒤에서 본 야구장. 투수 ${esc(pitName)}, 타자 ${esc(batName)}. ${visiblePitches.length}개의 투구 궤적과 번호.${cellText} 자세한 결과와 구속은 아래 투구 기록에서 확인할 수 있습니다.</desc>
        <defs><filter id="${id}-glow" x="-100%" y="-100%" width="300%" height="300%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="6"/></filter></defs>
        ${image(ballpark(parkColor))}${board}${pitcher(pitColor,pitSide==='좌')}<g class="pv-batter">${image(batter(batColor,lefty))}</g>
        <g class="pv-zone" fill="none">
          <path class="pv-zone-shadow" d="${zonePath(.30,.27,.70,.73)}" stroke="#edf7f4" stroke-opacity=".2" stroke-width="2"/>
          <path class="pv-zone-border" d="${zonePath(.33,.3,.67,.7)}" fill="#0a2636" fill-opacity=".16" stroke="#edf7f4" stroke-opacity=".9" stroke-width="3"/>
          ${highlight}<g stroke="#e2efeb" stroke-opacity=".48" stroke-width="2">${grid}</g>
          <path d="M${point(.33,.7)}L376,708M${point(.67,.7)}L584,708" stroke="#e2efeb" stroke-opacity=".22" stroke-dasharray="4 7"/>
        </g><g class="pv-tracks">${tracks}</g><g class="pv-markers">${markers}</g>
      </svg>
    </div>`;
  }

  const outcomes = {K:'삼진 아웃',BB:'볼넷',HBP:'몸에 맞는 공',IBB:'고의4구',GIDP:'병살타',SF:'희생플라이',SAC:'희생번트',FC:'야수선택',BUNT1B:'번트 안타',SB:'도루 성공',CS:'도루 실패',E:'실책 출루',OUT:'아웃','1B':'안타','2B':'2루타','3B':'3루타',HR:'홈런'};
  function result(ab, last, labels) {
    if (ab?.committed && ab.ev) return (outcomes[ab.ev.oc] || ab.ev.desc || '타석 종료') + (ab.ev.runs ? ` · ${ab.ev.runs}득점` : '');
    if (!last) return '타석 준비';
    return labels[last.res] || last.res;
  }

  function pitchList(pitches, colors, labels) {
    if (!pitches.length) return '<div class="pv-pitches-empty">첫 투구를 기다리고 있습니다.</div>';
    let b = 0, s = 0;
    const rows = pitches.map((p, i) => {
      if (p.res === 'B') b++;
      else if (p.res === 'F') s = Math.min(2,s+1);
      else if (p.res === 'S' || p.res === 'SW') s++;
      const end = ['IP','HBP','IBB'].includes(p.res) || b >= 4 || s >= 3;
      return `<tr class="${i===pitches.length-1 ? 'pl-latest' : ''}"><td><span class="pl-no" style="--pitch:${color(colors[p.res])}">${p.res==='IBB' ? '—' : i+1}</span></td><td><b>${esc(labels[p.res] || p.res)}</b></td><td class="pl-velo">${p.velo || '—'}</td><td class="pl-type">${esc(p.type || '—')}</td><td class="pl-cnt" aria-label="${end ? '플레이 종료, ' : ''}${Math.min(4,b)}볼 ${Math.min(3,s)}스트라이크">${p.res==='IBB' ? '—' : `${Math.min(4,b)} − ${Math.min(3,s)}`}</td></tr>`;
    });
    return `<div class="pl-list" tabindex="0" role="region" aria-label="투구 기록, 최신 투구부터"><table class="pv-pitch-table"><caption>투구 기록 <span>${pitches.filter(p=>p.res!=='IBB').length}구 · 최신순</span></caption><thead><tr><th scope="col">구</th><th scope="col">결과</th><th scope="col">km/h</th><th scope="col">구종</th><th scope="col">B − S</th></tr></thead><tbody>${rows.reverse().join('')}</tbody></table></div>`;
  }
  root.PitchView = {scene, pitchList, result, escape:esc};
})(globalThis);
