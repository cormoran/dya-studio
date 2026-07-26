/**
 * Build-time Keyboard Abyss configuration.
 *
 * Deliberately separate from {@link ./abyssClient.ts}: `App.tsx` only needs to
 * know *whether* Abyss is configured in order to decide if the Import/Export
 * tab exists, and that question should not drag the Abyss SDK into the app
 * shell's module graph.
 */
import { ABYSS_BASE_URL, ABYSS_CLIENT_ID } from "../viteEnv";

export { ABYSS_BASE_URL, ABYSS_CLIENT_ID };

/**
 * Whether this build was given an Abyss OAuth client id.
 *
 * When false the Import/Export tab is not registered at all — its only entry
 * point is a sign-in that could not succeed.
 */
export function isAbyssConfigured(): boolean {
  return ABYSS_CLIENT_ID.length > 0;
}
