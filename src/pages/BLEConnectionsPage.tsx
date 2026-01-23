import { useState, useContext } from "react";
import {
  IconBluetooth,
  IconLink,
  IconLinkOff,
  IconEdit,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import { useBLEProfiles } from "../hooks/useBLEProfiles";
import { ConnectionContext } from "../components/DeviceConnection";

export function BLEConnectionsPage() {
  const connection = useContext(ConnectionContext);
  const {
    profiles,
    isLoading,
    error,
    switchProfile,
    unpairProfile,
    setProfileName,
    loadProfiles,
  } = useBLEProfiles();

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const startEditing = (index: number, currentName: string) => {
    setEditingIndex(index);
    setEditName(currentName);
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditName("");
  };

  const saveProfileName = async (index: number) => {
    await setProfileName(index, editName);
    setEditingIndex(null);
    setEditName("");
  };

  const handleUnpair = async (index: number) => {
    if (confirm("Are you sure you want to unpair this device?")) {
      await unpairProfile(index);
    }
  };

  const handleSwitch = async (index: number) => {
    await switchProfile(index);
  };

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-[var(--color-cyber)]/10 border border-[var(--color-cyber)]/20">
            <IconBluetooth size={24} className="text-[var(--color-cyber)]" />
          </div>
          <div>
            <h1 className="text-xl font-medium text-[var(--color-text)]">
              BLE Connections
            </h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              Manage Bluetooth upstream connections
            </p>
          </div>
        </div>

        {/* Show message when not connected */}
        {!connection.isConnected && (
          <div className="glass-card p-6 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">
              Connect your keyboard to manage BLE profiles
            </p>
          </div>
        )}

        {/* Show error if any */}
        {error && (
          <div className="glass-card p-4 mb-4 border-red-500/20 bg-red-500/10">
            <p className="text-sm text-red-400">⚠️ {error}</p>
          </div>
        )}

        {/* Connection Slots */}
        {connection.isConnected && (
          <>
            {isLoading && profiles.length === 0 && (
              <div className="glass-card p-6 text-center">
                <p className="text-sm text-[var(--color-text-muted)]">
                  ⏳ Loading profiles...
                </p>
              </div>
            )}

            <div className="space-y-4">
              {profiles.map((profile) => (
                <div
                  key={profile.index}
                  className={`glass-card p-4 flex items-center justify-between ${
                    profile.isActive
                      ? "border-[var(--color-cyber)]/40 bg-[var(--color-cyber)]/5"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        profile.isActive
                          ? "bg-[var(--color-cyber)]/20 border border-[var(--color-cyber)]/40"
                          : "bg-[var(--color-border)] border border-[var(--color-border-hover)]"
                      }`}
                    >
                      <span
                        className={`text-sm font-mono ${
                          profile.isActive
                            ? "text-[var(--color-cyber)]"
                            : "text-[var(--color-text-muted)]"
                        }`}
                      >
                        {profile.index + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      {editingIndex === profile.index ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Device name"
                            maxLength={31} // ZMK firmware constraint for BLE name storage
                            className="input-field flex-1 text-sm"
                            disabled={isLoading}
                          />
                          <button
                            className="btn-ghost p-2"
                            onClick={() => saveProfileName(profile.index)}
                            disabled={isLoading}
                            aria-label="Save name"
                          >
                            <IconCheck size={16} />
                          </button>
                          <button
                            className="btn-ghost p-2"
                            onClick={cancelEditing}
                            disabled={isLoading}
                            aria-label="Cancel editing"
                          >
                            <IconX size={16} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                              {profile.name || `Profile ${profile.index + 1}`}
                            </p>
                            {!profile.isOpen && (
                              <button
                                className="btn-ghost p-1 opacity-50 hover:opacity-100"
                                onClick={() =>
                                  startEditing(profile.index, profile.name)
                                }
                                disabled={isLoading}
                                aria-label="Edit name"
                              >
                                <IconEdit size={14} />
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-[var(--color-text-muted)] truncate">
                            {profile.isOpen
                              ? "Not paired"
                              : profile.isConnected
                                ? `Connected • ${profile.address}`
                                : profile.address || "No address"}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!profile.isOpen && (
                      <button
                        className="btn-ghost text-sm flex items-center gap-1.5 text-red-400 hover:text-red-300"
                        onClick={() => handleUnpair(profile.index)}
                        disabled={isLoading}
                      >
                        <IconLinkOff size={16} />
                        <span className="hidden tablet:inline">Unpair</span>
                      </button>
                    )}
                    {!profile.isActive ? (
                      <button
                        className="btn-ghost text-sm flex items-center gap-1.5"
                        onClick={() => handleSwitch(profile.index)}
                        disabled={isLoading}
                      >
                        <IconLink size={16} />
                        <span className="hidden tablet:inline">Switch</span>
                      </button>
                    ) : (
                      <div className="w-[72px]" aria-hidden="true"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Refresh Button */}
            {profiles.length > 0 && (
              <div className="mt-6 flex justify-center">
                <button
                  className="btn-ghost text-sm"
                  onClick={loadProfiles}
                  disabled={isLoading}
                >
                  Refresh
                </button>
              </div>
            )}
          </>
        )}

        {/* Info */}
        <div className="mt-8 p-4 rounded-lg bg-[var(--color-border)] border border-[var(--color-border-hover)]">
          <p className="text-xs text-[var(--color-text-muted)]">
            Connect your keyboard to manage BLE profiles. Each profile can be
            paired to a different host device. The active profile is highlighted
            with a colored border.
          </p>
        </div>
      </div>
    </div>
  );
}
