import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      }
    );
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get Filebase credentials from environment
    const filebaseAccessKey = Deno.env.get('FILEBASE_ACCESS_KEY');
    const filebaseSecretKey = Deno.env.get('FILEBASE_SECRET_KEY');
    const filebaseBucket = Deno.env.get('FILEBASE_BUCKET');
    const filebaseIPFSRPCKey = Deno.env.get('FILEBASE_IPFS_RPC_KEY');

    if (!filebaseAccessKey || !filebaseSecretKey || !filebaseBucket || !filebaseIPFSRPCKey) {
      console.error('Missing Filebase environment variables');
      return new Response(
        JSON.stringify({ error: 'Filebase configuration error' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Parse request body
    const { mvpId, filePath } = await req.json();

    if (!mvpId || !filePath) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: mvpId, filePath' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log(`Starting IPFS pinning for MVP ${mvpId} at path ${filePath}`);

    // Step 1: Fetch the file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('mvp-files')
      .download(filePath);

    if (downloadError || !fileData) {
      console.error('Error downloading file from Supabase Storage:', downloadError);
      
      // Update MVP status to indicate IPFS pin failed
      await supabase
        .from('mvps')
        .update({ 
          status: 'ipfs_pin_failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', mvpId);

      return new Response(
        JSON.stringify({ error: 'Failed to download file from storage' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Step 2: Convert file to ArrayBuffer for upload
    const fileBuffer = await fileData.arrayBuffer();
    const fileName = filePath.split('/').pop() || 'mvp-file';

    // Step 3: Upload file to Filebase IPFS
    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer]), fileName);

    // Filebase IPFS Pinning Service API endpoint
    const filebaseUploadResponse = await fetch('https://api.filebase.io/v1/ipfs/pins', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${filebaseIPFSRPCKey}`,
      },
      body: formData,
    });

    if (!filebaseUploadResponse.ok) {
      const errorText = await filebaseUploadResponse.text();
      console.error('Error uploading to Filebase IPFS:', errorText);
      
      // Update MVP status to indicate IPFS pin failed
      await supabase
        .from('mvps')
        .update({ 
          status: 'ipfs_pin_failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', mvpId);

      return new Response(
        JSON.stringify({ error: 'Failed to upload file to IPFS' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const ipfsResponse = await filebaseUploadResponse.json();
    const ipfsHash = ipfsResponse.requestid || ipfsResponse.cid || ipfsResponse.hash;

    if (!ipfsHash) {
      console.error('No IPFS hash received from Filebase:', ipfsResponse);
      
      // Update MVP status to indicate IPFS pin failed
      await supabase
        .from('mvps')
        .update({ 
          status: 'ipfs_pin_failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', mvpId);

      return new Response(
        JSON.stringify({ error: 'No IPFS hash received from Filebase' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    console.log(`Successfully pinned to IPFS with hash: ${ipfsHash}`);

    // Step 4: Update MVP record with IPFS hash and set status to approved
    const { error: updateError } = await supabase
      .from('mvps')
      .update({ 
        ipfs_hash: ipfsHash,
        status: 'approved',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', mvpId);

    if (updateError) {
      console.error('Error updating MVP with IPFS hash:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update MVP with IPFS hash' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    console.log(`Successfully updated MVP ${mvpId} with IPFS hash ${ipfsHash}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        ipfsHash: ipfsHash,
        mvpId: mvpId 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in pin-to-ipfs function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});