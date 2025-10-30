<script lang="ts">
  import { onMount } from 'svelte';
  import { todoStore } from '../stores/todos.svelte';

  // Filter options state
  let filterOptions = $state<{
    projects: string[];
    tags: string[];
    assignees: string[];
    priorities: string[];
  }>({
    projects: [],
    tags: [],
    assignees: [],
    priorities: []
  });

  // Derived filter arrays with 'all' prepended
  const projects = $derived(['all', ...filterOptions.projects]);
  const priorities = $derived(['all', ...filterOptions.priorities]);
  const tags = $derived(['all', ...filterOptions.tags]);
  const assignees = $derived(['all', 'unassigned', ...filterOptions.assignees]);

  onMount(async () => {
    // Fetch filter options from API
    try {
      const response = await fetch('/api/todos/filter-options');
      const data = await response.json();

      if (data.success) {
        filterOptions = {
          projects: data.projects || [],
          tags: data.tags || [],
          assignees: data.assignees || [],
          priorities: data.priorities || []
        };
      }
    } catch (error) {
      console.error('Failed to load filter options:', error);
    }
  });

  function handleProjectFilter(project: string) {
    todoStore.setProjectFilter(project);
  }

  function handlePriorityFilter(priority: string) {
    todoStore.setPriorityFilter(priority);
  }

  function handleTagFilter(tag: string) {
    todoStore.toggleTagFilter(tag);
  }

  function handleAssigneeFilter(assignee: string) {
    todoStore.setAssigneeFilter(assignee);
  }

  function handleSearchInput(event: Event) {
    const target = event.target as HTMLInputElement;
    todoStore.setSearchFilter(target.value);
  }

  function clearAllFilters() {
    todoStore.clearFilters();
    const searchInput = document.getElementById('searchInput') as HTMLInputElement;
    if (searchInput) searchInput.value = '';
  }

  function isTagActive(tag: string): boolean {
    return todoStore.filters.tags.has(tag);
  }

  $: hasActiveFilters =
    todoStore.filters.search !== '' ||
    todoStore.filters.project !== 'all' ||
    todoStore.filters.priority !== 'all' ||
    (!todoStore.filters.tags.has('all') && todoStore.filters.tags.size > 0) ||
    todoStore.filters.assignee !== 'all';
</script>

