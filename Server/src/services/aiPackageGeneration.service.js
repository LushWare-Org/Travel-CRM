import geminiRestService from './geminiRest.service.js';

/**
 * AI Package Generation Service
 * Uses Gemini AI to generate complete travel packages with itinerary, hotels, activities, etc.
 */
class AIPackageGenerationService {
  /**
   * Generate complete package using Gemini AI
   * @param {string} destination - Travel destination
   * @param {string} packageType - Package type (Standard, Deluxe, Luxury, Premium)
   * @param {string} category - Package category
   * @param {number} nights - Number of nights
   * @returns {Promise<Object>} Complete package object with all details
   */
  async generatePackage(destination, packageType, category, nights) {
    try {
      const days = nights + 1; // Convert nights to days
      
      const prompt = `You are an expert travel package designer. Create a complete travel package based on the following requirements:

Destination: ${destination}
Package Type: ${packageType || 'Standard'}
Category: ${category || 'Family'}
Duration: ${nights} nights / ${days} days

Generate a complete travel package with the following structure:

1. PACKAGE INFORMATION:
   - Package Name (creative and appealing, 50-80 characters)
   - Description (detailed, 300-500 words, highlighting unique experiences)
   - Highlights (5-7 key highlights as an array)
   - Inclusions (8-12 items as an array - what's included)
   - Exclusions (5-8 items as an array - what's not included)

2. ITINERARY (${days} days):
   For each day, provide:
   - Day Title (engaging title for the day)
   - Locations (2-4 specific locations/places to visit)
   - Activities (3-6 activities for the day)
   - Accommodation:
     * Hotel/Resort Name
     * Complete Address
     * Contact Number (with country code)
     * Rating (1.0 to 5.0)
     * Type (hotel, resort, guesthouse, etc.)
   - Meals (breakfast, lunch, dinner - boolean for each)
   - Transport (how to get to next location: flight, train, bus, car, boat, walk)

CRITICAL INSTRUCTIONS:
1. You MUST respond with ONLY a valid JSON object
2. Do NOT include any text before or after the JSON
3. Do NOT use markdown code blocks (no code fences)
4. Keep descriptions concise (max 300 words for package description)
5. Keep day descriptions brief (max 100 words per day)
6. Ensure the JSON is complete and properly closed
7. Return ONLY the raw JSON, nothing else

Format your response as a JSON object with this exact structure:
{
  "name": "Package Name",
  "description": "Detailed description...",
  "highlights": ["Highlight 1", "Highlight 2", ...],
  "inclusions": ["Inclusion 1", "Inclusion 2", ...],
  "exclusions": ["Exclusion 1", "Exclusion 2", ...],
  "days": [
    {
      "dayNumber": 1,
      "title": "Day 1 Title",
      "locations": ["Location 1", "Location 2"],
      "activities": ["Activity 1", "Activity 2", "Activity 3"],
      "accommodation": {
        "name": "Hotel Name",
        "address": "Complete address",
        "contactNumber": "+94 XX XXX XXXX",
        "rating": 4.5,
        "type": "hotel"
      },
      "meals": {
        "breakfast": true,
        "lunch": false,
        "dinner": true
      },
      "transport": "car"
    },
    {
      "dayNumber": 2,
      "title": "Day 2 Title",
      "locations": ["Location 1", "Location 2"],
      "activities": ["Activity 1", "Activity 2"],
      "accommodation": {
        "name": "Hotel Name",
        "address": "Complete address",
        "contactNumber": "+94 XX XXX XXXX",
        "rating": 4.2,
        "type": "resort"
      },
      "meals": {
        "breakfast": true,
        "lunch": true,
        "dinner": true
      },
      "transport": "car"
    }
    // ... continue for all ${days} days
  ]
}

Return ONLY the JSON object, nothing else. Ensure all ${days} days are included.`;

      // Request more tokens for package generation (packages can be large)
      const responseText = await geminiRestService.generateContent(prompt, {
        maxTokens: 8000, // Increased for complete package generation
        temperature: 0.7,
      });
      
      if (!responseText || typeof responseText !== 'string') {
        throw new Error('No response from AI service');
      }

      // Log response length for debugging
      console.log(`[AI Package] Response length: ${responseText.length} characters`);
      if (responseText.length > 5000) {
        console.warn(`[AI Package] Response is very long (${responseText.length} chars), may be truncated`);
      }

      // Parse the JSON response with robust error handling
      let packageData = null;
      try {
        const text = responseText.trim();
        
        // Log full response for debugging (first 5000 chars)
        console.log('[AI Package] Full response preview:', text.substring(0, 5000));
        console.log('[AI Package] Response starts with:', text.substring(0, 200));
        
        // Remove markdown code blocks if present
        let jsonText = text
          .replace(/```json\n?/gi, '')
          .replace(/```\n?/g, '')
          .replace(/```javascript\n?/gi, '')
          .replace(/```typescript\n?/gi, '')
          .trim();
        
        // Try direct parse first
        try {
          packageData = JSON.parse(jsonText);
          console.log('[AI Package] Successfully parsed JSON directly');
        } catch (e) {
          console.log('[AI Package] Direct parse failed, trying extraction methods...');
          
          // Try multiple extraction strategies
          let extractedJson = null;
          
          // Strategy 1: Find JSON object with balanced braces
          const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            extractedJson = jsonMatch[0];
            console.log('[AI Package] Found JSON object with regex, length:', extractedJson.length);
          } else {
            // Strategy 2: Find JSON starting from first {
            const firstBrace = jsonText.indexOf('{');
            if (firstBrace !== -1) {
              // Try to find the matching closing brace
              let braceCount = 0;
              let endPos = firstBrace;
              for (let i = firstBrace; i < jsonText.length; i++) {
                if (jsonText[i] === '{') braceCount++;
                if (jsonText[i] === '}') braceCount--;
                if (braceCount === 0) {
                  endPos = i + 1;
                  break;
                }
              }
              if (endPos > firstBrace) {
                extractedJson = jsonText.substring(firstBrace, endPos);
                console.log('[AI Package] Extracted JSON by balancing braces, length:', extractedJson.length);
              }
            }
          }
          
          if (extractedJson) {
            try {
              packageData = JSON.parse(extractedJson);
              console.log('[AI Package] Successfully parsed extracted JSON');
            } catch (parseErr) {
              console.log('[AI Package] Extracted JSON parse failed, trying to fix...');
              console.log('[AI Package] Parse error:', parseErr.message);
              // If JSON is incomplete/truncated, try to fix it
              let fixedJson = extractedJson;
              
              // Count braces to see if JSON is incomplete
              const openBraces = (fixedJson.match(/\{/g) || []).length;
              const closeBraces = (fixedJson.match(/\}/g) || []).length;
              const openBrackets = (fixedJson.match(/\[/g) || []).length;
              const closeBrackets = (fixedJson.match(/\]/g) || []).length;
              
              // If incomplete, try to close it properly
              if (openBraces > closeBraces || openBrackets > closeBrackets) {
                // Try to find where it was cut off and close it
                // First, try to close any open arrays
                if (openBrackets > closeBrackets) {
                  fixedJson += ']'.repeat(openBrackets - closeBrackets);
                }
                
                // Then close any open objects
                if (openBraces > closeBraces) {
                  fixedJson += '}'.repeat(openBraces - closeBraces);
                }
                
                try {
                  packageData = JSON.parse(fixedJson);
                } catch (fixErr) {
                  // If still fails, try a more aggressive approach
                  // Extract what we can and build a partial structure
                  console.warn('JSON is incomplete, attempting partial extraction');
                  
                  // Try to extract at least the basic fields
                  const nameMatch = jsonText.match(/"name"\s*:\s*"([^"]*)"/);
                  const descMatch = jsonText.match(/"description"\s*:\s*"([^"]*)"/);
                  
                  if (nameMatch) {
                    // Build a minimal valid structure
                    packageData = {
                      name: nameMatch[1],
                      description: descMatch ? descMatch[1] : 'Description not fully generated',
                      highlights: [],
                      inclusions: [],
                      exclusions: [],
                      days: [],
                    };
                    
                    // Try to extract days if possible
                    const daysMatch = jsonText.match(/"days"\s*:\s*\[([\s\S]*?)\]/);
                    if (daysMatch) {
                      try {
                        const daysArray = JSON.parse(`[${daysMatch[1]}]`);
                        packageData.days = daysArray;
                      } catch (e) {
                        // If days array is also incomplete, create placeholder days
                        for (let i = 1; i <= days; i++) {
                          packageData.days.push({
                            dayNumber: i,
                            title: `Day ${i}`,
                            description: '',
                            locations: [],
                            activities: [],
                            accommodation: { name: '', address: '', contactNumber: '', rating: 0, type: 'hotel' },
                            meals: { breakfast: true, lunch: false, dinner: true },
                            transport: '',
                            images: [],
                            notes: '',
                          });
                        }
                      }
                    } else {
                      // Create placeholder days
                      for (let i = 1; i <= days; i++) {
                        packageData.days.push({
                          dayNumber: i,
                          title: `Day ${i}`,
                          description: '',
                          locations: [],
                          activities: [],
                          accommodation: { name: '', address: '', contactNumber: '', rating: 0, type: 'hotel' },
                          meals: { breakfast: true, lunch: false, dinner: true },
                          transport: '',
                          images: [],
                          notes: '',
                        });
                      }
                    }
                    
                    console.warn('Using partial package data due to incomplete JSON');
                  } else {
                    // Last resort: log the actual response and throw
                    console.error('[AI Package] Could not extract any JSON structure');
                    console.error('[AI Package] Response text (first 3000 chars):', responseText.substring(0, 3000));
                    throw new Error('No JSON structure found in response');
                  }
                }
              } else {
                // Try partial extraction even if braces are balanced
                console.log('[AI Package] Braces are balanced but parse failed, trying partial extraction...');
                const nameMatch = jsonText.match(/"name"\s*:\s*"([^"]*)"/);
                if (nameMatch) {
                  packageData = {
                    name: nameMatch[1],
                    description: (jsonText.match(/"description"\s*:\s*"([^"]*)"/)?.[1]) || 'Description not fully generated',
                    highlights: [],
                    inclusions: [],
                    exclusions: [],
                    days: [],
                  };
                  // Create placeholder days
                  for (let i = 1; i <= days; i++) {
                    packageData.days.push({
                      dayNumber: i,
                      title: `Day ${i}`,
                      description: '',
                      locations: [],
                      activities: [],
                      accommodation: { name: '', address: '', contactNumber: '', rating: 0, type: 'hotel' },
                      meals: { breakfast: true, lunch: false, dinner: true },
                      transport: '',
                      images: [],
                      notes: '',
                    });
                  }
                  console.warn('[AI Package] Using partial extraction with placeholders');
                } else {
                  throw new Error('No JSON structure found in response');
                }
              }
            }
          } else {
            // No JSON object found at all - try to extract any structured data
            console.error('[AI Package] No JSON object pattern found in response');
            console.error('[AI Package] Response preview:', responseText.substring(0, 1000));
            
            // Try to find if there's any JSON-like structure
            const nameMatch = responseText.match(/"name"\s*:\s*"([^"]*)"/);
            if (nameMatch) {
              console.log('[AI Package] Found name field, creating minimal structure');
              packageData = {
                name: nameMatch[1],
                description: 'Package description - AI response was incomplete',
                highlights: [],
                inclusions: [],
                exclusions: [],
                days: [],
              };
              // Create placeholder days
              for (let i = 1; i <= days; i++) {
                packageData.days.push({
                  dayNumber: i,
                  title: `Day ${i}`,
                  description: '',
                  locations: [],
                  activities: [],
                  accommodation: { name: '', address: '', contactNumber: '', rating: 0, type: 'hotel' },
                  meals: { breakfast: true, lunch: false, dinner: true },
                  transport: '',
                  images: [],
                  notes: '',
                });
              }
              console.warn('[AI Package] Created minimal package structure from partial data');
            } else {
              throw new Error('No JSON structure found in response');
            }
          }
        }
      } catch (parseError) {
        console.error('Failed to parse JSON. Response text length:', responseText.length);
        console.error('Response preview (first 2000 chars):', responseText.substring(0, 2000));
        console.error('Parse error:', parseError);
        throw new Error(`Failed to parse AI response: ${parseError.message}`);
      }

      // Validate the response structure
      if (!packageData || typeof packageData !== 'object') {
        throw new Error('Invalid response format: expected object');
      }

      if (!packageData.name || !packageData.description) {
        throw new Error('Missing required fields: name or description');
      }

      // Validate days - be more lenient if we got partial data
      if (!packageData.days || !Array.isArray(packageData.days)) {
        // Create placeholder days if missing
        packageData.days = [];
        for (let i = 1; i <= days; i++) {
          packageData.days.push({
            dayNumber: i,
            title: `Day ${i}`,
            description: '',
            locations: [],
            activities: [],
            accommodation: { name: '', address: '', contactNumber: '', rating: 0, type: 'hotel' },
            meals: { breakfast: true, lunch: false, dinner: true },
            transport: '',
            images: [],
            notes: '',
          });
        }
      } else if (packageData.days.length !== days) {
        // If we have some days but not enough, pad with placeholders
        console.warn(`Expected ${days} days but got ${packageData.days.length}, padding with placeholders`);
        while (packageData.days.length < days) {
          const dayNum = packageData.days.length + 1;
          packageData.days.push({
            dayNumber: dayNum,
            title: `Day ${dayNum}`,
            description: '',
            locations: [],
            activities: [],
            accommodation: { name: '', address: '', contactNumber: '', rating: 0, type: 'hotel' },
            meals: { breakfast: true, lunch: false, dinner: true },
            transport: '',
            images: [],
            notes: '',
          });
        }
      }

      // Map category to valid backend enum values
      const categoryMap = {
        'adventure': 'family', // Map adventure to family
        'budget': 'family',
        'luxury': 'family',
        'religious': 'family',
        'wildlife': 'wild safari', // Map wildlife to wild safari
        'beach': 'family',
        'heritage': 'family',
        'other': 'family',
        'honeymoon': 'honeymoon',
        'couple': 'couple',
        'family': 'family',
        'group': 'group',
        'wild safari': 'wild safari',
      };
      
      const validCategory = categoryMap[category?.toLowerCase()] || 'family';

      // Format and validate the package data
      const formattedPackage = {
        name: packageData.name,
        description: packageData.description || '',
        destination: destination,
        duration: days,
        category: validCategory,
        packageType: packageType || 'Standard',
        highlights: Array.isArray(packageData.highlights) ? packageData.highlights : [],
        inclusions: Array.isArray(packageData.inclusions) ? packageData.inclusions : [],
        exclusions: Array.isArray(packageData.exclusions) ? packageData.exclusions : [],
        price: 0, // Leave empty for manual entry
        days: packageData.days.map((day, index) => ({
          dayNumber: day.dayNumber || index + 1,
          title: day.title || `Day ${day.dayNumber || index + 1}`,
          description: day.description || '',
          locations: Array.isArray(day.locations) ? day.locations : [],
          activities: Array.isArray(day.activities) ? day.activities : [],
          accommodation: {
            name: day.accommodation?.name || '',
            address: day.accommodation?.address || '',
            contactNumber: day.accommodation?.contactNumber || day.accommodation?.contact || '',
            rating: day.accommodation?.rating !== undefined && day.accommodation?.rating !== null
              ? parseFloat(day.accommodation.rating)
              : 0,
            type: day.accommodation?.type || 'hotel',
          },
          meals: {
            breakfast: day.meals?.breakfast === true,
            lunch: day.meals?.lunch === true,
            dinner: day.meals?.dinner === true,
          },
          transport: day.transport || '',
          images: [],
          notes: day.notes || '',
        })),
        images: [], // Leave empty for manual upload
        status: 'draft', // Save as draft
      };

      return formattedPackage;
    } catch (error) {
      console.error('Error in AI package generation service:', error);
      throw new Error(`Failed to generate package: ${error.message}`);
    }
  }
}

export default new AIPackageGenerationService();

