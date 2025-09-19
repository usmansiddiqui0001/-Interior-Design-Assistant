
import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { DesignPlan, RoomDimensions, ColorPalette } from '../types';

// This function will be executed on Vercel's backend, not in the browser.
// It's a Vercel Edge Function, see https://vercel.com/docs/functions/edge-functions

export const config = {
  runtime: 'edge',
};

// IMPORTANT: Do not move this or the line below it.
// This is the secure way to access the API key on the server.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

// This is the main function that will be called when your app sends a request to /api/generate
export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const { action, payload } = await request.json();

    let result: any;

    // We use a switch statement to handle different types of requests
    // from our frontend (generating the plan, regenerating the image, etc.)
    switch (action) {
      case 'generateDesignIdeas':
        result = await generateDesignIdeas(payload.base64Image, payload.style, payload.dimensions, payload.roomType);
        break;
      case 'generateRedesignedImage':
        result = await generateRedesignedImage(payload.designPlan, payload.style, payload.roomType, payload.base64Image, payload.newColors);
        break;
      case 'generateMorePalettes':
        result = await generateMorePalettes(payload.designPlan, payload.style);
        break;
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error(`Error in API route for action:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred";
    return new Response(JSON.stringify({ error: `Server error: ${errorMessage}` }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}


// --- All the original Gemini functions from geminiService.ts are now here ---
// They are called by the handler function above, and run securely on the server.

const designPlanSchema = {
  type: Type.OBJECT,
  properties: {
    analysis: {
      type: Type.STRING,
      description: "A brief analysis of the current room's layout, lighting, and existing decor. If room dimensions were provided, mention how they influence the design.",
    },
    designRationale: {
      type: Type.STRING,
      description: "A brief explanation of why the proposed design elements (colors, furniture, etc.) work together to achieve the desired style, referencing core interior design principles like balance, harmony, and focal points.",
    },
    wallColor: {
      type: Type.OBJECT,
      description: "Recommendations for the primary wall color palette.",
      properties: {
        color: { type: Type.STRING, description: "The primary wall color suggestion (e.g., 'Soft Off-White')." },
        accent: { type: Type.STRING, description: "An accent wall color suggestion (e.g., 'Charcoal Gray')." },
      },
    },
    lighting: {
      type: Type.STRING,
      description: "Suggestions for lighting fixtures (e.g., 'A large, arched floor lamp and recessed ceiling lights').",
    },
    flooring: {
      type: Type.STRING,
      description: "Recommendations for flooring (e.g., 'Light oak hardwood floors or a large, neutral-toned area rug').",
    },
    furnitureSuggestions: {
      type: Type.ARRAY,
      description: "A list of 3-5 key furniture and decor items, appropriately scaled for the room size if provided.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "The name of the furniture or decor item (e.g., 'Plush Sectional Sofa')." },
          description: { type: Type.STRING, description: "A detailed description of the item's style, material, and color." },
          placement: { type: Type.STRING, description: "Where to place this item in the room." },
          estimatedPrice: { type: Type.NUMBER, description: "An estimated price for this item in USD." },
          modelUrl: { type: Type.STRING, description: "A publicly accessible URL to a 3D model of the furniture item, preferably in GLTF or OBJ format. Can be null if no model is found. If a real model URL cannot be found, provide a realistic placeholder URL like 'https://example.com/models/modern-sofa.gltf'." },
        },
      },
    },
    estimatedCost: {
        type: Type.OBJECT,
        description: "An estimated budget range for the entire makeover in USD.",
        properties: {
            min: { type: Type.NUMBER, description: "The minimum estimated cost in USD."},
            max: { type: Type.NUMBER, description: "The maximum estimated cost in USD."},
            currency: { type: Type.STRING, description: "The currency, e.g., 'USD'."}
        }
    },
    alternativePalettes: {
      type: Type.ARRAY,
      description: "A list of exactly 3 alternative color palettes that also fit the style. Each should have a primary and an accent color.",
      items: {
        type: Type.OBJECT,
        properties: {
          color: { type: Type.STRING, description: "The alternative primary wall color." },
          accent: { type: Type.STRING, description: "The alternative accent wall color." },
        },
      },
    },
  },
  required: ['analysis', 'designRationale', 'wallColor', 'lighting', 'flooring', 'furnitureSuggestions', 'estimatedCost', 'alternativePalettes'],
};

const generateDesignIdeas = async (base64Image: string, style: string, dimensions: RoomDimensions, roomType: string): Promise<DesignPlan> => {
  const imagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64Image,
    },
  };

  let dimensionText = '';
  if (dimensions && dimensions.width && dimensions.length) {
      const unitName = dimensions.unit === 'ft' ? 'feet' : 'meters';
      dimensionText = ` The user has specified the room is approximately ${dimensions.width} ${unitName} wide by ${dimensions.length} ${unitName} long. Please ensure your furniture suggestions and layout advice are appropriately scaled for a room of this size and explicitly mention this in your analysis.`
  }

  const textPart = {
    text: `You are a world-class AI interior designer with a keen eye for detail and aesthetics. Analyze the provided room image, which is a ${roomType}, and generate a complete design makeover plan in a friendly and inspiring tone. The user wants a "${style}" style. Your recommendations must be appropriate for a ${roomType}. Your goal is to create a truly inspiring and practical makeover plan.
    ${dimensionText}
    Your tasks are:
    1. Briefly analyze the current room's strengths and weaknesses.
    2. Suggest a full makeover based on the selected style, keeping the provided dimensions in mind if available.
    3. Output specific ideas for a primary wall color palette, flooring, and lighting.
    4. Recommend 3-5 key furniture or decor items with detailed descriptions and placement suggestions. Ensure items are scaled correctly for the room. For each recommended item, you must also provide a \`modelUrl\`, which should be a publicly accessible URL to a 3D model of the item, preferably in GLTF or OBJ format. If a real model cannot be found, provide a realistic placeholder URL (e.g., 'https://models.example.com/modern_chair.gltf').
    5. Provide a realistic, estimated total budget range (min and max) for the complete makeover. Also, include an estimated price for each recommended furniture item. All monetary values should be in USD.
    6. Also provide exactly 3 alternative color palettes (primary and accent) that would offer a different mood while still fitting the requested style.
    7. Provide a 'Design Rationale' explaining why your suggestions create a cohesive and high-quality '${style}' design, touching on principles like balance, harmony, or focal points.

    Provide the output in JSON format according to the provided schema. Ensure the descriptions are vivid and helpful.`,
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [imagePart, textPart] },
    config: {
      responseMimeType: "application/json",
      responseSchema: designPlanSchema,
      temperature: 0.7,
    },
  });

  const jsonText = response.text.trim();
  const parsedJson = JSON.parse(jsonText);
  
  if (!parsedJson.furnitureSuggestions || !parsedJson.estimatedCost || !parsedJson.alternativePalettes) {
      throw new Error("AI response is missing required fields like 'furnitureSuggestions', 'estimatedCost', or 'alternativePalettes'.");
  }
  
  return parsedJson as DesignPlan;
};


