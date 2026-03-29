import type { ProblemDetails } from './problem-details';

export type ActionResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      problem: ProblemDetails;
    };
