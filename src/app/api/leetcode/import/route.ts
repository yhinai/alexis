import { NextRequest, NextResponse } from 'next/server';

interface LeetCodeQuestion {
  questionId: string;
  title: string;
  titleSlug: string;
  content: string;
  difficulty: string;
  topicTags: { name: string }[];
  codeSnippets: { lang: string; langSlug: string; code: string }[];
  hints: string[];
  exampleTestcases: string;
}

interface GraphQLResponse {
  data?: {
    question: LeetCodeQuestion | null;
  };
  errors?: { message: string }[];
}

async function fetchLeetCodeProblem(slug: string): Promise<LeetCodeQuestion | null> {
  const query = `
    query questionData($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        questionId
        title
        titleSlug
        content
        difficulty
        topicTags {
          name
        }
        codeSnippets {
          lang
          langSlug
          code
        }
        hints
        exampleTestcases
      }
    }
  `;

  try {
    const response = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://leetcode.com',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      body: JSON.stringify({
        query,
        variables: { titleSlug: slug },
      }),
    });

    if (!response.ok) {
      console.error('LeetCode API error:', response.status, response.statusText);
      return null;
    }

    const data: GraphQLResponse = await response.json();

    if (data.errors) {
      console.error('LeetCode GraphQL errors:', data.errors);
      return null;
    }

    return data.data?.question || null;
  } catch (error) {
    console.error('Failed to fetch from LeetCode:', error);
    return null;
  }
}

