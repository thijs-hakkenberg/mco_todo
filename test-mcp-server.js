#!/usr/bin/env node

/**
 * Test script for the Git-Based MCP Todo Server
 * This simulates Claude Desktop interaction with the MCP server
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const TODO_REPO_PATH = '/Users/thijshakkenberg/my-todos';
const SERVER_PATH = '/Users/thijshakkenberg/our_todo/dist/index.js';

// MCP protocol messages
const messages = {
  initialize: {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '0.1.0',
      capabilities: {
        tools: {}
      },
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  },
  listTools: {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  },
  createTodo: {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'create_todo',
      arguments: {
        text: 'Test todo from MCP server',
        project: 'test-project',
        priority: 'high',
        tags: ['test', 'mcp']
      }
    }
  },
  listTodos: {
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'list_todos',
      arguments: {}
    }
  }
};

async function testMCPServer() {
  console.log('🚀 Starting MCP server test...\n');

  // Start the MCP server
  const server = spawn('node', [SERVER_PATH], {
    env: {
      ...process.env,
      TODO_REPO_PATH,
      GIT_USER_NAME: 'Test User',
      GIT_USER_EMAIL: 'test@example.com',
      AUTO_SYNC: 'false'
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let responseBuffer = '';

  server.stdout.on('data', (data) => {
    responseBuffer += data.toString();

    // Try to parse complete JSON-RPC messages
    const lines = responseBuffer.split('\n');
    for (const line of lines) {
      if (line.trim() && line.startsWith('{')) {
        try {
          const response = JSON.parse(line);
          console.log('📥 Response:', JSON.stringify(response, null, 2));

          // Handle different response types
          if (response.id === 1) {
            console.log('✅ Server initialized successfully\n');
            // Send list tools request
            sendMessage(server, messages.listTools);
          } else if (response.id === 2) {
            console.log('✅ Tools listed successfully\n');
            // Send create todo request
            sendMessage(server, messages.createTodo);
          } else if (response.id === 3) {
            console.log('✅ Todo created successfully\n');
            // Send list todos request
            sendMessage(server, messages.listTodos);
          } else if (response.id === 4) {
            console.log('✅ Todos listed successfully\n');
            console.log('\n🎉 All tests passed!');
            server.kill();
            process.exit(0);
          }
        } catch (e) {
          // Not a complete JSON message yet
        }
      }
    }

    // Keep only the last incomplete line
    responseBuffer = lines[lines.length - 1];
  });

  server.stderr.on('data', (data) => {
    console.error('❌ Server error:', data.toString());
  });

  server.on('close', (code) => {
    console.log(`\n🔚 Server exited with code ${code}`);
  });

  // Send initial message
  console.log('📤 Sending initialize request...');
  sendMessage(server, messages.initialize);

  // Timeout after 10 seconds
  setTimeout(() => {
    console.error('\n⏱️ Test timeout - killing server');
    server.kill();
    process.exit(1);
  }, 10000);
}

function sendMessage(server, message) {
  const messageStr = JSON.stringify(message) + '\n';
  server.stdin.write(messageStr);
}

// Run the test
testMCPServer().catch(console.error);