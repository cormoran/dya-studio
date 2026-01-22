export default function TrackballTab() {
  return (
    <div className="p-6 space-y-6">
      <div className="cyber-border rounded-lg p-6 bg-cyber-darker/30">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-cyber-blue to-cyber-purple bg-clip-text text-transparent">
          Trackball Adjustments
        </h2>
        
        {/* Sensitivity controls */}
        <div className="space-y-6">
          <div>
            <label className="text-sm text-white/60 mb-2 block">Pointer Sensitivity</label>
            <input 
              type="range" 
              min="1" 
              max="100" 
              defaultValue="50"
              className="w-full h-2 bg-cyber-darker/50 rounded-lg appearance-none cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                       [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyber-blue"
            />
            <div className="flex justify-between text-xs text-white/40 mt-1">
              <span>Slow</span>
              <span>Fast</span>
            </div>
          </div>

          <div>
            <label className="text-sm text-white/60 mb-2 block">Scroll Speed</label>
            <input 
              type="range" 
              min="1" 
              max="100" 
              defaultValue="50"
              className="w-full h-2 bg-cyber-darker/50 rounded-lg appearance-none cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                       [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyber-purple"
            />
            <div className="flex justify-between text-xs text-white/40 mt-1">
              <span>Slow</span>
              <span>Fast</span>
            </div>
          </div>

          <div>
            <label className="text-sm text-white/60 mb-2 block">Acceleration</label>
            <input 
              type="range" 
              min="0" 
              max="100" 
              defaultValue="30"
              className="w-full h-2 bg-cyber-darker/50 rounded-lg appearance-none cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                       [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyber-pink"
            />
            <div className="flex justify-between text-xs text-white/40 mt-1">
              <span>None</span>
              <span>Max</span>
            </div>
          </div>
        </div>

        {/* Advanced settings */}
        <div className="cyber-border rounded-lg p-4 bg-cyber-darker/20 mt-6">
          <h3 className="font-semibold text-white mb-3">Advanced Settings</h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-white/60">Invert Scroll Direction</span>
              <input type="checkbox" className="w-5 h-5 rounded border-cyber-blue/30" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-white/60">Enable Smooth Scrolling</span>
              <input type="checkbox" className="w-5 h-5 rounded border-cyber-blue/30" defaultChecked />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
