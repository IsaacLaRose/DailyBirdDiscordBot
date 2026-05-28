require("dotenv").config();

const EBIRD_KEY = process.env.EBIRD_KEY;

// Cache the full taxonomy in memory — ~17k species, no point re-fetching every day
let taxonomyCache = null;

async function getSpeciesCode(birdName) {
  if (!taxonomyCache) {
    console.log("Fetching eBird taxonomy (one-time cache)...");
    const res = await fetch(
      "https://api.ebird.org/v2/ref/taxonomy/ebird?fmt=json",
      { headers: { "X-eBirdApiToken": EBIRD_KEY } }
    );
    taxonomyCache = await res.json();
  }

  const match = taxonomyCache.find(
    (t) => t.comName.toLowerCase() === birdName.toLowerCase()
  );
  return match?.speciesCode ?? null;
}

async function fetchBirdImage(birdName) {
  try {
    const speciesCode = await getSpeciesCode(birdName);
    console.log(`Species code for ${birdName}:`, speciesCode);
    if (!speciesCode) return null;

    const res = await fetch(
      `https://search.macaulaylibrary.org/api/v1/search?taxonCode=${speciesCode}&mediaType=Photo&count=5&sort=rating_rank_desc`,
      { headers: { "X-eBirdApiToken": EBIRD_KEY } }
    );
    const data = await res.json();
    console.log("Macaulay response:", JSON.stringify(data).slice(0, 300));
    const assets = data.results?.content;
    if (!assets?.length) return null;

    const assetId = assets[0].assetId;
    return `https://cdn.download.ams.birds.cornell.edu/api/v1/asset/${assetId}/1200`;
  } catch (err) {
    console.error(`Image fetch failed for ${birdName}:`, err.message);
    return null;
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
    let recordings = data.recordings;

    // If no A-quality recordings, try without the quality filter
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

module.exports = { fetchBirdImage, fetchBirdSound };