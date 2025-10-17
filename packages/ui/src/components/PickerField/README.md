# PickerField Component

A reusable picker/select component that uses BottomSheetModal for an elegant selection experience.

## Features

- ✅ **Clean API** - Works like a controlled input
- ✅ **Searchable** - Optional search/filter for long lists
- ✅ **Themed** - Automatic light/dark mode support
- ✅ **Accessible** - Proper labels and hints
- ✅ **Type-safe** - Generic value types
- ✅ **Detached modal** - Beautiful floating UI
- ✅ **Error support** - Validation error display
- ✅ **Smooth gestures** - Uses `BottomSheetFlatList` for coordinated scrolling

## Basic Usage

```tsx
import { useState } from 'react';
import { PickerField } from '@qiima/ui';

function MyForm() {
  const [city, setCity] = useState('');

  const cities = [
    { label: 'Casablanca', value: 'casablanca' },
    { label: 'Rabat', value: 'rabat' },
    { label: 'Marrakech', value: 'marrakech' },
  ];

  return (
    <PickerField
      label="Ville"
      value={city}
      onValueChange={setCity}
      options={cities}
      placeholder="Choisir une ville"
    />
  );
}
```

## With Search

```tsx
<PickerField
  label="Merchant"
  value={merchant}
  onValueChange={setMerchant}
  options={merchants}
  searchable
  searchPlaceholder="Rechercher un marchand..."
/>
```

## With Validation Errors

```tsx
<PickerField
  label="Catégorie"
  value={category}
  onValueChange={setCategory}
  options={categories}
  error={errors.category?.message}
/>
```

## With React Hook Form

```tsx
import { Controller } from 'react-hook-form';

<Controller
  control={control}
  name="city"
  rules={{ required: 'La ville est requise' }}
  render={({ field, fieldState }) => (
    <PickerField
      label="Ville"
      value={field.value}
      onValueChange={field.onChange}
      options={cities}
      error={fieldState.error?.message}
    />
  )}
/>
```

## Custom Value Types

```tsx
type MerchantId = number;

const merchants: PickerOption<MerchantId>[] = [
  { label: 'Amazon', value: 1 },
  { label: 'Jumia', value: 2 },
];

<PickerField<MerchantId>
  label="Marchand"
  value={merchantId}
  onValueChange={setMerchantId}
  options={merchants}
/>
```

## Props

### Required

| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | Field label |
| `value` | `T` | Current selected value |
| `onValueChange` | `(value: T) => void` | Callback when value changes |
| `options` | `PickerOption<T>[]` | List of options |

### Optional

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `placeholder` | `string` | `'Sélectionner'` | Placeholder text |
| `title` | `string` | Same as `label` | Modal title |
| `searchable` | `boolean` | `false` | Enable search |
| `searchPlaceholder` | `string` | `'Rechercher...'` | Search input placeholder |
| `disabled` | `boolean` | `false` | Disabled state |
| `error` | `string` | - | Error message |
| `accessibilityLabel` | `string` | - | Accessibility label |

## PickerOption Type

```typescript
type PickerOption<T = string> = {
  label: string;  // Display text
  value: T;       // Actual value
};
```

## Examples

### City Picker (Searchable)

```tsx
const cities = [
  { label: 'Casablanca', value: 'casablanca' },
  { label: 'Rabat', value: 'rabat' },
  { label: 'Marrakech', value: 'marrakech' },
  { label: 'Fès', value: 'fes' },
  { label: 'Tanger', value: 'tanger' },
  { label: 'Agadir', value: 'agadir' },
  { label: 'Meknès', value: 'meknes' },
  { label: 'Oujda', value: 'oujda' },
];

<PickerField
  label="Ville"
  value={city}
  onValueChange={setCity}
  options={cities}
  searchable
/>
```

### Category Picker

```tsx
const categories = [
  { label: 'Électronique', value: 'electronics' },
  { label: 'Mode', value: 'fashion' },
  { label: 'Maison', value: 'home' },
  { label: 'Sport', value: 'sport' },
];

<PickerField
  label="Catégorie"
  value={category}
  onValueChange={setCategory}
  options={categories}
/>
```

### Merchant Picker (Numeric IDs)

```tsx
const merchants: PickerOption<number>[] = [
  { label: 'Amazon', value: 1 },
  { label: 'Jumia', value: 2 },
  { label: 'Marjane', value: 3 },
];

<PickerField<number>
  label="Marchand"
  value={merchantId}
  onValueChange={setMerchantId}
  options={merchants}
  searchable
/>
```

## Styling

The component automatically uses your theme:
- Colors from `useTheme()`
- Spacing from theme tokens
- Light/dark mode support
- Border radius from theme

## Accessibility

- Proper `accessibilityRole="button"` on trigger
- Descriptive labels and hints
- Keyboard navigation (via BottomSheetModal)
- Screen reader support

## Implementation Details

- Requires `BottomSheetModalProvider` in app root
- Modal is detached by default (floating card)
- Search is case-insensitive
- Empty state shown when no results
- Dismisses automatically after selection
- Uses `BottomSheetFlatList` with `scrollable` mode for optimized gesture handling:
  - Smooth scrolling when list is scrollable
  - Drag-to-dismiss when at top of list
  - No gesture conflicts between scroll and sheet drag
  - Dynamic sizing with `maxDynamicContentSize={600}` caps height and enables scrolling for long lists
