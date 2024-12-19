import fs from "fs";
import {debounce} from "es-toolkit";

// TODO: maybe replace with vue-reactivity
export function makeShallowProxy(target: Record<string, unknown>, file: string) {
  console.log('Make proxy for', target);

  const debouncedWrite = debounce(
    (fileName: string, data: unknown) => fs.promises
      .writeFile(fileName, JSON.stringify(data)).catch(console.log),
    500
  );

  return new Proxy(target, {
    set(target, prop, value) {
      target[prop as string] = value;
      console.log('proxy triggered');
      debouncedWrite(`data/${file}.json`, target);

      return true;
    },
  })
};

export async function loadPersistent(file: string): Promise<unknown> {
  try {
    return JSON.parse((await fs.promises.readFile('data/runningCompetitions.json')).toString());
  } catch (e) {
    return {};
  }
}