<div class="bg-white border-b border-gray-200">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
    <div class="space-y-4">
      <!-- Search Bar -->
      <div class="flex items-center space-x-4">
        <div class="flex-1 relative">
          <input
            type="text"
            id="searchInput"
            placeholder="Search todos..."
            value={todoStore.filters.search}
            on:input={handleSearchInput}
            class="w-full px-4 py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg class="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>
        <button
          id="clearFilters"
          on:click={clearAllFilters}
          class="px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Clear All
        </button>
      </div>

      <!-- Filter Groups -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Project Filter -->
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-2">Projects</label>
          <div class="flex flex-wrap gap-1" id="projectFilters">
            {#each projects as project}
              <button
                class="filter-chip px-3 py-1 text-xs rounded-full border transition-colors {todoStore.filters.project === project ? 'bg-blue-100 border-blue-500' : 'border-gray-300 bg-white hover:bg-gray-50'}"
                on:click={() => handleProjectFilter(project)}
              >
                {project === 'all' ? 'All Projects' : project.charAt(0).toUpperCase() + project.slice(1)}
              </button>
            {/each}
          </div>
        </div>

        <!-- Priority Filter -->
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-2">Priority</label>
          <div class="flex flex-wrap gap-1" id="priorityFilters">
            {#each priorities as priority}
              <button
                class="filter-chip px-3 py-1 text-xs rounded-full border transition-colors
                  {todoStore.filters.priority === priority
                    ? priority === 'urgent' ? 'bg-red-100 border-red-500 text-red-700'
                    : priority === 'high' ? 'bg-orange-100 border-orange-500 text-orange-700'
                    : priority === 'medium' ? 'bg-yellow-100 border-yellow-500 text-yellow-700'
                    : priority === 'low' ? 'bg-green-100 border-green-500 text-green-700'
                    : 'bg-blue-100 border-blue-500'
                    : `border-gray-300 bg-white hover:bg-gray-50 ${
                      priority === 'urgent' ? 'text-red-700 border-red-300 hover:bg-red-50'
                      : priority === 'high' ? 'text-orange-700 border-orange-300 hover:bg-orange-50'
                      : priority === 'medium' ? 'text-yellow-700 border-yellow-300 hover:bg-yellow-50'
                      : priority === 'low' ? 'text-green-700 border-green-300 hover:bg-green-50'
                      : ''
                    }`}"
                on:click={() => handlePriorityFilter(priority)}
              >
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </button>
            {/each}
          </div>
        </div>

        <!-- Tags Filter -->
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-2">Tags</label>
          <div class="flex flex-wrap gap-1" id="tagFilters">
            {#each tags as tag}
              <button
                class="filter-chip px-3 py-1 text-xs rounded-full border transition-colors
                  {isTagActive(tag)
                    ? 'bg-blue-100 border-blue-500 text-blue-700'
                    : 'border-gray-300 bg-white hover:bg-gray-50'}"
                on:click={() => handleTagFilter(tag)}
              >
                {tag === 'all' ? 'All Tags' : tag}
              </button>
            {/each}
          </div>
        </div>

        <!-- Assignee Filter -->
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-2">Assignee</label>
          <div class="flex flex-wrap gap-1" id="assigneeFilters">
            {#each assignees as assignee}
              <button
                class="filter-chip px-3 py-1 text-xs rounded-full border transition-colors {todoStore.filters.assignee === assignee ? 'bg-blue-100 border-blue-500' : 'border-gray-300 bg-white hover:bg-gray-50'}"
                on:click={() => handleAssigneeFilter(assignee)}
              >
                {assignee === 'all' ? 'All' : assignee === 'unassigned' ? 'Unassigned' : assignee === 'me' ? 'Me' : 'Team'}
              </button>
            {/each}
          </div>
        </div>
      </div>

      <!-- Active Filters Display -->
      {#if hasActiveFilters}
        <div id="activeFilters">
          <div class="flex items-center space-x-2">
            <span class="text-xs text-gray-500">Active filters:</span>
            <div id="activeFiltersList" class="flex flex-wrap gap-2">
              {#if todoStore.filters.search}
                <span class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                  Search: {todoStore.filters.search}
                  <button class="ml-1 hover:text-blue-900" on:click={() => todoStore.setSearchFilter('')}>
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                  </button>
                </span>
              {/if}

              {#if todoStore.filters.project !== 'all'}
                <span class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                  Project: {todoStore.filters.project}
                  <button class="ml-1 hover:text-blue-900" on:click={() => todoStore.setProjectFilter('all')}>
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                  </button>
                </span>
              {/if}

              {#if todoStore.filters.priority !== 'all'}
                <span class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                  Priority: {todoStore.filters.priority}
                  <button class="ml-1 hover:text-blue-900" on:click={() => todoStore.setPriorityFilter('all')}>
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                  </button>
                </span>
              {/if}

              {#if !todoStore.filters.tags.has('all')}
                {#each Array.from(todoStore.filters.tags) as tag}
                  <span class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                    Tag: {tag}
                    <button class="ml-1 hover:text-blue-900" on:click={() => todoStore.toggleTagFilter(tag)}>
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                      </svg>
                    </button>
                  </span>
                {/each}
              {/if}

              {#if todoStore.filters.assignee !== 'all'}
                <span class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                  Assignee: {todoStore.filters.assignee}
                  <button class="ml-1 hover:text-blue-900" on:click={() => todoStore.setAssigneeFilter('all')}>
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                  </button>
                </span>
              {/if}
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>