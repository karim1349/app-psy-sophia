#!/bin/bash

# Proper SafeAreaView Migration Script
# This script safely migrates SafeAreaView imports without breaking syntax

echo "🚀 Starting proper SafeAreaView migration..."

# Find all files with SafeAreaView imports from react-native
files=$(find apps/mobile -name "*.tsx" -o -name "*.ts" | xargs grep -l "SafeAreaView" | grep -v node_modules)

for file in $files; do
  echo "📝 Processing: $file"
  
  # Check if SafeAreaView is imported from react-native
  if grep -q "SafeAreaView" "$file" && grep -q "from 'react-native'" "$file"; then
    echo "  🔄 Migrating SafeAreaView import..."
    
    # Create backup
    cp "$file" "$file.backup"
    
    # Remove SafeAreaView from react-native import line
    sed -i.tmp "s/SafeAreaView,//g" "$file"
    sed -i.tmp "s/, SafeAreaView//g" "$file"
    sed -i.tmp "s/SafeAreaView//g" "$file"
    
    # Clean up empty lines and trailing commas in the import block
    sed -i.tmp '/^import {$/,/^} from '\''react-native'\'';$/ {
      s/,$//
      /^[[:space:]]*$/d
    }' "$file"
    
    # Add SafeAreaView import from react-native-safe-area-context
    # Check if the import already exists
    if ! grep -q "from 'react-native-safe-area-context'" "$file"; then
      # Find the last import line and add after it
      sed -i.tmp '/^import.*from.*react-native.*;$/a\
import { SafeAreaView } from '\''react-native-safe-area-context'\'';
' "$file"
    fi
    
    # Clean up temporary files
    rm -f "$file.tmp"
    
    echo "  ✅ Updated: $file"
  else
    echo "  ⏭️  Skipping: $file (already migrated or no SafeAreaView)"
  fi
done

echo "🎉 Migration complete!"
echo ""
echo "Files processed:"
echo "$files"
echo ""
echo "⚠️  Please test your app to ensure everything works!"
echo "💡 Backup files available as *.backup if you need to restore"
