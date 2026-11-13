import type {
  ChallengeRepository,
  SessionRepository,
  StoredSession,
  StoredWalletAuthChallenge,
} from "@paralel/auth";
import type {
  Hex,
} from "viem";

import type { Env } from "../../env";
import {
  createChallengeRepository,
} from "./challenge-repository";

export interface DeferredChallengeRepository {
  repository: ChallengeRepository;
  wasConsumed(): boolean;
}

export const createDeferredChallengeRepository = (
  env: Env,
): DeferredChallengeRepository => {
  const source =
    createChallengeRepository(env);

  let consumed = false;

  return {
    repository: {
      create:
        source.create.bind(source),

      findById:
        source.findById.bind(source),

      async consume(): Promise<boolean> {
        if (consumed) {
          return false;
        }

        consumed = true;
        return true;
      },

      revoke:
        source.revoke.bind(source),
    },

    wasConsumed(): boolean {
      return consumed;
    },
  };
};

export interface CapturedSessionRepository {
  repository: SessionRepository;
  getCapturedSession():
    StoredSession | null;
}

export const createCapturedSessionRepository =
  (): CapturedSessionRepository => {
    let captured:
      StoredSession | null = null;

    return {
      repository: {
        async create(
          session: StoredSession,
        ): Promise<void> {
          if (captured !== null) {
            throw new Error(
              "Session repository captured more than one session.",
            );
          }

          captured = session;
        },

        async findByTokenHash(
          _tokenHash: Hex,
        ): Promise<StoredSession | null> {
          return null;
        },

        async touch(): Promise<boolean> {
          return false;
        },

        async revoke(): Promise<boolean> {
          return false;
        },

        async revokeAllForWallet():
          Promise<number> {
          return 0;
        },
      },

      getCapturedSession():
        StoredSession | null {
        return captured;
      },
    };
  };
