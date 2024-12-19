import type {Question} from "./CustomLeetcodeApi.ts";
import {LeetCode, RecentSubmission} from "leetcode-query";
import {getAllTasks} from "./CustomLeetcodeApi.ts";
import dayjs from "dayjs";
import {keyBy} from "es-toolkit";

export enum SubmissionStatus {
  ACCEPTED = "Accepted",
  WRONG = "Wrong Answer",
  TIME_LIMIT = "Time Limit Exceeded",
  MEMORY_LIMIT = "Memory Limit Exceeded",
  OUTPUT_LIMIT = "Output Limit Exceeded",
  COMPILE_ERROR = "Compile Error",
  RUNTIME_ERROR = "Runtime Error"
}
export type UserSubmissions = Record<string, RecentSubmission[] | undefined>;
export type TaskProgress = {
  isPassed: boolean,
  failNum: number,
  firstAcceptedTime: number // timestamp,
  score: number,
}
type QuestionState = {
  solved: number
};
// Record of progress per task
export type UserRanking = Record<string, TaskProgress>
// Record of Ranking per user
export type Rankings = Record<string, UserRanking>

export type QuestionMap = Record<string, Question | undefined>;

export type User = string;

export type Competition = {
  startTime: number; // second timestamp in utc (unix timestamp)
  durationS: number;
  titleSlug: string;
  users: User[];
  userSubmissions: UserSubmissions;
  currentRankings: Rankings;
  tasks: Question[]
};

export type RunningCompetitions = Record<string, Competition>;

export let runningCompetitions: RunningCompetitions = {};

export function setRunningCompetitions(data: RunningCompetitions) {
  runningCompetitions = data;
}

const threeHours = 60 * 60 * 3;

export async function addCompetition(competitionSlug: string, duration?: number) {
  if (runningCompetitions[competitionSlug]) {
    throw new Error('Already exists');
  }

  // TODO: think through date persistence. Either use timestamp(simple) or reviver(hard)
  const competition = {
    startTime: dayjs().unix(),
    durationS: duration ?? threeHours,
    titleSlug: competitionSlug,
    userSubmissions: {},
    currentRankings: {},
    tasks: [],
    users: [],
  };

  console.log('Add to', runningCompetitions);
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

// TODO: do not duplicate requests about one user if can be shared by several competitions
export async function updateAllCompetitionStates(){
  const competitions = Object.values(runningCompetitions);
  console.log('Update all competitions');

  await Promise.all(competitions.map(async (competition) => {
    const currentTime = dayjs().unix();

    if (currentTime > competition.startTime + competition.durationS) {
      return;
    }

    // TODO: make concurrent with other competitions!!
    // TODO: fix score not updating to last state
    const submissionsUpdated = await updateCompetitionSubmissions(competition);

    if (!submissionsUpdated) {
      return;
    }

    const globalQuestionState = calcGlobalQuestionState(competition);

    competition.users.forEach((user) => {
      const submissionsByQuestions = userSubmissionByTask(competition.userSubmissions[user] ?? []);

      competition.tasks.forEach((question) => {
        const relevant = submissionsByQuestions[question.titleSlug] ?? [];
        const acceptedSubmissions = relevant.filter((submission) => submission.statusDisplay === SubmissionStatus.ACCEPTED);

        if (!competition.currentRankings[user]) {
          competition.currentRankings[user] = {};
        }

        const userTaskProgress: TaskProgress =  {
          isPassed: !!acceptedSubmissions.length,
          failNum: relevant.length - acceptedSubmissions.length,
          firstAcceptedTime: acceptedSubmissions.length && Math.min(...acceptedSubmissions.map((sub) => Number(sub.timestamp))),
          score: 0,
        };
        userTaskProgress.score = calcScore(userTaskProgress, globalQuestionState[question.titleSlug]);

        competition.currentRankings[user][question.titleSlug] = userTaskProgress;
      });
    })

  }));
}

function userSubmissionByTask(userSubmission: RecentSubmission[]): Record<string, RecentSubmission[]> {
  return userSubmission
    .reduce((acc, submission) => {
      if (!acc[submission.titleSlug]) {
        acc[submission.titleSlug] = [];
      }

      acc[submission.titleSlug].push(submission);
      return acc;
    }, {});
}

function calcGlobalQuestionState(competition: Competition): Record<string, QuestionState> {
  const state: Record<string, QuestionState> = {};
  Object.values(competition.currentRankings).forEach((userSubmissionState) => {
    Object.entries(userSubmissionState).forEach(([task, taskProgress]) => {
      if (!state[task]) {
        state[task] = { solved: 0 };
      }
      state[task].solved += Number(taskProgress.isPassed);
    });
  });

  return state;
}

const leetcodeApi = new LeetCode();

function updateCompetitionSubmissions(competition: Competition): Promise<boolean> {
  const questionMap = keyBy(competition.tasks, (question) => question.titleSlug);
  return Promise.all(competition.users.map((user) => updateUserSubmissions(competition, user, questionMap)))
    .then((results) => results.some(x => x));
}

async function updateUserSubmissions(competition: Competition, user: User, questionMap: QuestionMap): Promise<boolean> {
  const submissions = await leetcodeApi.recent_submissions(user);
  const existingSubmissions = competition.userSubmissions[user] ?? [];
  const competitionEnd = competition.startTime + competition.durationS;
  const lastSubmissionTimestamp = existingSubmissions.length
    ? Number(existingSubmissions[existingSubmissions.length - 1].timestamp)
    : null;

  // Filter out all submission out of competition and not from task list and before last saved one
  const validSubmissions = submissions
    .filter((submission) => Number(submission.timestamp) > (lastSubmissionTimestamp ?? competition.startTime)
      && Number(submission.timestamp) <= competitionEnd
      && questionMap[submission.titleSlug]);

  if (!validSubmissions.length) {
    return false;
  }

  if (!existingSubmissions.length || !competition.userSubmissions[user]) {
    competition.userSubmissions[user] = validSubmissions;
    return true;
  }

  competition.userSubmissions[user]?.push(...validSubmissions);
  return true;
}

let intervalId: ReturnType<typeof setInterval> | null = null;

function triggerProxy(proxy: RunningCompetitions) {
  const anyKey: string | undefined = Object.keys(proxy)[0];

  if (anyKey) {
    proxy[anyKey] = proxy[anyKey];
  }
}

// TODO: move to worker thread (or threads)
export function startCompetitionStatesIntervalUpdates(intervalMs: number) {
  intervalId = setInterval(() => updateAllCompetitionStates().then(() => triggerProxy(runningCompetitions)), intervalMs);
}

function calcScore(userTaskProgress: TaskProgress, globalProgressOnTask: QuestionState): number {
  return userTaskProgress.isPassed
    ? Math.max(100 * (1 - 0.1 * Math.max(globalProgressOnTask.solved - 3, 0)) + (-2 * userTaskProgress.failNum), 0)
    : 0;
}