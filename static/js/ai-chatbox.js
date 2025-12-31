/**
 * ImgCraft AI Chatbox - Flow-Based Conversational Assistant
 * Natural conversation with predefined flow paths and smart keyword matching
 */

class ImgCraftAIChatbox {
    constructor() {
        this.knowledge = window.ImgCraftKnowledge;
        this.isOpen = false;
        this.soundEnabled = this.loadSoundPreference();
        this.currentFlow = 'start';

        // FLOW OBJECT - Complete conversation paths
        this.FLOW = {
            start: {
                text: "👋 Hi! I'm your ImgCraft AI assistant. I can help you with tools, credits, navigation, and more. What would you like to know?",
                options: [
                    { label: "🎁 Free Tools", next: "free_tools" },
                    { label: "💰 Credits & Pricing", next: "credits_menu" },
                    { label: "🧭 Navigation Help", next: "navigation_menu" },
                    { label: "🔥 Streak System", next: "streak_info" },
                    { label: "🛠️ All Tools", next: "all_tools_menu" },
                    { label: "❓ FAQs", next: "faqs_menu" },
                    { label: "📞 Contact & Support", next: "contact" }
                ]
            },

            // ===== FREE TOOLS =====
            free_tools: {
                text: "🎁 **Free Tools (No Credits Required):**\n\n**Image Resize** - Resize images to custom dimensions\n📍 /resize\n\n**Format Convert** - Convert between JPG, PNG, WebP, GIF, BMP, TIFF\n📍 /convert\n\nAll other tools require credits!",
                options: [
                    { label: "View All Tools", next: "all_tools_menu" },
                    { label: "How Credits Work", next: "credits_info" },
                    { label: "🏠 Main Menu", next: "start" }
                ]
            },

            // ===== CREDITS MENU =====
            credits_menu: {
                text: "💰 **Credits & Pricing**\n\nWhat would you like to know about credits?",
                options: [
                    { label: "How Credits Work", next: "credits_info" },
                    { label: "Pricing Plans", next: "pricing_plans" },
                    { label: "Admin Credits", next: "admin_credits" },
                    { label: "Tool Costs", next: "tool_costs" },
                    { label: "🏠 Main Menu", next: "start" }
                ]
            },

            credits_info: {
                text: "💰 **How Credits Work:**\n\n• Each tool costs specific credits\n• Free tools (Resize, Convert) = 0 credits\n• Credits deducted after successful processing\n• Failed operations = automatic refund\n• Admin users = unlimited credits\n\n**New User Credits:**\n• Sign up and get 10 free credits! 🎉",
                options: [
                    { label: "View Pricing Plans", next: "pricing_plans" },
                    { label: "Tool Costs", next: "tool_costs" },
                    { label: "Back to Credits", next: "credits_menu" }
                ]
            },

            pricing_plans: {
                text: "💳 **Credit Plans:**\n\n**Starter** - 50 credits\n₹99\n\n**Basic** - 100 credits\n₹179 (Save 10%)\n\n**Pro** - 500 credits\n₹499 (Save 20%)\n\n**Enterprise** - 1000 credits\n₹899 (Save 25%)\n\n📍 Go to /billing to purchase!",
                options: [
                    { label: "Open Billing Page", next: "open_billing" },
                    { label: "How Credits Work", next: "credits_info" },
                    { label: "🏠 Main Menu", next: "start" }
                ]
            },

            admin_credits: {
                text: "👑 **Admin Users:**\n\nAdmin users have **unlimited credits** and can use all tools without any restrictions!\n\nThis is a special privilege for ImgCraft administrators.",
                options: [
                    { label: "Back to Credits", next: "credits_menu" },
                    { label: "🏠 Main Menu", next: "start" }
                ]
            },



            tool_costs: {
                text: "📊 **Tool Credit Costs:**\n\n**Essentials:**\n• Resize: FREE\n• Convert: FREE\n• Crop: 1 credit\n• Compress: 2 credits\n\n**Enhance:**\n• Filter: 2 credits\n• Upscale: 5 credits\n• Remove Background: 10 credits\n\n**AI Studio:**\n• New Year Generator: 5 credits\n• Watermark: 3 credits\n• Collage: 13 credits\n\n**Tools:**\n• Palette: 2 credits\n• EXIF: 1 credit\n• Annotation: 2 credits",
                options: [
                    { label: "View Tool Details", next: "all_tools_menu" },
                    { label: "Back to Credits", next: "credits_menu" },
                    { label: "🏠 Main Menu", next: "start" }
                ]
            },

            // ===== NAVIGATION MENU =====
            navigation_menu: {
                text: "🧭 **Navigation Help**\n\nWhere would you like to go?",
                options: [
                    { label: "Main Pages", next: "nav_main_pages" },
                    { label: "Tool Categories", next: "nav_tool_categories" },
                    { label: "Specific Tool", next: "all_tools_menu" },
                    { label: "🏠 Main Menu", next: "start" }
                ]
            },

            nav_main_pages: {
                text: "📍 **Main Pages:**\n\n• Home - /\n• Billing - /billing\n• Documentation - /docs\n• About - /about\n• Contact - /contact\n• Auth (Sign In/Up) - /auth",
                options: [
                    { label: "Tool Categories", next: "nav_tool_categories" },
                    { label: "Back to Navigation", next: "navigation_menu" },
                    { label: "🏠 Main Menu", next: "start" }
                ]
            },

            nav_tool_categories: {
                text: "🛠️ **Tool Categories:**\n\nWhich category would you like to explore?",
                options: [
                    { label: "Essentials", next: "nav_essentials" },
                    { label: "Enhance", next: "nav_enhance" },
                    { label: "AI Studio", next: "nav_ai_studio" },
                    { label: "Tools", next: "nav_tools" },
                    { label: "Back to Navigation", next: "navigation_menu" }
                ]
            },

            nav_essentials: {
                text: "📦 **Essentials Category:**\n\n• Resize - /resize (FREE)\n• Convert - /convert (FREE)\n• Crop - /crop (1 credit)\n• Compress - /compress (2 credits)",
                options: [
                    { label: "Other Categories", next: "nav_tool_categories" },
                    { label: "🏠 Main Menu", next: "start" }
                ]
            },

            nav_enhance: {
                text: "✨ **Enhance Category:**\n\n• Filter - /filter (2 credits)\n• Upscale - /upscale (5 credits)\n• Remove Background - /remove-bg (10 credits)",
                options: [
                    { label: "Other Categories", next: "nav_tool_categories" },
                    { label: "🏠 Main Menu", next: "start" }
                ]
            },

            nav_ai_studio: {
                text: "🎨 **AI Studio Category:**\n\n• New Year Generator - /newyear (5 credits)\n• Watermark - /watermark (3 credits)\n• Collage - /collage (13 credits)",
                options: [
                    { label: "Other Categories", next: "nav_tool_categories" },
                    { label: "🏠 Main Menu", next: "start" }
                ]
            },

            nav_tools: {
                text: "🔧 **Tools Category:**\n\n• Palette - /palette (2 credits)\n• EXIF - /exif (1 credit)\n• Annotation - /annotation (2 credits)",
                options: [
                    { label: "Other Categories", next: "nav_tool_categories" },
                    { label: "🏠 Main Menu", next: "start" }
                ]
            },

            // ===== STREAK SYSTEM =====
            streak_info: {
                text: "🔥 **Streak System:**\n\nTrack your daily usage consistency!\n\n**How It Works:**\n• Use any tool to maintain streak\n• Streak +1 each consecutive day\n• Missing a day resets to 1\n• Multiple uses per day = counts once\n• Longest streak tracked separately\n\n**Benefits:**\n• Track consistency\n• Compete with yourself\n• Build ImgCraft habit",
                options: [
                    { label: "How to Use Tools", next: "all_tools_menu" },
                    { label: "🏠 Main Menu", next: "start" }
                ]
            },

            // ===== ALL TOOLS MENU =====
            all_tools_menu: {
                text: "🛠️ **All Tools**\n\nSelect a tool to learn more:",
                options: [
                    { label: "Resize (FREE)", next: "tool_resize" },
                    { label: "Convert (FREE)", next: "tool_convert" },
                    { label: "Crop", next: "tool_crop" },
                    { label: "Compress", next: "tool_compress" },
                    { label: "Filter", next: "tool_filter" },
                    { label: "Upscale", next: "tool_upscale" },
                    { label: "Remove BG", next: "tool_remove_bg" },
                    { label: "More Tools →", next: "all_tools_menu_2" },
                    { label: "🏠 Main Menu", next: "start" }
                ]
            },

            all_tools_menu_2: {
                text: "🛠️ **More Tools:**",
                options: [
                    { label: "New Year AI", next: "tool_newyear" },
                    { label: "Watermark", next: "tool_watermark" },
                    { label: "Collage", next: "tool_collage" },
                    { label: "Palette", next: "tool_palette" },
                    { label: "EXIF", next: "tool_exif" },
                    { label: "Annotation", next: "tool_annotation" },
                    { label: "← Back to Tools", next: "all_tools_menu" },
                    { label: "🏠 Main Menu", next: "start" }
                ]
            },

            // ===== TOOL DETAILS =====
            tool_resize: {
                text: "**Image Resize** (FREE)\n\nResize images to custom dimensions with multiple modes\n\n**Features:**\n• Custom dimensions\n• Preserve aspect ratio\n• Batch resize support\n• Multiple resize modes\n\n📍 /resize",
                options: [
                    { label: "Open Resize Tool", next: "open_resize" },
                    { label: "Back to Tools", next: "all_tools_menu" },
                    { label: "🏠 Main Menu", next: "start" }
                ]
            },

            tool_convert: {
                text: "**Format Convert** (FREE)\n\nConvert between image formats\n\n**Features:**\n• JPG, PNG, WebP, GIF, BMP, TIFF\n• Quality preservation\n• Batch conversion\n• Metadata handling\n\n📍 /convert",
                options: [
                    { label: "Open Convert Tool", next: "open_convert" },
                    { label: "Back to Tools", next: "all_tools_menu" },
                    { label: "🏠 Main Menu", next: "start" }
                ]
            },

            tool_crop: {
                text: "**Image Crop** (1 credit)\n\nPrecise crop selection with rotation\n\n**Features:**\n• Precise crop selection\n• Aspect ratio locking\n• Auto-crop detection\n• Rotation (90°, 180°, 270°)\n• Flip horizontal/vertical\n\n📍 /crop",
                options: [
                    { label: "Open Crop Tool", next: "open_crop" },
                    { label: "Back to Tools", next: "all_tools_menu" },
                    { label: "🏠 Main Menu", next: "start" }
                ]
            },

            tool_compress: {
                text: "**Image Compress** (2 credits)\n\nReduce file size without quality loss\n\n**Features:**\n• Adjustable compression levels\n• Format conversion during compression\n• Automatic quality optimization\n\n📍 /compress",
                options: [
                    { label: "Open Compress Tool", next: "open_compress" },
                    { label: "Back to Tools", next: "all_tools_menu" },
                    { label: "🏠 Main Menu", next: "start" }
                ]
            },

            tool_filter: {
                text: "**Image Filter** (2 credits)\n\nApply advanced filters and effects\n\n**Features:**\n• Brightness/Contrast\n• Saturation/Vibrance\n• Exposure & Highlights/Shadows\n• Sharpness, Vignette, Grain\n• Temperature & Tint\n• Multiple filters combinable\n\n📍 /filter",
                options: [
                    { label: "Open Filter Tool", next: "open_filter" },
                    { label: "Back to Tools", next: "all_tools_menu" },
                    { label: "🏠 Main Menu", next: "start" }
                ]
            },

            tool_upscale: {
                text: "**Image Upscale** (5 credits)\n\nAI-powered image upscaling\n\n**Features:**\n• AI-powered upscaling\n• 2x-4x enlargement\n• Detail preservation\n• Noise reduction\n\n📍 /upscale",
                options: [
                    { label: "Open Upscale Tool", next: "open_upscale" },
                    { label: "Back to Tools", next: "all_tools_menu" },
                    { label: "🏠 Main Menu", next: "start" }
                ]
            },

            tool_remove_bg: {
                text: "**Remove Background** (10 credits)\n\nAI-powered background removal\n\n**Features:**\n• AI-powered removal\n• Transparent background\n• Edge detection\n• Smoothing\n\n📍 /remove-bg",
                options: [
                    { label: "Open Remove BG Tool", next: "open_remove_bg" },
                    { label: "Back to Tools", next: "all_tools_menu" },
                    { label: "🏠 Main Menu", next: "start" }
                ]
            },

            tool_watermark: {
                text: "**Add Watermark** (3 credits)\n\nAdd text or image watermarks\n\n**Features:**\n• Text watermarks\n• Image watermarks\n• Position customization\n• Opacity control\n• Multiple watermarks\n\n📍 /watermark",
                options: [
                    { label: "Open Watermark Tool", next: "open_watermark" },
                    { label: "Back to Tools", next: "all_tools_menu_2" },
                    { label: "🏠 Main Menu", next: "start" }
                ]
            },

            tool_collage: {
                text: "**AI Collage Generator** (13 credits)\n\nCreate beautiful multi-image collages\n\n**Features:**\n• 2x2, 2x3, 3x3 grids\n• Spacing customization\n• Border styles\n• Template-based collages\n\n📍 /collage",
                options: [
                    { label: "Open Collage Tool", next: "open_collage" },
                    { label: "Back to Tools", next: "all_tools_menu_2" },
                    { label: "🏠 Main Menu", next: "start" }
                ]
            },

            tool_palette: {
                text: "**Color Palette** (2 credits)\n\nExtract dominant colors\n\n**Features:**\n• Extract dominant colors\n• Generate palettes\n• Color hex export\n• Palette analytics\n\n📍 /palette",
                options: [
                    { label: "Open Palette Tool", next: "open_palette" },
                    { label: "Back to Tools", next: "all_tools_menu_2" },
                    { label: "🏠 Main Menu", next: "start" }
                ]
            },

            tool_exif: {
                text: "**EXIF Data Viewer** (1 credit)\n\nView image metadata\n\n**Features:**\n• Extract EXIF metadata\n• Camera information\n• GPS coordinates\n• Technical details\n\n📍 /exif",
                options: [
                    { label: "Open EXIF Tool", next: "open_exif" },
                    { label: "Back to Tools", next: "all_tools_menu_2" },
                    { label: "🏠 Main Menu", next: "start" }
                ]
            },

            tool_annotation: {
                text: "**Image Annotation** (2 credits)\n\nAdd annotations and shapes\n\n**Features:**\n• Text annotations\n• Arrow & shape drawing\n• Highlight regions\n• Custom colors & fonts\n• Layer management\n\n📍 /annotation",
                options: [
                    { label: "Open Annotation Tool", next: "open_annotation" },
                    { label: "Back to Tools", next: "all_tools_menu_2" },
                    { label: "🏠 Main Menu", next: "start" }
                ]
            },

            tool_newyear: {
                text: "**New Year AI Generator** (5 credits)\n\nCreate stunning 2026 greetings\n\n**Features:**\n• 20 Premium Templates\n• Dynamic Text & Zoom\n• Real-time Preview\n• Seasonal Designs\n\n📍 /newyear",
                options: [
                    { label: "Open New Year Tool", next: "open_newyear" },
                    { label: "Back to Tools", next: "all_tools_menu_2" },
                    { label: "🏠 Main Menu", next: "start" }
                ]
            },

            // ===== FAQs =====
            faqs_menu: {
                text: "❓ **Frequently Asked Questions:**",
                options: [
                    { label: "How to get started?", next: "faq_started" },
                    { label: "Which tools are free?", next: "free_tools" },
                    { label: "How to buy credits?", next: "faq_buy_credits" },
                    { label: "Is my data safe?", next: "faq_data_safe" },
                    { label: "Offline support?", next: "faq_offline" },
                    { label: "Supported formats?", next: "faq_formats" },
                    { label: "🏠 Main Menu", next: "start" }
                ]
            },

            faq_started: {
                text: "**How to get started?**\n\nSimply sign up for a free account to get 10 free credits! You can use free tools like Resize and Convert without any credits!",
                options: [
                    { label: "Back to FAQs", next: "faqs_menu" },
                    { label: "🏠 Main Menu", next: "start" }
                ]
            },

            faq_buy_credits: {
                text: "**How to buy credits?**\n\nGo to the Billing page (/billing) to purchase credit packs. We offer Starter, Basic, Pro, and Enterprise plans with savings up to 25%!",
                options: [
                    { label: "View Pricing", next: "pricing_plans" },
                    { label: "Back to FAQs", next: "faqs_menu" },
                    { label: "🏠 Main Menu", next: "start" }
                ]
            },

            faq_data_safe: {
                text: "**Is my data safe?**\n\nYes! All images are processed securely and are not stored permanently. We use industry-standard encryption and secure payment gateways.",
                options: [
                    { label: "Back to FAQs", next: "faqs_menu" },
                    { label: "🏠 Main Menu", next: "start" }
                ]
            },

            faq_offline: {
                text: "**Can I use ImgCraft offline?**\n\nImgCraft is a PWA (Progressive Web App) with offline support for the interface. However, image processing requires an internet connection to access our servers.",
                options: [
                    { label: "Back to FAQs", next: "faqs_menu" },
                    { label: "🏠 Main Menu", next: "start" }
                ]
            },

            faq_formats: {
                text: "**What image formats are supported?**\n\nWe support JPG, PNG, WebP, GIF, BMP, and TIFF formats. You can convert between any of these formats using our Convert tool.",
                options: [
                    { label: "Convert Tool", next: "tool_convert" },
                    { label: "Back to FAQs", next: "faqs_menu" },
                    { label: "🏠 Main Menu", next: "start" }
                ]
            },

            // ===== CONTACT =====
            contact: {
                text: "📞 **Contact & Support:**\n\nEmail: imgcrafthelp@gmail.com\n\nWe typically respond within 24 hours.\n\nYou can also visit our Contact page for more options.",
                options: [
                    { label: "Open Contact Page", next: "open_contact" },
                    { label: "🏠 Main Menu", next: "start" }
                ]
            },

            // ===== ACTIONS (Open pages) =====
            open_billing: {
                text: "Opening Billing page...",
                action: () => { window.location.href = '/billing'; },
                options: [{ label: "🏠 Main Menu", next: "start" }]
            },
            open_contact: {
                text: "Opening Contact page...",
                action: () => { window.location.href = '/contact'; },
                options: [{ label: "🏠 Main Menu", next: "start" }]
            },
            open_resize: {
                text: "Opening Resize tool...",
                action: () => { window.location.href = '/resize'; },
                options: [{ label: "🏠 Main Menu", next: "start" }]
            },
            open_convert: {
                text: "Opening Convert tool...",
                action: () => { window.location.href = '/convert'; },
                options: [{ label: "🏠 Main Menu", next: "start" }]
            },
            open_crop: {
                text: "Opening Crop tool...",
                action: () => { window.location.href = '/crop'; },
                options: [{ label: "🏠 Main Menu", next: "start" }]
            },
            open_compress: {
                text: "Opening Compress tool...",
                action: () => { window.location.href = '/compress'; },
                options: [{ label: "🏠 Main Menu", next: "start" }]
            },
            open_filter: {
                text: "Opening Filter tool...",
                action: () => { window.location.href = '/filter'; },
                options: [{ label: "🏠 Main Menu", next: "start" }]
            },
            open_upscale: {
                text: "Opening Upscale tool...",
                action: () => { window.location.href = '/upscale'; },
                options: [{ label: "🏠 Main Menu", next: "start" }]
            },
            open_remove_bg: {
                text: "Opening Remove Background tool...",
                action: () => { window.location.href = '/remove-bg'; },
                options: [{ label: "🏠 Main Menu", next: "start" }]
            },
            open_watermark: {
                text: "Opening Watermark tool...",
                action: () => { window.location.href = '/watermark'; },
                options: [{ label: "🏠 Main Menu", next: "start" }]
            },
            open_collage: {
                text: "Opening Collage tool...",
                action: () => { window.location.href = '/collage'; },
                options: [{ label: "🏠 Main Menu", next: "start" }]
            },
            open_palette: {
                text: "Opening Palette tool...",
                action: () => { window.location.href = '/palette'; },
                options: [{ label: "🏠 Main Menu", next: "start" }]
            },
            open_exif: {
                text: "Opening EXIF tool...",
                action: () => { window.location.href = '/exif'; },
                options: [{ label: "🏠 Main Menu", next: "start" }]
            },
            open_annotation: {
                text: "Opening Annotation tool...",
                action: () => { window.location.href = '/annotation'; },
                options: [{ label: "🏠 Main Menu", next: "start" }]
            },
            open_newyear: {
                text: "Opening New Year AI Generator...",
                action: () => { window.location.href = '/newyear'; },
                options: [{ label: "🏠 Main Menu", next: "start" }]
            },


            // ===== FALLBACK =====
            fallback: {
                text: "I'm not sure about that. Here are some things I can help with:",
                options: [
                    { label: "Free Tools", next: "free_tools" },
                    { label: "Credits & Pricing", next: "credits_menu" },
                    { label: "Navigation", next: "navigation_menu" },
                    { label: "All Tools", next: "all_tools_menu" },
                    { label: "🏠 Main Menu", next: "start" }
                ]
            }
        };

        this.init();
    }

