import uiTemplate from "./Ui.html" with { type: "text" };
import type {Rankings} from "./Competitions.ts";
import type {Question} from "./CustomLeetcodeApi.ts";
import Mustache from 'mustache';
import {sum} from "es-toolkit";

export function renderCompetitionPage(rankings: Rankings, tasks: Question[], title: string): string {
  // TODO: make empty row for users without submissions
  // TODO: optimize
  const rankingsForTemplate = Object.entries(rankings)
    .map(([user, userTasks]) => ({
        user: user,
        total: sum(Object.values(userTasks).map((progress) => progress.score)),
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
    rankings: rankingsForTemplate,
  });
}