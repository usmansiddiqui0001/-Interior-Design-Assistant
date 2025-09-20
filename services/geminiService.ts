import type { DesignPlan, RoomDimensions, ColorPalette } from '../types';

// A helper function to call our serverless API endpoint
async function callApi<T>(action: string, payload: object): Promise<T> {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, payload }),
  });

  const result = await response.json();

  if (!response.ok) {
    console.error('API Error:', result.error);
    // Try to provide a more user-friendly error message
    const userFriendlyError = result.error && result.error.includes("safety")
      ? "The request was blocked by a safety filter. Please modify your prompt or image."
      : `An error occurred: ${result.error || 'Unknown server error'}`;
    throw new Error(userFriendlyError);
  }

  return result as T;
}

export const generateDesignIdeas = async (base64Image: string, style: string, dimensions: RoomDimensions, roomType: string): Promise<DesignPlan> => {
  return callApi<DesignPlan>('generateDesignIdeas', { base64Image, style, dimensions, roomType });
};

export const generateRedesignedImage = async (designPlan: DesignPlan, style: string, roomType: string, base64Image: string, newColors?: ColorPalette): Promise<string> => {
  return callApi<string>('generateRedesignedImage', { designPlan, style, roomType, base64Image, newColors });
};

export const generateMorePalettes = async (designPlan: DesignPlan, style: string): Promise<ColorPalette[]> => {
  return callApi<ColorPalette[]>('generateMorePalettes', { designPlan, style });
};
