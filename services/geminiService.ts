
import type { DesignPlan, RoomDimensions, ColorPalette } from '../types';

// This is a helper function to call our new secure API backend
async function callApi(action: string, payload: object) {
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, payload }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response from server.' }));
        throw new Error(errorData.error || `Server responded with status: ${response.status}`);
    }
    
    return await response.json();

  } catch (error) {
    console.error(`Client-side error calling API for action "${action}":`, error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    throw new Error(`Failed to communicate with the server. ${errorMessage}`);
  }
}

export const generateDesignIdeas = async (base64Image: string, style: string, dimensions: RoomDimensions, roomType: string): Promise<DesignPlan> => {
  return callApi('generateDesignIdeas', { base64Image, style, dimensions, roomType });
};

export const generateRedesignedImage = async (designPlan: DesignPlan, style: string, roomType: string, base64Image: string, newColors?: ColorPalette): Promise<string> => {
  return callApi('generateRedesignedImage', { designPlan, style, roomType, base64Image, newColors });
};

export const generateMorePalettes = async (designPlan: DesignPlan, style: string): Promise<ColorPalette[]> => {
  return callApi('generateMorePalettes', { designPlan, style });
};
