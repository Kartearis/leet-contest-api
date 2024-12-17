# leet-contest-api

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.1.38. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

## Plan

- admin commands to create competition based on provided list name/slug. Maybe 'GET /competitions/create/:slug/?params' + auth. Later should be made into cli or admin ui
- competition room (should be scalable for parallel competitions). 'GET /competitions/:slug'. After entering should be able to register with leetcode name (stored in session)
  - I guess session is not even required actually - but why not
- Competition state updates should be done on interval (basic) or in separate worker (better)
  - On data pull all submissions of a user should be compared with previous and new ones appended.
  - If there are new submissions - update state
  - State and all users' submissions should be persistent in case of failure
- Frontend is served by hono and is mainly static now
- Competition should have duration, provided on start. It determines end time based on start time (comp start time). Submissions before start time are not used
