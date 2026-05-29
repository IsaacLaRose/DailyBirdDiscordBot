require("dotenv").config();

const EBIRD_KEY = process.env.EBIRD_KEY;

let taxonomyCache = null;

const normalize = (s) => s.toLowerCase().replace(/grey/g, "gray");

async function getSpeciesCode(birdName) {
  if (!taxonomyCache) {
    console.log("Fetching eBird taxonomy (one-time cache)...");
    const res = await fetch(
      "https://api.ebird.org/v2/ref/taxonomy/ebird?fmt=json",
      { headers: { "X-eBirdApiToken": EBIRD_KEY } }
    );
    taxonomyCache = await res.json();
  }

  const match =
    taxonomyCache.find((t) => normalize(t.comName) === normalize(birdName)) ??
    taxonomyCache.find((t) => normalize(t.comName).includes(normalize(birdName))) ??
    taxonomyCache.find((t) => normalize(birdName).includes(normalize(t.comName)));

  return match?.speciesCode ?? null;
}

async function fetchWikiData(birdName) {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(birdName)}`
    );
    if (!res.ok) return { extract: null, imageUrl: null };
    const data = await res.json();
    return {
      extract: data.extract ?? null,
      imageUrl: data.thumbnail?.source ?? null,
    };
  } catch (err) {
    console.error(`Wiki fetch failed for ${birdName}:`, err.message);
    return { extract: null, imageUrl: null };
  }
}

async function fetchBirdImage(birdName, wikiImageUrl = null) {
  try {
    const speciesCode = await getSpeciesCode(birdName);
    console.log(`Species code for ${birdName}:`, speciesCode);
    if (!speciesCode) return wikiImageUrl;

    const res = await fetch(
      `https://search.macaulaylibrary.org/api/v1/search?taxonCode=${speciesCode}&mediaType=Photo&count=5&sort=rating_rank_desc`,
      { headers: { "X-eBirdApiToken": EBIRD_KEY } }
    );
    const data = await res.json();
    console.log("Macaulay response:", JSON.stringify(data).slice(0, 300));
    const assets = data.results?.content;
    if (!assets?.length) return wikiImageUrl;

    const assetId = assets[0].assetId;
    return `https://cdn.download.ams.birds.cornell.edu/api/v1/asset/${assetId}/1200`;
  } catch (err) {
    console.error(`Image fetch failed for ${birdName}:`, err.message);
    return wikiImageUrl;
  }
}

async function fetchBirdSound(birdName) {
  try {
    const query = encodeURIComponent(birdName);
    const res = await fetch(
      `https://xeno-canto.org/api/2/recordings?query=${query}+q:A`
    );
    if (!res.ok) return null;

    const data = await res.json();
    console.log(`Xeno-canto results for ${birdName}:`, data.numRecordings);
    console.log("First recording sample:", JSON.stringify(data.recordings?.[0]).slice(0, 300));
    let recordings = data.recordings;

    if (!recordings?.length) {
      console.log("No A-quality recordings, trying without quality filter...");
      const fallback = await fetch(
        `https://xeno-canto.org/api/2/recordings?query=${query}`
      );
      const fallbackData = await fallback.json();
      recordings = fallbackData.recordings;
    }

    if (!recordings?.length) return null;

    const best =
      recordings.find((r) => r.type?.includes("call")) ??
      recordings.find((r) => r.type?.includes("song")) ??
      recordings[0];

    return {
      pageUrl: `https://xeno-canto.org/${best.id}`,
      fileUrl: best.file.startsWith("//") ? `https:${best.file}` : best.file,
      recordist: best.rec,
      country: best.cnt,
    };
  } catch (err) {
    console.error(`Sound fetch failed for ${birdName}:`, err.message);
    return null;
  }
}

module.exports = { fetchWikiData, fetchBirdImage, fetchBirdSound };