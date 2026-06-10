require("dotenv").config();

const GROQ_KEY = process.env.GROQ_KEY;

async function promptBird(birdName, wikiExtract = null, retries = 5) {
  const truncatedExtract = wikiExtract?.slice(0, 1500) ?? null;

  const contextBlock = truncatedExtract
    ? `Here is a Wikipedia excerpt about this bird:\n"${truncatedExtract}"\nBase the fun fact on this text. Do not invent facts not supported by it.\n\n`
    : "";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  console.log(`[LLM] Sending request for: ${birdName} (retries left: ${retries})`);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${GROQ_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are a witty bird facts bot. Respond ONLY with valid JSON, no markdown, no backticks, no extra text. Always fill every field. For callDescription, be creative and specific to this bird — avoid overused phrases like 'melodic whistle', 'rusty gate', 'gentle breeze', or 'babbling stream' unless they are genuinely the best description. Aim for something unexpected and funny, but still accurate, like 'a dial-up modem having an existential crisis' or 'someone accidentally sat on a squeeze toy'. For vibe, give it real personality, not just where it lives.",
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
  "vibe": "one to three liner personality or energy of this bird (e.g. 'Spirit NPC that warns travelers')"
}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    clearTimeout(timeout);
    console.log(`[LLM] Got response for: ${birdName} (status: ${response.status})`);

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 429 && retries > 0) {
        const retryAfter = parseInt(data.error?.message?.match(/try again in (\d+)/i)?.[1] ?? "10");
        console.log(`[LLM] Rate limited. Retrying in ${retryAfter}s... (${retries} attempts left)`);
        await new Promise((r) => setTimeout(r, (retryAfter + 2) * 1000));
        return promptBird(birdName, wikiExtract, retries - 1);
      }
      throw new Error(`Groq error: ${data.error?.message ?? response.statusText}`);
    }

    const raw = data.choices[0].message.content;
    console.log(`[LLM] Raw response for ${birdName}:`, raw);

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const cleaned = raw.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(cleaned);
    }

    if (!parsed?.name) {
      throw new Error(`LLM returned invalid data for ${birdName}: ${raw}`);
    }

    console.log(`[LLM] Parsed response for: ${birdName}`);
    return parsed;
  } catch (err) {
    clearTimeout(timeout);

    if (err.name === "AbortError") {
      console.error(`[LLM] Timed out for ${birdName}`);
      if (retries > 0) {
        console.log(`[LLM] Retrying ${birdName} after timeout... (${retries} attempts left)`);
        await new Promise((r) => setTimeout(r, 3000));
        return promptBird(birdName, wikiExtract, retries - 1);
      }
      throw new Error(`[LLM] Timed out after all retries for ${birdName}`);
    }

    throw err;
  }
}

module.exports = { promptBird };