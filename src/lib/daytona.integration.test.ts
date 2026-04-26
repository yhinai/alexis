import { describe, it, expect, afterAll } from 'vitest';
import { daytonaService } from './daytona';

// Only run if we have a real API key and we explicitly want to run integration tests
const runIntegration = process.env.RUN_INTEGRATION_TESTS === 'true' && process.env.DAYTONA_API_KEY;

describe.skipIf(!runIntegration)('DaytonaService Full Integration', () => {
  let workspaceId: string | null = null;

  // Cleanup hook - always runs even if tests fail mid-way
  afterAll(async () => {
    if (workspaceId) {
      console.log(`🧹 Cleanup: Deleting workspace ${workspaceId}...`);
      try {
        await daytonaService.cleanupWorkspace(workspaceId);
        console.log('✅ Cleanup successful');
      } catch (err) {
        console.error('⚠️ Cleanup failed:', err);
      }
    }
  });

  // Helper to skip gracefully on resource limits
  const skipOnResourceLimit = (error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('disk limit') ||
        errorMessage.includes('limit exceeded') ||
        errorMessage.includes('Maximum allowed')) {
      console.log('⚠️ Skipping test due to Daytona resource limits:', errorMessage);
      console.log('💡 Consider archiving unused sandboxes at https://app.daytona.io/dashboard');
      return true;
    }
    return false;
  };

  it('1. Create workspace', async () => {
    try {
      console.log('📦 Creating integration test workspace...');
      const workspace = await daytonaService.createWorkspace({ language: 'python' });
      workspaceId = workspace.id;
      expect(workspace.id).toBeDefined();
      expect(typeof workspace.id).toBe('string');
      console.log(`✅ Workspace created: ${workspace.id}`);
    } catch (error) {
      if (skipOnResourceLimit(error)) return;
      throw error;
    }
  }, 60000);

  it('2. Execute Python code', async () => {
    if (!workspaceId) {
      console.log('⏭️ Skipping: No workspace available');
      return;
    }

    console.log('🐍 Executing Python code...');
    const result = await daytonaService.executeCode(
      workspaceId,
      'print("Hello from Daytona!")\nprint(1 + 1)',
      'python'
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Hello from Daytona!');
    expect(result.stdout).toContain('2');
    console.log('✅ Python execution successful');
  }, 30000);

  it('3. Execute shell command', async () => {
    if (!workspaceId) {
      console.log('⏭️ Skipping: No workspace available');
      return;
    }

    console.log('🖥️ Executing shell command...');
    const result = await daytonaService.executeCommand(workspaceId, 'echo "Shell test" && pwd');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Shell test');
    console.log('✅ Shell command successful');
  }, 30000);

  it('4. File operations - write and read', async () => {
    if (!workspaceId) {
      console.log('⏭️ Skipping: No workspace available');
      return;
    }

    console.log('📝 Testing file write...');
    const testContent = 'Integration test content\nLine 2\nLine 3';
    await daytonaService.saveFile(workspaceId, '/tmp/integration_test.txt', testContent);

    console.log('📖 Testing file read...');
    const readContent = await daytonaService.readFile(workspaceId, '/tmp/integration_test.txt');
    expect(readContent).toContain('Integration test content');
    expect(readContent).toContain('Line 2');
    console.log('✅ File operations successful');
  }, 60000);

  it('5. List files in directory', async () => {
    if (!workspaceId) {
      console.log('⏭️ Skipping: No workspace available');
      return;
    }

    console.log('📂 Listing files in /tmp...');
    const files = await daytonaService.listFiles(workspaceId, '/tmp');
    expect(Array.isArray(files)).toBe(true);
    expect(files.length).toBeGreaterThan(0);

    // Should find our test file
    const testFile = files.find(f => f.name === 'integration_test.txt');
    expect(testFile).toBeDefined();
    console.log(`✅ Found ${files.length} files, including our test file`);
  }, 60000);

  it('6. Execute code with file persistence', async () => {
    if (!workspaceId) {
      console.log('⏭️ Skipping: No workspace available');
      return;
    }

    console.log('💾 Executing code with file persistence...');
    const code = `
import os
print("Script executed successfully")
print(f"Working directory: {os.getcwd()}")
`;
    const result = await daytonaService.executeCodeWithFile(
      workspaceId,
      code,
      'python',
      'persistent_test.py'
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Script executed successfully');
    console.log('✅ Persisted code execution successful');
  }, 60000);

  it('7. Execute JavaScript/Node code', async () => {
    if (!workspaceId) {
      console.log('⏭️ Skipping: No workspace available');
      return;
    }

    console.log('🟨 Executing JavaScript code...');
    const result = await daytonaService.executeCode(
      workspaceId,
      'console.log("JS works!"); console.log(Array.from({length: 3}, (_, i) => i));',
      'javascript'
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('JS works!');
    console.log('✅ JavaScript execution successful');
  }, 30000);

  it('8. Error handling - execute invalid code', async () => {
    if (!workspaceId) {
      console.log('⏭️ Skipping: No workspace available');
      return;
    }

    console.log('🔴 Testing error handling with invalid code...');
    const result = await daytonaService.executeCode(
      workspaceId,
      'this is not valid python syntax !!!',
      'python'
    );
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.length).toBeGreaterThan(0);
    console.log('✅ Error handling works correctly');
  }, 30000);

  it('9. Cleanup workspace', async () => {
    if (!workspaceId) {
      console.log('⏭️ Skipping: No workspace to cleanup');
      return;
    }

    console.log(`🗑️ Cleaning up workspace ${workspaceId}...`);
    await daytonaService.cleanupWorkspace(workspaceId);
    console.log('✅ Workspace cleaned up successfully');
    workspaceId = null; // Prevent double cleanup in afterAll
  }, 30000);
});
