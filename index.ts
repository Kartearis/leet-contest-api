import fs from "fs";
import {Hono} from "hono";
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
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

app.get('/current', (c) => {
  return c.json({ hello: 'world'});
});

loadPersistent().then(() => {
  // users = makeProxy(users) as Record<string, User>;
  console.log(`Server is running on port ${port}`)
  serve({
    fetch: app.fetch,
    port
  });
});