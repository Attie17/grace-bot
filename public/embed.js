/**
 * Stabilis Bot Embed Script
 * 
 * Add this to stabilistc.co.za to get a floating chat button.
 * 
 * Usage (paste before </body>):
 * <script src="https://bot.stabilistc.co.za/widget/embed.js"></script>
 */

(function() {
    'use strict';

    const BOT_URL = 'https://bot.stabilistc.co.za/widget/widget.html'; // Update to your deploy URL
    const WIDGET_ID = 'stabilis-bot-widget';

    if (document.getElementById(WIDGET_ID)) return; // Already loaded

    // Styles
    const style = document.createElement('style');
    style.textContent = `
        #stabilis-bot-trigger {
            position: fixed;
            bottom: 24px;
            right: 24px;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
            color: white;
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 20px rgba(37, 211, 102, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            transition: transform 0.2s, box-shadow 0.2s;
            font-family: -apple-system, sans-serif;
        }
        #stabilis-bot-trigger:hover {
            transform: scale(1.08);
            box-shadow: 0 6px 25px rgba(37, 211, 102, 0.5);
        }
        #stabilis-bot-trigger::before {
            content: '';
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            border: 2px solid #25D366;
            animation: stabilis-pulse 2s infinite;
        }
        @keyframes stabilis-pulse {
            0% { transform: scale(1); opacity: 1; }
            100% { transform: scale(1.4); opacity: 0; }
        }
        #stabilis-bot-tooltip {
            position: fixed;
            bottom: 30px;
            right: 100px;
            background: #1F3F5F;
            color: white;
            padding: 10px 14px;
            border-radius: 8px;
            font-size: 13px;
            z-index: 99998;
            box-shadow: 0 2px 10px rgba(0,0,0,0.15);
            white-space: nowrap;
            animation: stabilis-fadein 0.5s 2s backwards;
            font-family: -apple-system, sans-serif;
        }
        #stabilis-bot-tooltip::after {
            content: '';
            position: absolute;
            right: -6px;
            top: 50%;
            transform: translateY(-50%);
            border: 6px solid transparent;
            border-left-color: #1F3F5F;
        }
        @keyframes stabilis-fadein {
            from { opacity: 0; transform: translateX(10px); }
            to { opacity: 1; transform: translateX(0); }
        }
        #stabilis-bot-frame {
            position: fixed;
            bottom: 100px;
            right: 24px;
            width: 420px;
            max-width: calc(100vw - 48px);
            height: 700px;
            max-height: calc(100vh - 140px);
            border: none;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.25);
            z-index: 99997;
            background: white;
            display: none;
        }
        #stabilis-bot-close {
            position: fixed;
            bottom: 100px;
            right: 24px;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: white;
            color: #333;
            border: none;
            cursor: pointer;
            z-index: 99999;
            font-size: 16px;
            display: none;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            transform: translate(-8px, -8px);
            font-family: -apple-system, sans-serif;
        }
        @media (max-width: 480px) {
            #stabilis-bot-frame {
                bottom: 0;
                right: 0;
                width: 100vw;
                height: 100vh;
                max-height: 100vh;
                border-radius: 0;
            }
            #stabilis-bot-close {
                top: 10px;
                right: 10px;
                bottom: auto;
                transform: none;
            }
        }
    `;
    document.head.appendChild(style);

    // Tooltip
    const tooltip = document.createElement('div');
    tooltip.id = 'stabilis-bot-tooltip';
    tooltip.textContent = '💬 Chat with us — fully covered by medical aid';
    setTimeout(() => tooltip.remove(), 10000);
    document.body.appendChild(tooltip);

    // Trigger button
    const btn = document.createElement('button');
    btn.id = WIDGET_ID;
    btn.setAttribute('aria-label', 'Open chat');
    btn.innerHTML = `
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.52 3.449C12.831-3.984 1 1.446 1 11.892c0 1.988.52 3.912 1.51 5.606L.057 22.929a.75.75 0 0 0 .933.936l5.6-1.473a10.844 10.844 0 0 0 5.113 1.302h.005c9.084 0 14.777-9.839 10.233-17.716a10.817 10.817 0 0 0-1.42-2.53z"/>
        </svg>
    `;
    btn.id = 'stabilis-bot-trigger';

    // Iframe
    const frame = document.createElement('iframe');
    frame.id = 'stabilis-bot-frame';
    frame.src = BOT_URL;
    frame.setAttribute('title', 'Stabilis chat');

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.id = 'stabilis-bot-close';
    closeBtn.innerHTML = '✕';
    closeBtn.setAttribute('aria-label', 'Close chat');

    document.body.appendChild(btn);
    document.body.appendChild(frame);
    document.body.appendChild(closeBtn);

    let isOpen = false;

    function toggle() {
        isOpen = !isOpen;
        frame.style.display = isOpen ? 'block' : 'none';
        closeBtn.style.display = isOpen ? 'flex' : 'none';
        btn.style.display = isOpen ? 'none' : 'flex';
        if (tooltip.parentNode) tooltip.remove();
    }

    btn.addEventListener('click', toggle);
    closeBtn.addEventListener('click', toggle);

    // Escape key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen) toggle();
    });
})();
