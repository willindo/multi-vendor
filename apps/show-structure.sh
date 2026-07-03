#!/bin/bash

# Clean compact tree - files shown ONLY inline with directories, NO duplicates
# Shows ALL file names (no truncation) when -L is NOT specified
# Usage: show-structure.sh [directory] [-L level]

show_compact_tree() {
  local dir="${1:-.}"
  local max_depth="${2:-999}"
  local current_depth="${3:-0}"
  local prefix="${4:-}"
  local show_all_files="${5:-false}"
  
  # Resolve path
  if [[ ! "$dir" = /* ]]; then
    dir="$(pwd)/$dir"
  fi
  
  if [ ! -d "$dir" ]; then
    return
  fi
  
  # Print root
  if [ $current_depth -eq 0 ]; then
    echo "📁 $(basename "$dir")/"
  fi
  
  # Stop if max depth reached
  if [ $current_depth -ge $max_depth ]; then
    return
  fi
  
  # Get all items (sorted) - ONLY directories at this level
  local dirs=()
  local files=()
  
  for item in $(ls -1 "$dir" 2>/dev/null | sort); do
    # Skip ignored
    if [[ "$item" =~ ^(node_modules|\.git|\.next|\.cache|\.vscode|dist|build|coverage|\.DS_Store|pnpm-lock\.yaml|yarn\.lock|package-lock\.json|tsconfig\.tsbuildinfo)$ ]]; then
      continue
    fi
    
    if [ -d "$dir/$item" ]; then
      if [ -L "$dir/$item" ]; then
        dirs+=("$item -> $(readlink "$dir/$item")")
      else
        dirs+=("$item")
      fi
    elif [ -f "$dir/$item" ]; then
      # Only show relevant file types
      if [[ "$item" =~ \.(tsx?|jsx?|css|json|md|jpg|png|svg|ts|js|html|txt|back)$ ]]; then
        files+=("$item")
      fi
    fi
  done
  
  # --- Process directories ---
  local count=0
  for d in "${dirs[@]}"; do
    count=$((count + 1))
    local is_last_dir=false
    [ $count -eq ${#dirs[@]} ] && is_last_dir=true
    
    local actual_dir="$d"
    local is_symlink=false
    if [[ "$d" == *"->"* ]]; then
      is_symlink=true
      actual_dir=$(echo "$d" | cut -d' ' -f1)
    fi
    
    # Get subdirectories for display
    local subdirs=()
    if [ -d "$dir/$actual_dir" ] && [ $current_depth -lt $((max_depth - 1)) ]; then
      for sub in $(ls -1 "$dir/$actual_dir" 2>/dev/null | sort); do
        if [ -d "$dir/$actual_dir/$sub" ] && [[ ! "$sub" =~ ^(node_modules|\.git|\.next|\.cache)$ ]]; then
          subdirs+=("$sub")
        fi
      done
    fi
    
    # Get files for this directory (for inline display)
    local dir_files=()
    if [ -d "$dir/$actual_dir" ]; then
      for f in $(ls -1 "$dir/$actual_dir" 2>/dev/null | sort); do
        if [ -f "$dir/$actual_dir/$f" ] && [[ "$f" =~ \.(tsx?|jsx?|css|json|md|jpg|png|svg|ts|js|html|txt|back)$ ]]; then
          dir_files+=("$f")
        fi
      done
    fi
    
    # Build display for this directory
    local display_parts=()
    
    # Add subdirectories (always show)
    if [ ${#subdirs[@]} -gt 0 ]; then
      local sub_str=""
      if [ ${#subdirs[@]} -le 8 ] || [ "$show_all_files" = true ]; then
        sub_str=$(printf "%s, " "${subdirs[@]}")
        sub_str="${sub_str%, }"
      else
        local first_five=("${subdirs[@]:0:5}")
        sub_str=$(printf "%s, " "${first_five[@]}")
        sub_str="${sub_str%, }... and $((${#subdirs[@]} - 5)) more"
      fi
      display_parts+=("$sub_str")
    fi
    
    # Add files - show ALL when show_all_files=true, otherwise truncate
    if [ ${#dir_files[@]} -gt 0 ] && ([ $current_depth -le 1 ] || [ ${#subdirs[@]} -eq 0 ]); then
      local file_str=""
      if [ "$show_all_files" = true ]; then
        # Show ALL files, no truncation
        file_str=$(printf "%s, " "${dir_files[@]}")
        file_str="${file_str%, }"
      else
        # Show limited files with truncation
        if [ ${#dir_files[@]} -le 6 ]; then
          file_str=$(printf "%s, " "${dir_files[@]}")
          file_str="${file_str%, }"
        else
          local first_four=("${dir_files[@]:0:4}")
          file_str=$(printf "%s, " "${first_four[@]}")
          file_str="${file_str%, }... and $((${#dir_files[@]} - 4)) more"
        fi
      fi
      display_parts+=("files: $file_str")
    fi
    
    # Build the full display
    local display=""
    if [ ${#display_parts[@]} -gt 0 ]; then
      display=" [$(printf "%s | " "${display_parts[@]}" | sed 's/ | $//')]"
    fi
    
    # Determine connector
    local connector="├──"
    if $is_last_dir; then
      connector="└──"
    fi
    
    # Print directory
    if $is_symlink; then
      echo "$prefix  $connector $d$display"
    else
      echo "$prefix  $connector $actual_dir/$display"
    fi
    
    # Recurse into directory (with proper prefix)
    if [ -d "$dir/$actual_dir" ] && [ $current_depth -lt $((max_depth - 1)) ]; then
      local new_prefix="$prefix"
      if $is_last_dir; then
        new_prefix="$prefix    "
      else
        new_prefix="$prefix  │ "
      fi
      show_compact_tree "$dir/$actual_dir" $max_depth $((current_depth + 1)) "$new_prefix" "$show_all_files"
    fi
  done
  
  # --- IMPORTANT: NEVER show files as separate lines ---
  # Files are ONLY shown inline with their parent directory above
}

# --- Parse arguments ---
TARGET="."
LEVEL=4
SHOW_ALL=false

while [[ $# -gt 0 ]]; do
  case $1 in
    -L)
      LEVEL="$2"
      shift 2
      ;;
    -a|--all)
      SHOW_ALL=true
      shift
      ;;
    *)
      TARGET="$1"
      shift
      ;;
  esac
done

# Run
show_compact_tree "$TARGET" $LEVEL 0 "" "$SHOW_ALL"