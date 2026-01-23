import { useState, useEffect, useCallback, useContext, useMemo } from "react";
import { ZMKCustomSubsystem, ZMKAppContext } from "@cormoran/zmk-studio-react-hook";
import {
  Request,
  Response,
} from "../proto/zmk/ble_management/ble_management";

// Subsystem identifier for ZMK BLE management custom protocol
// This matches the identifier registered in the ZMK firmware module
const SUBSYSTEM_IDENTIFIER = "zmk__ble_management";

export interface BLEProfile {
  index: number;
  name: string;
  address: string;
  isConnected: boolean;
  isOpen: boolean;
  isActive: boolean;
}

export interface UseBLEProfilesReturn {
  profiles: BLEProfile[];
  maxProfiles: number;
  isLoading: boolean;
  error: string | null;
  loadProfiles: () => Promise<void>;
  switchProfile: (index: number) => Promise<void>;
  unpairProfile: (index: number) => Promise<void>;
  setProfileName: (index: number, name: string) => Promise<void>;
}

export function useBLEProfiles(): UseBLEProfilesReturn {
  const zmkApp = useContext(ZMKAppContext);
  const [profiles, setProfiles] = useState<BLEProfile[]>([]);
  const [maxProfiles, setMaxProfiles] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize subsystem to avoid unnecessary re-renders
  const subsystem = useMemo(
    () => zmkApp?.findSubsystem(SUBSYSTEM_IDENTIFIER),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [zmkApp?.state.customSubsystems]
  );
  
  // Extract subsystem index as a stable primitive value for dependencies
  const subsystemIndex = subsystem?.index;

  const loadProfiles = useCallback(async () => {
    if (!zmkApp?.state.connection || subsystemIndex === undefined) {
      setError("Not connected to device or subsystem not found");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const service = new ZMKCustomSubsystem(
        zmkApp.state.connection,
        subsystemIndex
      );

      const request = Request.create({
        getProfiles: {},
      });

      const payload = Request.encode(request).finish();
      const responsePayload = await service.callRPC(payload);

      if (responsePayload) {
        const resp = Response.decode(responsePayload);
        if (resp.getProfiles) {
          // The protobuf-generated ProfileInfo matches our BLEProfile interface
          const profiles = resp.getProfiles.profiles.map((p) => ({
            index: p.index,
            name: p.name,
            address: p.address,
            isConnected: p.isConnected,
            isOpen: p.isOpen,
            isActive: p.isActive,
          }));
          setProfiles(profiles);
          setMaxProfiles(resp.getProfiles.maxProfiles);
        } else if (resp.error) {
          setError(resp.error.message);
        }
      }
    } catch (err) {
      console.error("Failed to load profiles:", err);
      setError(
        `Failed to load profiles: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setIsLoading(false);
    }
  }, [zmkApp?.state.connection, subsystemIndex]);

  const switchProfile = useCallback(
    async (index: number) => {
      if (!zmkApp?.state.connection || subsystemIndex === undefined) return;

      setIsLoading(true);
      setError(null);

      try {
        const service = new ZMKCustomSubsystem(
          zmkApp.state.connection,
          subsystemIndex
        );

        const request = Request.create({
          switchProfile: { index },
        });

        const payload = Request.encode(request).finish();
        const responsePayload = await service.callRPC(payload);

        if (responsePayload) {
          const resp = Response.decode(responsePayload);
          if (resp.switchProfile?.success) {
            await loadProfiles();
          } else if (resp.error) {
            setError(resp.error.message);
          } else {
            setError("Failed to switch profile");
          }
        }
      } catch (err) {
        console.error("Failed to switch profile:", err);
        setError(
          `Failed to switch profile: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      } finally {
        setIsLoading(false);
      }
    },
    [zmkApp?.state.connection, subsystemIndex, loadProfiles]
  );

  const unpairProfile = useCallback(
    async (index: number) => {
      if (!zmkApp?.state.connection || subsystemIndex === undefined) return;

      setIsLoading(true);
      setError(null);

      try {
        const service = new ZMKCustomSubsystem(
          zmkApp.state.connection,
          subsystemIndex
        );

        const request = Request.create({
          unpairProfile: { index },
        });

        const payload = Request.encode(request).finish();
        const responsePayload = await service.callRPC(payload);

        if (responsePayload) {
          const resp = Response.decode(responsePayload);
          if (resp.unpairProfile?.success) {
            await loadProfiles();
          } else if (resp.error) {
            setError(resp.error.message);
          } else {
            setError("Failed to unpair profile");
          }
        }
      } catch (err) {
        console.error("Failed to unpair profile:", err);
        setError(
          `Failed to unpair profile: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      } finally {
        setIsLoading(false);
      }
    },
    [zmkApp?.state.connection, subsystemIndex, loadProfiles]
  );

  const setProfileName = useCallback(
    async (index: number, name: string) => {
      if (!zmkApp?.state.connection || subsystemIndex === undefined) return;

      setIsLoading(true);
      setError(null);

      try {
        const service = new ZMKCustomSubsystem(
          zmkApp.state.connection,
          subsystemIndex
        );

        const request = Request.create({
          setProfileName: { index, name },
        });

        const payload = Request.encode(request).finish();
        const responsePayload = await service.callRPC(payload);

        if (responsePayload) {
          const resp = Response.decode(responsePayload);
          if (resp.setProfileName?.success) {
            await loadProfiles();
          } else if (resp.error) {
            setError(resp.error.message);
          } else {
            setError("Failed to set profile name");
          }
        }
      } catch (err) {
        console.error("Failed to set profile name:", err);
        setError(
          `Failed to set profile name: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      } finally {
        setIsLoading(false);
      }
    },
    [zmkApp?.state.connection, subsystemIndex, loadProfiles]
  );

  // Load profiles when connection or subsystem changes
  useEffect(() => {
    if (subsystemIndex !== undefined && zmkApp?.state.connection) {
      loadProfiles();
    }
  }, [subsystemIndex, zmkApp?.state.connection, loadProfiles]);

  return {
    profiles,
    maxProfiles,
    isLoading,
    error,
    loadProfiles,
    switchProfile,
    unpairProfile,
    setProfileName,
  };
}
