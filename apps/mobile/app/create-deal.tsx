import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { useCreateDeal, useInfiniteCategories } from '@qiima/queries';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { config } from '@/constants/config';
import { useI18n, useI18nNamespace } from '@qiima/i18n';

export default function CreateDealScreen() {
  const scheme = useColorScheme() ?? 'light';
  const router = useRouter();
  
  // i18n hooks
  const { t: tCommon } = useI18n();
  const { t: tErrors } = useI18nNamespace('errors');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    current_price: '',
    original_price: '',
    currency: 'MAD',
    merchant: '',
    channel: 'online' as 'online' | 'in_store',
    url: '',
    city: '',
    category: '',
    proof_url: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch categories with infinite scroll
  const { 
    data: categoriesData, 
    isLoading: categoriesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage 
  } = useInfiniteCategories({
    env: 'native',
    baseURL: config.baseURL,
  }, 20);

  // Flatten all categories from all pages
  const categories = categoriesData?.pages.flatMap(page => page.results) || [];

  // Create deal mutation
  const createDealMutation = useCreateDeal({
    env: 'native',
    baseURL: config.baseURL,
  });

  // URL validation helper
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Title validation
    if (!formData.title.trim()) {
      newErrors.title = tErrors('validation.required');
    } else if (formData.title.trim().length < 5) {
      newErrors.title = tErrors('validation.titleMinLength');
    }
    
    // Description validation
    if (!formData.description.trim()) {
      newErrors.description = tErrors('validation.required');
    } else if (formData.description.trim().length < 10) {
      newErrors.description = tErrors('validation.descriptionMinLength');
    }
    
    // Current price validation
    if (!formData.current_price) {
      newErrors.current_price = tErrors('validation.required');
    } else if (parseFloat(formData.current_price) <= 0) {
      newErrors.current_price = tErrors('validation.minValue');
    }
    
    // Merchant validation
    if (!formData.merchant.trim()) {
      newErrors.merchant = tErrors('validation.required');
    } else if (formData.merchant.trim().length < 2) {
      newErrors.merchant = tErrors('validation.merchantMinLength');
    }
    
    // Category validation
    if (!formData.category) {
      newErrors.category = tErrors('validation.required');
    }
    
    // Channel-specific validation
    if (formData.channel === 'online') {
      if (!formData.url.trim()) {
        newErrors.url = tErrors('validation.required');
      } else if (!isValidUrl(formData.url.trim())) {
        newErrors.url = tErrors('validation.invalidUrl');
      }
    }
    
    if (formData.channel === 'in_store' && !formData.city.trim()) {
      newErrors.city = tErrors('validation.required');
    }
    
    // Proof URL validation
    if (formData.proof_url.trim() && !isValidUrl(formData.proof_url.trim())) {
      newErrors.proof_url = tErrors('validation.invalidUrl');
    }
    
    // Require at least one proof (image or proof URL)
    if (!formData.proof_url.trim()) {
      newErrors.proof_url = tErrors('deals.validation.proofRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const dealData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        current_price: parseFloat(formData.current_price),
        original_price: formData.original_price ? parseFloat(formData.original_price) : undefined,
        currency: formData.currency,
        merchant: formData.merchant.trim(),
        channel: formData.channel,
        url: formData.channel === 'online' ? formData.url.trim() : undefined,
        city: formData.channel === 'in_store' ? formData.city.trim() : undefined,
        category: formData.category,
        proof_url: formData.proof_url.trim() || undefined,
      };

      await createDealMutation.mutateAsync(dealData);
      
      // Success toast will be automatically shown by the global handler
      // Navigate back immediately
      router.back();
    } catch (error: any) {
      // Error will be automatically handled by the global error handler
      // No need to show error toast here as it's already handled
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        pointerEvents="none"
        colors={
          scheme === 'dark'
            ? ['#21110D', '#28180F', '#17120A']
            : ['#FFECE5', '#FFE3CC', '#FFF6D6']
        }
        locations={[0, 0.6, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Create Deal</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          {/* Title */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={[styles.input, errors.title && styles.inputError]}
              placeholder="Enter deal title"
              value={formData.title}
              onChangeText={(value) => updateFormData('title', value)}
              maxLength={200}
            />
            {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
          </View>

          {/* Description */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.textArea, errors.description && styles.inputError]}
              placeholder="Describe the deal..."
              value={formData.description}
              onChangeText={(value) => updateFormData('description', value)}
              multiline
              numberOfLines={4}
              maxLength={1000}
            />
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          </View>

          {/* Price Section */}
          <View style={styles.priceSection}>
            <View style={styles.priceGroup}>
              <Text style={styles.label}>Current Price *</Text>
              <TextInput
                style={[styles.input, errors.current_price && styles.inputError]}
                placeholder="0.00"
                value={formData.current_price}
                onChangeText={(value) => updateFormData('current_price', value)}
                keyboardType="numeric"
              />
              {errors.current_price && <Text style={styles.errorText}>{errors.current_price}</Text>}
            </View>
            
            <View style={styles.priceGroup}>
              <Text style={styles.label}>Original Price</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={formData.original_price}
                onChangeText={(value) => updateFormData('original_price', value)}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Currency */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Currency</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.currency}
                onValueChange={(value) => updateFormData('currency', value)}
                style={styles.picker}
              >
                <Picker.Item label="MAD (Moroccan Dirham)" value="MAD" />
                <Picker.Item label="USD (US Dollar)" value="USD" />
                <Picker.Item label="EUR (Euro)" value="EUR" />
              </Picker>
            </View>
          </View>

          {/* Merchant */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Merchant *</Text>
            <TextInput
              style={[styles.input, errors.merchant && styles.inputError]}
              placeholder="Store or website name"
              value={formData.merchant}
              onChangeText={(value) => updateFormData('merchant', value)}
            />
            {errors.merchant && <Text style={styles.errorText}>{errors.merchant}</Text>}
          </View>

          {/* Category */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Category *</Text>
            <View style={[styles.pickerContainer, errors.category && styles.inputError]}>
              <Picker
                selectedValue={formData.category}
                onValueChange={(value) => {
                  if (value === 'load_more' && hasNextPage) {
                    fetchNextPage();
                  } else {
                    updateFormData('category', value);
                  }
                }}
                style={styles.picker}
              >
                <Picker.Item label="Select a category" value="" />
                {categories?.map((category) => (
                  <Picker.Item 
                    key={category.id} 
                    label={`${category.icon || '🏷️'} ${category.name}`} 
                    value={category.id.toString()} 
                  />
                ))}
                {hasNextPage && (
                  <Picker.Item 
                    label={isFetchingNextPage ? "Loading more..." : "Load more categories..."} 
                    value="load_more" 
                  />
                )}
                {categoriesLoading && (
                  <Picker.Item label="Loading categories..." value="" />
                )}
              </Picker>
            </View>
            {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
          </View>

          {/* Deal Type */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Deal Type</Text>
            <View style={styles.dealTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.dealTypeButton,
                  formData.channel === 'online' && styles.dealTypeButtonActive,
                ]}
                onPress={() => updateFormData('channel', 'online')}
              >
                <Text
                  style={[
                    styles.dealTypeButtonText,
                    formData.channel === 'online' && styles.dealTypeButtonTextActive,
                  ]}
                >
                  🌐 Online
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.dealTypeButton,
                  formData.channel === 'in_store' && styles.dealTypeButtonActive,
                ]}
                onPress={() => updateFormData('channel', 'in_store')}
              >
                <Text
                  style={[
                    styles.dealTypeButtonText,
                    formData.channel === 'in_store' && styles.dealTypeButtonTextActive,
                  ]}
                >
                  🏪 In Store
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* URL (for online deals) */}
          {formData.channel === 'online' && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>URL *</Text>
              <TextInput
                style={[styles.input, errors.url && styles.inputError]}
                placeholder="https://example.com/deal"
                value={formData.url}
                onChangeText={(value) => updateFormData('url', value)}
                keyboardType="url"
                autoCapitalize="none"
              />
              {errors.url && <Text style={styles.errorText}>{errors.url}</Text>}
            </View>
          )}

          {/* City (for in-store deals) */}
          {formData.channel === 'in_store' && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>City *</Text>
              <TextInput
                style={[styles.input, errors.city && styles.inputError]}
                placeholder="Casablanca, Rabat, Marrakech..."
                value={formData.city}
                onChangeText={(value) => updateFormData('city', value)}
              />
              {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
            </View>
          )}

          {/* Proof URL */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Proof URL *</Text>
            <TextInput
              style={[styles.input, errors.proof_url && styles.inputError]}
              placeholder="https://example.com/screenshot or image URL"
              value={formData.proof_url}
              onChangeText={(value) => updateFormData('proof_url', value)}
              keyboardType="url"
              autoCapitalize="none"
            />
            {errors.proof_url && <Text style={styles.errorText}>{errors.proof_url}</Text>}
            <Text style={styles.helpText}>
              Provide a URL to a screenshot, image, or other proof of the deal
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, createDealMutation.isPending && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={createDealMutation.isPending}
          >
            <Text style={styles.submitButtonText}>
              {createDealMutation.isPending ? 'Creating Deal...' : 'Create Deal'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#FF6A00',
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  form: {
    paddingBottom: 40,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  textArea: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#ff4444',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    marginTop: 4,
  },
  helpText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  priceSection: {
    flexDirection: 'row',
    gap: 12,
  },
  priceGroup: {
    flex: 1,
  },
  pickerContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  picker: {
    height: 50,
  },
  dealTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dealTypeButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dealTypeButtonActive: {
    borderColor: '#FF6A00',
    backgroundColor: 'rgba(255, 106, 0, 0.1)',
  },
  dealTypeButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  dealTypeButtonTextActive: {
    color: '#FF6A00',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#FF6A00',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
