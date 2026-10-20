import { onRequest as __api___route___ts_onRequest } from "E:\\project\\imagelibrary\\functions\\api\\[[route]].ts"
import { onRequest as __image___id___ts_onRequest } from "E:\\project\\imagelibrary\\functions\\image\\[[id]].ts"
import { onRequest as __sfx___id___ts_onRequest } from "E:\\project\\imagelibrary\\functions\\sfx\\[[id]].ts"
import { onRequest as __video___id___ts_onRequest } from "E:\\project\\imagelibrary\\functions\\video\\[[id]].ts"

export const routes = [
    {
      routePath: "/api/:route*",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api___route___ts_onRequest],
    },
  {
      routePath: "/image/:id*",
      mountPath: "/image",
      method: "",
      middlewares: [],
      modules: [__image___id___ts_onRequest],
    },
  {
      routePath: "/sfx/:id*",
      mountPath: "/sfx",
      method: "",
      middlewares: [],
      modules: [__sfx___id___ts_onRequest],
    },
  {
      routePath: "/video/:id*",
      mountPath: "/video",
      method: "",
      middlewares: [],
      modules: [__video___id___ts_onRequest],
    },
  ]