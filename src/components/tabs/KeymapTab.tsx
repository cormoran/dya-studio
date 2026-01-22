export default function KeymapTab() {
  return (
    <div className="p-6 space-y-6">
      <div className="cyber-border rounded-lg p-6 bg-cyber-darker/30">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-cyber-blue to-cyber-purple bg-clip-text text-transparent">
          Keymap Settings
        </h2>
        
        {/* Layer selector */}
        <div className="mb-6">
          <label className="text-sm text-white/60 mb-2 block">Active Layer</label>
          <div className="flex gap-2">
            {[0, 1, 2, 3].map((layer) => (
              <button
                key={layer}
                className="cyber-border rounded-lg px-4 py-2 bg-cyber-darker/20 hover:bg-cyber-blue/10 
                         transition-all text-white font-mono"
              >
                Layer {layer}
              </button>
            ))}
          </div>
        </div>

        {/* Keyboard visualization placeholder */}
        <div className="cyber-border rounded-lg p-8 bg-cyber-darker/20 min-h-[300px] flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">⌨️</div>
            <p className="text-white/60">Keyboard layout visualization</p>
            <p className="text-sm text-cyber-blue/60 mt-2">Connect your keyboard to configure keymaps</p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <button className="cyber-border rounded-lg p-3 bg-cyber-darker/20 hover:bg-cyber-blue/10 
                           transition-all text-white">
            Load Preset
          </button>
          <button className="cyber-border rounded-lg p-3 bg-cyber-darker/20 hover:bg-cyber-purple/10 
                           transition-all text-white">
            Save Layout
          </button>
        </div>
      </div>
    </div>
  );
}
