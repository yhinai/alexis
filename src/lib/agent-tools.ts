import { useInterviewStore, CustomProblem } from '@/lib/store';
import { generateTestCode } from '@/lib/test-runner';
import { Problem } from '@/data/problems';
import { COMPANIES, CompanyProblem, getAllCompanyProblems, NEETCODE_CATEGORIES } from '@/data/company-problems';
import { authFetch } from '@/lib/api-client';
import type { VisualObservation, VisualObservationCategory, VisualObservationSeverity } from '@/lib/visual-observations';

// Wrapper to catch tool errors and prevent disconnections
const wrapTool = (name: string, fn: Function) => async (...args: any[]) => {
    try {
        console.log(`🔧 Tool called: ${name}`, args.length > 0 ? args[0] : '(no args)');
        const result = await fn(...args);
        console.log(`✅ Tool ${name} succeeded`);
        return result;
    } catch (error) {
        console.error(`❌ Tool ${name} failed:`, error);
        return `Error in ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
};

// Helper to get the current problem (works for both regular and practice mode)
function getCurrentProblem(): Problem | CompanyProblem | CustomProblem | null {
    const store = useInterviewStore.getState();
    const { currentProblemId, interviewMode, selectedCompanyId, customProblems } = store;

    if (!currentProblemId) return null;

    // Practice mode - check different sources based on selected company
    if (interviewMode === 'practice' && selectedCompanyId) {
        // Custom problems
        if (selectedCompanyId === 'custom') {
            const customProblem = customProblems.find(p => p.id === currentProblemId);
            if (customProblem) return customProblem;
        }
        // NeetCode 150 problems
        else if (selectedCompanyId === 'neetcode-150') {
            const neetcodeProblem = NEETCODE_CATEGORIES
                .flatMap(cat => cat.problems)
                .find(p => p.id === currentProblemId);
            if (neetcodeProblem) return neetcodeProblem;
        }
        // Regular company problems
        else {
            const company = COMPANIES.find(c => c.id === selectedCompanyId);
            const companyProblem = company?.problems.find(p => p.id === currentProblemId);
            if (companyProblem) return companyProblem;
        }
    }

    // Regular interview mode - check all company problems including NeetCode
    const allProblems = getAllCompanyProblems();
    const problem = allProblems.find(p => p.id === currentProblemId);
    if (problem) return problem;

    // Also check custom problems
    const customProblem = customProblems.find(p => p.id === currentProblemId);
    if (customProblem) return customProblem;

    return null;
}

// Type guard for company problems
function isCompanyProblem(problem: Problem | CompanyProblem): problem is CompanyProblem {
    return 'company' in problem && 'hints' in problem;
}


export const getAgentTools = () => ({
    read_candidate_code: wrapTool('read_candidate_code', async () => {
        const store = useInterviewStore.getState();
        const currentCode = store.code;

        console.log("📝 read_candidate_code called");
        console.log("📝 Code length:", currentCode?.length || 0);
        console.log("📝 Code preview:", currentCode ? currentCode.substring(0, 100) + "..." : "(empty)");

        if (!currentCode || currentCode.trim() === '') {
            return "The code editor is empty. The candidate hasn't written any code yet.";
        }

        // Truncate if too long to avoid token limits/connection drops
        if (currentCode.length > 20000) {
            return currentCode.substring(0, 20000) + "\n...[Code truncated due to length]...";
        }
        return currentCode;
    }),

    read_sandbox_file: wrapTool('read_sandbox_file', async ({ path }: { path: string }) => {
        console.log("Agent requested file read:", path);
        const workspaceId = useInterviewStore.getState().workspaceId;
        if (!workspaceId) return "No active workspace.";

        const response = await authFetch('/api/sandbox/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspaceId, path })
        });
        const json = await response.json();
        const data = json.data || json;
        return data.content || "File not found or empty.";
    }),

    run_coderabbit_analysis: wrapTool('run_coderabbit_analysis', async () => {
        console.log("Agent requested CodeRabbit analysis");
        const workspaceId = useInterviewStore.getState().workspaceId;
        if (!workspaceId) return "No active workspace.";

        const response = await authFetch('/api/analysis/coderabbit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspaceId })
        });
        const data = await response.json();
        return JSON.stringify(data);
    }),

    run_code: wrapTool('run_code', async () => {
        const store = useInterviewStore.getState();
        const workspaceId = store.workspaceId;

        console.log("🚀 run_code called");
        console.log("🚀 Workspace ID:", workspaceId || "(none)");
        console.log("🚀 Code length:", store.code?.length || 0);
        console.log("🚀 Language:", store.language);

        if (!workspaceId) {
            return "No active sandbox workspace. Please wait for the sandbox to initialize.";
        }

        const code = store.code;
        const language = store.language;
        const currentProblemId = store.currentProblemId;

        // Find current problem from either source
        const currentProblem = getCurrentProblem();
        const testCode = currentProblem
            ? generateTestCode(currentProblem, code, language)
            : code;

        const response = await authFetch('/api/sandbox/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspaceId, code: testCode, language })
        });
        const json = await response.json();
        const result = json.data || json;

        // Display output in the UI console (same as manual run)
        if (result.stdout) {
            store.addLog(result.stdout, 'stdout');

            // Parse and store test results if tests were run
            if (currentProblem) {
                const testOutput = result.stdout;
                const passedMatches = testOutput.match(/✓ Test \d+ passed/g) || [];
                const testsTotal = currentProblem.testCases.length;
                const testsPassed = passedMatches.length;

                store.addTestResult({
                    timestamp: Date.now(),
                    problemId: currentProblemId || 'unknown',
                    testsPassed,
                    testsTotal,
                    details: {
                        stdout: result.stdout,
                        stderr: result.stderr,
                    },
                });
            }
        }

        if (result.stderr) {
            store.addLog(result.stderr, 'stderr');
        }

        // Return formatted test results to the agent (truncated to avoid connection drops)
        const stdout = result.stdout ?? '';
        const stderr = result.stderr ?? '';
        const stdoutTrunc = stdout.length > 5000 ? stdout.substring(0, 5000) + "...[truncated]" : stdout;
        const stderrTrunc = stderr.length > 5000 ? stderr.substring(0, 5000) + "...[truncated]" : stderr;

        return `Exit Code: ${result.isError ? 1 : 0}\nStdout: ${stdoutTrunc}\nStderr: ${stderrTrunc}`;
    }),

    install_dependency: wrapTool('install_dependency', async ({ packageName, manager }: { packageName: string, manager: string }) => {
        console.log(`Agent requested install: ${packageName} via ${manager}`);
        const workspaceId = useInterviewStore.getState().workspaceId;
        if (!workspaceId) return "No active workspace.";

        const response = await authFetch('/api/sandbox/install', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspaceId, packageName, manager })
        });
        const json = await response.json();
        const result = json.data || json;
        if (result.isError) {
            return `Failed to install ${packageName}: ${result.stderr}`;
        }
        return `Successfully installed ${packageName}. stdout: ${result.stdout}`;
    }),

    run_hidden_test: wrapTool('run_hidden_test', async ({ testCode }: { testCode: string }) => {
        console.log("Agent requested hidden test execution");
        const workspaceId = useInterviewStore.getState().workspaceId;
        if (!workspaceId) return "No active workspace.";

        const response = await authFetch('/api/sandbox/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspaceId, testCode })
        });
        const json = await response.json();
        const result = json.data || json;
        return `Test Execution Result:\nExit Code: ${result.isError ? 1 : 0}\nStdout: ${result.stdout}\nStderr: ${result.stderr}`;
    }),

    get_current_problem: wrapTool('get_current_problem', async () => {
        console.log("Agent requested current problem info");
        const store = useInterviewStore.getState();
        const { interviewMode, selectedCompanyId } = store;
        const problem = getCurrentProblem();

        if (!problem) {
            return "No problem selected yet. Please wait for the candidate to select a problem.";
        }

        // Base problem info
        const problemInfo: Record<string, unknown> = {
            title: problem.title,
            difficulty: problem.difficulty,
            description: problem.description,
            examples: problem.examples,
            constraints: problem.constraints,
            functionName: problem.functionName,
            hint: `The candidate needs to implement a function called '${problem.functionName}'.`
        };

        // Add practice interview specific info
        if (interviewMode === 'practice' && isCompanyProblem(problem)) {
            const company = COMPANIES.find(c => c.id === selectedCompanyId);
            problemInfo.interviewMode = 'practice';
            problemInfo.companyName = company?.name || 'Unknown';
            problemInfo.tags = problem.tags;
            problemInfo.frequency = problem.frequency;
            problemInfo.hintsAvailable = problem.hints.length;
            problemInfo.coachingNote = `This is a PRACTICE session. Your role is to be a supportive COACH, not an evaluator. Help the student learn and grow. Provide encouragement and constructive guidance.`;
        }

        return JSON.stringify(problemInfo, null, 2);
    }),

    get_interview_mode: wrapTool('get_interview_mode', async () => {
        console.log("Agent requested interview mode info");
        const store = useInterviewStore.getState();
        const { interviewMode, selectedCompanyId } = store;

        if (interviewMode === 'practice') {
            const company = COMPANIES.find(c => c.id === selectedCompanyId);
            return JSON.stringify({
                mode: 'practice',
                companyName: company?.name || 'Unknown',
                role: 'COACH',
                guidance: `You are conducting a PRACTICE interview in coaching mode. Your goals:
1. Be SUPPORTIVE and ENCOURAGING - this is for learning
2. Provide HINTS when the student is stuck (ask if they want a hint first)
3. Explain CONCEPTS when they don't understand
4. Focus on TEACHING, not evaluating
5. NEVER give hire/no-hire recommendations
6. Celebrate small wins and progress
7. Frame mistakes as learning opportunities`
            }, null, 2);
        }

        return JSON.stringify({
            mode: 'real',
            role: 'INTERVIEWER',
            guidance: 'Standard interview mode. Evaluate the candidate professionally.'
        }, null, 2);
    }),

    provide_hint: wrapTool('provide_hint', async ({ level }: { level?: number }) => {
        console.log("Agent requested hint, level:", level);
        const store = useInterviewStore.getState();
        const { interviewMode } = store;

        if (interviewMode !== 'practice') {
            return "Hints are only available in practice mode.";
        }

        const problem = getCurrentProblem();
        if (!problem || !isCompanyProblem(problem)) {
            return "No problem with hints available.";
        }

        const hintLevel = typeof level === 'number' ? Math.max(0, Math.min(level, problem.hints.length - 1)) : 0;
        const hint = problem.hints[hintLevel];

        if (!hint) {
            return "No more hints available for this problem.";
        }

        return JSON.stringify({
            hintNumber: hintLevel + 1,
            totalHints: problem.hints.length,
            hint: hint,
            moreHintsAvailable: hintLevel < problem.hints.length - 1
        }, null, 2);
    }),

    explain_concept: wrapTool('explain_concept', async ({ topic }: { topic: string }) => {
        console.log("Agent requested concept explanation:", topic);
        const store = useInterviewStore.getState();
        const { interviewMode } = store;

        if (interviewMode !== 'practice') {
            return "Concept explanations are for practice mode coaching.";
        }

        // Return confirmation that the AI should explain this concept
        // The AI will use its own knowledge to explain
        return JSON.stringify({
            status: "ready_to_explain",
            topic: topic,
            action: "You should now explain this concept verbally to the candidate in a clear, friendly way. Use simple examples and check if they understand."
        }, null, 2);
    }),

    get_integrity_status: wrapTool('get_integrity_status', async () => {
        const store = useInterviewStore.getState();
        if (store.getIntegrityReport) {
            return store.getIntegrityReport();
        }
        return "Integrity monitoring not available.";
    }),

    record_visual_observation: wrapTool('record_visual_observation', async (
        { category, severity, note }: {
            category: VisualObservationCategory;
            severity: VisualObservationSeverity;
            note: string;
        }
    ) => {
        const trimmed = (note || '').slice(0, 200);
        const obs: VisualObservation = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            category,
            severity,
            note: trimmed,
        };
        useInterviewStore.getState().addVisualObservation(obs);
        return { ok: true };
    }),

    end_interview_now: wrapTool('end_interview_now', async () => {
        const store = useInterviewStore.getState();
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('interview:end'));
        }
        setTimeout(() => {
            store.agentDisconnect?.();
            store.onEndInterview?.();
        }, 1500);
        return { ok: true };
    }),

    skip_to_next_problem: wrapTool('skip_to_next_problem', async () => {
        const store = useInterviewStore.getState();
        const { selectedCompanyId, currentProblemId } = store;
        const current = getCurrentProblem();
        if (!current) return { ok: false, reason: 'no_current_problem' };

        let pool: (Problem | CompanyProblem)[] = [];
        if (selectedCompanyId) {
            const company = COMPANIES.find(c => c.id === selectedCompanyId);
            if (company) pool = company.problems;
            else pool = getAllCompanyProblems();
        } else {
            pool = getAllCompanyProblems();
        }

        const sameDifficulty = pool.filter(
            p => p.difficulty === current.difficulty && p.id !== currentProblemId
        );
        if (sameDifficulty.length === 0) {
            return { ok: false, reason: 'no_more_same_difficulty' };
        }
        const next = sameDifficulty[Math.floor(Math.random() * sameDifficulty.length)];
        store.setCurrentProblemId(next.id);
        return {
            ok: true,
            nextProblem: { id: next.id, title: next.title, difficulty: next.difficulty },
        };
    }),

    change_difficulty: wrapTool('change_difficulty', async ({ direction }: { direction: 'easier' | 'harder' }) => {
        const store = useInterviewStore.getState();
        const { selectedCompanyId, currentProblemId } = store;
        const current = getCurrentProblem();

        const order: Array<'Easy' | 'Medium' | 'Hard'> = ['Easy', 'Medium', 'Hard'];
        const currentIdx = current ? order.indexOf(current.difficulty as 'Easy' | 'Medium' | 'Hard') : 1;
        let targetIdx: number;
        if (direction === 'easier') {
            targetIdx = Math.max(0, currentIdx - 1);
        } else {
            targetIdx = Math.min(order.length - 1, currentIdx + 1);
        }
        const targetDifficulty = order[targetIdx];

        let pool: (Problem | CompanyProblem)[] = [];
        if (selectedCompanyId) {
            const company = COMPANIES.find(c => c.id === selectedCompanyId);
            if (company) pool = company.problems;
            else pool = getAllCompanyProblems();
        } else {
            pool = getAllCompanyProblems();
        }

        const candidates = pool.filter(
            p => p.difficulty === targetDifficulty && p.id !== currentProblemId
        );
        if (candidates.length === 0) {
            return { ok: false, reason: 'no_problems_at_difficulty' };
        }
        const next = candidates[Math.floor(Math.random() * candidates.length)];
        store.setCurrentProblemId(next.id);
        return {
            ok: true,
            nextProblem: { id: next.id, title: next.title, difficulty: next.difficulty },
        };
    }),

    take_break: wrapTool('take_break', async ({ seconds }: { seconds: number }) => {
        const capped = Math.max(0, Math.min(600, Math.floor(seconds || 0)));
        const until = Date.now() + capped * 1000;
        useInterviewStore.getState().setBreakUntilMs(until);
        return { ok: true, seconds: capped };
    }),

    repeat_question: wrapTool('repeat_question', async () => {
        const problem = getCurrentProblem();
        if (!problem) return { ok: false, reason: 'no_current_problem' };
        return {
            problemTitle: problem.title,
            problemDescription: problem.description,
            examples: problem.examples,
            constraints: problem.constraints,
        };
    }),

    end_interview: wrapTool('end_interview', async () => {
        console.log("🏁 Agent triggered end_interview");
        const store = useInterviewStore.getState();
        const { onEndInterview } = store;

        if (!onEndInterview) {
            return "End interview handler not available.";
        }

        // Delay slightly so the tool response is sent back to Gemini
        // before we tear down the connection
        setTimeout(() => {
            onEndInterview();
        }, 1500);

        return "Interview ending. The report will be generated now. Say your final goodbye to the candidate.";
    })
});
