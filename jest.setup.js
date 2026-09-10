// The first render test of a cold-cache run pays for transforming React Native
// itself, which comfortably exceeds jest's 5 second default.
jest.setTimeout(30000);

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true, status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true, status: 'granted' })),
  scheduleNotificationAsync: jest.fn(async () => 'notif-id'),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  AndroidImportance: { MAX: 7 },
  AndroidNotificationVisibility: { PUBLIC: 1 },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date', DAILY: 'daily', WEEKLY: 'weekly' },
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(async () => undefined),
  hideAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(async () => undefined) }));

// The native safe-area module isn't present under jest, so SafeAreaProvider
// would render nothing. Feed it fixed metrics the way a device would.
jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  return {
    ...actual,
    initialWindowMetrics: {
      frame: { x: 0, y: 0, width: 390, height: 844 },
      insets: { top: 47, left: 0, right: 0, bottom: 34 },
    },
  };
});

// The picker reaches for a native TurboModule at import time, which doesn't
// exist under jest. A plain stub is enough for render assertions.
jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const DateTimePicker = () => React.createElement('RNDateTimePicker', null);
  return {
    __esModule: true,
    default: DateTimePicker,
    DateTimePickerAndroid: { open: jest.fn(), dismiss: jest.fn(async () => true) },
  };
});
