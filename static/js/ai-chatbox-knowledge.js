/**
 * ImgCraft AI Chatbox - Hardcoded Knowledge Base
 * This file contains all the knowledge about ImgCraft features, tools, credits, and UI behavior
 * NO runtime DOM scanning - all data is predefined for fast, efficient responses
 */

const ImgCraftKnowledge = {
    // ============================================
    // TOOLS & FEATURES
    // ============================================
    tools: [
        {
            name: 'resize',
            displayName: 'Image Resize',
            credits: 0,
            isFree: true,
            category: 'Essentials',
            description: 'Resize images to custom dimensions with multiple modes (fit, fill, stretch)',
            features: ['Custom dimensions', 'Preserve aspect ratio', 'Batch resize support', 'Multiple resize modes'],
            endpoint: '/api/resize',
            page: '/resize',
            keywords: ['resize', 'scale', 'dimensions', 'width', 'height', 'size']
        },
        {
            name: 'convert',
            displayName: 'Format Convert',
            credits: 0,
            isFree: true,
            category: 'Essentials',
            description: 'Convert between image formats (JPG, PNG, WebP, GIF, BMP, TIFF)',
            features: ['Format conversion', 'Quality preservation', 'Batch conversion', 'Metadata handling'],
            endpoint: '/api/convert',
            page: '/convert',
            keywords: ['convert', 'format', 'jpg', 'png', 'webp', 'gif', 'bmp', 'tiff']
        },
        {
            name: 'crop',
            displayName: 'Image Crop',
            credits: 1,
            isFree: false,
            category: 'Essentials',
            description: 'Precise crop selection with aspect ratio locking and rotation support',
            features: ['Precise crop selection', 'Aspect ratio locking', 'Auto-crop detection', 'Rotation (90°, 180°, 270°)', 'Flip horizontal/vertical'],
            endpoint: '/api/crop',
            page: '/crop',
            keywords: ['crop', 'cut', 'trim', 'rotate', 'flip']
        },
        {
            name: 'compress',
            displayName: 'Image Compress',
            credits: 2,
            isFree: false,
            category: 'Essentials',
            description: 'Reduce file size without significant quality loss',
            features: ['Adjustable compression levels', 'Format conversion during compression', 'Automatic quality optimization'],
            endpoint: '/api/compress',
            page: '/compress',
            keywords: ['compress', 'reduce', 'size', 'optimize', 'quality']
        },
        {
            name: 'filter',
            displayName: 'Image Filter',
            credits: 2,
            isFree: false,
            category: 'Enhance',
            description: 'Apply advanced filters and effects to your images',
            features: ['Brightness/Contrast', 'Saturation/Vibrance', 'Exposure & Highlights/Shadows', 'Sharpness, Vignette, Grain', 'Temperature & Tint', 'Multiple filters combinable'],
            endpoint: '/api/filter',
            page: '/filter',
            keywords: ['filter', 'effect', 'brightness', 'contrast', 'saturation', 'exposure', 'sharpness']
        },
        {
            name: 'upscale',
            displayName: 'Image Upscale',
            credits: 5,
            isFree: false,
            category: 'Enhance',
            description: 'AI-powered image upscaling with detail preservation',
            features: ['AI-powered upscaling', '2x-4x enlargement', 'Detail preservation', 'Noise reduction'],
            endpoint: '/api/upscale',
            page: '/upscale',
            keywords: ['upscale', 'enlarge', 'enhance', 'ai', 'quality', 'resolution']
        },
        {
            name: 'remove_bg',
            displayName: 'Remove Background',
            credits: 10,
            isFree: false,
            category: 'Enhance',
            description: 'AI-powered background removal with transparent output',
            features: ['AI-powered removal', 'Transparent background', 'Edge detection', 'Smoothing'],
            endpoint: '/api/remove-bg',
            page: '/remove-bg',
            keywords: ['background', 'remove', 'transparent', 'ai', 'cutout']
        },
        {
            name: 'watermark',
            displayName: 'Add Watermark',
            credits: 3,
            isFree: false,
            category: 'AI Studio',
            description: 'Add text or image watermarks with customization',
            features: ['Text watermarks', 'Image watermarks', 'Position customization', 'Opacity control', 'Multiple watermarks'],
            endpoint: '/api/watermark',
            page: '/watermark',
            keywords: ['watermark', 'logo', 'text', 'copyright', 'protect']
        },
        {
            name: 'collage',
            displayName: 'AI Collage Generator',
            credits: 13,
            isFree: false,
            category: 'AI Studio',
            description: 'Create beautiful multi-image collages with AI layouts',
            features: ['2x2, 2x3, 3x3 grids', 'Spacing customization', 'Border styles', 'Template-based collages'],
            endpoint: '/api/collage',
            page: '/collage',
            keywords: ['collage', 'grid', 'layout', 'multiple', 'images', 'ai']
        },
        {
            name: 'palette',
            displayName: 'Color Palette',
            credits: 2,
            isFree: false,
            category: 'Tools',
            description: 'Extract dominant colors and generate color palettes',
            features: ['Extract dominant colors', 'Generate palettes', 'Color hex export', 'Palette analytics'],
            endpoint: '/api/palette',
            page: '/palette',
            keywords: ['palette', 'color', 'extract', 'dominant', 'hex']
        },
        {
            name: 'exif',
            displayName: 'EXIF Data Viewer',
            credits: 1,
            isFree: false,
            category: 'Tools',
            description: 'View and extract EXIF metadata from images',
            features: ['Extract EXIF metadata', 'Camera information', 'GPS coordinates', 'Technical details'],
            endpoint: '/api/exif',
            page: '/exif',
            keywords: ['exif', 'metadata', 'camera', 'gps', 'info']
        },
        {
            name: 'annotation',
            displayName: 'Image Annotation',
            credits: 2,
            isFree: false,
            category: 'Tools',
            description: 'Add annotations, arrows, and shapes to images',
            features: ['Text annotations', 'Arrow & shape drawing', 'Highlight regions', 'Custom colors & fonts', 'Layer management'],
            endpoint: '/api/annotation',
            page: '/annotation',
            keywords: ['annotation', 'text', 'arrow', 'shape', 'draw', 'highlight']
        }
    ],

    // ============================================
    // CREDIT SYSTEM
    // ============================================
    credits: {
        freeTools: ['resize', 'convert'],
        newUserCredits: 10,
        plans: [
            { name: 'Starter', credits: 50, price: 99, currency: 'INR', savings: 0 },
            { name: 'Basic', credits: 100, price: 179, currency: 'INR', savings: 10 },
            { name: 'Pro', credits: 500, price: 499, currency: 'INR', savings: 20 },
            { name: 'Enterprise', credits: 1000, price: 899, currency: 'INR', savings: 25 }
        ],
        howItWorks: [
            'Each tool costs a specific number of credits',
            'Free tools (Resize, Convert) cost 0 credits',
            'Credits are deducted only after successful processing',
            'Failed operations are automatically refunded',
            'Admin users have unlimited credits'
        ]
    },

    // ============================================
    // STREAK SYSTEM
    // ============================================
    streak: {
        description: 'Daily streak tracking for consistent tool usage',
        rules: [
            'Use any tool to maintain your streak',
            'Streak increases by 1 each consecutive day',
            'Missing a day resets streak to 1',
            'Using tools multiple times per day counts only once',
            'Longest streak is tracked separately'
        ],
        benefits: [
            'Track your consistency',
            'Compete with yourself',
            'Build a habit of using ImgCraft'
        ]
    },

    // ============================================
    // AUTHENTICATION
    // ============================================
    auth: {
        features: [
            'Email-based registration',
            'Secure JWT token authentication',
            'Session management',
            'Password validation'
        ],
        guestAccess: {
            allowed: true,
            freeTools: ['resize', 'convert'],
            limitation: 'Must sign in to access premium tools'
        }
    },

    // ============================================
    // UI & NAVIGATION
    // ============================================
    ui: {
        theme: {
            name: 'Sunset Dark Theme',
            primaryColor: '#F97316',
            secondaryColor: '#E11D48',
            accentColor: '#FFD700',
            background: '#020617',
            cardBackground: '#0F172A'
        },
        fonts: [
            { name: 'Inter', description: 'Modern & Clean' },
            { name: 'Poppins', description: 'Rounded & Friendly (Default)' },
            { name: 'Fira Code', description: 'Developer Font' }
        ],
        features: [
            'Glassmorphic design',
            'Smooth animations',
            'Responsive layout',
            'Dark mode optimized',
            'PWA support',
            'Offline capabilities'
        ],
        navigation: {
            categories: [
                { name: 'Essentials', tools: ['resize', 'crop', 'convert', 'compress'] },
                { name: 'Enhance', tools: ['filter', 'upscale', 'remove_bg'] },
                { name: 'AI Studio', tools: ['collage', 'watermark'] }
            ]
        }
    },

    // ============================================
    // PAYMENT & BILLING
    // ============================================
    payment: {
        provider: 'Razorpay',
        currency: 'INR',
        features: [
            'Secure payment gateway',
            'Real-time verification',
            'Automatic credit addition',
            'Payment history tracking',
            'Refund support'
        ]
    },

    // ============================================
    // COMMON QUESTIONS & ANSWERS
    // ============================================
    faq: [
        {
            question: 'How do I get started?',
            answer: 'Simply sign up for a free account to get 10 credits. You can use free tools like Resize and Convert without any credits!',
            keywords: ['start', 'begin', 'signup', 'register', 'account']
        },
        {
            question: 'Which tools are free?',
            answer: 'Resize and Convert tools are completely free and don\'t require any credits. All other tools require credits.',
            keywords: ['free', 'cost', 'price', 'credits']
        },
        {
            question: 'How do credits work?',
            answer: 'Each tool costs a specific number of credits. For example: Resize (0), Crop (1), Compress (2), Filter (2), Upscale (5), Remove Background (10), Collage (13). Credits are only deducted after successful processing.',
            keywords: ['credits', 'cost', 'price', 'how much']
        },
        {
            question: 'What is the streak system?',
            answer: 'The streak system tracks your daily usage. Use any tool each day to maintain your streak. Missing a day resets it to 1. Your longest streak is always saved!',
            keywords: ['streak', 'daily', 'fire', 'consecutive']
        },
        {
            question: 'How do I buy more credits?',
            answer: 'Go to the Billing page to purchase credit packs. We offer Starter (50 credits - ₹99), Basic (100 credits - ₹179), Pro (500 credits - ₹499), and Enterprise (1000 credits - ₹899) plans.',
            keywords: ['buy', 'purchase', 'credits', 'billing', 'payment']
        },
        {
            question: 'Is my data safe?',
            answer: 'Yes! All images are processed securely and are not stored permanently. We use industry-standard encryption and secure payment gateways.',
            keywords: ['safe', 'secure', 'privacy', 'data', 'security']
        },
        {
            question: 'Can I use ImgCraft offline?',
            answer: 'ImgCraft is a PWA (Progressive Web App) with offline support for the interface. However, image processing requires an internet connection to access our servers.',
            keywords: ['offline', 'pwa', 'internet', 'connection']
        },
        {
            question: 'What image formats are supported?',
            answer: 'We support JPG, PNG, WebP, GIF, BMP, and TIFF formats. You can convert between any of these formats using our Convert tool.',
            keywords: ['format', 'jpg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'support']
        },
        {
            question: 'How do I contact support?',
            answer: 'You can reach us at imgcrafthelp@gmail.com or use the Contact form on our website. We typically respond within 24 hours.',
            keywords: ['contact', 'support', 'help', 'email']
        },
        {
            question: 'Can I get a refund?',
            answer: 'Yes, we offer refunds within 7 days of purchase if you haven\'t used the credits. Please contact support for refund requests.',
            keywords: ['refund', 'money back', 'return']
        },
        {
            question: 'What are admin privileges?',
            answer: 'Admin users have unlimited credits and can use all tools without any restrictions. This is a special privilege for ImgCraft administrators.',
            keywords: ['admin', 'unlimited', 'privileges', 'administrator']

        },
        {
            question: 'Is there a limit to how many images I can process?',
            answer: 'There\'s no limit to the number of images you can process, as long as you have enough credits. Free tools (Resize and Convert) can be used unlimited times.',
            keywords: ['limit', 'how many', 'unlimited', 'maximum']
        },
        {
            question: 'Will my image quality be affected?',
            answer: 'We preserve image quality as much as possible. Tools like Resize and Convert maintain original quality. Compression allows you to control the quality level. AI tools like Upscale actually enhance quality!',
            keywords: ['quality', 'resolution', 'preserve', 'maintain', 'affect']
        },
        {
            question: 'Can I process multiple images at once?',
            answer: 'Currently, tools process one image at a time. However, you can quickly process multiple images by using the same tool repeatedly.',
            keywords: ['batch', 'multiple', 'bulk', 'many images']
        },
        {
            question: 'Does ImgCraft work on mobile devices?',
            answer: 'Yes! ImgCraft is fully responsive and works on all devices including smartphones and tablets. You can also install it as a PWA (Progressive Web App) on your mobile device.',
            keywords: ['mobile', 'phone', 'tablet', 'smartphone', 'responsive']
        },
        {
            question: 'Is there an API available?',
            answer: 'Currently, ImgCraft is a web-based platform for individual users. API access is not available at this time, but may be considered for future releases.',
            keywords: ['api', 'integration', 'developer', 'programmatic']
        },
        {
            question: 'What is the maximum file size I can upload?',
            answer: 'The maximum file size depends on your browser and connection, but generally images up to 10MB are supported. For larger files, consider compressing them first.',
            keywords: ['file size', 'maximum', 'limit', 'upload', 'large']
        },
        {
            question: 'How long does image processing take?',
            answer: 'Most tools process images in 2-10 seconds. AI-powered tools like Remove Background and Upscale may take 10-30 seconds depending on image size and complexity.',
            keywords: ['time', 'speed', 'how long', 'fast', 'processing']
        },
        {
            question: 'Can I delete my account?',
            answer: 'Yes, you can delete your account by contacting support at imgcrafthelp@gmail.com. All your data will be permanently removed within 7 days.',
            keywords: ['delete', 'remove', 'account', 'close', 'deactivate']
        }
    ],

    // ============================================
    // QUICK TIPS
    // ============================================
    tips: [
        // Free Tools Tips
        'Use the free Resize tool to quickly adjust image dimensions without spending credits!',
        'Convert between JPG, PNG, WebP, GIF, BMP, and TIFF formats for free!',

        // Credit Tips
        'Failed operations are automatically refunded - you only pay for successful processing.',
        'Check your credit balance anytime in the top navigation bar.',
        'Admin users have unlimited credits and can use all tools freely.',

        // Tool-Specific Tips
        'The Collage tool supports multiple grid layouts - try 2x2, 2x3, or 3x3!',
        'Use the Filter tool to apply multiple effects at once for creative results.',
        'The Remove Background tool uses AI for precise edge detection.',
        'Upscale your images up to 4x while preserving quality with AI enhancement.',
        'Add custom watermarks to protect your images from unauthorized use.',
        'Extract color palettes from any image to use in your design projects.',
        'View detailed EXIF data including camera settings and GPS coordinates.',
        'Annotate images with text, arrows, and shapes for presentations.',

        // Streak Tips
        'Maintain your daily streak to track your consistency with ImgCraft.',
        'Use any tool once per day to keep your streak alive.',
        'Your longest streak is always saved, even if you miss a day.',

        // UI/UX Tips
        'You can change the font style in the footer to match your preference.',
        'ImgCraft works offline as a PWA - install it on your device!',
        'Use keyboard shortcuts for faster navigation and tool access.',
        'The dark theme is optimized for comfortable long-term use.',

        // Best Practices
        'Compress images before uploading to websites for faster loading times.',
        'Always keep a backup of your original images before editing.',
        'Use the Crop tool to remove unwanted parts and focus on the subject.',
        'Convert to WebP format for the best compression-to-quality ratio.',
        'Remove backgrounds to create professional product photos.',

        // Payment & Security
        'All payments are processed securely through Razorpay.',
        'Your images are processed securely and not stored permanently.',
        'We use industry-standard encryption to protect your data.',

        // Getting Started
        'New users get 10 free credits to try premium tools.',
        'Start with free tools to learn the interface before using credits.',

        // Advanced Features
        'Combine multiple tools for complex image editing workflows.',
        'Use filters to enhance photos before removing backgrounds.',
        'Resize images after editing to optimize file size.',
        'Add watermarks as the final step to protect your work.'
    ],

    // ============================================
    // PAGES & ROUTES
    // ============================================
    pages: {
        home: { path: '/', description: 'Main landing page with tool overview' },
        auth: { path: '/auth', description: 'Sign in or sign up page' },
        billing: { path: '/billing', description: 'View credits, purchase plans, and payment history' },
        docs: { path: '/docs', description: 'Documentation and guides' },
        about: { path: '/about', description: 'About ImgCraft' },
        contact: { path: '/contact', description: 'Contact support' }
    }
};

// Export for use in chatbox
if (typeof window !== 'undefined') {
    window.ImgCraftKnowledge = ImgCraftKnowledge;
}
