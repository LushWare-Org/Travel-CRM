import geminiRestService from './geminiRest.service.js';

/**
 * Hotel Suggestion Service
 * Uses Gemini AI to suggest hotels based on destination, package type, and category
 */
class HotelSuggestionService {
  /**
   * Generate hotel suggestions using Gemini AI
   * @param {string} destination - Travel destination
   * @param {string} packageType - Package type (Standard, Deluxe, Luxury, Premium)
   * @param {string} category - Package category
   * @param {string} location - Specific location from itinerary day
   * @param {number} count - Number of hotels to suggest (default: 5)
   * @returns {Promise<Array>} Array of hotel suggestions with name and address
   */
  async suggestHotels(destination, packageType, category, location, count = 5) {
    try {
      // Prioritize locations if available, otherwise use destination
      const searchLocation = location || destination;
      
      const prompt = `You are a travel expert. Based on the following information, suggest ${count} best matching hotels:

Destination: ${destination || 'Not specified'}
${location ? `Specific Locations: ${location} (These are specific locations from the itinerary day - prioritize hotels near these locations)` : ''}
Package Type: ${packageType || 'Not specified'}
Category: ${category || 'Not specified'}

Please provide exactly ${count} hotel suggestions. Prioritize hotels that are:
1. Located in or near the specific locations: "${location || destination}"
2. Match the package type (${packageType || 'any'})
3. Suitable for the category (${category || 'any'})

For each hotel, provide:
1. Hotel Name
2. Complete Address (street address, city, state/province, country)
3. Contact Number (phone number with country code, e.g., +94 XX XXX XXXX)
4. Rating (numeric rating from 1.0 to 5.0, with one decimal place if needed)

The first hotel should be the BEST MATCH based on location proximity and package requirements.

IMPORTANT: You MUST respond with ONLY a valid JSON array. Do not include any text before or after the JSON. Do not use markdown code blocks. Just return the raw JSON array.

Format your response as a JSON array with this exact structure:
[
  {
    "name": "Hotel Name",
    "address": "Complete street address, city, state, country",
    "contactNumber": "+94 XX XXX XXXX or similar format",
    "rating": 4.5
  },
  {
    "name": "Another Hotel Name",
    "address": "Complete street address, city, state, country",
    "contactNumber": "+94 XX XXX XXXX or similar format",
    "rating": 4.2
  }
]

Return ONLY the JSON array, nothing else.`;

      // Request more tokens for hotel suggestions (hotel data can be large)
      const responseText = await geminiRestService.generateContent(prompt, {
        maxTokens: 4000, // Increased for complete hotel suggestions
        temperature: 0.7,
      });
      
      if (!responseText || typeof responseText !== 'string') {
        throw new Error('No response from AI service');
      }

      // Log response length for debugging
      console.log(`[Hotel Suggestions] Response length: ${responseText.length} characters`);
      if (responseText.length > 3000) {
        console.warn(`[Hotel Suggestions] Response is very long (${responseText.length} chars), may be truncated`);
      }

      // Parse the JSON response
      let hotels = [];
      try {
        // Try to extract JSON from the response
        const text = responseText.trim();
        
        // Remove markdown code blocks if present
        let jsonText = text
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .replace(/```javascript\n?/g, '')
          .trim();
        
        // Try direct parse first
        try {
          hotels = JSON.parse(jsonText);
        } catch (e) {
          // If that fails, try to extract JSON array from the text
          const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            hotels = JSON.parse(jsonMatch[0]);
          } else {
            // Try to find any JSON-like structure
            const jsonObjectMatch = jsonText.match(/\{[\s\S]*\}/);
            if (jsonObjectMatch) {
              const obj = JSON.parse(jsonObjectMatch[0]);
              // If it's a single object, wrap it in an array
              if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
                hotels = [obj];
              } else if (Array.isArray(obj)) {
                hotels = obj;
              }
            } else {
              // Last resort: try to parse line by line or extract structured data
              throw new Error('No JSON structure found in response');
            }
          }
        }
      } catch (parseError) {
        console.error('Failed to parse JSON. Response text:', responseText.substring(0, 1000));
        console.error('Parse error:', parseError);
        
        // Try a more aggressive extraction - look for any array-like structure
        try {
          // Try multiple patterns to extract JSON
          // Pattern 1: Simple array pattern
          let arrayPattern = /\[[\s\S]*?\]/;
          let match = responseText.match(arrayPattern);
          
          if (!match) {
            // Pattern 2: More flexible - find anything between [ and ]
            arrayPattern = /\[[^\]]*(?:\{[^}]*\}[^\]]*)*\]/;
            match = responseText.match(arrayPattern);
          }
          
          if (!match) {
            // Pattern 3: Find nested structures
            const lines = responseText.split('\n');
            const jsonLines = [];
            let inJson = false;
            for (const line of lines) {
              if (line.trim().startsWith('[') || line.trim().startsWith('{')) {
                inJson = true;
              }
              if (inJson) {
                jsonLines.push(line);
              }
              if (inJson && (line.trim().endsWith(']') || line.trim().endsWith('}'))) {
                break;
              }
            }
            if (jsonLines.length > 0) {
              match = [jsonLines.join('\n')];
            }
          }
          
          if (match && match[0]) {
            try {
              hotels = JSON.parse(match[0]);
            } catch (e) {
              // Try cleaning up the match
              let cleaned = match[0]
                .replace(/```json/gi, '')
                .replace(/```/g, '')
                .trim();
              
              // If JSON is incomplete/truncated, try to fix it
              try {
                hotels = JSON.parse(cleaned);
              } catch (parseErr) {
                // Check if JSON is incomplete
                const openBrackets = (cleaned.match(/\[/g) || []).length;
                const closeBrackets = (cleaned.match(/\]/g) || []).length;
                const openBraces = (cleaned.match(/\{/g) || []).length;
                const closeBraces = (cleaned.match(/\}/g) || []).length;
                
                // If incomplete, try to close it properly
                if (openBrackets > closeBrackets || openBraces > closeBraces) {
                  // Find the last complete object
                  let lastCompleteIndex = cleaned.lastIndexOf('}');
                  if (lastCompleteIndex !== -1) {
                    // Extract up to the last complete object
                    let partialJson = cleaned.substring(0, lastCompleteIndex + 1);
                    
                    // Close any open brackets
                    if (openBrackets > closeBrackets) {
                      partialJson += ']';
                    }
                    
                    try {
                      hotels = JSON.parse(partialJson);
                      console.warn(`[Hotel Suggestions] Using partial JSON (${hotels.length} hotels)`);
                    } catch (e) {
                      // Try to extract individual hotel objects
                      const hotelMatches = cleaned.match(/\{[^}]*"name"[^}]*\}/g);
                      if (hotelMatches && hotelMatches.length > 0) {
                        hotels = hotelMatches.map(match => {
                          try {
                            return JSON.parse(match);
                          } catch (e) {
                            // Extract fields manually
                            const nameMatch = match.match(/"name"\s*:\s*"([^"]*)"/);
                            const addressMatch = match.match(/"address"\s*:\s*"([^"]*)"/);
                            const contactMatch = match.match(/"contactNumber"\s*:\s*"([^"]*)"/);
                            const ratingMatch = match.match(/"rating"\s*:\s*([0-9.]+)/);
                            
                            return {
                              name: nameMatch ? nameMatch[1] : 'Unknown Hotel',
                              address: addressMatch ? addressMatch[1] : '',
                              contactNumber: contactMatch ? contactMatch[1] : '',
                              rating: ratingMatch ? parseFloat(ratingMatch[1]) : 0,
                            };
                          }
                        }).filter(h => h && h.name);
                        console.warn(`[Hotel Suggestions] Extracted ${hotels.length} hotels from incomplete JSON`);
                      } else {
                        throw e;
                      }
                    }
                  } else {
                    throw e;
                  }
                } else {
                  throw e;
                }
              }
            }
          } else {
            // Try to extract hotel objects directly from text
            const hotelPattern = /\{[^}]*"name"[^}]*\}/g;
            const hotelMatches = responseText.match(hotelPattern);
            if (hotelMatches && hotelMatches.length > 0) {
              hotels = hotelMatches.map(match => {
                try {
                  return JSON.parse(match);
                } catch (e) {
                  // Extract fields manually
                  const nameMatch = match.match(/"name"\s*:\s*"([^"]*)"/);
                  const addressMatch = match.match(/"address"\s*:\s*"([^"]*)"/);
                  const contactMatch = match.match(/"contactNumber"\s*:\s*"([^"]*)"/);
                  const ratingMatch = match.match(/"rating"\s*:\s*([0-9.]+)/);
                  
                  return {
                    name: nameMatch ? nameMatch[1] : 'Unknown Hotel',
                    address: addressMatch ? addressMatch[1] : '',
                    contactNumber: contactMatch ? contactMatch[1] : '',
                    rating: ratingMatch ? parseFloat(ratingMatch[1]) : 0,
                  };
                }
              }).filter(h => h && h.name);
              console.warn(`[Hotel Suggestions] Extracted ${hotels.length} hotels using pattern matching`);
            } else {
              throw new Error('Could not extract JSON array from response');
            }
          }
        } catch (finalError) {
          console.error('Final parse attempt failed:', finalError);
          console.error('Full response text:', responseText);
          throw new Error(`Failed to parse hotel suggestions from AI response: ${parseError.message}. Response preview: ${responseText.substring(0, 500)}`);
        }
      }

      // Validate and format the response
      if (!Array.isArray(hotels)) {
        throw new Error('Invalid response format: expected array');
      }

      // Ensure we have the required fields
      const formattedHotels = hotels
        .slice(0, count) // Limit to requested count
        .map((hotel, index) => ({
          name: hotel.name || `Hotel ${index + 1}`,
          address: hotel.address || 'Address not available',
          contactNumber: hotel.contactNumber || hotel.phone || hotel.contact || '',
          rating: hotel.rating !== undefined && hotel.rating !== null 
            ? parseFloat(hotel.rating) 
            : (hotel.rating === undefined ? null : parseFloat(hotel.rating)),
        }))
        .filter(hotel => hotel.name && hotel.address); // Filter out invalid entries

      if (formattedHotels.length === 0) {
        throw new Error('No valid hotel suggestions found');
      }

      return formattedHotels;
    } catch (error) {
      console.error('Error in hotel suggestion service:', error);
      throw new Error(`Failed to generate hotel suggestions: ${error.message}`);
    }
  }
}

export default new HotelSuggestionService();

