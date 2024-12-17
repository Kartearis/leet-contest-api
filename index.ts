import {Hono} from "hono";
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import {LeetCode} from "leetcode-query";
import {loadPersistent, makeShallowProxy} from "./modules/Persistence.ts";
import {
  addCompetition,
  RunningCompetitions,
  runningCompetitions,
  updateAllCompetitionTaskList
} from "./modules/Competitions.ts";
import {HTTPException} from "hono/http-exception";

// import {serveStatic} from "@hono/node-server/serve-static";
// import {debounce} from "es-toolkit";
//




// const onCodeUpdate = debounce(
//   (value) => render(value, false)
//     .then((image) => compare(image, './static/challenge-1.png'))
//     .then((progress) => challenges.challenge && (challenges.challenge.similarity = progress))
//   , 200);



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
const leetcodeApi = new LeetCode();

const taskListSlug = 'a1ty5dsi';





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

// WIP (not working due to updates)
// TODO state updates should really be async of frontend update requests. Maybe in worker thread?
app.get('/competitions/:slug', async (c) => {
  const slug = c.req.param['slug'];
  const allTasks = runningCompetitions[slug].tasks;
  // TODO: This should be done for each challenger
  // TODO: Check acceptable rate to not get blocked. Once per minute / 5minutes?
  const submissions = await leetcodeApi.recent_submissions('kartearis');
  console.log(submissions);
  // TODO: This should be accumulative global with persistence in case of failure. Init & type
  const currentState = { 'kartearis': {}};
  allTasks.forEach((question) => {
    // TODO: make more effective, better build map with all filters before calculating state
    const relevant = submissions
      .filter((sub) => sub.titleSlug === question.titleSlug);

    // TODO: current user & enum for states
    currentState['kartearis'][question.titleSlug] = {
      isPassed: relevant.some((sub) => sub.statusDisplay === "Accepted"),
      failNum: relevant.filter((sub) => sub.statusDisplay !== "Accepted").length,
      firstAcceptedTime: Math.max(...relevant.filter((sub) => sub.statusDisplay === "Accepted")
        .map((sub) => Number(sub.timestamp)))
    }
  });

  return c.json(currentState);
});

// TODO: ref
loadPersistent('runningCompetitions')
  .then((data) => {
  runningCompetitions = data as RunningCompetitions;
  return updateAllCompetitionTaskList();
}).then(() => {
  runningCompetitions = makeShallowProxy(runningCompetitions, 'runningCompetitions') as RunningCompetitions;
  console.log(`Server is running on port ${port}`)
  serve({
    fetch: app.fetch,
    port
  });
});