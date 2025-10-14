import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGE_KEY = 'i18nextLng';

export const languageStorage = {
  getItem: (key: string): Promise<string | null> => {
    if (key === LANGUAGE_KEY) {
      return AsyncStorage.getItem(LANGUAGE_KEY);
    }
    return Promise.resolve(null);
  },
  setItem: (key: string, value: string): Promise<void> => {
    if (key === LANGUAGE_KEY) {
      return AsyncStorage.setItem(LANGUAGE_KEY, value);
    }
    return Promise.resolve();
  },
  removeItem: (key: string): Promise<void> => {
    if (key === LANGUAGE_KEY) {
      return AsyncStorage.removeItem(LANGUAGE_KEY);
    }
    return Promise.resolve();
  },
};
