import type {Question} from "./CustomLeetcodeApi.ts";
import {RecentSubmission} from "leetcode-query";
import {getAllTasks} from "./CustomLeetcodeApi.ts";
import dayjs, {Dayjs} from "dayjs";
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

export type UserSubmissions = Record<string, RecentSubmission[]>;
export type TaskProgress = {
  isPassed: boolean,
  failNum: number,
  firstAcceptedTime: number // timestamp,
  score: number,
}
// Record of progress per task
export type UserRanking = Record<string, TaskProgress>
// Record of Ranking per user
export type Rankings = Record<string, UserRanking>

export type Competition = {
  startTime: Dayjs;
  durationMs: number;
  titleSlug: string;
  userSubmissions: UserSubmissions;
  currentRankings: Rankings;
  tasks: Question[]
};

export type RunningCompetitions = Record<string, Competition>;

export let runningCompetitions: RunningCompetitions = {};

const threeHours = 1000 * 60 * 60 * 3;

export async function addCompetition(competitionSlug: string, duration?: number) {
  if (runningCompetitions[competitionSlug]) {
    throw new Error('Already exists');
  }

  // TODO: think through date persistence. Either use timestamp(simple) or reviver(hard)
  const competition = {
    startTime: dayjs.utc(),
    durationMs: duration ?? threeHours,
    titleSlug: competitionSlug,
    userSubmissions: {},
    currentRankings: {},
    tasks: [],
  };

  runningCompetitions[competitionSlug] = await updateCompetitionTaskList(competition);
}

// Mutates original object
export async function updateCompetitionTaskList(competition: Competition,): Promise<Competition> {
  try {
    competition.tasks = await getAllTasks(competition.titleSlug);
  } catch (e) {
    throw new Error('Could not load tasks', { cause: e });
  }

  return competition;
}

export async function updateAllCompetitionTaskList(): Promise<RunningCompetitions> {
  await Promise.all(Object.values(runningCompetitions)
    .map((competition) => updateCompetitionTaskList(competition)));
}