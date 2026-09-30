# 3D style exploration

A proposed 3D art direction for the gLOWCOST explainer. It uses the same palette, fonts, chamfered panels, CH labels and real minute counts as the 2D video, staged as lit, glowing objects in three.js (WebGL) with bloom. These are stills for review; the finished video is still 2D.

- `contact-sheet.jpg`: two frames from each of the six scenes (air shower, time dilation, scintillator → fibre → SiPM, coincidence stack, weather ribbons, phone + title).
- `iphone-states.jpg` and `iphone-*.png`: the phone screen at device resolution (1179 × 2556, iPhone 15 Pro at 3×), drawn from the SwiftUI source in the iOS app (`LiveActivityWidget.swift`) with the same point sizes, spacing and order:
  - **Lock Screen:** the Live Activity banner. The Dynamic Island shows no content on the Lock Screen, as on a real iPhone.
  - **Compact:** inside another app, the glyph on the left of the Island and the total on the right.
  - **Expanded:** long-pressed, the leading, trailing and bottom regions with the Stop button, drawn over the app.

  System chrome (clock, date, status icons) uses Raleway, because SF Pro can't be bundled. The app screen behind the Island is the design render of the Now screen.

Rebuild: `node scripts/contact3d.js` writes `build/3d/`. The scenes are in `src3d/world.js`, the phone screens in `src3d/iphone.js`. Each frame takes about 1 s in software WebGL.
