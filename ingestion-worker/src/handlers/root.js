/**
 * Root handler - serves the web interface
 * HTML interface for manual triggers and testing
 */

export async function handleRoot(request, env) {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>JumpTrainingAI - Video Ingestion</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .container { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .button { background: #007bff; color: white; border: none; padding: 12px 24px; 
                     border-radius: 4px; cursor: pointer; font-size: 16px; margin: 10px 5px; }
            .button:hover { background: #0056b3; }
            .button:disabled { background: #6c757d; cursor: not-allowed; }
            .status { margin: 20px 0; padding: 10px; border-radius: 4px; }
            .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
            .error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
            .info { background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; }
            .loading { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; }
            pre { background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto; }
        </style>
    </head>
    <body>
        <h1>🏀 JumpTrainingAI - Video Ingestion Worker</h1>
        
        <div class="container">
            <h2>Phase 1: Basic Storage & Ingestion (Modular)</h2>
            <p>This worker handles YouTube video metadata extraction and storage in R2.</p>
            
            <h3>Source Input</h3>
            <div style="margin: 15px 0;">
                <div style="margin-bottom: 10px;">
                    <input type="radio" id="sourceChannel" name="sourceType" value="channel" checked>
                    <label for="sourceChannel">Channel</label>
                    <input type="radio" id="sourcePlaylist" name="sourceType" value="playlist" style="margin-left: 20px;">
                    <label for="sourcePlaylist">Playlist</label>
                </div>
                <input type="text" id="sourceInput" 
                       placeholder="Enter channel (@TheHoopsProf) or playlist URL (https://youtube.com/playlist?list=...)"
                       style="width: 500px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                <input type="number" id="maxResults" value="10" min="1" max="50" 
                       style="width: 80px; padding: 8px; margin-left: 10px;">
                <label for="maxResults" style="margin-left: 5px;">videos</label>
            </div>
            
            <h3>Manual Triggers</h3>
            <button class="button" onclick="triggerIngestion()">
                🎬 Trigger Video Ingestion
            </button>
            <button class="button" onclick="checkStatus()">
                📊 Check Status
            </button>
            <button class="button" onclick="testHealth()">
                ❤️ Health Check
            </button>
            <button class="button" onclick="testKnownChannel()">
                🧪 Test with @YouTube
            </button>
            <button class="button" onclick="testUserPlaylist()">
                🎯 Test Your Playlist
            </button>
        </div>
        
        <div class="container">
            <h3>💡 Format Examples</h3>
            <h4>📺 Channel Options:</h4>
            <ul>
                <li><strong>Handle:</strong> @YouTube, @GoogleDevelopers</li>
                <li><strong>Channel ID:</strong> UCxxxxxxxxxxxxxxxxxxxxxx (24 characters starting with UC)</li>
                <li><strong>Search:</strong> "Isaiah Rivera basketball", etc.</li>
            </ul>
            <h4>📋 Playlist Options:</h4>
            <ul>
                <li><strong>Full URL:</strong> https://youtube.com/playlist?list=PLxxxxxxx</li>
                <li><strong>Playlist ID:</strong> PLxxxxxxx (starts with PL)</li>
            </ul>
            <p><em>The system will automatically detect and process the format.</em></p>
        </div>

        <div id="status-container"></div>

        <script>
            function showStatus(message, type = 'info') {
                const container = document.getElementById('status-container');
                const statusDiv = document.createElement('div');
                statusDiv.className = 'status ' + type;
                statusDiv.innerHTML = '<strong>' + new Date().toLocaleTimeString() + ':</strong> ' + message;
                container.insertBefore(statusDiv, container.firstChild);
                
                // Remove old status messages (keep last 5)
                while (container.children.length > 5) {
                    container.removeChild(container.lastChild);
                }
            }

            async function triggerIngestion() {
                const button = event.target;
                button.disabled = true;
                button.textContent = '⏳ Processing...';
                
                const sourceInput = document.getElementById('sourceInput').value.trim() || 'Isaiah Rivera';
                const sourceType = document.querySelector('input[name="sourceType"]:checked').value;
                const maxResults = parseInt(document.getElementById('maxResults').value) || 10;
                
                showStatus(\`Starting \${sourceType} ingestion for: \${sourceInput}\`, 'loading');
                
                try {
                    const requestBody = { maxResults: maxResults };
                    
                    if (sourceType === 'playlist') {
                        requestBody.playlistUrl = sourceInput;
                    } else {
                        requestBody.channelHandle = sourceInput;
                    }
                    
                    const response = await fetch('/ingest', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestBody)
                    });
                    
                    const result = await response.json();
                    
                    if (response.ok) {
                        showStatus('✅ Ingestion completed: ' + JSON.stringify(result, null, 2), 'success');
                    } else {
                        showStatus('❌ Ingestion failed: ' + result.error, 'error');
                    }
                } catch (error) {
                    showStatus('❌ Network error: ' + error.message, 'error');
                } finally {
                    button.disabled = false;
                    button.textContent = '🎬 Trigger Video Ingestion';
                }
            }

            async function checkStatus() {
                showStatus('Checking worker status...', 'loading');
                
                try {
                    const response = await fetch('/status');
                    const result = await response.json();
                    
                    showStatus('📊 Status: <pre>' + JSON.stringify(result, null, 2) + '</pre>', 'info');
                } catch (error) {
                    showStatus('❌ Status check failed: ' + error.message, 'error');
                }
            }

            async function testHealth() {
                showStatus('Running health check...', 'loading');
                
                try {
                    const response = await fetch('/health');
                    const result = await response.json();
                    
                    if (response.ok) {
                        showStatus('✅ Health check passed: ' + result.status, 'success');
                    } else {
                        showStatus('⚠️ Health check issues: ' + result.error, 'error');
                    }
                } catch (error) {
                    showStatus('❌ Health check failed: ' + error.message, 'error');
                }
            }

            async function testKnownChannel() {
                document.getElementById('sourceChannel').checked = true;
                document.getElementById('sourceInput').value = '@YouTube';
                document.getElementById('maxResults').value = '3';
                showStatus('🧪 Testing with known working channel @YouTube...', 'info');
                setTimeout(triggerIngestion, 500); // Small delay to show the message
            }
            
            function testUserPlaylist() {
                document.getElementById('sourcePlaylist').checked = true;
                document.getElementById('sourceInput').value = 'https://youtube.com/playlist?list=PLkuJUNfqNFGKj3DkG5xpmXsn9U5Nfthr9';
                document.getElementById('maxResults').value = '10';
                showStatus('🎯 Testing with your jump training playlist...', 'info');
                setTimeout(triggerIngestion, 500);
            }

            // Show initial status
            showStatus('Worker ready - modular architecture loaded!', 'info');
        </script>
    </body>
    </html>
  `;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}
