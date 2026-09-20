import { useContext } from "react";
import { ConnectionContext } from "../contexts/DeviceConnectionContext";

export function useConnection() {
  return useContext(ConnectionContext);
}
