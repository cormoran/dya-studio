export default function ConnectionTab() {
  return (
    <div className="p-6 space-y-6">
      <div className="cyber-border rounded-lg p-6 bg-cyber-darker/30">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-cyber-blue to-cyber-purple bg-clip-text text-transparent">
          BLE Connection
        </h2>
        
        <div className="space-y-4">
          {/* Connection status */}
          <div className="cyber-border rounded-lg p-4 bg-cyber-darker/20">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">Connection Status</h3>
                <p className="text-sm text-white/60 mt-1">Not connected</p>
              </div>
              <div className="w-3 h-3 rounded-full bg-red-500 animate-glow-pulse"></div>
            </div>
          </div>

          {/* Connect button */}
          <button className="w-full cyber-border rounded-lg p-4 bg-gradient-to-r from-cyber-blue/10 to-cyber-purple/10 
                           hover:from-cyber-blue/20 hover:to-cyber-purple/20 transition-all
                           text-white font-semibold tracking-wide">
            Connect to Keyboard
          </button>

          {/* Device info */}
          <div className="cyber-border rounded-lg p-4 bg-cyber-darker/20">
            <h3 className="font-semibold text-white mb-3">Device Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/60">Device Name:</span>
                <span className="text-cyber-blue">--</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Signal Strength:</span>
                <span className="text-cyber-blue">--</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Firmware Version:</span>
                <span className="text-cyber-blue">--</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
