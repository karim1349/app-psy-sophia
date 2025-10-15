import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useToast } from './ToastContext';
import { ToastItem } from './ToastItem.native';

export function ToastContainer() {
  const { toasts, hideToast } = useToast();
  const [toastHeights, setToastHeights] = useState<Map<string, number>>(new Map());

  const handleToastLayout = useCallback((toastId: string, height: number) => {
    setToastHeights(prev => new Map(prev.set(toastId, height)));
  }, []);

  const calculateOffset = (index: number) => {
    let offset = 0;
    for (let i = 0; i < index; i++) {
      const toast = toasts[i];
      if (toast?.id) {
        const height = toastHeights.get(toast.id) || 0;
        offset += height + 10; // height + 10px spacing between toasts
      }
    }
    return offset;
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map((toast, index) => {
        const offset = calculateOffset(index);
        
        return (
          <ToastItem
            key={toast.id}
            toast={toast}
            onHide={hideToast}
            offset={offset}
            onLayout={handleToastLayout}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
});
