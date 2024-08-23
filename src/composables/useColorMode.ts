export const useTheme = useColorMode as () => ThemeInstance;

type ThemeInstance = ReturnType<typeof useColorMode> & {
  preference: 'system' | 'dark' | 'light';
  value: 'dark' | 'light';
};
