# first-entry

One-time onboarding/setup page за SoulMatch.

## Files

- `index.html`
- `first-entry.css`
- `first-entry.js`

## One-time logic

JS пази прогреса в localStorage per user:

- current session user: `soulmatch_demo_session`
- done flag: `soulmatch_onboarding_done_<user>`
- last step: `soulmatch_onboarding_last_step_<user>`

Когато user мине setup-а или натисне Skip:

```js
localStorage.setItem("soulmatch_onboarding_done_" + userKey, "true")
```

## Scheme 5 redirect idea

След успешен login в Scheme 5:

```js
const userKey = localStorage.getItem("soulmatch_demo_session") || "guest";
const done = localStorage.getItem("soulmatch_onboarding_done_" + userKey) === "true";
window.location.href = done ? "../scheme3/" : "../first-entry/";
```

## Test

```powershell
npx serve . -l 5500
```

Open:

```text
http://localhost:5500/first-entry/
```
