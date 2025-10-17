# BottomSheet Component

A clean, themeable bottom sheet component built on `@gorhom/bottom-sheet`.

## Features

- **Theme Integration**: Automatically adapts to light/dark mode
- **Flexible Snap Points**: Support for percentage or pixel-based snap points
- **Dynamic Sizing**: Optional content-based height
- **Backdrop**: Configurable backdrop with dismissal
- **Accessible**: Built-in accessibility labels and roles
- **Header/Footer**: Support for custom or default headers and footers
- **TypeScript**: Fully typed with comprehensive props

## Installation

The component is part of `@qiima/ui`. The underlying library `@gorhom/bottom-sheet` is installed as a peer dependency.

## Basic Usage

```tsx
import { useRef } from 'react';
import { View, Text, Button } from 'react-native';
import { BottomSheet } from '@qiima/ui';
import type BottomSheetRef from '@gorhom/bottom-sheet';

function MyComponent() {
  const sheetRef = useRef<BottomSheetRef>(null);

  const openSheet = () => {
    sheetRef.current?.snapToIndex(0);
  };

  return (
    <View>
      <Button title="Open Sheet" onPress={openSheet} />

      <BottomSheet
        ref={sheetRef}
        snapPoints={['50%', '90%']}
        title="Select an option"
        enablePanDownToClose
      >
        <Text>Your content here</Text>
      </BottomSheet>
    </View>
  );
}
```

## Props

### Core Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `snapPoints` | `Array<string \| number>` | `['50%', '90%']` | Snap points for the sheet |
| `initialSnapIndex` | `number` | `0` | Initial snap position |
| `enableBackdrop` | `boolean` | `true` | Show backdrop overlay |
| `backdropDismissable` | `boolean` | `true` | Allow backdrop tap to close |
| `enablePanDownToClose` | `boolean` | `true` | Enable swipe down gesture |
| `enableDynamicSizing` | `boolean` | `false` | Auto-size to content height |

### Content Props

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Creates a default header with close button |
| `header` | `ReactNode` | Custom header component |
| `footer` | `ReactNode` | Footer component |
| `children` | `ReactNode` | Main content |

### Callbacks

| Prop | Type | Description |
|------|------|-------------|
| `onChange` | `(index: number) => void` | Called when sheet position changes |
| `onClose` | `() => void` | Called when sheet is closed |

### Accessibility

| Prop | Type | Description |
|------|------|-------------|
| `accessibilityLabel` | `string` | Accessibility label for the sheet |

### Advanced

| Prop | Type | Description |
|------|------|-------------|
| `bottomSheetProps` | `Partial<RNBottomSheetProps>` | Pass-through props to underlying library |

## Examples

### With Custom Header

```tsx
<BottomSheet
  ref={sheetRef}
  snapPoints={['50%']}
  header={
    <View style={{ padding: 16, borderBottomWidth: 1 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Custom Header</Text>
    </View>
  }
>
  <Text>Content</Text>
</BottomSheet>
```

### With Footer Actions

```tsx
<BottomSheet
  ref={sheetRef}
  snapPoints={['50%']}
  title="Confirm Action"
  footer={
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Button title="Cancel" onPress={() => sheetRef.current?.close()} />
      <Button title="Confirm" onPress={handleConfirm} />
    </View>
  }
>
  <Text>Are you sure?</Text>
</BottomSheet>
```

### Dynamic Content Height

```tsx
<BottomSheet
  ref={sheetRef}
  enableDynamicSizing
  title="Dynamic Sheet"
>
  <View>
    {/* Content height determines sheet height */}
    <Text>This sheet adapts to content</Text>
  </View>
</BottomSheet>
```

### Without Backdrop

```tsx
<BottomSheet
  ref={sheetRef}
  snapPoints={['25%', '50%', '90%']}
  enableBackdrop={false}
  title="No Backdrop"
>
  <Text>Users can interact with content behind</Text>
</BottomSheet>
```

### Non-dismissable Sheet

```tsx
<BottomSheet
  ref={sheetRef}
  snapPoints={['50%']}
  backdropDismissable={false}
  enablePanDownToClose={false}
  title="Must Interact"
>
  <Text>User must explicitly close via button</Text>
</BottomSheet>
```

## Imperative API

The component exposes a ref with the following methods from `@gorhom/bottom-sheet`:

```tsx
const sheetRef = useRef<BottomSheetRef>(null);

// Snap to index
sheetRef.current?.snapToIndex(0);  // First snap point
sheetRef.current?.snapToIndex(1);  // Second snap point

// Snap to position (percentage or pixels)
sheetRef.current?.snapToPosition('80%');
sheetRef.current?.snapToPosition(500);

// Close the sheet
sheetRef.current?.close();

// Expand to max
sheetRef.current?.expand();

// Collapse to min
sheetRef.current?.collapse();
```

## Notes

- **GestureHandlerRootView**: Ensure your app root is wrapped with `GestureHandlerRootView` from `react-native-gesture-handler`
- **Theme**: Uses `useTheme()` hook from `@qiima/ui` for automatic light/dark mode support
- **Performance**: The sheet uses `react-native-reanimated` for smooth 60fps animations

## Related

- [@gorhom/bottom-sheet documentation](https://gorhom.dev/react-native-bottom-sheet)
- [Design System Theme](/packages/ui/src/native/theme.ts)
