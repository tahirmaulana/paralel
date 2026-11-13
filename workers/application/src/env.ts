export interface Env {
  APP_ENV: string;

  /*
   * Runtime bindings will be added only when each migrated API dependency
   * has been proven from the canonical repository state.
   *
   * Secrets Store bindings are intentionally not declared in this first
   * bootstrap slice.
   */
}
