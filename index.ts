import fs from "fs";
import {Hono} from "hono";
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { LeetCode } from "leetcode-query";
import axios from "axios";

// import {serveStatic} from "@hono/node-server/serve-static";
// import {debounce} from "es-toolkit";
//
async function loadPersistent() {
  // try {
  //   users = JSON.parse((await fs.promises.readFile('data/users.json')).toString());
  // } catch (e) {
  //   users = {};
  // }
}

const app = new Hono()

const leetcode = new LeetCode();

app.use(
  '*',
  cors({
    origin: '*',
    allowHeaders: ['*'],
    allowMethods: ['*'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  })
)

const port = 3000;
const leetcodeApi = new LeetCode();

const taskListSlug = 'a1ty5dsi';

type Question = {
  difficulty: 'EASY'|'NORMAL'|'HARD',
  titleSlug: string,
  title: string,
}

type FavouriteQuestionList = {
  hasMore: boolean,
  questions: Question[],
  totalLength: 1,
};

async function getAllTasks() {
  const res = await axios.post('https://leetcode.com/graphql/', {
    "query": "\n    query favoriteQuestionList($favoriteSlug: String!, $filter: FavoriteQuestionFilterInput) {\n  favoriteQuestionList(favoriteSlug: $favoriteSlug, filter: $filter) {\n    questions {\n      difficulty\n      id\n      paidOnly\n      questionFrontendId\n      status\n      title\n      titleSlug\n      translatedTitle\n      isInMyFavorites\n      frequency\n      topicTags {\n        name\n        nameTranslated\n        slug\n      }\n    }\n    totalLength\n    hasMore\n  }\n}\n    ",
    "variables": {"favoriteSlug": taskListSlug, "filter": {"positionRoleTagSlug": "", "skip": 0, "limit": 100}},
    "operationName": "favoriteQuestionList"
  });

  const tasks = res.data.data.favoriteQuestionList as FavouriteQuestionList;

  return tasks;
}

// TODO state updates should really be async of frontend update requests. Maybe in worker thread?
app.get('/current', async (c) => {
  // TODO: Cache so as to not request every time. At minimum - ask once per `run serve`
  const allTasks = await getAllTasks();
  // TODO: This should be done for each challenger
  // TODO: Check acceptable rate to not get blocked. Once per minute / 5minutes?
  const submissions = await leetcodeApi.recent_submissions('kartearis');
  console.log(submissions);
  // TODO: This should be accumulative global with persistence in case of failure. Init & type
  const currentState = { 'kartearis': {}};
  allTasks.questions.forEach((question) => {
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

loadPersistent().then(() => {
  // users = makeProxy(users) as Record<string, User>;
  console.log(`Server is running on port ${port}`)
  serve({
    fetch: app.fetch,
    port
  });
});