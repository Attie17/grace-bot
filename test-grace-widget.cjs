const { chromium } = require('playwright');

async function testGraceWidget() {
  console.log('=== GRACE WIDGET PLAYWRIGHT TEST ===\n');
  
  const browser = await chromium.launch({ headless: false }); // visible so you can watch
  const page = await browser.newPage();
  
  // Track all Grace responses
  const conversation = [];
  
  async function isEnded() {
    return page.$eval('#input', el => el.disabled).catch(() => false);
  }

  async function sendMessage(message) {
    // Skip if conversation has already ended
    if (await isEnded()) {
      console.log(`[ENDED] Skipping: "${message}"`);
      return null;
    }

    // Use the real widget input id
    await page.fill('#input', message);
    await page.keyboard.press('Enter');

    // Wait for typing indicator to disappear (Grace is responding)
    await page.waitForFunction(
      () => !document.getElementById('typing'),
      { timeout: 15000 }
    ).catch(() => {});
    await page.waitForTimeout(600); // small buffer for DOM update

    // Get latest bot message using the real CSS class
    const messages = await page.$$eval('.msg.bot', els =>
      els.map(el => el.innerText.trim())
    );
    const latest = messages[messages.length - 1];
    const ended = await isEnded();
    conversation.push({ user: message, grace: latest, ended });
    console.log(`User: ${message}`);
    console.log(`Grace: ${latest}`);
    if (ended) console.log('[CONVERSATION ENDED - input locked]');
    console.log('---');
    return latest;
  }
  
  try {
    // Open widget
    await page.goto('http://localhost:3002/widget/widget.html');
    await page.waitForTimeout(2000);
    
    // Check opening line (hardcoded in widget HTML)
    const botMessages = await page.$$eval('.msg.bot', els => els.map(el => el.innerText.trim()));
    console.log('OPENING LINE:', botMessages[0] || 'NONE FOUND');
    console.log('---');
    
    // Have a conversation
    await sendMessage("Hi, I need help with alcohol");
    await sendMessage("It's been going on for about 2 years");
    await sendMessage("I drink every day, it's affecting my work and marriage");
    await sendMessage("My wife has noticed and is very worried");
    await sendMessage("I have medical aid through my employer");
    await sendMessage("My name is Peter and my number is 0821234561");
    await sendMessage("Mornings work best for me");
    await sendMessage("I'm ready to start as soon as possible, maybe next week");
    await sendMessage("I'm based in Johannesburg");
    await sendMessage("I just want my life back");
    
    // Check all Grace messages for invite URL
    const allBotMessages = await page.$$eval('.msg.bot', els => els.map(el => el.innerText.trim()));
    const allText = allBotMessages.join(' ');
    const hasInvite = allText.includes('sobrietyjourney') ||
                      allText.includes('activate') ||
                      allText.includes('https://');

    console.log('\n=== RESULTS ===');
    console.log(`Total exchanges attempted: ${conversation.length}`);
    console.log(`Conversation ended (input locked): ${conversation.some(c => c.ended)}`);
    console.log(`Invite URL present in messages: ${hasInvite}`);

    if (hasInvite) {
      const inviteMatch = allText.match(/https:\/\/[^\s]+/);
      console.log(`Invite URL: ${inviteMatch ? inviteMatch[0] : 'found but could not extract'}`);
    }

    console.log('\n=== ALL GRACE MESSAGES ===');
    allBotMessages.forEach((msg, i) => console.log(`[${i + 1}] ${msg}`));

    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    await browser.close();
    console.log('\n=== TEST COMPLETE ===');
  }
}

testGraceWidget();
