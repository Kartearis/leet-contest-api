import uiTemplate from "./Ui.html" with { type: "text" };
import type {Rankings} from "./Competitions.ts";
import type {Question} from "./CustomLeetcodeApi.ts";
import Mustache from 'mustache';

export function renderCompetitionPage(rankings: Rankings, tasks: Question[], title: string): string {
  // TODO: make empty row for users without submissions
  const rankingsForTemplate = Object.entries(rankings)
    .map(([user, userTasks]) => ({
      user: user,
      tasks: tasks.map((task) => ({
        pass: userTasks[task.titleSlug]?.isPassed === true
          ? 'pass'
          : userTasks[task.titleSlug]?.failNum
            ? 'fail'
            : '',
        score: userTasks[task.titleSlug]?.score || ''
      }))
    }));

  return Mustache.render(uiTemplate as string, {
    title,
    tasks,
    rankings: rankingsForTemplate
  });
}