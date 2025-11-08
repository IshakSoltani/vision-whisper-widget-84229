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

    // Send transcript to Airtable
    const airtableApiKey = Deno.env.get('AIRTABLE_API_KEY');
    const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');
    const airtableTableName = Deno.env.get('AIRTABLE_TABLE_NAME');

    if (airtableApiKey && airtableBaseId && airtableTableName) {
      try {
        const airtablePayload = {
          records: [
            {
              fields: {
                'Conversation ID': conversationId,
                'Claim ID': claimId || '',
                'Transcript': JSON.stringify(data, null, 2),
                'Timestamp': new Date().toISOString(),
              }
            }
          ]
        };

        console.log('Sending transcript to Airtable');
        const airtableResponse = await fetch(
          `https://api.airtable.com/v0/${airtableBaseId}/${encodeURIComponent(airtableTableName)}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${airtableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(airtablePayload),
          }
        );

        if (!airtableResponse.ok) {
          const errorText = await airtableResponse.text();
          console.error('Airtable API failed:', errorText);
          throw new Error(`Airtable API error: ${errorText}`);
        } else {
          console.log('Successfully sent transcript to Airtable');
        }
      } catch (airtableError) {
        console.error('Error sending to Airtable:', airtableError);
        throw airtableError;
      }
    } else {
      console.warn('Airtable credentials not fully configured');
      throw new Error('Airtable credentials not configured');
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
