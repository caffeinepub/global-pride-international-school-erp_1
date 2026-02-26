import { useActor } from "./useActor";
import type { backendInterface } from "../backend";

/**
 * Returns the backend actor instance.
 * Callers should check that actor is not null before invoking methods.
 */
export function useBackend(): { backend: backendInterface | null; isFetching: boolean } {
  const { actor, isFetching } = useActor();
  return { backend: actor, isFetching };
}
