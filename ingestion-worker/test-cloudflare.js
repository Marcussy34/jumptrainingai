// Quick test script to verify Cloudflare credentials
// Run with: node test-cloudflare.js

require('dotenv').config({ path: '.env.local' });

async function testCloudflare() {
    console.log('🔶 Testing Cloudflare Setup...\n');
    
    // Check environment variables
    const requiredVars = [
        'CLOUDFLARE_ACCOUNT_ID',
        'CLOUDFLARE_API_TOKEN', 
        'R2_ACCESS_KEY_ID',
        'R2_SECRET_ACCESS_KEY'
    ];
    
    console.log('📋 Environment Variables:');
    for (const varName of requiredVars) {
        const value = process.env[varName];
        if (value) {
            console.log(`✅ ${varName}: ${value.substring(0, 8)}...`);
        } else {
            console.log(`❌ ${varName}: Missing!`);
            return;
        }
    }
    
    console.log('\n🧪 Testing Cloudflare API...');
    
    try {
        // Test Cloudflare API
        const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}`, {
            headers: {
                'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ Cloudflare API: Account "${data.result.name}" connected successfully!`);
        } else {
            console.log(`❌ Cloudflare API: ${response.status} ${response.statusText}`);
        }
        
    } catch (error) {
        console.log(`❌ Cloudflare API Error: ${error.message}`);
    }
    
    console.log('\n🪣 Testing R2 Storage...');
    
    try {
        // Test R2 by listing buckets
        const r2Response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/r2/buckets`, {
            headers: {
                'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (r2Response.ok) {
            const r2Data = await r2Response.json();
            if (r2Data.result && r2Data.result.buckets && Array.isArray(r2Data.result.buckets)) {
                const bucket = r2Data.result.buckets.find(b => b.name === 'jumptrainingai-videos');
                if (bucket) {
                    console.log(`✅ R2 Storage: Bucket "jumptrainingai-videos" found!`);
                } else {
                    console.log(`⚠️  R2 Storage: Bucket "jumptrainingai-videos" not found. Did you create it?`);
                }
            } else {
                console.log(`⚠️  R2 Storage: API connected but bucket list format unexpected`);
            }
        } else {
            console.log(`❌ R2 Storage: ${r2Response.status} ${r2Response.statusText}`);
        }
        
    } catch (error) {
        console.log(`❌ R2 Storage Error: ${error.message}`);
    }
    
    console.log('\n✨ Cloudflare setup test complete!');
}

testCloudflare();
