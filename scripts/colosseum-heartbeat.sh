#!/bin/bash
# Colosseum Agent Hackathon Heartbeat Script
# Run every 30 minutes to stay synced with the hackathon

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CREDENTIALS_FILE="$PROJECT_ROOT/.colosseum-credentials"
LOG_FILE="$PROJECT_ROOT/.colosseum-heartbeat.log"
STATE_FILE="$PROJECT_ROOT/.colosseum-heartbeat-state.json"

# Load credentials
if [[ ! -f "$CREDENTIALS_FILE" ]]; then
    echo "Error: Credentials file not found at $CREDENTIALS_FILE"
    exit 1
fi
source "$CREDENTIALS_FILE"

API_BASE="https://agents.colosseum.com/api"

# Initialize state file if not exists
if [[ ! -f "$STATE_FILE" ]]; then
    echo '{"lastSkillCheck":0,"lastStatusCheck":0,"lastLeaderboardCheck":0,"lastForumCheck":0,"skillVersion":""}' > "$STATE_FILE"
fi

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Get current timestamp
NOW=$(date +%s)

# Read state
LAST_SKILL_CHECK=$(jq -r '.lastSkillCheck // 0' "$STATE_FILE")
LAST_STATUS_CHECK=$(jq -r '.lastStatusCheck // 0' "$STATE_FILE")
LAST_LEADERBOARD_CHECK=$(jq -r '.lastLeaderboardCheck // 0' "$STATE_FILE")
LAST_FORUM_CHECK=$(jq -r '.lastForumCheck // 0' "$STATE_FILE")
SKILL_VERSION=$(jq -r '.skillVersion // ""' "$STATE_FILE")

# Time intervals in seconds
SIX_HOURS=21600
TWO_HOURS=7200
ONE_HOUR=3600
THIRTY_MINUTES=1800

log "=== Heartbeat Started ==="

# 1. Check skill file version (every 6 hours)
if (( NOW - LAST_SKILL_CHECK >= SIX_HOURS )); then
    log "Checking skill file version..."
    NEW_VERSION=$(curl -s "https://colosseum.com/skill.md" | head -10 | grep -oE 'version[: ]+[0-9.]+' | head -1 || echo "unknown")
    if [[ -n "$SKILL_VERSION" && "$NEW_VERSION" != "$SKILL_VERSION" ]]; then
        log "WARNING: Skill file version changed from $SKILL_VERSION to $NEW_VERSION"
    fi
    log "Skill version: $NEW_VERSION"
    SKILL_VERSION="$NEW_VERSION"
    LAST_SKILL_CHECK=$NOW
fi

# 2. Check agent status (every 2 hours)
if (( NOW - LAST_STATUS_CHECK >= TWO_HOURS )); then
    log "Checking agent status..."
    STATUS_RESPONSE=$(curl -s -H "Authorization: Bearer $COLOSSEUM_API_KEY" "$API_BASE/agents/status")

    if echo "$STATUS_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
        log "ERROR: $(echo "$STATUS_RESPONSE" | jq -r '.error')"
    else
        CLAIM_STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.claimStatus // "unknown"')
        ENGAGEMENT=$(echo "$STATUS_RESPONSE" | jq -r '.engagement // {}')
        log "Claim status: $CLAIM_STATUS"
        log "Engagement: $ENGAGEMENT"
    fi
    LAST_STATUS_CHECK=$NOW
fi

# 3. Check leaderboard (every hour)
if (( NOW - LAST_LEADERBOARD_CHECK >= ONE_HOUR )); then
    log "Checking leaderboard..."

    # Get active hackathon
    HACKATHON_RESPONSE=$(curl -s -H "Authorization: Bearer $COLOSSEUM_API_KEY" "$API_BASE/hackathons/active")
    HACKATHON_ID=$(echo "$HACKATHON_RESPONSE" | jq -r '.hackathon.id // 1' 2>/dev/null || echo "1")

    # Get leaderboard
    LEADERBOARD=$(curl -s -H "Authorization: Bearer $COLOSSEUM_API_KEY" "$API_BASE/hackathons/$HACKATHON_ID/leaderboard?limit=10")

    # Check if leaderboard has projects
    if echo "$LEADERBOARD" | jq -e '.projects' > /dev/null 2>&1; then
        # Find our project rank
        OUR_RANK=$(echo "$LEADERBOARD" | jq -r --arg slug "open-commerce" '[.projects[] | .slug] | to_entries | map(select(.value == $slug)) | .[0].key // "not ranked"' 2>/dev/null || echo "not ranked")
        OUR_VOTES=$(echo "$LEADERBOARD" | jq -r --arg slug "open-commerce" '[.projects[] | select(.slug == $slug)] | .[0].totalUpvotes // 0' 2>/dev/null || echo "0")

        log "Our project rank: $OUR_RANK, votes: $OUR_VOTES"
        log "Top 3 projects:"
        echo "$LEADERBOARD" | jq -r '.projects[:3][] | "  - \(.name): \(.totalUpvotes // 0) votes"' 2>/dev/null | tee -a "$LOG_FILE" || log "  (no projects yet)"
    else
        log "Leaderboard not available yet"
    fi

    LAST_LEADERBOARD_CHECK=$NOW
fi

# 4. Check forum posts (every hour, replies every 30 min)
if (( NOW - LAST_FORUM_CHECK >= THIRTY_MINUTES )); then
    log "Checking forum..."

    # Get new posts
    FORUM_POSTS=$(curl -s -H "Authorization: Bearer $COLOSSEUM_API_KEY" "$API_BASE/forum/posts?sort=new&limit=5")

    if echo "$FORUM_POSTS" | jq -e '.posts' > /dev/null 2>&1; then
        POST_COUNT=$(echo "$FORUM_POSTS" | jq -r '.posts | length' 2>/dev/null || echo "0")
        log "Recent forum posts: $POST_COUNT"

        # Show recent post titles
        echo "$FORUM_POSTS" | jq -r '.posts[:3][] | "  - \(.title)"' 2>/dev/null | tee -a "$LOG_FILE" || true
    else
        log "Forum not available or empty"
    fi

    LAST_FORUM_CHECK=$NOW
fi

# 5. Check our project status
log "Checking project status..."
PROJECT_STATUS=$(curl -s -H "Authorization: Bearer $COLOSSEUM_API_KEY" "$API_BASE/my-project")
PROJECT_STATE=$(echo "$PROJECT_STATUS" | jq -r '.project.status // "unknown"')
UPVOTES=$(echo "$PROJECT_STATUS" | jq -r '(.project.humanUpvotes // 0) + (.project.agentUpvotes // 0)')
log "Project status: $PROJECT_STATE, total upvotes: $UPVOTES"

# Save state
jq -n \
    --argjson lastSkillCheck "$LAST_SKILL_CHECK" \
    --argjson lastStatusCheck "$LAST_STATUS_CHECK" \
    --argjson lastLeaderboardCheck "$LAST_LEADERBOARD_CHECK" \
    --argjson lastForumCheck "$LAST_FORUM_CHECK" \
    --arg skillVersion "$SKILL_VERSION" \
    '{
        lastSkillCheck: $lastSkillCheck,
        lastStatusCheck: $lastStatusCheck,
        lastLeaderboardCheck: $lastLeaderboardCheck,
        lastForumCheck: $lastForumCheck,
        skillVersion: $skillVersion
    }' > "$STATE_FILE"

log "=== Heartbeat Complete ==="
echo ""
