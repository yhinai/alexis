# 🚀 Quick Start - Demo Day

## 5 Minutes Before Presentation

### 1. Start Dev Server
```bash
cd "/Users/nihalnihalani/Desktop/Github/DAYTONA InterviewSandBox"
npm run dev
```
**Expected**: Server starts on http://localhost:3000 (or 3001 if 3000 is busy)

### 2. Open Browser Tabs (in order)
1. **Tab 1**: http://localhost:3000 (Landing page with metrics)
2. **Tab 2**: http://localhost:3000/interview (Interview interface)
3. **Tab 3**: Backup video (if you recorded one)

### 3. Test Voice Agent
- Go to Tab 2 (interview page)
- Click "Start Interview" button
- Allow microphone access
- Verify agent connects and greets you
- Click stop

### 4. Prepare Code Snippet
Copy this to clipboard (you'll type it during demo):
```python
def reverse_list(arr):
    import numpy as np
    return np.flip(arr)

print(reverse_list([1, 2, 3]))
```

### 5. Final Checks
- [ ] Laptop charged
- [ ] Notifications off (Do Not Disturb)
- [ ] Microphone working
- [ ] Metrics dashboard visible on landing page
- [ ] Deep breath 😊

---

## During Demo (90 seconds)

### Part 1: Landing Page (10s)
- Show metrics dashboard
- Say: "94% consistency, 50% time saved, 23% cheating detected"
- Click "Start Interview"

### Part 2: Start Agent (10s)
- Click "Start Interview" on agent panel
- Agent greets: "Hi! I'm Alex. Ready to code?"
- Say: "Voice-powered AI interviewer using Gemini Live"

### Part 3: Break the Code (20s) 💥
- Paste/type the Python snippet (which uses `numpy`)
- Say: "I'm writing code that requires `numpy`, which isn't installed in this fresh container."
- **Point out that it should fail.**
- Say: "Normally, this would be an error."

### Part 4: Auto-Fix Action (20s) 🛠️
- Agent detects `import numpy`
- Agent says: "I see you need numpy. I'll install it for you."
- Watch thinking indicator appear
- Console shows: `pip install numpy` running automatically.
- Say: "This is **Self-Healing Code**. The agent autonomously fixes the Daytona environment."

### Part 5: Run Code (10s)
- Click "Run Code"
- Show output: `[3, 2, 1]`
- Say: "Code runs successfully in the isolated container."

### Part 6: Integrity (10s)
- Switch tabs briefly (trigger blur)
- Point to integrity counter
- Say: "Automatic cheating detection"

### Part 7: Report (10s)
- Click "End Interview & Report"
- Report downloads
- Say: "Comprehensive hire/no-hire recommendation"

---

## If Something Breaks

### Voice Agent Won't Connect
**Option 1**: Enable Wizard Mode
- Click "Enable Wizard Mode" button
- Use Ctrl+Shift+X to trigger scripted responses
- Narrate what agent "would" say

**Option 2**: Skip Voice
- Focus on autonomous actions
- Show thinking indicator
- Emphasize infrastructure control

### Internet Fails
- Set `NEXT_PUBLIC_USE_MOCK_DAYTONA=true` in `.env.local`
- Restart server
- All Daytona calls return mock data

### Everything Fails
- Switch to backup video
- Narrate over the video
- Continue with slides

---

## Key Metrics to Memorize

- **94%** - Consistency score
- **50%** - Time savings
- **23%** - Cheating detection
- **$20** - Price per interview
- **$75** - Value saved

---

## Closing Statement

> "This isn't just a better interview tool. It's the future of technical hiring. And it's only possible because of Daytona's secure, programmable infrastructure. Thank you!"

---

**You've got this! 🎉**
