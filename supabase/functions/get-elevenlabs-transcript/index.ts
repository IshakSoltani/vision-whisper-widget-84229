import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId, claimId } = await req.json();
    
    if (!conversationId) {
      throw new Error('Conversation ID is required');
    }

    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    console.log('Fetching transcript for conversation:', conversationId);

    // Fetch conversation details from ElevenLabs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', errorText);
      throw new Error(`Failed to fetch transcript: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('Transcript retrieved successfully');

    // Send transcript to n8n webhook
    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
    if (n8nWebhookUrl) {
      try {
        const n8nPayload = {
          conversationId,
          transcript: data,
          claimId: claimId || null,
          timestamp: new Date().toISOString(),
        };

        console.log('Sending transcript to n8n:', n8nWebhookUrl);
        const n8nResponse = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(n8nPayload),
        });

        if (!n8nResponse.ok) {
          console.error('n8n webhook failed:', await n8nResponse.text());
        } else {
          console.log('Successfully sent transcript to n8n');
        }
      } catch (n8nError) {
        console.error('Error sending to n8n:', n8nError);
        // Don't fail the request if n8n fails
      }
    } else {
      console.warn('N8N_WEBHOOK_URL not configured');
    }

    return new Response(
      JSON.stringify(data),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching transcript:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
