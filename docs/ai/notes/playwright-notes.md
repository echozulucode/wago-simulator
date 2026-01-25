Ahh, that message is the smoking gun:

```text
2 failed
  [chromium] › tests\app.spec.ts:48:3 › GitScribe Features › settings section with prompt template is present
  [chromium] › tests\app.spec.ts:59:3 › GitScribe Features › ollama status UI is present ──────

Serving HTML report at http://localhost:57549. Press Ctrl+C to quit.
```

This means:

- Your Playwright **test run finished** (2 failures).
- Then Playwright started an **HTTP server for the HTML report**.
- That server runs until _you_ press `Ctrl+C`.

So from the OS (and from Gemini’s POV), the command is _still running_ and will **never return on its own**. That’s why Gemini “stalls”: it’s just waiting for the command to exit, but Playwright is intentionally keeping it alive.

---

## Why this happens

That exact `Serving HTML report at ... Press Ctrl+C to quit.` line comes from:

- `npx playwright show-report`, **or**
- some script that calls `show-report` at the end,

which starts a tiny web server so you can browse the report. It doesn’t exit automatically.

So your flow is probably one of:

- `npm test` runs `playwright test` **and then** `playwright show-report`.
- Or you’re manually running `npx playwright show-report` after tests.

Either way, as soon as `show-report` runs, the process blocks.

---

## How to fix it

### 1. Separate “run tests” from “show report”

Make sure your **test command** just runs tests and exits.

In `package.json`, something like:

```jsonc
{
  "scripts": {
    "test:e2e": "playwright test --reporter=line", // or line, dot, list, etc.
    "test:e2e:report": "playwright show-report" // only run this when you want to view
  }
}
```

Key points:

- Don’t chain `show-report` directly onto the main test script that Gemini runs.
- Gemini (or you) should invoke only `npm run test:e2e` (or direct `npx playwright test ...`) when you want a clean, non-blocking run.

Then your workflow is:

1. In Gemini: “Run `npm run test:e2e` and summarize failures.”
2. In your terminal (outside Gemini), _if you want the HTML UI_: `npm run test:e2e:report`.

---

### 2. Check that you’re not using UI/debug modes

Anything that starts a **server or UI** will also block:

- `npx playwright test --ui`
- `PWDEBUG=1`
- `npx playwright show-report`

When running tests via Gemini, stick to a non-interactive command:

```bash
npx playwright test --reporter=line
# or
npm run test:e2e
```

No `--ui`, no `show-report` in that same command.

---

### 3. Confirm behavior in a plain shell

In a normal terminal (no Gemini), run exactly what Gemini is running. For example:

```bash
npm run test:e2e
```

You should see:

- Test output,
- Then the process **returns to the shell prompt**.

If you still see:

```text
Serving HTML report at http://localhost:57549. Press Ctrl+C to quit.
```

then there’s still a `show-report` or similar in that script. Remove/move it.
