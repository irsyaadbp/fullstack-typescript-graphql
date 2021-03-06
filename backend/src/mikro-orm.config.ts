import { Post } from "./entities/Post";
import { __prod__ } from "./constants";
import { MikroORM } from "@mikro-orm/core";
import path from "path";
import { User } from "./entities/User";

export default {
  migrations: {
    path: path.join(__dirname, "./migrations"), // path to the folder with migrations
    pattern: /^[\w-]+\d+\.[tj]s$/,
  },
  entities: [Post, User],
  type: "postgresql",
  dbName: "lireddit",
  user: "manusia",
  password: "usaha.com",
  debug: !__prod__,
} as Parameters<typeof MikroORM.init>[0];
