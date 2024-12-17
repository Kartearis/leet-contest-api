import axios from "axios";

export type Question = {
  difficulty: 'EASY'|'NORMAL'|'HARD',
  titleSlug: string,
  title: string,
}

type FavouriteQuestionList = {
  hasMore: boolean,
  questions: Question[],
  totalLength: 1,
};

// Gets up to 100 tasks
export async function getAllTasks(competitionSlug: string): Promise<Question[]> {
  const res = await axios.post('https://leetcode.com/graphql/', {
    "query": "\n    query favoriteQuestionList($favoriteSlug: String!, $filter: FavoriteQuestionFilterInput) {\n  favoriteQuestionList(favoriteSlug: $favoriteSlug, filter: $filter) {\n    questions {\n      difficulty\n      id\n      paidOnly\n      questionFrontendId\n      status\n      title\n      titleSlug\n      translatedTitle\n      isInMyFavorites\n      frequency\n      topicTags {\n        name\n        nameTranslated\n        slug\n      }\n    }\n    totalLength\n    hasMore\n  }\n}\n    ",
    "variables": {"favoriteSlug": competitionSlug, "filter": {"positionRoleTagSlug": "", "skip": 0, "limit": 100}},
    "operationName": "favoriteQuestionList"
  });

  const tasks = res.data.data.favoriteQuestionList as FavouriteQuestionList;

  return tasks.questions;
}