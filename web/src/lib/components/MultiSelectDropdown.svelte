<script lang="ts">
  import { onMount } from 'svelte';

  let {
    label,
    options = [],
    selected = $bindable([]),
    placeholder = 'Search...'
  } = $props<{
    label: string;
    options: string[];
    selected: string[];
    placeholder?: string;
  }>();

  let isOpen = $state(false);
  let searchQuery = $state('');
  let dropdownRef: HTMLDivElement | null = $state(null);

  // Filtered options based on search
  const filteredOptions = $derived(
    searchQuery
      ? options.filter(opt => opt.toLowerCase().includes(searchQuery.toLowerCase()))
      : options
  );

  // Selected count for display
  const selectedCount = $derived(selected.length);
  const displayText = $derived(
    selectedCount === 0 ? `All ${label}` : `${label} (${selectedCount})`
  );

  function toggleDropdown() {
    isOpen = !isOpen;
    if (isOpen) {
      searchQuery = '';
    }
  }

  function toggleOption(option: string) {
    if (selected.includes(option)) {
      selected = selected.filter(s => s !== option);
    } else {
      selected = [...selected, option];
    }
  }

  function selectAll() {
    selected = [];
  }

  function handleClickOutside(event: MouseEvent) {
    if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
      isOpen = false;
    }
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });
</script>

<div class="multi-select-dropdown relative" bind:this={dropdownRef}>
  <!-- Trigger Button -->
  <button
    type="button"
    class="dropdown-trigger px-4 py-2 text-sm font-medium border rounded-lg transition-colors
      {isOpen ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}"
    onclick={toggleDropdown}
  >
    <div class="flex items-center gap-2">
      <span>{displayText}</span>
      <svg
        class="w-4 h-4 transition-transform {isOpen ? 'rotate-180' : ''}"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
      </svg>
    </div>
  </button>

  <!-- Dropdown Panel -->
  {#if isOpen}
    <div class="dropdown-panel absolute z-50 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200">
      <!-- Search Input -->
      <div class="p-3 border-b border-gray-200">
        <input
          type="text"
          bind:value={searchQuery}
          placeholder={placeholder}
          class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          onclick={(e) => e.stopPropagation()}
        />
      </div>

      <!-- Options List -->
      <div class="max-h-64 overflow-y-auto p-2">
        {#if filteredOptions.length === 0}
          <div class="px-3 py-2 text-sm text-gray-500 text-center">
            No {label.toLowerCase()} found
          </div>
        {:else}
          <!-- Select All Option -->
          <label class="flex items-center px-3 py-2 hover:bg-gray-50 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={selectedCount === 0}
              onchange={selectAll}
              class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span class="ml-2 text-sm font-medium text-gray-700">All {label}</span>
          </label>

          <div class="border-t border-gray-200 my-1"></div>

          <!-- Individual Options -->
          {#each filteredOptions as option (option)}
            <label class="flex items-center px-3 py-2 hover:bg-gray-50 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onchange={() => toggleOption(option)}
                class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span class="ml-2 text-sm text-gray-700">{option}</span>
            </label>
          {/each}
        {/if}
      </div>

      <!-- Footer with counts -->
      <div class="px-3 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-600 rounded-b-lg">
        {selectedCount > 0 ? `${selectedCount} selected` : 'All selected'}
        {#if searchQuery}
          · {filteredOptions.length} of {options.length} shown
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .dropdown-panel {
    animation: slideDown 0.15s ease-out;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
