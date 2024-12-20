import {Hono} from "hono";
import { serve } from '@hono/node-server'
import {loadPersistent, makeShallowProxy} from "./modules/Persistence.ts";
import {
  addCompetition,
  RunningCompetitions,
  runningCompetitions, setRunningCompetitions, startCompetitionStatesIntervalUpdates, triggerProxy,
  updateAllCompetitionTaskList
} from "./modules/Competitions.ts";
import {HTTPException} from "hono/http-exception";
import {renderCompetitionPage} from "./modules/Ui.ts";

const app = new Hono();

const port = 3000;

// TODO: basic auth
app.get('/competitions/create/:slug', async (c) => {
  const { slug } = c.req.param();
  const duration = c.req.query('duration')
    ? Number(c.req.query('duration'))
    : undefined;
  const title = c.req.query('title');

  try {
    await addCompetition(slug, duration, title);
  } catch (e) {
    throw new HTTPException(401, { message: e.toString() })
  }

  return c.json({ created: true, tasks: runningCompetitions[slug].tasks.length });
});

// TODO: currently unused
app.post('/competitions/:slug/register', async (c) => {
  const slug = c.req.param('slug');
  const competition = runningCompetitions[slug];

  if (!competition) {
    throw new HTTPException(404, { message: 'Competition does not exist' });
  }

  const body = await c.req.json();

  if (!body.user) {
    throw new HTTPException(422, { message: 'Malformed request' });
  }

  competition.users.push(String(body.user));

  return c.json({ ok: 'true' });
});

// TODO: drop user parameter and make registration instead
app.get('/competitions/:slug/', async (c) => {
  const slug = c.req.param('slug') as string;
  const user = c.req.query('user');

  if (!user) {
    throw new HTTPException(422, { message: 'User must be provided' });
  }

  const competition = runningCompetitions[slug];

  if (!competition) {
    throw new HTTPException(404, { message: 'Competition does not exist' });
  }

  if (!competition.users.includes(user)) {
    competition.users.push(user);
    console.log('Added user', user);

    triggerProxy(runningCompetitions);
  }

  return c.html(renderCompetitionPage(competition.currentRankings, competition.tasks, competition.title ?? competition.titleSlug));
});

const fiveMinutes = 1000 * 60 * 5;

loadPersistent('runningCompetitions')
  .then((data) => {
  setRunningCompetitions(data as RunningCompetitions ?? {});
  return updateAllCompetitionTaskList();
}).then(() => {
  setRunningCompetitions(makeShallowProxy(runningCompetitions, 'runningCompetitions') as RunningCompetitions);
  startCompetitionStatesIntervalUpdates(fiveMinutes);

  console.log(`Server is running on port ${port}`)
  serve({
    fetch: app.fetch,
    port
  });
});