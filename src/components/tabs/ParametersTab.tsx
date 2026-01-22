export default function ParametersTab() {
  return (
    <div className="p-6 space-y-6">
      <div className="cyber-border rounded-lg p-6 bg-cyber-darker/30">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-cyber-blue to-cyber-purple bg-clip-text text-transparent">
          System Parameters
        </h2>
        
        <div className="space-y-4">
          {/* RGB Settings */}
          <div className="cyber-border rounded-lg p-4 bg-cyber-darker/20">
            <h3 className="font-semibold text-white mb-3">RGB Lighting</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-white/60 mb-2 block">Brightness</label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  defaultValue="80"
                  className="w-full h-2 bg-cyber-darker/50 rounded-lg appearance-none cursor-pointer
                           [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                           [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyber-blue"
                />
              </div>
              <div>
                <label className="text-sm text-white/60 mb-2 block">Animation Speed</label>
                <input 
                  type="range" 
                  min="1" 
                  max="100" 
                  defaultValue="50"
                  className="w-full h-2 bg-cyber-darker/50 rounded-lg appearance-none cursor-pointer
                           [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                           [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyber-purple"
                />
              </div>
            </div>
          </div>

          {/* Power Settings */}
          <div className="cyber-border rounded-lg p-4 bg-cyber-darker/20">
            <h3 className="font-semibold text-white mb-3">Power Management</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-white/60 mb-2 block">Sleep Timeout (minutes)</label>
                <input 
                  type="number" 
                  min="1" 
                  max="60" 
                  defaultValue="10"
                  className="w-full cyber-border rounded-lg p-2 bg-cyber-darker/50 text-white"
                />
              </div>
              <label className="flex items-center justify-between">
                <span className="text-white/60">Deep Sleep Mode</span>
                <input type="checkbox" className="w-5 h-5 rounded border-cyber-blue/30" defaultChecked />
              </label>
            </div>
          </div>

          {/* Firmware */}
          <div className="cyber-border rounded-lg p-4 bg-cyber-darker/20">
            <h3 className="font-semibold text-white mb-3">Firmware</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Current Version</p>
                <p className="text-cyber-blue font-mono">--</p>
              </div>
              <button className="cyber-border rounded-lg px-4 py-2 bg-cyber-blue/10 hover:bg-cyber-blue/20 
                               transition-all text-white text-sm">
                Check for Updates
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
