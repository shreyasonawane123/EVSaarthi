const axios = require('axios');

const MAPPLS_CLIENT_ID = "96dHZVzsAuuyCyrKCsiXCTJR-QTJLSdUHX-az4-_foikorHpEuVLjSKEck-PnVdg_7NqUVTItL_mB4G3SfO0RQ==";
const MAPPLS_CLIENT_SECRET = "lrFxI-iSEg_igmrlUYN_w2t5sqHhlro0eDElsVGvOcKPbmYrl34-hAELWvchMb7hs0V4iI1eFDYNPYDLFi2AhhFO0HTawrVV";

async function runTest() {
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', MAPPLS_CLIENT_ID);
    params.append('client_secret', MAPPLS_CLIENT_SECRET);

    console.log("Fetching token...");
    const res = await axios.post('https://outpost.mappls.com/api/security/oauth/token', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000
    });
    const token = res.data.access_token;
    console.log("Token generated:", token.substring(0, 10) + "...");

    const testAddresses = [
      "Whitefield Main Rd, Bengaluru, Karnataka, India",
      "Near Air India Building, Mumbai, Maharashtra, India",
      "Shivaji Nagar, Pune, Maharashtra, India",
      "Metro Pillar 140, Kothrud, Pune, Maharashtra, India",
      "Survey 12, Baner Road, Pune, Maharashtra, India"
    ];

    for (let fullAddress of testAddresses) {
      console.log(`\nTesting address: ${fullAddress}`);
      try {
        const url = `https://atlas.mappls.com/api/places/geocode`;
        const response = await axios.get(url, {
          params: { address: fullAddress },
          headers: { 
            "Authorization": `bearer ${token}`,
            "User-Agent": "EVSaarthiAdmin/1.0" 
          },
          timeout: 10000,
        });

        const data = response.data;
        console.log("Mappls response copResults:", JSON.stringify(data.copResults, null, 2));
      } catch (err) {
        console.error("Mappls error:", err.response?.status, err.response?.data);
      }
    }
  } catch (error) {
    console.error("Test script failed:", error.message);
  }
}

runTest();
