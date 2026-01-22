export default function BatteryTab() {
  return (
    <div className="p-6 space-y-6">
      <div className="cyber-border rounded-lg p-6 bg-cyber-darker/30">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-cyber-blue to-cyber-purple bg-clip-text text-transparent">
          Battery Level History
        </h2>
        
        {/* Placeholder for battery graph */}
        <div className="relative h-64 bg-cyber-darker/50 rounded-lg border border-cyber-blue/20 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🔋</div>
            <p className="text-white/60">Battery graph will be displayed here</p>
            <p className="text-sm text-cyber-blue/60 mt-2">Connect your keyboard to view battery history</p>
          </div>
        </div>

        {/* Battery stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="cyber-border rounded-lg p-4 bg-cyber-darker/20 text-center">
            <div className="text-3xl font-bold text-cyber-blue">--</div>
            <div className="text-sm text-white/60 mt-1">Current Level</div>
          </div>
          <div className="cyber-border rounded-lg p-4 bg-cyber-darker/20 text-center">
            <div className="text-3xl font-bold text-cyber-purple">--</div>
            <div className="text-sm text-white/60 mt-1">Average</div>
          </div>
          <div className="cyber-border rounded-lg p-4 bg-cyber-darker/20 text-center">
            <div className="text-3xl font-bold text-cyber-pink">--</div>
            <div className="text-sm text-white/60 mt-1">Min Level</div>
          </div>
        </div>
      </div>
    </div>
  );
}
