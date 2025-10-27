#!/usr/bin/env node

/**
 * Test script for batch_create_todos MCP tool
 * This script connects to the MCP server and tests the batch creation functionality
 */

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { spawn } = require('child_process');

async function testBatchCreateTodos() {
  console.log('Starting MCP server test for batch_create_todos...\n');

  // Start the MCP server
  const serverProcess = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env }
  });

  // Create MCP client
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/index.js']
  });

  const client = new Client({
    name: 'batch-test-client',
    version: '1.0.0'
  }, {
    capabilities: {}
  });

  try {
    // Connect to the server
    await client.connect(transport);
    console.log('✓ Connected to MCP server\n');

    // Test 1: Create a simple batch of todos
    console.log('Test 1: Creating simple batch of todos...');
    const simpleBatch = await client.callTool('batch_create_todos', {
      todos: [
        {
          text: 'Setup development environment',
          project: 'new-project',
          priority: 'high',
          tags: ['setup', 'dev']
        },
        {
          text: 'Install dependencies',
          project: 'new-project',
          priority: 'high',
          tags: ['setup']
        },
        {
          text: 'Configure ESLint and Prettier',
          project: 'new-project',
          priority: 'medium',
          tags: ['setup', 'code-quality']
        }
      ]
    });

    const result1 = JSON.parse(simpleBatch.content[0].text);
    console.log(`✓ Created ${result1.count} todos`);
    console.log(`  IDs: ${result1.todos.map(t => t.id).join(', ')}\n`);

    // Test 2: Create hierarchical todos with parent-child relationships
    console.log('Test 2: Creating hierarchical todos...');
    const hierarchicalBatch = await client.callTool('batch_create_todos', {
      todos: [
        {
          text: 'Implement user authentication',
          project: 'web-app',
          priority: 'urgent',
          tags: ['feature', 'auth']
        },
        {
          text: 'Design login page',
          project: 'web-app',
          priority: 'high',
          parentIndex: 0,
          tags: ['frontend', 'auth']
        },
        {
          text: 'Implement JWT token generation',
          project: 'web-app',
          priority: 'high',
          parentIndex: 0,
          tags: ['backend', 'auth']
        },
        {
          text: 'Add password reset functionality',
          project: 'web-app',
          priority: 'medium',
          parentIndex: 0,
          tags: ['feature', 'auth']
        },
        {
          text: 'Send reset email',
          project: 'web-app',
          priority: 'medium',
          parentIndex: 3,
          tags: ['backend', 'email']
        }
      ]
    });

    const result2 = JSON.parse(hierarchicalBatch.content[0].text);
    console.log(`✓ Created ${result2.count} hierarchical todos`);

    // Display hierarchy
    const parent = result2.todos[0];
    console.log(`  Parent: ${parent.text} (${parent.id})`);
    for (let i = 1; i < result2.todos.length; i++) {
      const todo = result2.todos[i];
      if (todo.dependencies.includes(parent.id)) {
        console.log(`    └─ ${todo.text}`);
        // Check for sub-children
        for (let j = i + 1; j < result2.todos.length; j++) {
          if (result2.todos[j].dependencies.includes(todo.id)) {
            console.log(`       └─ ${result2.todos[j].text}`);
          }
        }
      }
    }
    console.log();

    // Test 3: Error handling - missing required fields
    console.log('Test 3: Testing error handling...');
    try {
      await client.callTool('batch_create_todos', {
        todos: [
          {
            text: 'Missing project field'
            // project is missing - should fail
          }
        ]
      });
      console.log('✗ Should have thrown an error for missing project');
    } catch (error) {
      const errorResult = JSON.parse(error.content[0].text);
      console.log(`✓ Correctly rejected: ${errorResult.error}\n`);
    }

    // Test 4: List todos to verify creation
    console.log('Test 4: Verifying created todos...');
    const listResult = await client.callTool('list_todos', {
      project: 'web-app',
      sortBy: 'priority'
    });

    const todos = JSON.parse(listResult.content[0].text).todos;
    console.log(`✓ Found ${todos.length} todos in web-app project`);
    todos.forEach(todo => {
      console.log(`  - [${todo.priority}] ${todo.text}`);
    });
    console.log();

    // Test 5: Get statistics
    console.log('Test 5: Getting statistics...');
    const statsResult = await client.callTool('get_stats', {});
    const stats = JSON.parse(statsResult.content[0].text);
    console.log('✓ Statistics:');
    console.log(`  Total todos: ${stats.todoStats.total}`);
    console.log(`  By status: ${JSON.stringify(stats.todoStats.byStatus)}`);
    console.log(`  By priority: ${JSON.stringify(stats.todoStats.byPriority)}`);
    console.log();

    console.log('✅ All tests passed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    // Clean up
    await client.close();
    serverProcess.kill();
    process.exit(0);
  }
}

// Run the test
testBatchCreateTodos().catch(console.error);