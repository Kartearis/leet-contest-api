import {Hono} from "hono";
import { serve } from '@hono/node-server'
import {loadPersistent, makeShallowProxy} from "./modules/Persistence.ts";
import {
  addCompetition,
  RunningCompetitions,
  runningCompetitions, startCompetitionStatesIntervalUpdates,
  updateAllCompetitionTaskList
} from "./modules/Competitions.ts";
import {HTTPException} from "hono/http-exception";

const app = new Hono();

// app.use(
//   '*',
//   cors({
//     origin: '*',
//     allowHeaders: ['*'],
//     allowMethods: ['*'],
//     exposeHeaders: ['Content-Length'],
//     maxAge: 600,
//     credentials: true,
//   })
// )

const port = 3000;

// TODO: basic auth
app.get('/competitions/create/:slug', async (c) => {
  const { slug } = c.req.param();
  const duration = c.req.query['duration'] && Number(c.req.query['duration']);

  try {
    await addCompetition(slug, duration);
  } catch (e) {
    throw new HTTPException(401, { message: e.toString() })
  }

  return c.json({ created: true, tasks: runningCompetitions[slug].tasks.length });
});

app.get('/competitions/:slug', async (c) => {
  const slug = c.req.param['slug'];

  const competitionState = runningCompetitions[slug].currentRankings;

  return c.json({});
});

const fiveMinutes = 1000 * 60 * 5;

loadPersistent('runningCompetitions')
  .then((data) => {
  runningCompetitions = data as RunningCompetitions;
  return updateAllCompetitionTaskList();
}).then(() => {
  runningCompetitions = makeShallowProxy(runningCompetitions, 'runningCompetitions') as RunningCompetitions;
  startCompetitionStatesIntervalUpdates(fiveMinutes);

  console.log(`Server is running on port ${port}`)
  serve({
    fetch: app.fetch,
    port
  });
});