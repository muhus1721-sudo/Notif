// The first render test of a cold-cache run pays for transforming React Native
// itself, which comfortably exceeds jest's 5 second default.
jest.setTimeout(30000);

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(async () => undefined),
  hideAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: null })),
  UIImagePickerPreferredAssetRepresentationMode: { Compatible: 'compatible' },
}));

jest.mock('expo-sharing', () => ({ shareAsync: jest.fn(async () => undefined) }));

// expo-file-system's classes are backed by a native module that doesn't exist
// under jest; an in-memory stand-in is enough for the code paths tested here.
jest.mock('expo-file-system', () => {
  const files = new Map();
  class File {
    constructor(...parts) {
      this.uri = parts.map((p) => (typeof p === 'string' ? p : p.uri)).join('/');
    }
    get exists() {
      return files.has(this.uri);
    }
    async bytes() {
      return files.get(this.uri);
    }
    write(content) {
      files.set(this.uri, content);
    }
    delete() {
      files.delete(this.uri);
    }
  }
  class Directory extends File {
    create() {}
  }
  return {
    File,
    Directory,
    Paths: { cache: { uri: 'file:///cache' }, document: { uri: 'file:///document' } },
    __files: files,
  };
});

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
