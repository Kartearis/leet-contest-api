import type {Question} from "./CustomLeetcodeApi.ts";
import {LeetCode, RecentSubmission} from "leetcode-query";
import {getAllTasks} from "./CustomLeetcodeApi.ts";
import dayjs from "dayjs";
import {keyBy} from "es-toolkit";

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

export type QuestionMap = Record<string, Question>;

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

// TODO: do not duplicate requests about one user if it shared by several competitions
export async function updateAllCompetitionStates(){
  const competitions = Object.values(runningCompetitions);

  competitions.forEach((competition) => {

    // TODO: make concurrent with other competitions
    await updateCompetitionSubmissions(competition);

    // WIP
    // TODO: make global task progress here to pass in score calculation

    competition.users.forEach((user) => {
      competition.tasks.forEach((question) => {
        // TODO: make more effective (make map of submissions by question, then for each
        // calculate firstAcceptedTime and failNum in one pass (isPassed = !!firstAcceptedTime)
        const relevant = competition.userSubmissions[user]
          .filter((sub) => sub.titleSlug === question.titleSlug);

        if (!competition.currentRankings[user]) {
          competition.currentRankings[user] = {};
        }

        // TODO: current user & enum for states, make more effective
        const userTaskProgress =  {
          isPassed: relevant.some((sub) => sub.statusDisplay === "Accepted"),
          failNum: relevant.filter((sub) => sub.statusDisplay !== "Accepted").length,
          firstAcceptedTime: Math.max(...relevant.filter((sub) => sub.statusDisplay === "Accepted")
            .map((sub) => Number(sub.timestamp))),
          score: 0,
        };
        userTaskProgress.score = calcScore(userTaskProgress, {});

        competition.currentRankings[user][question.titleSlug] = userTaskProgress;
      });
    })

  })
}

const leetcodeApi = new LeetCode();

// TODO: implement check if update happened to bail state recalc if none
function updateCompetitionSubmissions(competition: Competition): Promise<unknown> {
  const questionMap = keyBy(competition.tasks, (question) => question.titleSlug);
  return Promise.all(competition.users.map((user) => updateUserSubmissions(competition, user, questionMap)));
}

async function updateUserSubmissions(competition: Competition, user: User, questionMap: QuestionMap): Promise<RecentSubmission[]> {
  const submissions = await leetcodeApi.recent_submissions(user);
  const existingSubmissions = competition.userSubmissions[user];
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
    return existingSubmissions;
  }

  if (!existingSubmissions.length) {
    competition.userSubmissions[user] = validSubmissions;
    return validSubmissions;
  }

  competition.userSubmissions[user].push(...validSubmissions);
  return competition.userSubmissions[user];
}

function calcScore(userTaskProgress: TaskProgress, globalTaskProgress: Record<string, TaskProgress>): number {
  // TODO: Implement score calculation
  return 0;
}