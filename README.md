# Bird of the Day

A Discord bot that posts a daily bird fact card to a channel at 9am. Each post includes an AI-generated from Wikipedia fun fact, a photo from the Macaulay Library or Wikipedia, and a sound recording from xeno-canto.

## What it does

Every morning the bot picks a bird from a local list, then in parallel:

- Asks an LLM (via OpenRouter) for a fun fact, favorite foods, a description of the bird's call, and a one-liner "vibe" — grounded by a Wikipedia summary to reduce hallucinated facts
- Fetches the top-rated photo from the Cornell Macaulay Library via the eBird API, falling back to the Wikipedia thumbnail if no photo is available
- Fetches an A-quality recording from xeno-canto, falling back to any quality if none found

The result is posted as a Discord embed. You can also trigger a post manually with the `/bird` slash command.

## Prerequisites

- Node.js 18+
- A Discord application with a bot token
- An eBird API key (free at ebird.org/api/keygen)
- A Groq API key (free tier at console.groq.com)
- A xeno-canto API key (free for registered members at xeno-canto.org)

## Setup

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Create a `.env` file in the project root:

```env
TOKEN_KEY=your_discord_bot_token
CLIENT_ID=your_discord_application_id

EBIRD_KEY=your_ebird_api_key
GROQ_KEY=your_groq_api_key
XENO_CANTO_KEY=your_xeno_canto_api_key
```

3. Start the bot:

```bash
node index.js
```

Slash commands are registered globally on startup and become available in all servers within ~1 hour.

## Channel selection

The bot automatically finds the right channel to post in for each server it's in. It checks for the following channel names in order:

1. `#bot`
2. `#bot-commands`
3. `#botcommands`
4. `#general` (fallback)

If none of these exist or the bot lacks `Send Messages` permission in all of them, that server is skipped with a warning in the logs. No `CHANNEL_ID` configuration is needed.

## The `/bird` command

```
/bird — posts a random bird from the list
```

The command posts to the best available channel in the server it was run in, using the same priority order as the scheduler.

## Notes

- The eBird taxonomy (~17k species) is fetched once and cached in memory for the lifetime of the process.
- Bird name lookups use fuzzy matching and grey/gray normalization to handle naming differences between the local list and eBird's taxonomy.
- Birds are tracked in a `Set` to avoid repeats until the full list has been exhausted, then it resets.
- If Groq rate-limits the request, the bot will retry up to 5 times with the suggested backoff interval.
- xeno-canto queries use the `en:` tag with an exact match operator and prefer A-quality recordings and call recordings over songs, with graceful fallback if neither is available.

## Dependencies

- [discord.js](https://discord.js.org/) — Discord client and embed builder
- [node-cron](https://github.com/node-cron/node-cron) — daily scheduling
- [dotenv](https://github.com/motdotla/dotenv) — environment variable loading
- [eBird API v2](https://documenter.getpostman.com/view/664302/S1ENwy59) — taxonomy lookup and Macaulay Library photos
- [Wikipedia REST API](https://en.wikipedia.org/api/rest_v1/) — bird summaries for LLM grounding and image fallback
- [xeno-canto API v3](https://xeno-canto.org/explore/api) — bird sound recordings
- [Groq](https://groq.com/) — LLM inference (model: `llama-3.3-70b-versatile`)
- [OpenRouter](https://openrouter.ai/) — LLM inference (default model: `z-ai/glm-4.5-air`)
