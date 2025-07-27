import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file, fileName, clientId } = await req.json();
    
    // MinIO configuration
    const S3_ACCESS_KEY = "dwDgcvisQ35tobfwssIp";
    const S3_SECRET_KEY = "6UFcbJbPQFtw1imqR2u9EGkvVsdHXw8zCN6blsrE";
    const S3_BUCKET = "crm";
    const S3_ENDPOINT = "s3.minio.opensys.tech";
    const S3_REGION = "us-east-1";

    // Convert base64 to blob
    const base64Data = file.split(',')[1];
    const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    
    // Generate unique filename
    const timestamp = new Date().getTime();
    const uniqueFileName = `clients/${clientId}/${timestamp}-${fileName}`;

    // Create date for AWS signature
    const now = new Date();
    const dateString = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeString = now.toISOString().slice(0, 19).replace(/[-:]/g, '') + 'Z';

    // AWS4 signature calculation
    const algorithm = 'AWS4-HMAC-SHA256';
    const service = 's3';
    const credentialScope = `${dateString}/${S3_REGION}/${service}/aws4_request`;
    const credential = `${S3_ACCESS_KEY}/${credentialScope}`;

    // Create canonical request
    const canonicalUri = `/${S3_BUCKET}/${uniqueFileName}`;
    const canonicalQueryString = '';
    const canonicalHeaders = `host:${S3_ENDPOINT}\nx-amz-content-sha256:UNSIGNED-PAYLOAD\nx-amz-date:${timeString}\n`;
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
    const payloadHash = 'UNSIGNED-PAYLOAD';

    const canonicalRequest = [
      'PUT',
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash
    ].join('\n');

    // Create string to sign
    const canonicalRequestHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalRequest));
    const canonicalRequestHashHex = Array.from(new Uint8Array(canonicalRequestHash))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    const stringToSign = [
      algorithm,
      timeString,
      credentialScope,
      canonicalRequestHashHex
    ].join('\n');

    // Calculate signature
    const getSignatureKey = async (key: string, dateStamp: string, regionName: string, serviceName: string) => {
      const kDate = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode('AWS4' + key),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const kDateBytes = await crypto.subtle.sign('HMAC', kDate, new TextEncoder().encode(dateStamp));
      
      const kRegion = await crypto.subtle.importKey(
        'raw',
        new Uint8Array(kDateBytes),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const kRegionBytes = await crypto.subtle.sign('HMAC', kRegion, new TextEncoder().encode(regionName));
      
      const kService = await crypto.subtle.importKey(
        'raw',
        new Uint8Array(kRegionBytes),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const kServiceBytes = await crypto.subtle.sign('HMAC', kService, new TextEncoder().encode(serviceName));
      
      const kSigning = await crypto.subtle.importKey(
        'raw',
        new Uint8Array(kServiceBytes),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      return kSigning;
    };

    const signingKey = await getSignatureKey(S3_SECRET_KEY, dateString, S3_REGION, service);
    const signatureBytes = await crypto.subtle.sign('HMAC', signingKey, new TextEncoder().encode(stringToSign));
    const signature = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    // Create authorization header
    const authorizationHeader = `${algorithm} Credential=${credential}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    // Upload to MinIO
    const uploadUrl = `http://${S3_ENDPOINT}/${S3_BUCKET}/${uniqueFileName}`;
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': authorizationHeader,
        'X-Amz-Date': timeString,
        'X-Amz-Content-Sha256': payloadHash,
        'Content-Type': 'application/octet-stream'
      },
      body: binaryData
    });

    if (uploadResponse.ok) {
      const fileUrl = `http://${S3_ENDPOINT}/${S3_BUCKET}/${uniqueFileName}`;
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          fileUrl,
          fileName: uniqueFileName
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    } else {
      const errorText = await uploadResponse.text();
      console.error('MinIO upload error:', errorText);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Upload failed',
          details: errorText
        }),
        { 
          status: 500,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

  } catch (error) {
    console.error('Upload error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});