function htmlToPlainText(html: string): string {
  // Remove HTML tags and decode entities while preserving structure
  return html
    // Handle pre/code blocks first - preserve content
    .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, content) => {
      return '\n```\n' + content.replace(/<[^>]+>/g, '').trim() + '\n```\n';
    })
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
    // Preserve bold text (often used for Input:/Output:/Constraints:)
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
    // Handle list items - important for constraints
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/li>/gi, '')
    .replace(/<ul[^>]*>/gi, '\n')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>/gi, '\n')
    .replace(/<\/ol>/gi, '\n')
    // Handle line breaks and paragraphs
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<div[^>]*>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    // Handle superscript (often used in constraints like 10^5)
    .replace(/<sup[^>]*>([\s\S]*?)<\/sup>/gi, '^$1')
    .replace(/<sub[^>]*>([\s\S]*?)<\/sub>/gi, '_$1')
    // Remove remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&le;/g, '≤')
    .replace(/&ge;/g, '≥')
    .replace(/&times;/g, '×')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
    // Clean up whitespace
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function extractExamples(content: string): { input: string; output: string; explanation?: string }[] {
  const examples: { input: string; output: string; explanation?: string }[] = [];

  // Try multiple patterns to match different LeetCode formats

  // Pattern 1: Example X:\nInput: ...\nOutput: ...\nExplanation: ...
  const pattern1 = /Example\s*\d*:?\s*\n*\**Input:?\**\s*([^\n]+)\s*\n*\**Output:?\**\s*([^\n]+)(?:\s*\n*\**Explanation:?\**\s*([^\n]+))?/gi;

  let match;
  while ((match = pattern1.exec(content)) !== null) {
    examples.push({
      input: match[1].trim(),
      output: match[2].trim(),
      explanation: match[3]?.trim(),
    });
  }

  // Pattern 2: **Input:** ... **Output:** ... format (markdown bold)
  if (examples.length === 0) {
    const pattern2 = /\*\*Input:?\*\*\s*([^\n*]+)\s*\n*\*\*Output:?\*\*\s*([^\n*]+)(?:\s*\n*\*\*Explanation:?\*\*\s*([^\n*]+))?/gi;
    while ((match = pattern2.exec(content)) !== null) {
      examples.push({
        input: match[1].trim(),
        output: match[2].trim(),
        explanation: match[3]?.trim(),
      });
    }
  }

  // Pattern 3: Simple Input:/Output: on separate lines
  if (examples.length === 0) {
    const inputMatches = content.match(/Input:\s*([^\n]+)/gi) || [];
    const outputMatches = content.match(/Output:\s*([^\n]+)/gi) || [];

    for (let i = 0; i < Math.min(inputMatches.length, outputMatches.length); i++) {
      const inputVal = inputMatches[i].replace(/Input:\s*/i, '').trim();
      const outputVal = outputMatches[i].replace(/Output:\s*/i, '').trim();
      if (inputVal && outputVal) {
        examples.push({
          input: inputVal,
          output: outputVal,
        });
      }
    }
  }

  // Pattern 4: Look for code blocks with test cases
  if (examples.length === 0) {
    const codeBlockPattern = /`([^`]+)`/g;
    const codeBlocks: string[] = [];
    while ((match = codeBlockPattern.exec(content)) !== null) {
      codeBlocks.push(match[1].trim());
    }
    // Try to pair them as input/output
    if (codeBlocks.length >= 2) {
      examples.push({
        input: codeBlocks[0],
        output: codeBlocks[1],
      });
    }
  }

  return examples.length > 0 ? examples : [{ input: '', output: '' }];
}

function extractConstraints(content: string): string[] {
  const constraints: string[] = [];

  // Try multiple patterns for constraints section

  // Pattern 1: **Constraints:** or Constraints: followed by list
  const constraintsMatch = content.match(/\*?\*?Constraints?:?\*?\*?\s*([\s\S]*?)(?=\n\n(?:Example|Follow|Note|\*\*)|$)/i);
  if (constraintsMatch) {
    const constraintLines = constraintsMatch[1]
      .split('\n')
      .map(line => line.replace(/^[-•*`]\s*/, '').replace(/`/g, '').trim())
      .filter(line => line.length > 0 && !line.toLowerCase().startsWith('example'));
    constraints.push(...constraintLines);
  }

  // If no constraints found, look for bullet points with typical constraint patterns
  if (constraints.length === 0) {
    const bulletPattern = /[-•*]\s*(`?\d+\s*[<≤>≥]=?\s*[^`\n]+`?)/g;
    let match;
    while ((match = bulletPattern.exec(content)) !== null) {
      const constraint = match[1].replace(/`/g, '').trim();
      if (constraint && !constraints.includes(constraint)) {
        constraints.push(constraint);
      }
    }
  }

  // Look for common constraint patterns like "1 <= n <= 10^5"
  if (constraints.length === 0) {
    const rangePattern = /(\d+\s*[<≤]=?\s*\w+(?:\.\w+)?\s*[<≤]=?\s*\d+(?:\^\d+)?)/g;
    let match;
    while ((match = rangePattern.exec(content)) !== null) {
      if (!constraints.includes(match[1])) {
        constraints.push(match[1]);
      }
    }
  }

  return constraints;
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    // Validate LeetCode URL format
    const slugMatch = url.match(/leetcode\.com\/problems\/([\w-]+)/);
    if (!slugMatch) {
      return NextResponse.json(
        { error: 'Invalid LeetCode URL. Please provide a valid URL like https://leetcode.com/problems/two-sum' },
        { status: 400 }
      );
    }

    const slug = slugMatch[1];

    // Try to fetch from LeetCode's GraphQL API
    const leetcodeData = await fetchLeetCodeProblem(slug);

    if (leetcodeData) {
      // Successfully fetched problem data
      const plainDescription = htmlToPlainText(leetcodeData.content);
      const examples = extractExamples(plainDescription);
      const constraints = extractConstraints(plainDescription);

      // Get Python code snippet
      const pythonSnippet = leetcodeData.codeSnippets?.find(
        s => s.langSlug === 'python3' || s.langSlug === 'python'
      );

      // Extract function name from the code snippet
      const funcMatch = pythonSnippet?.code?.match(/def\s+(\w+)\s*\(/);
      const functionName = funcMatch ? funcMatch[1] : slug.replace(/-/g, '_');

      const problem = {
        id: `custom-${slug}-${Date.now()}`,
        title: leetcodeData.title,
        slug,
        difficulty: leetcodeData.difficulty as 'Easy' | 'Medium' | 'Hard',
        description: plainDescription,
        examples,
        constraints,
        starterCode: pythonSnippet?.code || `def ${functionName}():\n    # Write your solution here\n    pass`,
        functionName,
        testCases: [{ inputs: [], expected: null }],
        tags: leetcodeData.topicTags?.map(t => t.name) || [],
        hints: leetcodeData.hints || [],
        leetcodeUrl: url,
        addedAt: Date.now(),
        requiresManualEntry: false,
        message: `Successfully imported "${leetcodeData.title}" from LeetCode! You may want to add test cases manually.`
      };

      return NextResponse.json({ problem });
    }

    // Fallback: Could not fetch from LeetCode API
    const title = slug
      .split('-')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const problem = {
      id: `custom-${slug}-${Date.now()}`,
      title,
      slug,
      difficulty: 'Medium' as const,
      description: '',
      examples: [{ input: '', output: '' }],
      constraints: [],
      starterCode: `def ${slug.replace(/-/g, '_')}():\n    """\n    :rtype:\n    """\n    # Write your solution here\n    pass`,
      functionName: slug.replace(/-/g, '_'),
      testCases: [{ inputs: [], expected: null }],
      tags: [],
      hints: [],
      leetcodeUrl: url,
      addedAt: Date.now(),
      requiresManualEntry: true,
      message: `Could not fetch problem details from LeetCode. Please fill in the description, examples, and test cases manually.`
    };

    return NextResponse.json({ problem });
  } catch (error) {
    console.error('LeetCode import error:', error);
    return NextResponse.json(
      { error: 'Failed to import problem. Please try again or add the problem manually.' },
      { status: 500 }
    );
  }
}
