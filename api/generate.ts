// This file is no longer in use. All API calls have been moved back to the client-side
// in `services/geminiService.ts` to restore the application's previous functionality.
// This file can be safely deleted from your project.

export const config = {
    runtime: 'edge',
};

export default async function handler(request: Request) {
    return new Response(JSON.stringify({ error: 'This API endpoint is deprecated and no longer in use.' }), { status: 410, headers: { 'Content-Type': 'application/json' } });
}
