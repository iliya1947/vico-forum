# Responsive layout regressions

These opt-in engineering checks use Chromium layout and hit testing of the actual shared
components and stylesheet. They cover RES-UI-01, CODE-HISTORY-01 and M-M07 separately.
They do not assert CSS text or use jsdom geometry. The preview supplies synthetic identities;
TopicView history uses a fixed in-memory Router action, not real permissions/database reads.
History labels stay English; its locale/direction/date formatting vary. Header/editor use
actual English, Russian and Hebrew preview resources. This is not owner visual acceptance.

Prerequisites: repository's pinned Node/pnpm and installed dependencies, Python 3,
Playwright Python 1.62.0 and Chromium. No new application/npm dependency is required.
In a browser-test environment, install the Python tool with `python -m pip install playwright==1.62.0`
and install Chromium using the platform package manager (or set `CHROMIUM` to its executable).

From the repository root, with the pinned Node on PATH:

```sh
python tests/browser/responsive/check.py --output /tmp/vico-responsive-results
```

`--smoke` runs the three original EN/320 reproductions. The full matrix includes
320/360/390, both sides of 480/704/768 breakpoints and desktop1280, guest/user/manager header,
long identity, Simple/Advanced in-page/fullscreen menus and two raw history revisions.
More is opened by a native click and keyboard; 320px cases also click a nested emoji
and resize the viewport while the menu is open.
The script builds a disposable fixture with existing Vite, starts only a loopback HTTP
server, rejects external/mutating requests and closes browser/server/temp build afterward.
JSON records every case; failures produce screenshots and a nonzero exit status.
Keep output outside the checkout. Backend/native tests and normal CI remain separate gates.
