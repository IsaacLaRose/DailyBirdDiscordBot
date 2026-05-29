# Bird of the Day

A Discord bot that posts a daily bird fact card to a channel at 9am. Each post includes an AI-generated fun fact, a photo from the Macaulay Library or Wikipedia, and a sound recording from xeno-canto.

## What it does

Every morning the bot picks a bird from a local list, then in parallel:

- Asks an LLM (via OpenRouter) for a fun fact, favorite foods, a description of the bird's call, and a one-liner "vibe" — grounded by a Wikipedia summary to reduce hallucinated facts
- Fetches the top-rated photo from the Cornell Macaulay Library via the eBird API, falling back to the Wikipedia thumbnail if no photo is available
- Fetches an A-quality recording from xeno-canto (falls back to any quality if none found) — currently non-functional (Issue believed to be on DisCloud due to outbound network restrictions, planned fix)

The result is posted as a Discord embed. You can also trigger a post manually with the `/bird` slash command.

## Prerequisites

- Node.js 18+
- A Discord application with a bot token
- An eBird API key (free at ebird.org/api/keygen)
- An OpenRouter API key (free tier works)

## Setup

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Create a `.env` file in the project root:

```env
TOKEN_KEY=your_discord_bot_token
CLIENT_ID=your_discord_application_id
GUILD_ID=your_discord_server_id
CHANNEL_ID=the_channel_to_post_in
EBIRD_KEY=your_ebird_api_key
OPENROUTER_KEY=your_openrouter_api_key
```

3. Start the bot:

```bash
node index.js
```

Slash commands are registered automatically on startup. The scheduler will post once daily at 9am in the server's local time.

## Development mode

Set `NODE_ENV=development` in your `.env` and the bot will post immediately on startup in addition to the scheduled post. Useful for testing embed layout without waiting for 9am.

```env
NODE_ENV=development
```

## The `/bird` command

```
/bird              — posts a random bird from the list
```

The command posts to the configured `CHANNEL_ID`, not the channel the command was run in.

## Notes

- The eBird taxonomy (~17k species) is fetched once and cached in memory for the lifetime of the process.
- Bird name lookups use fuzzy matching and grey/gray normalization to handle naming differences between the local list and eBird's taxonomy.
- Birds are tracked in a `Set` to avoid repeats until the full list has been exhausted, then it resets.
- If OpenRouter rate-limits the request, the bot will retry up to 5 times with the suggested backoff interval.
- xeno-canto queries prefer A-quality recordings and call recordings over songs, with graceful fallback if neither is available.
- xeno-canto sound links are not currently working when hosted on DisCloud. The feature is fully implemented and works locally but requires either a hosting change or a proxy solution.

## Dependencies

- [discord.js](https://discord.js.org/) — Discord client and embed builder
- [node-cron](https://github.com/node-cron/node-cron) — daily scheduling
- [dotenv](https://github.com/motdotla/dotenv) — environment variable loading
- [eBird API v2](https://documenter.getpostman.com/view/664302/S1ENwy59) — taxonomy lookup and Macaulay Library photos
- [Wikipedia REST API](https://en.wikipedia.org/api/rest_v1/) — bird summaries for LLM grounding and image fallback
- [xeno-canto API v2](https://xeno-canto.org/explore/api) — bird sound recordings (pending fix)
- [OpenRouter](https://openrouter.ai/) — LLM inference (default model: `z-ai/glm-4.5-air`)