const generateRedesignedImage = async (designPlan: DesignPlan, style: string, roomType: string, base64Image: string, newColors?: ColorPalette): Promise<string> => {
    const furnitureList = designPlan.furnitureSuggestions.map(f => `- ${f.name}: ${f.placement}`).join('\n');
    const primaryColor = newColors?.color || designPlan.wallColor.color;
    const accentColor = newColors?.accent || designPlan.wallColor.accent;

    const imagePart = {
        inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image,
        },
    };

    const textPrompt = `Redesign this ${roomType} in a photorealistic ${style} style.
Incorporate these elements:
- Walls: ${primaryColor} with ${accentColor} accents.
- Flooring: ${designPlan.flooring}.
- Lighting: ${designPlan.lighting}.
- Furniture:
${furnitureList}
Crucially, preserve the original room's structure, like walls, windows, and doors. Replace only the furnishings and decor.
The final output must be only the redesigned image, with no text.`;


    const textPart = { text: textPrompt };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [imagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    const candidate = response.candidates?.[0];

    if (!candidate) {
        const blockReason = response.promptFeedback?.blockReason;
        const safetyRatings = response.promptFeedback?.safetyRatings?.map(r => `${r.category}: ${r.probability}`).join(', ');
        let reason = "The AI returned an empty response, which could be due to a safety filter or a temporary issue.";
        if (blockReason) {
            reason = `Request was blocked due to: ${blockReason}.`;
        } else if (safetyRatings) {
            reason = `Request may have been blocked by safety filters. Ratings: ${safetyRatings}`;
        }
        throw new Error(reason);
    }
  
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
        throw new Error(`Image generation stopped unexpectedly. Reason: ${candidate.finishReason}`);
    }

    if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
            if (part.inlineData && part.inlineData.data) {
                return part.inlineData.data;
            }
        }
    }
  
    const textResponse = response.text;
    if (textResponse) {
        console.warn("AI responded with text instead of an image:", textResponse);
        throw new Error(`The AI provided a text response instead of an image. This can happen if the request is not possible to fulfill. AI response: "${textResponse.substring(0, 100)}..."`);
    }
  
    throw new Error("The AI did not return a redesigned image. The response was valid but contained no image data.");
};

const morePalettesSchema = {
    type: Type.ARRAY,
    description: "A list of exactly 3 new and distinct color palettes. Each palette must have a primary and an accent color.",
    items: {
      type: Type.OBJECT,
      properties: {
        color: { type: Type.STRING, description: "The new primary wall color." },
        accent: { type: Type.STRING, description: "The new accent wall color." },
      },
       required: ['color', 'accent'],
    },
};

const generateMorePalettes = async (designPlan: DesignPlan, style: string): Promise<ColorPalette[]> => {
    const existingPalettes = [designPlan.wallColor, ...designPlan.alternativePalettes]
        .map(p => `- ${p.color} & ${p.accent}`)
        .join('\n');

    const prompt = `You are an AI color consultant for an interior design app. Based on the following design analysis for a "${style}" themed room, please generate exactly 3 new and distinct color palettes.

    **Design Analysis:** ${designPlan.analysis}

    **Important:** The user has already seen the following palettes, so please provide completely different options that suggest different moods (e.g., one calming, one energetic, one sophisticated):
    ${existingPalettes}
    
    Return the output as a JSON array of objects, where each object has a 'color' and 'accent' property, according to the provided schema.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }] },
        config: {
          responseMimeType: "application/json",
          responseSchema: morePalettesSchema,
          temperature: 0.8,
        },
    });

    const jsonText = response.text.trim();
    const parsedJson = JSON.parse(jsonText);
    return parsedJson as ColorPalette[];
};
