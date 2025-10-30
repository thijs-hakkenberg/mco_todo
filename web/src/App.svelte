<script lang="ts">
  import KanbanBoard from './lib/components/KanbanBoard.svelte'
</script>

<main>
  <KanbanBoard />
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
  }

  main {
    width: 100%;
    min-height: 100vh;
    overflow-y: auto;
  }
</style>
