import type { ViewStyle, TextStyle } from 'react-native';

type Style = ViewStyle | TextStyle;

type VariantsConfig<T extends Record<string, Record<string, Style>>> = {
  base?: Style | Style[];
  variants: T;
  defaultVariants?: { [K in keyof T]?: keyof T[K] };
};

export function createVariants<T extends Record<string, Record<string, Style>>>(
  config: VariantsConfig<T>
) {
  return function resolve(variantProps?: Partial<{ [K in keyof T]: keyof T[K] }>, extra?: Style | Style[]) {
    const styles: (Style | undefined)[] = Array.isArray(config.base) ? config.base : [config.base];
    const used = { ...config.defaultVariants, ...variantProps } as Record<string, string>;
    for (const key in config.variants) {
      const variantKey = used[key];
      if (variantKey) {
        styles.push(config.variants[key][variantKey]);
      }
    }
    if (extra) {
      styles.push(...(Array.isArray(extra) ? extra : [extra]));
    }
    return styles.filter(Boolean) as Style[];
  };
}


