/**
 * Keyboard Abyss sign-in card at the top of the Import/Export tab.
 *
 * Everything else on the tab is gated on this, so it is the one section that is
 * always expanded and always visible.
 */
import { IconCloud, IconLoader2, IconLogout } from "@tabler/icons-react";
import { useLanguage } from "../../hooks/useLanguage";
import { SectionError } from "../troubleshooting/SectionCard";
import type { UseAbyssAuthReturn } from "../../hooks/useAbyssAuth";
import { abyssHost } from "../../lib/abyss/abyssConfig";

export function AbyssAccountCard({ auth }: { auth: UseAbyssAuthReturn }) {
  const { t } = useLanguage();
  const { isAuthenticated, user, isLoading, error, login, logout } = auth;

  return (
    <div className="glass-card p-6">
      <div className="flex flex-col tablet:flex-row tablet:items-center gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt=""
              className="w-9 h-9 rounded-full flex-shrink-0 object-cover"
            />
          ) : (
            <div className="p-2 rounded-lg bg-[var(--color-electric)]/10 border border-[var(--color-electric)]/20 flex-shrink-0">
              <IconCloud size={20} className="text-[var(--color-electric)]" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-[var(--color-text)] truncate">
              {isAuthenticated
                ? (user?.displayName ?? user?.username ?? t("Keyboard Abyss"))
                : t("Keyboard Abyss")}
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] truncate">
              {isAuthenticated
                ? `@${user?.username ?? ""}`
                : t("Sign in to import and export keymaps.")}
            </p>
          </div>
        </div>

        <div className="tablet:ml-auto flex-shrink-0">
          {isAuthenticated ? (
            <button
              className="btn-ghost border border-[var(--color-border)] flex items-center gap-2 text-sm"
              onClick={() => void logout()}
              disabled={isLoading}
            >
              <IconLogout size={16} />
              {t("Sign out")}
            </button>
          ) : (
            <button
              className="btn-electric flex items-center gap-2 text-sm"
              onClick={() => void login()}
              disabled={isLoading}
            >
              {isLoading ? (
                <IconLoader2 size={16} className="animate-spin" />
              ) : (
                <IconCloud size={16} />
              )}
              {t("Sign in with Abyss")}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <SectionError message={error} />
        </div>
      )}

      {!isAuthenticated && (
        <p className="mt-4 text-xs text-[var(--color-text-muted)]">
          {t(
            "A sign-in window opens at {{host}}. Your session lasts until this tab is closed.",
            { host: abyssHost() },
          )}
        </p>
      )}
    </div>
  );
}
