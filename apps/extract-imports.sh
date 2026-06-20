#!/bin/bash
# extract-imports.sh - Reusable script for any file

# === CONFIGURATION ===
# Change this to your target file or pass as argument
TARGET_FILE="${1:-./src/app/vendor/dashboard/products/edit/[id]/EditProductFormClient.tsx}"
BASE_PATH="/home/badsha/medusa-dev/apps"
SHARED_DIR="$BASE_PATH/packages/shared/src"
STOREFRONT_DIR="$BASE_PATH/my-storefront/src"

echo "=== Extracting ALL imports from: $TARGET_FILE ==="
echo "=================================================="
echo

grep -n -E "from\s+['\"]" "$TARGET_FILE" | grep -v -E "(react|next|@medusajs)" | while IFS=: read -r ln imp; do
  path=$(echo "$imp" | grep -oE "from\s+['\"][^'\"]+['\"]" | sed "s/from\s*['\"]//g" | sed "s/['\"]//g")
  [ -z "$path" ] && continue
  
  echo -e "\n📦 Line $ln: $path"
  
  # --- Handle @/ components ---
  if [[ "$path" == "@/"* ]]; then
    rel="${path#@/}"
    base_file="$STOREFRONT_DIR/$rel"
    
    # Find the actual file
    actual_file=""
    for ext in tsx ts jsx js; do
      if [ -f "$base_file.$ext" ]; then
        actual_file="$base_file.$ext"
        break
      elif [ -f "$base_file/index.$ext" ]; then
        actual_file="$base_file/index.$ext"
        break
      fi
    done
    
    if [ -z "$actual_file" ]; then
      echo "   ⚠️  File not found"
      continue
    fi
    
    echo "   📁 File: $actual_file"
    
    # Extract imported items
    items=$(echo "$imp" | grep -oE "{[^}]+}" | sed 's/[{}]//g' | tr ',' '\n' | \
      sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | \
      grep -v -E "^(import|type|from)$" | \
      grep -v "^$")
    
    # Check for default import
    default_import=$(echo "$imp" | grep -oE "import\s+[a-zA-Z_][a-zA-Z0-9_]*\s+from" | sed "s/import\s*//g" | sed "s/\s*from//g")
    
    if [ -n "$default_import" ] && [ "$default_import" != "{" ] && [ "$default_import" != "type" ]; then
      echo "   🎯 Default import: $default_import"
      grep -n -E "^\s*(export\s+default\s+$default_import|export\s+default\s+function\s+$default_import|const\s+$default_import\s*=)" "$actual_file" | \
      while IFS=: read -r dline dcontent; do
        rel_file="${actual_file#$STOREFRONT_DIR/}"
        echo "      📍 $rel_file:$dline"
        echo "      $dcontent"
      done
    fi
    
    # Handle named imports
    if [ -n "$items" ]; then
      echo "   📝 Named imports:"
      for item in $items; do
        echo -e "\n      ► $item"
        grep -n -E "^\s*(export\s+)?(function|const|let|var|interface|type)\s+$item\b" "$actual_file" | \
        while IFS=: read -r dline dcontent; do
          rel_file="${actual_file#$STOREFRONT_DIR/}"
          echo "         📍 $rel_file:$dline"
          echo "         $dcontent"
        done
      done
    fi
    
    # If no items and no default, show all exports
    if [ -z "$items" ] && [ -z "$default_import" ]; then
      echo "   📝 All exports:"
      grep -n -E "^\s*(export\s+)" "$actual_file" | \
      while IFS=: read -r dline dcontent; do
        rel_file="${actual_file#$STOREFRONT_DIR/}"
        echo "      📍 $rel_file:$dline"
        echo "      $dcontent"
      done
    fi
  
  # --- Handle @shared ---
  elif [[ "$path" == "@shared"* ]]; then
    INDEX="$SHARED_DIR/index.ts"
    [ ! -f "$INDEX" ] && echo "   ⚠️  Index not found" && continue
    
    echo "   📁 Index: $INDEX"
    
    # Extract imported items
    items=$(echo "$imp" | grep -oE "{[^}]+}" | sed 's/[{}]//g' | tr ',' '\n' | \
      sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | \
      grep -v -E "^(import|type|from)$" | \
      grep -v "^$")
    
    if [ -z "$items" ]; then
      echo "   ⚠️  No items found in import"
      continue
    fi
    
    echo "   🔍 Looking for:"
    
    for item in $items; do
      echo -e "\n      ► $item"
      
      # Check if type import
      if echo "$imp" | grep -q "import type"; then
        echo "         ℹ️  Type import"
      fi
      
      # Find in index.ts first
      export_line=$(grep -n "export.*$item" "$INDEX" | head -1)
      
      if [ -n "$export_line" ]; then
        echo "         📍 Index: $export_line"
        
        # Extract source file
        source_file=$(echo "$export_line" | grep -oE "from\s+['\"][^'\"]+['\"]" | sed "s/from\s*['\"]//g" | sed "s/['\"]//g")
        
        if [ -n "$source_file" ]; then
          src_path="$SHARED_DIR/${source_file#./}"
          
          for ext in ts tsx js jsx; do
            if [ -f "$src_path.$ext" ]; then
              echo "         📁 Source: ${src_path#$SHARED_DIR/}.$ext"
              grep -n -E "^\s*(export\s+)?(function|const|let|var|interface|type)\s+$item\b" "$src_path.$ext" | \
              while IFS=: read -r sline scontent; do
                echo "            📍 $sline"
                echo "            $scontent"
              done
              break
            elif [ -f "$src_path/index.$ext" ]; then
              echo "         📁 Source: ${src_path#$SHARED_DIR/}/index.$ext"
              grep -n -E "^\s*(export\s+)?(function|const|let|var|interface|type)\s+$item\b" "$src_path/index.$ext" | \
              while IFS=: read -r sline scontent; do
                echo "            📍 $sline"
                echo "            $scontent"
              done
              break
            fi
          done
        else
          # Direct export in index
          grep -n -E "^\s*(export\s+)?(function|const|let|var|interface|type)\s+$item\b" "$INDEX" | \
          while IFS=: read -r sline scontent; do
            echo "            📍 $sline"
            echo "            $scontent"
          done
        fi
      else
        # Search all shared files
        echo "         🔍 Searching in shared files..."
        find "$SHARED_DIR" -name "*.ts" -not -name "index.ts" -exec grep -Hn -E "^\s*(export\s+)?(function|const|let|var|interface|type)\s+$item\b" {} \; | \
        while IFS=: read -r sfile sline scontent; do
          rel_file="${sfile#$SHARED_DIR/}"
          echo "            📍 $rel_file:$sline"
          echo "            $scontent"
        done
      fi
    done
  fi
done

echo -e "\n=================================================="
echo "✅ Complete!"
