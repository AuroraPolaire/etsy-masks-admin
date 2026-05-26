import backendWorker from '../../worker/src/index';

import type { Env } from '../../worker/src/types';

type PagesFunctionContext = {
  request: Request;
  env: Env;
};

export const onRequest = (context: PagesFunctionContext): Promise<Response> =>
  backendWorker.fetch(context.request, context.env);
