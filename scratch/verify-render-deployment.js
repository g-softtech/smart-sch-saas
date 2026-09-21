const https = require('https');

https.get('https://smart-sch-saas-web.onrender.com/dashboard/academics', (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    // Find script tags
    const scriptRegex = /<script src="(\/_next\/static\/chunks\/[^"]+)"/g;
    let match;
    const scripts = [];
    while ((match = scriptRegex.exec(body)) !== null) {
      scripts.push(match[1]);
    }
    
    console.log(`Found ${scripts.length} script chunks.`);
    
    // Download and check each chunk for "Add Campus"
    let found = false;
    let pending = scripts.length;
    
    if (pending === 0) {
      console.log('No scripts found.');
      return;
    }

    scripts.forEach(script => {
      https.get('https://smart-sch-saas-web.onrender.com' + script, (jsRes) => {
        let jsBody = '';
        jsRes.on('data', d => jsBody += d);
        jsRes.on('end', () => {
          if (jsBody.includes('isCreateCampusModalOpen') || jsBody.includes('handleCreateCampusSubmit') || jsBody.includes('Add Campus')) {
            console.log(`\nSUCCESS: Found modal code in chunk: ${script}`);
            found = true;
          }
          pending--;
          if (pending === 0) {
            if (!found) console.log('\nFAILED: Could not find modal code in any chunk. Deployment might still be in progress.');
          }
        });
      }).on('error', console.error);
    });
  });
}).on('error', console.error);
