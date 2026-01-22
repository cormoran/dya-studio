import * as Tabs from '@radix-ui/react-tabs';
import { motion } from 'framer-motion';
import { 
  ActivityLogIcon, 
  BlendingModeIcon, 
  ComponentInstanceIcon, 
  GearIcon, 
  MixIcon, 
  DotFilledIcon 
} from '@radix-ui/react-icons';
import BatteryTab from './tabs/BatteryTab';
import ConnectionTab from './tabs/ConnectionTab';
import HealthTab from './tabs/HealthTab';
import KeymapTab from './tabs/KeymapTab';
import TrackballTab from './tabs/TrackballTab';
import ParametersTab from './tabs/ParametersTab';

const tabs = [
  { id: 'battery', label: 'Battery', icon: ActivityLogIcon, component: BatteryTab },
  { id: 'connection', label: 'Connection', icon: BlendingModeIcon, component: ConnectionTab },
  { id: 'health', label: 'Health', icon: ComponentInstanceIcon, component: HealthTab },
  { id: 'keymap', label: 'Keymap', icon: GearIcon, component: KeymapTab },
  { id: 'trackball', label: 'Trackball', icon: DotFilledIcon, component: TrackballTab },
  { id: 'parameters', label: 'Parameters', icon: MixIcon, component: ParametersTab },
];

export default function MainTabs() {
  return (
    <Tabs.Root defaultValue="battery" className="flex flex-col h-full">
      {/* Tab List */}
      <Tabs.List className="flex border-b border-cyber-blue/20 bg-cyber-darker/50 backdrop-blur-sm">
        {tabs.map((tab) => (
          <Tabs.Trigger
            key={tab.id}
            value={tab.id}
            className="group relative flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors
                     text-white/60 hover:text-white data-[state=active]:text-cyber-blue
                     outline-none focus-visible:ring-2 focus-visible:ring-cyber-blue/50"
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
            
            {/* Active indicator */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyber-blue via-cyber-purple to-cyber-pink group-data-[state=active]:opacity-100"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.3 }}
              style={{ transformOrigin: 'left', opacity: 0 }}
            />
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {tabs.map((tab) => (
          <Tabs.Content
            key={tab.id}
            value={tab.id}
            className="h-full outline-none"
          >
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <tab.component />
            </motion.div>
          </Tabs.Content>
        ))}
      </div>
    </Tabs.Root>
  );
}
