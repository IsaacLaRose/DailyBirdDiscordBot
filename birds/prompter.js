require("dotenv").config();

const OPENROUTER_KEY = process.env.OPENROUTER_KEY;

async function promptBird(birdName, wikiExtract = null, retries = 5) {
  const contextBlock = wikiExtract
    ? `Here is a Wikipedia excerpt about this bird:\n"${wikiExtract}"\nBase the fun fact on this text. Do not invent facts not supported by it.\n\n`
    : "";

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "z-ai/glm-4.5-air:free",
      messages: [
        {
          role: "system",
          content: `You are a witty bird facts bot. Respond ONLY with valid JSON, no markdown, no backticks, no extra text.`,
        },
        {
          role: "user",
          content: `${contextBlock}Generate a Bird of the Day card for: ${birdName}

Return this exact JSON shape:
{
  "name": "bird name",
  "funFact": "one surprising or weird real fact",
  "favoriteFoods": ["food1", "food2", "food3"],
  "callDescription": "what the call sounds like to humans (funny/poetic, e.g. 'a car alarm that learned emotions')",
  "vibe": "one-liner personality or energy of this bird (e.g. 'Spirit NPC that warns travelers')"
}`,
        },
      ],
    }),
  });

  const data = await response.json();

  if (data.error) {
    const retryAfter = data.error.metadata?.retry_after_seconds;
    if (retryAfter && retries > 0) {
      console.log(`Rate limited. Retrying in ${retryAfter}s... (${retries} attempts left)`);
      await new Promise((r) => setTimeout(r, (retryAfter + 2) * 1000));
      return promptBird(birdName, wikiExtract, retries - 1);
    }
    throw new Error(`OpenRouter error: ${data.error.message}`);
  }

  const raw = data.choices[0].message.content;

  try {
    return JSON.parse(raw);
  } catch {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  }
}

module.exports = { promptBird };