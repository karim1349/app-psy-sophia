import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, useToast } from '@qiima/ui';
import { useRouter } from 'expo-router';

export default function ToastDemoScreen() {
  const scheme = useColorScheme() ?? 'light';
  const router = useRouter();
  const { showToast } = useToast();

  const handleSuccessToast = () => {
    showToast({
      type: 'success',
      title: 'Success!',
      message: 'Your action was completed successfully.',
    });
  };

  const handleErrorToast = () => {
    showToast({
      type: 'error',
      title: 'Error',
      message: 'Something went wrong. Please try again.',
    });
  };

  const handleWarningToast = () => {
    showToast({
      type: 'warning',
      title: 'Warning',
      message: 'Please check your input before proceeding.',
    });
  };

  const handleInfoToast = () => {
    showToast({
      type: 'info',
      title: 'Information',
      message: 'Here is some useful information for you.',
    });
  };

  const handleLongToast = () => {
    showToast({
      type: 'info',
      title: 'Long Message',
      message: 'This is a longer message to test how the toast handles multiple lines of text and whether it wraps properly.',
      duration: 6000,
    });
  };

  const handleMultipleToasts = () => {
    showToast({
      type: 'success',
      title: 'First Toast',
      message: 'This is the first toast.',
    });
    
    setTimeout(() => {
      showToast({
        type: 'error',
        title: 'Second Toast',
        message: 'This is the second toast.',
      });
    }, 500);
    
    setTimeout(() => {
      showToast({
        type: 'warning',
        title: 'Third Toast',
        message: 'This is the third toast.',
      });
    }, 1000);
  };

  return (
    <LinearGradient
      colors={scheme === 'dark' ? ['#0E0F10', '#14161A'] : ['#FFFFFF', '#F8F9FA']}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: scheme === 'dark' ? '#EDEAE6' : '#1F2428' }]}>
            Toast Demo
          </Text>
          <Text style={[styles.subtitle, { color: scheme === 'dark' ? '#BDB8B1' : '#5B6166' }]}>
            Test different toast types and behaviors
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Success Toast"
            onPress={handleSuccessToast}
            variant="solid"
            tone="brand"
            size="md"
          />
          
          <Button
            title="Error Toast"
            onPress={handleErrorToast}
            variant="solid"
            tone="brand"
            size="md"
          />
          
          <Button
            title="Warning Toast"
            onPress={handleWarningToast}
            variant="solid"
            tone="brand"
            size="md"
          />
          
          <Button
            title="Info Toast"
            onPress={handleInfoToast}
            variant="solid"
            tone="brand"
            size="md"
          />
          
          <Button
            title="Long Message"
            onPress={handleLongToast}
            variant="solid"
            tone="brand"
            size="md"
          />
          
          <Button
            title="Multiple Toasts"
            onPress={handleMultipleToasts}
            variant="solid"
            tone="brand"
            size="md"
          />
          
          <Button
            title="Back to Home"
            onPress={() => router.back()}
            variant="outline"
            tone="brand"
            size="md"
          />
        </View>
      </ScrollView>
      
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 16,
  },
});

