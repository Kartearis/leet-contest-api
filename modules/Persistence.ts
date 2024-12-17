import fs from "fs";

// TODO: maybe replace with vue-reactivity
export async function makeShallowProxy(target: Record<string, unknown>, file: string) {
  return new Proxy(target, {
    set(target, prop, value) {
      target[prop as string] = value;
      fs.promises.writeFile(`data/${file}.json`, JSON.stringify(target)).catch(console.log);

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