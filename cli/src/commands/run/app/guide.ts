export const agentGuide = `
WORKFLOW
  1. Discover app id and mode:
       difyctl get app -o json
       difyctl describe app <id> -o json | jq '.info.mode'

  2. Run the app:
       difyctl run app <id> "your message"
       difyctl run app <id> "your message" -o json

APP MODES
  chat / advanced-chat   Conversational. Accepts --conversation <id> to
                         resume an existing thread.
  completion             Single-turn. Ignores --conversation.
  workflow               Multi-step graph. Use --input key=val for each
                         input variable the workflow declares.
  agent-chat             Always streams regardless of --stream flag.

FLAGS
  --input key=val        Pass named inputs. Repeatable. Required for
                         workflow apps that declare input variables.
                           --input language=English --input topic="AI safety"
  --stream               Request SSE streaming. Recommended for runs
                         exceeding ~30s. Agent apps stream regardless.
  --conversation <id>    Resume a conversation (chat/advanced-chat only).
  --workspace <id>       Target a specific workspace.

ERROR RECOVERY
  not logged in          difyctl auth login
  app not found (404)    difyctl get app
  workspace required     difyctl get workspace
`
