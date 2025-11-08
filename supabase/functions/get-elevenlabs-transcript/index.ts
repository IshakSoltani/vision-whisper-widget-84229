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
    console.log('Response structure:', JSON.stringify(data).substring(0, 500)); // Log first 500 chars to debug

    // Update transcript in Airtable
    const airtableApiKey = Deno.env.get('AIRTABLE_API_KEY');
    const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');
    const airtableTableName = Deno.env.get('AIRTABLE_TABLE_NAME');

    if (airtableApiKey && airtableBaseId && airtableTableName && claimId) {
      try {
        console.log('Finding Airtable record with Claim ID:', claimId);
        
        // First, find the record with matching claim_id
        const filterFormula = `{claim_id}='${claimId}'`;
        const listResponse = await fetch(
          `https://api.airtable.com/v0/${airtableBaseId}/${encodeURIComponent(airtableTableName)}?filterByFormula=${encodeURIComponent(filterFormula)}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${airtableApiKey}`,
            },
          }
        );

        if (!listResponse.ok) {
          const errorText = await listResponse.text();
          console.error('Airtable list API failed:', errorText);
          throw new Error(`Airtable list API error: ${errorText}`);
        }

        const listData = await listResponse.json();
        
        if (!listData.records || listData.records.length === 0) {
          console.error('No record found with Claim ID:', claimId);
          throw new Error(`No Airtable record found with claim_id: ${claimId}`);
        }

        const recordId = listData.records[0].id;
        console.log('Found record:', recordId);

        // Extract transcript text from the conversation data
        let transcriptText = '';
        
        // Check different possible structures
        if (typeof data.transcript === 'string') {
          transcriptText = data.transcript;
        } else if (Array.isArray(data.analysis?.transcript_with_data)) {
          // Extract messages from transcript_with_data array
          transcriptText = data.analysis.transcript_with_data
            .map((item: any) => `${item.role}: ${item.message}`)
            .join('\n');
        } else if (Array.isArray(data)) {
          // If data itself is the transcript array
          transcriptText = data
            .map((item: any) => `${item.role}: ${item.message}`)
            .join('\n');
        } else {
          // Fallback: try to find transcript in the response
          console.warn('Unexpected response structure, using fallback');
          transcriptText = JSON.stringify(data, null, 2);
        }

        console.log('Extracted transcript text (first 200 chars):', transcriptText.substring(0, 200));

        // Update the record with just the transcript message
        const updatePayload = {
          fields: {
            'elevenlabs_transcript': transcriptText,
          }
        };

        console.log('Updating Airtable record with transcript');
        const updateResponse = await fetch(
          `https://api.airtable.com/v0/${airtableBaseId}/${encodeURIComponent(airtableTableName)}/${recordId}`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${airtableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatePayload),
          }
        );

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error('Airtable update API failed:', errorText);
          throw new Error(`Airtable update API error: ${errorText}`);
        }
        
        console.log('Successfully updated transcript in Airtable');
      } catch (airtableError) {
        console.error('Error updating Airtable:', airtableError);
        throw airtableError;
      }
    } else {
      console.warn('Airtable credentials not fully configured or claim_id missing');
      throw new Error('Airtable credentials not configured or claim_id missing');
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
