export default function HealthTab() {
  return (
    <div className="p-6 space-y-6">
      <div className="cyber-border rounded-lg p-6 bg-cyber-darker/30">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-cyber-blue to-cyber-purple bg-clip-text text-transparent">
          Circuit Health Check
        </h2>
        
        {/* Health status */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="cyber-border rounded-lg p-4 bg-cyber-darker/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                <span className="text-2xl">✓</span>
              </div>
              <div>
                <h3 className="font-semibold text-white">Matrix Status</h3>
                <p className="text-sm text-green-400">All keys functional</p>
              </div>
            </div>
          </div>

          <div className="cyber-border rounded-lg p-4 bg-cyber-darker/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                <span className="text-2xl">✓</span>
              </div>
              <div>
                <h3 className="font-semibold text-white">Power Status</h3>
                <p className="text-sm text-green-400">Normal operation</p>
              </div>
            </div>
          </div>
        </div>

        {/* Diagnostics */}
        <div className="cyber-border rounded-lg p-4 bg-cyber-darker/20">
          <h3 className="font-semibold text-white mb-3">Diagnostics</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 border-b border-white/10">
              <span className="text-white/60">Matrix Scan Rate:</span>
              <span className="text-cyber-blue font-mono">-- Hz</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-white/10">
              <span className="text-white/60">USB/BLE Latency:</span>
              <span className="text-cyber-blue font-mono">-- ms</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-white/60">Last Health Check:</span>
              <span className="text-cyber-blue font-mono">--</span>
            </div>
          </div>
        </div>

        <button className="w-full mt-4 cyber-border rounded-lg p-3 bg-gradient-to-r from-cyber-blue/10 to-cyber-purple/10 
                         hover:from-cyber-blue/20 hover:to-cyber-purple/20 transition-all
                         text-white font-semibold">
          Run Diagnostics
        </button>
      </div>
    </div>
  );
}
