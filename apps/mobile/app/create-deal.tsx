import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useState, useMemo } from 'react';
import { useCreateDeal, useInfiniteCategories } from '@qiima/queries';
import { useRouter } from 'expo-router';
import { config } from '@/constants/config';
import { useI18nNamespace } from '@qiima/i18n';
import { useTheme, PickerField } from '@qiima/ui';
import { StackScreen } from '@/components/stack-screen';

export default function CreateDealScreen() {
  const router = useRouter();
  const theme = useTheme();
  
  // i18n hooks
  const { t: tDeals } = useI18nNamespace('deals');

  const styles = createStyles(theme);
  
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

  // Currency options
  const currencyOptions = useMemo(() => [
    { label: 'MAD (Moroccan Dirham)', value: 'MAD' },
    { label: 'USD (US Dollar)', value: 'USD' },
    { label: 'EUR (Euro)', value: 'EUR' },
  ], []);

  // Category options for picker
  const categoryOptions = useMemo(() =>
    categories.map(cat => ({
      label: `${cat.icon || '🏷️'} ${cat.name}`,
      value: cat.id.toString(),
    }))
  , [categories]);

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
      newErrors.title = tDeals('createDeal.validation.titleRequired');
    } else if (formData.title.trim().length < 5) {
      newErrors.title = tDeals('createDeal.validation.titleMinLength');
    }
    
    // Description validation
    if (!formData.description.trim()) {
      newErrors.description = tDeals('createDeal.validation.descriptionRequired');
    } else if (formData.description.trim().length < 10) {
      newErrors.description = tDeals('createDeal.validation.descriptionMinLength');
    }
    
    // Current price validation
    if (!formData.current_price) {
      newErrors.current_price = tDeals('createDeal.validation.currentPriceRequired');
    } else if (parseFloat(formData.current_price) <= 0) {
      newErrors.current_price = tDeals('createDeal.validation.currentPriceMinValue');
    }
    
    // Merchant validation
    if (!formData.merchant.trim()) {
      newErrors.merchant = tDeals('createDeal.validation.merchantRequired');
    } else if (formData.merchant.trim().length < 2) {
      newErrors.merchant = tDeals('createDeal.validation.merchantMinLength');
    }
    
    // Category validation
    if (!formData.category) {
      newErrors.category = tDeals('createDeal.validation.categoryRequired');
    }
    
    // Channel-specific validation
    if (formData.channel === 'online') {
      if (!formData.url.trim()) {
        newErrors.url = tDeals('createDeal.validation.urlRequired');
      } else if (!isValidUrl(formData.url.trim())) {
        newErrors.url = tDeals('createDeal.validation.urlInvalid');
      }
    }
    
    if (formData.channel === 'in_store' && !formData.city.trim()) {
      newErrors.city = tDeals('createDeal.validation.cityRequired');
    }
    
    // Proof URL validation
    if (formData.proof_url.trim() && !isValidUrl(formData.proof_url.trim())) {
      newErrors.proof_url = tDeals('createDeal.validation.proofUrlInvalid');
    }
    
    // Require at least one proof (image or proof URL)
    if (!formData.proof_url.trim()) {
      newErrors.proof_url = tDeals('createDeal.validation.proofUrlRequired');
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
    } catch {
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
    <StackScreen>
      <View style={styles.form}>
          {/* Title */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>{tDeals('createDeal.form.title')} *</Text>
            <TextInput
              style={[styles.input, errors.title && styles.inputError]}
              placeholder={tDeals('createDeal.form.titlePlaceholder')}
              placeholderTextColor={theme.colors.fgMuted}
              value={formData.title}
              onChangeText={(value) => updateFormData('title', value)}
              maxLength={200}
            />
            {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
          </View>

          {/* Description */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>{tDeals('createDeal.form.description')} *</Text>
            <TextInput
              style={[styles.textArea, errors.description && styles.inputError]}
              placeholder={tDeals('createDeal.form.descriptionPlaceholder')}
              placeholderTextColor={theme.colors.fgMuted}
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
              <Text style={styles.label}>{tDeals('createDeal.form.currentPrice')} *</Text>
              <TextInput
                style={[styles.input, errors.current_price && styles.inputError]}
                placeholder={tDeals('createDeal.form.currentPricePlaceholder')}
                placeholderTextColor={theme.colors.fgMuted}
                value={formData.current_price}
                onChangeText={(value) => updateFormData('current_price', value)}
                keyboardType="numeric"
              />
              {errors.current_price && <Text style={styles.errorText}>{errors.current_price}</Text>}
            </View>
            
            <View style={styles.priceGroup}>
              <Text style={styles.label}>{tDeals('createDeal.form.originalPrice')}</Text>
              <TextInput
                style={styles.input}
                placeholder={tDeals('createDeal.form.originalPricePlaceholder')}
                placeholderTextColor={theme.colors.fgMuted}
                value={formData.original_price}
                onChangeText={(value) => updateFormData('original_price', value)}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Currency */}
          <PickerField
            label={tDeals('createDeal.form.currency')}
            value={formData.currency}
            onValueChange={(value) => updateFormData('currency', value)}
            options={currencyOptions}
            placeholder={tDeals('createDeal.form.currency')}
          />

          {/* Merchant */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>{tDeals('createDeal.form.merchant')} *</Text>
            <TextInput
              style={[styles.input, errors.merchant && styles.inputError]}
              placeholder={tDeals('createDeal.form.merchantPlaceholder')}
              placeholderTextColor={theme.colors.fgMuted}
              value={formData.merchant}
              onChangeText={(value) => updateFormData('merchant', value)}
            />
            {errors.merchant && <Text style={styles.errorText}>{errors.merchant}</Text>}
          </View>

          {/* Category */}
          <PickerField
            label={tDeals('createDeal.form.category')}
            value={formData.category}
            onValueChange={(value) => updateFormData('category', value)}
            options={categoryOptions}
            placeholder={tDeals('createDeal.form.categoryPlaceholder')}
            searchable
            searchPlaceholder={tDeals('createDeal.form.searchCategories') || 'Search categories...'}
            error={errors.category}
            disabled={categoriesLoading}
          />

          {/* Deal Type */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>{tDeals('createDeal.form.dealType')}</Text>
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
                  {tDeals('createDeal.form.dealTypeOnline')}
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
                  {tDeals('createDeal.form.dealTypeInStore')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* URL (for online deals) */}
          {formData.channel === 'online' && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>{tDeals('createDeal.form.url')} *</Text>
              <TextInput
                style={[styles.input, errors.url && styles.inputError]}
                placeholder={tDeals('createDeal.form.urlPlaceholder')}
                placeholderTextColor={theme.colors.fgMuted}
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
              <Text style={styles.label}>{tDeals('createDeal.form.city')} *</Text>
              <TextInput
                style={[styles.input, errors.city && styles.inputError]}
                placeholder={tDeals('createDeal.form.cityPlaceholder')}
                placeholderTextColor={theme.colors.fgMuted}
                value={formData.city}
                onChangeText={(value) => updateFormData('city', value)}
              />
              {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
            </View>
          )}

          {/* Proof URL */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>{tDeals('createDeal.form.proofUrl')} *</Text>
            <TextInput
              style={[styles.input, errors.proof_url && styles.inputError]}
              placeholder={tDeals('createDeal.form.proofUrlPlaceholder')}
              placeholderTextColor={theme.colors.fgMuted}
              value={formData.proof_url}
              onChangeText={(value) => updateFormData('proof_url', value)}
              keyboardType="url"
              autoCapitalize="none"
            />
            {errors.proof_url && <Text style={styles.errorText}>{errors.proof_url}</Text>}
            <Text style={styles.helpText}>
              {tDeals('createDeal.form.proofUrlHelp')}
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, createDealMutation.isPending && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={createDealMutation.isPending}
          >
            <Text style={styles.submitButtonText}>
              {createDealMutation.isPending ? tDeals('createDeal.form.submitting') : tDeals('createDeal.form.submitButton')}
            </Text>
          </TouchableOpacity>
        </View>
    </StackScreen>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
  form: {
    paddingBottom: 40,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.fgDefault,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.bgSurface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.fgDefault,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  textArea: {
    backgroundColor: theme.colors.bgSurface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.fgDefault,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: theme.colors.danger,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 14,
    marginVertical: theme.space.xs,
  },
  helpText: {
    color: theme.colors.fgMuted,
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
  dealTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dealTypeButton: {
    flex: 1,
    backgroundColor: theme.colors.bgSurface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dealTypeButtonActive: {
    borderColor: theme.colors.brand,
    backgroundColor: `${theme.colors.brand}1A`, // 10% opacity
  },
  dealTypeButtonText: {
    fontSize: 16,
    color: theme.colors.fgMuted,
    fontWeight: '500',
  },
  dealTypeButtonTextActive: {
    color: theme.colors.brand,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: theme.colors.brand,
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
    backgroundColor: theme.colors.fgMuted,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