    init() {
        this.createChatboxUI();
        this.attachEventListeners();
        this.showWelcomeMessage();
    }

    loadSoundPreference() {
        return localStorage.getItem('imgcraft_ai_sound') !== 'false';
    }

    saveSoundPreference(enabled) {
        localStorage.setItem('imgcraft_ai_sound', enabled);
        this.soundEnabled = enabled;
    }

    playNotificationSound() {
        if (!this.soundEnabled) return;

        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (e) {
            console.log('Sound not supported');
        }
    }

    createChatboxUI() {
        const chatboxHTML = `
            <div id="imgcraft-ai-chatbox" class="imgcraft-ai-chatbox">
                <button id="ai-chat-toggle" class="ai-chat-toggle" aria-label="Open AI Assistant">
                    <i class="fas fa-comments"></i>
                    <span class="ai-pulse"></span>
                </button>

                <div id="ai-chat-window" class="ai-chat-window">
                    <div class="ai-chat-header">
                        <div class="ai-header-left">
                            <div class="ai-avatar">
                                <i class="fas fa-robot"></i>
                            </div>
                            <div class="ai-header-info">
                                <h3>ImgCraft AI</h3>
                                <span class="ai-status">
                                    <span class="status-dot"></span>
                                    Always Ready
                                </span>
                            </div>
                        </div>
                        <div class="ai-header-actions">
                            <button id="ai-sound-toggle" class="ai-header-btn" title="Toggle sound">
                                <i class="fas ${this.soundEnabled ? 'fa-volume-up' : 'fa-volume-mute'}"></i>
                            </button>
                            <button id="ai-clear-chat" class="ai-header-btn" title="Clear chat">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                            <button id="ai-chat-close" class="ai-header-btn" title="Close">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>

                    <div id="ai-chat-messages" class="ai-chat-messages"></div>

                    <div class="ai-chat-input-area">
                        <div class="ai-input-wrapper">
                            <input 
                                type="text" 
                                id="ai-chat-input" 
                                placeholder="Type your question..."
                                autocomplete="off"
                            />
                            <button id="ai-send-btn" class="ai-send-btn">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', chatboxHTML);
    }

    attachEventListeners() {
        const toggleBtn = document.getElementById('ai-chat-toggle');
        const closeBtn = document.getElementById('ai-chat-close');
        const sendBtn = document.getElementById('ai-send-btn');
        const input = document.getElementById('ai-chat-input');
        const clearBtn = document.getElementById('ai-clear-chat');
        const soundBtn = document.getElementById('ai-sound-toggle');

        toggleBtn?.addEventListener('click', () => this.toggleChat());
        closeBtn?.addEventListener('click', () => this.toggleChat());
        sendBtn?.addEventListener('click', () => this.handleSend());
        input?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSend();
        });
        clearBtn?.addEventListener('click', () => this.clearChat());
        soundBtn?.addEventListener('click', () => this.toggleSound());
    }

    toggleChat() {
        this.isOpen = !this.isOpen;
        const chatWindow = document.getElementById('ai-chat-window');
        const toggleBtn = document.getElementById('ai-chat-toggle');

        if (this.isOpen) {
            chatWindow.classList.add('open');
            toggleBtn.classList.add('active');
            document.getElementById('ai-chat-input').focus();
            // Lock body scroll when chatbox is open
            document.body.style.overflow = 'hidden';
        } else {
            chatWindow.classList.remove('open');
            toggleBtn.classList.remove('active');
            // Restore body scroll when chatbox is closed
            document.body.style.overflow = '';
        }
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        this.saveSoundPreference(this.soundEnabled);

        const soundBtn = document.getElementById('ai-sound-toggle');
        const icon = soundBtn.querySelector('i');
        icon.className = this.soundEnabled ? 'fas fa-volume-up' : 'fas fa-volume-mute';

        this.appendMessage(`Sound ${this.soundEnabled ? 'enabled' : 'disabled'} ✓`, 'ai');
    }

    clearChat() {
        const messagesContainer = document.getElementById('ai-chat-messages');
        messagesContainer.innerHTML = '';
        this.showWelcomeMessage();
    }

    showWelcomeMessage() {
        this.botRespond('start');
    }

    handleSend() {
        const input = document.getElementById('ai-chat-input');
        const text = input.value.trim();
        if (!text) return;

        this.appendMessage(text, 'user');
        input.value = '';

        const nodeKey = this.matchKeywordToNode(text);
        setTimeout(() => this.botRespond(nodeKey || 'fallback'), 300);
    }

    matchKeywordToNode(text) {
        const t = text.toLowerCase();

        // Free tools
        if (/\b(free|which tool|no credit|without credit)\b/.test(t)) return 'free_tools';

        // Credits
        if (/\b(credit|cost|price|how much|pricing|plan|buy|purchase)\b/.test(t)) return 'credits_menu';
        if (/\b(admin|unlimited)\b/.test(t)) return 'admin_credits';


        // Navigation
        if (/\b(navigate|navigation|where|find|go to|how to get|page|location)\b/.test(t)) return 'navigation_menu';

        // Streak
        if (/\b(streak|daily|fire|consecutive)\b/.test(t)) return 'streak_info';

        // Specific tools
        if (/\b(resize)\b/.test(t)) return 'tool_resize';
        if (/\b(convert|format)\b/.test(t)) return 'tool_convert';
        if (/\b(crop)\b/.test(t)) return 'tool_crop';
        if (/\b(compress|reduce size|optimize)\b/.test(t)) return 'tool_compress';
        if (/\b(filter|effect)\b/.test(t)) return 'tool_filter';
        if (/\b(upscale|enlarge|enhance)\b/.test(t)) return 'tool_upscale';
        if (/\b(background|remove bg|transparent)\b/.test(t)) return 'tool_remove_bg';
        if (/\b(watermark|logo)\b/.test(t)) return 'tool_watermark';
        if (/\b(collage|grid)\b/.test(t)) return 'tool_collage';
        if (/\b(palette|color)\b/.test(t)) return 'tool_palette';
        if (/\b(exif|metadata)\b/.test(t)) return 'tool_exif';
        if (/\b(annotation|annotate)\b/.test(t)) return 'tool_annotation';
        if (/\b(new year|greeting|2026|seasonal)\b/.test(t)) return 'tool_newyear';

        // FAQs
        if (/\b(faq|question|help)\b/.test(t)) return 'faqs_menu';
        if (/\b(start|begin|get started|signup|register)\b/.test(t)) return 'faq_started';
        if (/\b(safe|secure|privacy|data)\b/.test(t)) return 'faq_data_safe';
        if (/\b(offline|pwa)\b/.test(t)) return 'faq_offline';
        if (/\b(format|jpg|png|webp|support)\b/.test(t)) return 'faq_formats';

        // Contact
        if (/\b(contact|email|support|help|reach)\b/.test(t)) return 'contact';

        // All tools
        if (/\b(all tool|show tool|list tool|tool list)\b/.test(t)) return 'all_tools_menu';

        return null;
    }

    botRespond(nodeKey) {
        const node = this.FLOW[nodeKey] || this.FLOW['fallback'];

        // Show typing indicator
        this.showTypingIndicator();

        const delay = Math.min(1000 + (node.text?.length || 0) * 8, 2500);
        setTimeout(() => {
            this.hideTypingIndicator();

            // Execute action if present
            if (typeof node.action === 'function') {
                node.action();
            }

            // Show message
            this.appendMessage(node.text || "I don't have that information yet.", 'ai');

            // Show options
            if (node.options && node.options.length) {
                this.appendOptions(node.options);
            }

            // Only play sound if chatbox is open
            if (this.isOpen) {
                this.playNotificationSound();
            }
        }, delay);
    }

    handleUserChoice(label, nextNode) {
        this.appendMessage(label, 'user');
        setTimeout(() => this.botRespond(nextNode || 'fallback'), 350);
    }

    appendMessage(text, who = 'ai') {
        const messagesContainer = document.getElementById('ai-chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-message ai-message-${who}`;

        if (who === 'ai') {
            messageDiv.innerHTML = `
                <div class="ai-message-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="ai-message-content">
                    ${this.formatMessage(text)}
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="ai-message-content">
                    ${this.escapeHtml(text)}
                </div>
            `;
        }

        messagesContainer.appendChild(messageDiv);
        setTimeout(() => messageDiv.classList.add('show'), 10);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    appendOptions(options = []) {
        if (!options || !options.length) return;

        const messagesContainer = document.getElementById('ai-chat-messages');
        const container = document.createElement('div');
        container.className = 'ai-options';

        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'ai-option';
            btn.type = 'button';
            btn.textContent = opt.label;
            btn.addEventListener('click', () => this.handleUserChoice(opt.label, opt.next));
            container.appendChild(btn);
        });

        messagesContainer.appendChild(container);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    showTypingIndicator() {
        const messagesContainer = document.getElementById('ai-chat-messages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'ai-message ai-message-ai ai-typing';
        typingDiv.id = 'ai-typing-indicator';
        typingDiv.innerHTML = `
            <div class="ai-message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="ai-message-content">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        messagesContainer.appendChild(typingDiv);
        setTimeout(() => typingDiv.classList.add('show'), 10);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('ai-typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    formatMessage(text) {
        let formatted = this.escapeHtml(text);

        // Bold text
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Convert /path to clickable links
        formatted = formatted.replace(/(\s|^)(\/[\w-]+)/g, '$1<a href="$2" class="ai-link">$2</a>');

        // Line breaks
        formatted = formatted.replace(/\n/g, '<br>');

        return formatted;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize chatbox when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.imgcraftAI = new ImgCraftAIChatbox();
});
