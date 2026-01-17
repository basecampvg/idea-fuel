# n8n-MCP Setup Guide for Forge Automation

This guide will walk you through setting up the n8n-mcp MCP server and n8n-skills to enable workflow analysis and stabilization.

## Prerequisites

- ✅ Node.js v24.12.0 (already installed)
- ✅ n8n.cloud account with active workflows
- ✅ Claude Desktop application
- ✅ Claude Code access (current environment)

---

## Step 1: Get n8n Cloud API Key

### 1.1 Log into n8n.cloud

1. Go to [https://app.n8n.cloud](https://app.n8n.cloud)
2. Log in with your credentials

### 1.2 Generate API Key

1. Click on your profile/settings (usually top-right corner)
2. Navigate to: **Settings** → **API**
3. Click **"Generate API Key"** or **"Create New API Key"**
4. Copy the API key immediately (you won't be able to see it again)
5. Save it securely (you'll need it in Step 2)

### 1.3 Note Your Instance URL

Your n8n cloud instance URL format:
```
https://[your-username].app.n8n.cloud
```

Or it might be:
```
https://app.n8n.cloud/workflow/[your-workspace-id]
```

**Action:** Write down your full n8n cloud URL

---

## Step 2: Configure Claude Desktop for MCP

### 2.1 Locate Configuration File

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

**Full path (Windows):**
```
C:\Users\[YourUsername]\AppData\Roaming\Claude\claude_desktop_config.json
```

**To open quickly:**
1. Press `Win + R`
2. Type: `%APPDATA%\Claude`
3. Press Enter
4. Open or create `claude_desktop_config.json`

### 2.2 Add n8n-mcp Configuration

If the file doesn't exist, create it with this content:

```json
{
  "mcpServers": {
    "n8n-mcp": {
      "command": "npx",
      "args": ["n8n-mcp"],
      "env": {
        "MCP_MODE": "stdio",
        "LOG_LEVEL": "error",
        "DISABLE_CONSOLE_OUTPUT": "true",
        "N8N_API_URL": "https://YOUR-INSTANCE.app.n8n.cloud",
        "N8N_API_KEY": "YOUR-API-KEY-HERE"
      }
    }
  }
}
```

If the file already exists with other MCP servers, add the `n8n-mcp` section to the existing `mcpServers` object:

```json
{
  "mcpServers": {
    "existing-server": {
      ... existing config ...
    },
    "n8n-mcp": {
      "command": "npx",
      "args": ["n8n-mcp"],
      "env": {
        "MCP_MODE": "stdio",
        "LOG_LEVEL": "error",
        "DISABLE_CONSOLE_OUTPUT": "true",
        "N8N_API_URL": "https://YOUR-INSTANCE.app.n8n.cloud",
        "N8N_API_KEY": "YOUR-API-KEY-HERE"
      }
    }
  }
}
```

### 2.3 Replace Placeholders

**Replace these values:**
- `YOUR-INSTANCE.app.n8n.cloud` → Your actual n8n cloud URL (from Step 1.3)
- `YOUR-API-KEY-HERE` → Your API key (from Step 1.2)

**Example:**
```json
"N8N_API_URL": "https://john-workspace.app.n8n.cloud",
"N8N_API_KEY": "n8n_api_abc123xyz789..."
```

### 2.4 Verify Configuration

**Critical settings (DO NOT change these):**
- ✅ `MCP_MODE: "stdio"` - MANDATORY for Claude Desktop
- ✅ `DISABLE_CONSOLE_OUTPUT: "true"` - Prevents JSON-RPC errors
- ✅ `LOG_LEVEL: "error"` - Minimizes log noise

**Save the file!**

---

## Step 3: Restart Claude Desktop

### 3.1 Completely Quit Claude

1. Right-click Claude Desktop in taskbar
2. Select "Quit" or "Exit"
3. **OR** Press `Alt + F4` while Claude is focused
4. Wait for the application to fully close

### 3.2 Restart Claude

1. Launch Claude Desktop again
2. Wait for it to fully load
3. The MCP server will initialize automatically in the background

**Note:** You won't see any visual indication of MCP initialization - this is normal.

---

## Step 4: Install n8n-skills

### 4.1 In Claude Code (This Environment)

Run this command:

```bash
/plugin install czlonkowski/n8n-skills
```

### 4.2 Alternative Method (if first method fails)

```bash
/plugin marketplace add czlonkowski/n8n-skills
/plugin install
```

Then select "n8n-mcp-skills" from the available options.

### 4.3 What Gets Installed

7 specialized skills for n8n development:

1. **n8n Expression Syntax** - Learn {{}} patterns and variable access
2. **n8n MCP Tools Expert** ⭐ - Primary skill for n8n-mcp usage
3. **n8n Workflow Patterns** - Architectural best practices
4. **n8n Validation Expert** - Error diagnosis and fixes
5. **n8n Node Configuration** - Node setup guidance
6. **n8n Code JavaScript** - JS coding in Code nodes
7. **n8n Code Python** - Python coding patterns

---

## Step 5: Verify Everything Works

### 5.1 Test MCP Connection

**Try these queries in Claude:**

1. **Test basic tools:**
   ```
   Show me the n8n-mcp tools documentation
   ```
   **Expected:** List of 20 MCP tools (7 core + 13 management)

2. **Test node search:**
   ```
   Find me a Slack node
   ```
   **Expected:** Information about Slack nodes from the n8n library

3. **Test API connection:**
   ```
   List my n8n workflows
   ```
   **Expected:** Your actual workflows from n8n.cloud

### 5.2 Test Skills Activation

**Try these queries:**

```
How do I write n8n expressions?
```
Should activate: **n8n Expression Syntax** skill

```
Build a webhook workflow
```
Should activate: **n8n Workflow Patterns** skill

```
Why is validation failing?
```
Should activate: **n8n Validation Expert** skill

### 5.3 Troubleshooting

**If "List my n8n workflows" fails:**

1. ✅ Verify API key is correct in `claude_desktop_config.json`
2. ✅ Check N8N_API_URL matches your cloud instance
3. ✅ Ensure MCP_MODE is set to "stdio"
4. ✅ Restart Claude Desktop completely
5. ✅ Check n8n cloud dashboard to confirm workflows exist

**If skills don't activate:**

1. Confirm `/plugin install` completed successfully
2. Try reloading Claude Code
3. Use explicit commands: `/skills` to see installed skills

---

## Step 6: Start Workflow Analysis

Once everything is verified, you can begin analyzing workflows:

### 6.1 List All Workflows

```
List all my n8n workflows with their status
```

### 6.2 Get Workflow Details

```
Get workflow details for [workflow-id]
```

### 6.3 Validate Workflows

```
Validate workflow [workflow-id] with strict profile
```

### 6.4 Export Workflows

```
Export workflow [workflow-id] to JSON and save to workflows/ directory
```

---

## Directory Structure After Setup

```
Forge Automation/
├── workflows/                    # ← Created for workflow exports
│   ├── workflow-1-name.json     # ← Will be added during analysis
│   ├── workflow-2-name.json
│   └── ...
├── packages/
│   ├── web/
│   ├── mobile/
│   └── shared/
├── CLAUDE.md                     # ← Workflow documentation
├── N8N_SETUP_GUIDE.md           # ← This file
├── README.md
└── package.json
```

---

## Important Notes

### Security

⚠️ **NEVER commit your API key to git!**
- The `claude_desktop_config.json` is outside this project directory
- Don't copy API keys into project files
- Use environment variables for production code

### Workflow Safety

⚠️ **NEVER edit production workflows directly!**
- Always test changes in development workflows first
- Clone workflows for testing
- Use validation tools before applying changes
- Monitor execution logs after changes

### MCP Server Behavior

- Runs via `npx n8n-mcp` (downloads on first use)
- No persistent daemon - starts with Claude Desktop
- Uses stdio mode for communication
- Logs are suppressed to prevent JSON-RPC issues

---

## Next Steps

After completing this setup:

1. ✅ Run: "List my n8n workflows"
2. ✅ Document each workflow in CLAUDE.md
3. ✅ Identify stability issues
4. ✅ Validate workflows with strict profile
5. ✅ Export workflows to workflows/ directory
6. ✅ Plan and implement fixes
7. ✅ Prepare migration strategy to Next.js + BullMQ

---

## Quick Reference

### Essential Commands

```bash
# Install skills
/plugin install czlonkowski/n8n-skills

# List workflows
"List my n8n workflows"

# Get workflow
"Get workflow details for [id]"

# Validate workflow
"Validate workflow [id] with strict profile"

# Search nodes
"Find me a [node-type] node"

# Get help
"Show me n8n-mcp tools documentation"
```

### File Locations

- **MCP Config:** `%APPDATA%\Claude\claude_desktop_config.json`
- **Workflows Export:** `C:\Users\matt\Forge Automation\workflows\`
- **Documentation:** `C:\Users\matt\Forge Automation\CLAUDE.md`
- **This Guide:** `C:\Users\matt\Forge Automation\N8N_SETUP_GUIDE.md`

### Support Resources

- **n8n-mcp GitHub:** https://github.com/czlonkowski/n8n-mcp
- **n8n-skills GitHub:** https://github.com/czlonkowski/n8n-skills
- **n8n Documentation:** https://docs.n8n.io/
- **n8n Cloud Dashboard:** https://app.n8n.cloud/

---

## Checklist

### Setup Completion

- [ ] n8n cloud API key generated
- [ ] n8n cloud instance URL noted
- [ ] `claude_desktop_config.json` created/updated
- [ ] API key and URL added to config
- [ ] MCP_MODE set to "stdio"
- [ ] Claude Desktop restarted
- [ ] n8n-skills installed via `/plugin install`
- [ ] MCP connection tested successfully
- [ ] Skills activation verified
- [ ] First workflow listed successfully

### Ready for Analysis

- [ ] Can list all workflows
- [ ] Can retrieve workflow details
- [ ] Can validate workflows
- [ ] Can export workflow JSON
- [ ] workflows/ directory exists
- [ ] CLAUDE.md ready for documentation

---

**Setup Guide Version:** 1.0
**Last Updated:** 2026-01-15
**Project:** Forge Automation - n8n Workflow Stabilization
