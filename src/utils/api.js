const FDA_API_URL = "https://api.fda.gov/drug/label.json";
const RXNORM_API_URL = "https://rxnav.nlm.nih.gov/REST/rxcui.json";

export const fetchDrugInfo = async (query) => {
  if (!query) return null;
  let cleanQuery = query.toLowerCase().trim();
  const cacheKey = `med_v2_${cleanQuery}`;

  // 1. CHECK OFFLINE CACHE
  const cachedData = localStorage.getItem(cacheKey);
  if (cachedData) return { ...JSON.parse(cachedData), source: 'offline' };

  try {
    let searchName = cleanQuery;

    // 2. BARCODE HANDLING (Simulation)
    // Real barcode APIs are expensive. For the project, we simulate looking up a few common codes.
    // If query is all numbers (like a barcode)
    if (/^\d+$/.test(cleanQuery)) {
        console.log("Barcode detected:", cleanQuery);
        // Fallback for demo: If barcode detected, just return a generic result 
        // because we don't have a real UPC database.
        return {
            id: cleanQuery,
            name: "Scanned Product (Demo)",
            brandName: "Barcode Item " + cleanQuery,
            purpose: "Identified via Barcode Scan.",
            usage: "Refer to physical packaging.",
            warnings: "Verify product before use.",
            source: 'barcode_scan'
        };
    }

    // 3. RxNORM NORMALIZATION (The "Scientific" Step)
    // Tries to find the Generic Name if user typed a Brand Name
    try {
        const rxUrl = `${RXNORM_API_URL}?name=${searchName}`;
        const rxRes = await fetch(rxUrl);
        const rxData = await rxRes.json();
        
        if (rxData.idGroup && rxData.idGroup.rxnormId) {
            // We found an ID! Now let's try to get the name associated with it
            // Simple logic: If RxNorm finds it, it validates the drug exists
            console.log("RxNorm Verified ID:", rxData.idGroup.rxnormId[0]);
        }
    } catch (e) {
        console.warn("RxNorm check skipped (network/cors)");
    }

    // 4. FETCH FROM OPENFDA
    const searchUrl = `${FDA_API_URL}?search=openfda.brand_name:"${searchName}"+OR+openfda.generic_name:"${searchName}"&limit=1`;
    const response = await fetch(searchUrl);
    const data = await response.json();

    if (data.error || !data.results) throw new Error("Not found");

    const result = data.results[0];
    const drugData = {
      id: result.id || Date.now().toString(),
      name: result.openfda?.generic_name?.[0] || searchName,
      brandName: result.openfda?.brand_name?.[0] || searchName,
      purpose: result.purpose ? result.purpose[0] : "General Health.",
      usage: result.dosage_and_administration ? result.dosage_and_administration[0] : "Consult Doctor.",
      warnings: result.warnings ? result.warnings[0] : "Consult Doctor.",
      sideEffects: result.adverse_reactions ? result.adverse_reactions[0] : "Not listed.",
      source: 'api'
    };

    localStorage.setItem(cacheKey, JSON.stringify(drugData));
    return drugData;

  } catch (error) {
    console.error("Fetch error:", error);
    return null;
  }
};