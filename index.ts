// IMPORTANT: Background task phải được import ở top-level trước registerRootComponent
// Đây là yêu cầu của expo-task-manager
import './src/services/backgroundFallCheck';

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
