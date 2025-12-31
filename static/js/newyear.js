/**
 * ImgCraft - New Year AI Template Generator
 * Premium template-based greeting card creator with client-side canvas rendering
 * 5 Credits per export
 */

// ============================================================================
// GLOBAL STATE & CONFIGURATION
// ============================================================================

const NewYearApp = {
    // DOM Elements
    dom: {
        dropZone: null,
        fileInput: null,
        previewContainer: null,
        canvas: null,
        loadingOverlay: null,
        startInfoLeft: null,
        startInfoRight: null,
        templateControls: null,
        templateGrid: null,
        generateBtn: null,
        downloadArea: null,
        downloadBtn: null,
        greetingText: null,
        subtitleText: null,
        fileName: null,
        fileDim: null,
        fileSize: null,
        selectedTemplate: null,
        fileInfoSection: null
    },

    // State
    currentFile: null,
    sourceImage: null,
    isImageLoaded: false,
    isProcessing: false,
    selectedTemplateId: null,
    selectedCategory: 'trending',
    selectedPlatform: {
        ratio: '1:1',
        width: 1080,
        height: 1080
    },

    // Image Controls
    imageControls: {
        zoom: 100,
        offsetX: 0,
        offsetY: 0,
        fitMode: 'cover'
    },

    // Text Controls
    textControls: {
        greeting: {
            fontSize: 48,
            lineHeight: 1.2,
            alignment: 'center',
            visible: true
        },
        subtitle: {
            fontSize: 24,
            lineHeight: 1.2,
            alignment: 'center',
            visible: true
        }
    },

    // Template Definitions (JSON-based layouts)
    templates: {
        // TRENDING CATEGORY
        trending_sparkle: {
            id: 'trending_sparkle',
            name: '2026 Sparkle',
            category: 'trending',
            icon: '✨',
            badge: 'Hot',
            render: function (ctx, img, config) {
                const { width, height, greetingText, subtitleText, imageControls, textControls } = config;

                // Background gradient
                const grad = ctx.createLinearGradient(0, 0, width, height);
                grad.addColorStop(0, '#667eea');
                grad.addColorStop(1, '#764ba2');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);

                // Image with circular mask - DYNAMIC ZOOM
                const baseSize = Math.min(width, height) * 0.5;
                const imgSize = baseSize * (imageControls.zoom / 100);
                const imgX = width / 2;
                const imgY = height * 0.35;

                ctx.save();
                ctx.beginPath();
                ctx.arc(imgX, imgY, imgSize / 2, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();

                const aspectRatio = img.width / img.height;
                let drawWidth, drawHeight;
                if (aspectRatio > 1) {
                    drawHeight = imgSize;
                    drawWidth = imgSize * aspectRatio;
                } else {
                    drawWidth = imgSize;
                    drawHeight = imgSize / aspectRatio;
                }

                ctx.drawImage(img, imgX - drawWidth / 2, imgY - drawHeight / 2, drawWidth, drawHeight);
                ctx.restore();

                // Border around image
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 8;
                ctx.beginPath();
                ctx.arc(imgX, imgY, imgSize / 2, 0, Math.PI * 2);
                ctx.stroke();

                // Greeting text - DYNAMIC FONT SIZE
                ctx.fillStyle = '#ffffff';
                ctx.font = `bold ${textControls.greeting.fontSize}px Poppins, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(greetingText, width / 2, height * 0.75);

                // Subtitle - DYNAMIC FONT SIZE
                if (subtitleText) {
                    ctx.font = `${textControls.subtitle.fontSize}px Poppins, sans-serif`;
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                    ctx.fillText(subtitleText, width / 2, height * 0.85);
                }

                // Decorative sparkles
                ctx.fillStyle = '#ffd700';
                ctx.font = `${height * 0.06}px Arial`;
                ctx.fillText('✨', width * 0.15, height * 0.2);
                ctx.fillText('✨', width * 0.85, height * 0.2);
                ctx.fillText('🎉', width * 0.1, height * 0.9);
                ctx.fillText('🎊', width * 0.9, height * 0.9);
            }
        },

        trending_fireworks: {
            id: 'trending_fireworks',
            name: 'Fireworks Blast',
            category: 'trending',
            icon: '🎆',
            badge: 'New',
            render: function (ctx, img, config) {
                const { width, height, greetingText, subtitleText, imageControls, textControls } = config;

                // Dark background with gradient
                const grad = ctx.createLinearGradient(0, 0, 0, height);
                grad.addColorStop(0, '#0f0c29');
                grad.addColorStop(0.5, '#302b63');
                grad.addColorStop(1, '#24243e');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);

                // Image placement (top half) - DYNAMIC ZOOM
                const baseImgHeight = height * 0.5;
                const baseImgWidth = width * 0.9;
                const imgHeight = baseImgHeight * (imageControls.zoom / 100);
                const imgWidth = baseImgWidth * (imageControls.zoom / 100);
                const imgX = width * 0.05 + (baseImgWidth - imgWidth) / 2;
                const imgY = height * 0.05 + (baseImgHeight - imgHeight) / 2;

                ctx.save();
                ctx.beginPath();
                ctx.roundRect(imgX, imgY, imgWidth, imgHeight, 20);
                ctx.closePath();
                ctx.clip();

                const aspectRatio = img.width / img.height;
                let drawWidth, drawHeight;
                if (aspectRatio > imgWidth / imgHeight) {
                    drawHeight = imgHeight;
                    drawWidth = imgHeight * aspectRatio;
                } else {
                    drawWidth = imgWidth;
                    drawHeight = imgWidth / aspectRatio;
                }

                const centerX = imgX + imgWidth / 2 - drawWidth / 2;
                const centerY = imgY + imgHeight / 2 - drawHeight / 2;
                ctx.drawImage(img, centerX, centerY, drawWidth, drawHeight);
                ctx.restore();

                // Neon border
                ctx.strokeStyle = '#f700ff';
                ctx.lineWidth = 6;
                ctx.shadowColor = '#f700ff';
                ctx.shadowBlur = 20;
                ctx.beginPath();
                ctx.roundRect(imgX, imgY, imgWidth, imgHeight, 20);
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Greeting text with glow - DYNAMIC FONT SIZE
                ctx.fillStyle = '#ffffff';
                ctx.font = `bold ${textControls.greeting.fontSize}px Poppins, sans-serif`;
                ctx.textAlign = 'center';
                ctx.shadowColor = '#00d4ff';
                ctx.shadowBlur = 30;
                ctx.fillText(greetingText, width / 2, height * 0.7);
                ctx.shadowBlur = 0;

                // Subtitle - DYNAMIC FONT SIZE
                if (subtitleText) {
                    ctx.font = `${textControls.subtitle.fontSize}px Poppins, sans-serif`;
                    ctx.fillStyle = '#00d4ff';
                    ctx.fillText(subtitleText, width / 2, height * 0.82);
                }

                // Firework emojis
                ctx.font = `${height * 0.08}px Arial`;
                ctx.fillText('🎆', width * 0.2, height * 0.92);
                ctx.fillText('🎇', width * 0.8, height * 0.92);
            }
        },

        // MINIMAL CATEGORY
        minimal_clean: {
            id: 'minimal_clean',
            name: 'Clean & Simple',
            category: 'minimal',
            icon: '⚪',
            render: function (ctx, img, config) {
                const { width, height, greetingText, subtitleText, imageControls, textControls } = config;

                // White background
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);

                // Image (centered, large) - DYNAMIC ZOOM
                const baseSize = Math.min(width, height) * 0.6;
                const imgSize = baseSize * (imageControls.zoom / 100);
                const imgX = width / 2 - imgSize / 2;
                const imgY = height * 0.15;

                const aspectRatio = img.width / img.height;
                let drawWidth, drawHeight;
                if (aspectRatio > 1) {
                    drawWidth = imgSize;
                    drawHeight = imgSize / aspectRatio;
                } else {
                    drawHeight = imgSize;
                    drawWidth = imgSize * aspectRatio;
                }

                ctx.drawImage(img, width / 2 - drawWidth / 2, imgY, drawWidth, drawHeight);

                // Thin border
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                ctx.strokeRect(width / 2 - drawWidth / 2, imgY, drawWidth, drawHeight);

                // Text - DYNAMIC FONT SIZE
                ctx.fillStyle = '#000000';
                ctx.font = `bold ${textControls.greeting.fontSize}px Poppins, sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText(greetingText, width / 2, height * 0.85);

                if (subtitleText) {
                    ctx.font = `${textControls.subtitle.fontSize}px Poppins, sans-serif`;
                    ctx.fillStyle = '#666666';
                    ctx.fillText(subtitleText, width / 2, height * 0.93);
                }
            }
        },

        minimal_elegant: {
            id: 'minimal_elegant',
            name: 'Elegant Lines',
            category: 'minimal',
            icon: '▫️',
            render: function (ctx, img, config) {
                const { width, height, greetingText, subtitleText, imageControls, textControls } = config;

                // Soft gradient background
                const grad = ctx.createLinearGradient(0, 0, 0, height);
                grad.addColorStop(0, '#f5f7fa');
                grad.addColorStop(1, '#c3cfe2');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);

                // Image with rounded corners - DYNAMIC ZOOM
                const baseImgWidth = width * 0.7;
                const baseImgHeight = height * 0.45;
                const imgWidth = baseImgWidth * (imageControls.zoom / 100);
                const imgHeight = baseImgHeight * (imageControls.zoom / 100);
                const imgX = width * 0.15 + (baseImgWidth - imgWidth) / 2;
                const imgY = height * 0.1 + (baseImgHeight - imgHeight) / 2;

                ctx.save();
                ctx.beginPath();
                ctx.roundRect(imgX, imgY, imgWidth, imgHeight, 15);
                ctx.closePath();
                ctx.clip();

                const aspectRatio = img.width / img.height;
                let drawWidth, drawHeight;
                if (aspectRatio > imgWidth / imgHeight) {
                    drawHeight = imgHeight;
                    drawWidth = imgHeight * aspectRatio;
                } else {
                    drawWidth = imgWidth;
                    drawHeight = imgWidth / aspectRatio;
                }

                ctx.drawImage(img, imgX + imgWidth / 2 - drawWidth / 2, imgY + imgHeight / 2 - drawHeight / 2, drawWidth, drawHeight);
                ctx.restore();

                // Decorative lines
                ctx.strokeStyle = '#2c3e50';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(width * 0.2, height * 0.65);
                ctx.lineTo(width * 0.8, height * 0.65);
                ctx.stroke();

                // Text - DYNAMIC FONT SIZE
                ctx.fillStyle = '#2c3e50';
                ctx.font = `bold ${textControls.greeting.fontSize}px Poppins, sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText(greetingText, width / 2, height * 0.77);

                if (subtitleText) {
                    ctx.font = `italic ${textControls.subtitle.fontSize}px Poppins, sans-serif`;
                    ctx.fillStyle = '#34495e';
                    ctx.fillText(subtitleText, width / 2, height * 0.88);
                }
            }
        },

        // NEON PARTY CATEGORY
        neon_electric: {
            id: 'neon_electric',
            name: 'Electric Vibes',
            category: 'neon',
            icon: '⚡',
            badge: 'Party',
            render: function (ctx, img, config) {
                const { width, height, greetingText, subtitleText, imageControls, textControls } = config;

                // Black background
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, width, height);

                // Neon grid effect
                ctx.strokeStyle = '#00ffff';
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.3;
                for (let i = 0; i < width; i += 50) {
                    ctx.beginPath();
                    ctx.moveTo(i, 0);
                    ctx.lineTo(i, height);
                    ctx.stroke();
                }
                for (let i = 0; i < height; i += 50) {
                    ctx.beginPath();
                    ctx.moveTo(0, i);
                    ctx.lineTo(width, i);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;

                // Image with neon glow - DYNAMIC ZOOM
                const baseSize = Math.min(width, height) * 0.55;
                const imgSize = baseSize * (imageControls.zoom / 100);
                const imgX = width / 2;
                const imgY = height * 0.35;

                ctx.save();
                ctx.shadowColor = '#ff00ff';
                ctx.shadowBlur = 40;
                ctx.beginPath();
                ctx.arc(imgX, imgY, imgSize / 2, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();

                const aspectRatio = img.width / img.height;
                let drawWidth, drawHeight;
                if (aspectRatio > 1) {
                    drawHeight = imgSize;
                    drawWidth = imgSize * aspectRatio;
                } else {
                    drawWidth = imgSize;
                    drawHeight = imgSize / aspectRatio;
                }

                ctx.drawImage(img, imgX - drawWidth / 2, imgY - drawHeight / 2, drawWidth, drawHeight);
                ctx.restore();

                // Neon circle border
                ctx.strokeStyle = '#ff00ff';
                ctx.lineWidth = 6;
                ctx.shadowColor = '#ff00ff';
                ctx.shadowBlur = 30;
                ctx.beginPath();
                ctx.arc(imgX, imgY, imgSize / 2, 0, Math.PI * 2);
                ctx.stroke();

                // Glowing text - DYNAMIC FONT SIZE
                ctx.fillStyle = '#00ffff';
                ctx.font = `bold ${textControls.greeting.fontSize}px Poppins, sans-serif`;
                ctx.textAlign = 'center';
                ctx.shadowColor = '#00ffff';
                ctx.shadowBlur = 40;
                ctx.fillText(greetingText, width / 2, height * 0.75);

                if (subtitleText) {
                    ctx.font = `${textControls.subtitle.fontSize}px Poppins, sans-serif`;
                    ctx.fillStyle = '#ff00ff';
                    ctx.shadowColor = '#ff00ff';
                    ctx.fillText(subtitleText, width / 2, height * 0.87);
                }
                ctx.shadowBlur = 0;
            }
        },

        neon_cyberpunk: {
            id: 'neon_cyberpunk',
            name: 'Cyberpunk 2026',
            category: 'neon',
            icon: '🌃',
            badge: 'Hot',
            render: function (ctx, img, config) {
                const { width, height, greetingText, subtitleText, imageControls, textControls } = config;

                // Cyberpunk gradient
                const grad = ctx.createLinearGradient(0, 0, width, height);
                grad.addColorStop(0, '#ff0080');
                grad.addColorStop(0.5, '#7928ca');
                grad.addColorStop(1, '#0080ff');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);

                // Glitch effect overlay
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                for (let i = 0; i < 10; i++) {
                    const y = Math.random() * height;
                    const h = Math.random() * 20 + 5;
                    ctx.fillRect(0, y, width, h);
                }

                // Image placement - DYNAMIC ZOOM
                const baseImgWidth = width * 0.8;
                const baseImgHeight = height * 0.5;
                const imgWidth = baseImgWidth * (imageControls.zoom / 100);
                const imgHeight = baseImgHeight * (imageControls.zoom / 100);
                const imgX = width * 0.1 + (baseImgWidth - imgWidth) / 2;
                const imgY = height * 0.08 + (baseImgHeight - imgHeight) / 2;

                ctx.save();
                ctx.shadowColor = '#00ffff';
                ctx.shadowBlur = 25;
                ctx.beginPath();
                ctx.roundRect(imgX, imgY, imgWidth, imgHeight, 10);
                ctx.closePath();
                ctx.clip();

                const aspectRatio = img.width / img.height;
                let drawWidth, drawHeight;
                if (aspectRatio > imgWidth / imgHeight) {
                    drawHeight = imgHeight;
                    drawWidth = imgHeight * aspectRatio;
                } else {
                    drawWidth = imgWidth;
                    drawHeight = imgWidth / aspectRatio;
                }

                ctx.drawImage(img, imgX + imgWidth / 2 - drawWidth / 2, imgY + imgHeight / 2 - drawHeight / 2, drawWidth, drawHeight);
                ctx.restore();

                // Cyber border
                ctx.strokeStyle = '#00ffff';
                ctx.lineWidth = 4;
                ctx.shadowColor = '#00ffff';
                ctx.shadowBlur = 20;
                ctx.beginPath();
                ctx.roundRect(imgX, imgY, imgWidth, imgHeight, 10);
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Glowing text - DYNAMIC FONT SIZE
                ctx.fillStyle = '#ffffff';
                ctx.font = `bold ${textControls.greeting.fontSize}px Poppins, sans-serif`;
                ctx.textAlign = 'center';
                ctx.shadowColor = '#ff0080';
                ctx.shadowBlur = 35;
                ctx.fillText(greetingText, width / 2, height * 0.75);

                if (subtitleText) {
                    ctx.font = `${textControls.subtitle.fontSize}px Poppins, sans-serif`;
                    ctx.fillStyle = '#00ffff';
                    ctx.shadowColor = '#00ffff';
                    ctx.fillText(subtitleText, width / 2, height * 0.88);
                }
                ctx.shadowBlur = 0;
            }
        },

        // ELEGANT DARK CATEGORY
        elegant_gold: {
            id: 'elegant_gold',
            name: 'Golden Luxury',
            category: 'elegant',
            icon: '👑',
            badge: 'Premium',
            render: function (ctx, img, config) {
                const { width, height, greetingText, subtitleText, imageControls, textControls } = config;

                // Dark elegant background
                ctx.fillStyle = '#1a1a1a';
                ctx.fillRect(0, 0, width, height);

                // Gold accent lines
                const goldGrad = ctx.createLinearGradient(0, 0, width, 0);
                goldGrad.addColorStop(0, '#d4af37');
                goldGrad.addColorStop(0.5, '#ffd700');
                goldGrad.addColorStop(1, '#d4af37');

                ctx.strokeStyle = goldGrad;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(width * 0.1, height * 0.08);
                ctx.lineTo(width * 0.9, height * 0.08);
                ctx.stroke();

                // Image with gold frame - DYNAMIC ZOOM
                const baseSize = Math.min(width, height) * 0.5;
                const imgSize = baseSize * (imageControls.zoom / 100);
                const imgX = width / 2;
                const imgY = height * 0.35;

                ctx.save();
                ctx.beginPath();
                ctx.arc(imgX, imgY, imgSize / 2, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();

                const aspectRatio = img.width / img.height;
                let drawWidth, drawHeight;
                if (aspectRatio > 1) {
                    drawHeight = imgSize;
                    drawWidth = imgSize * aspectRatio;
                } else {
                    drawWidth = imgSize;
                    drawHeight = imgSize / aspectRatio;
                }

                ctx.drawImage(img, imgX - drawWidth / 2, imgY - drawHeight / 2, drawWidth, drawHeight);
                ctx.restore();

                // Gold border
                ctx.strokeStyle = goldGrad;
                ctx.lineWidth = 8;
                ctx.shadowColor = '#ffd700';
                ctx.shadowBlur = 20;
                ctx.beginPath();
                ctx.arc(imgX, imgY, imgSize / 2, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Elegant text - DYNAMIC FONT SIZE
                ctx.fillStyle = '#ffd700';
                ctx.font = `bold ${textControls.greeting.fontSize}px Poppins, sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText(greetingText, width / 2, height * 0.72);

                if (subtitleText) {
                    ctx.font = `italic ${textControls.subtitle.fontSize}px Poppins, sans-serif`;
                    ctx.fillStyle = '#d4af37';
                    ctx.fillText(subtitleText, width / 2, height * 0.83);
                }

                // Bottom gold line
                ctx.strokeStyle = goldGrad;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(width * 0.1, height * 0.92);
                ctx.lineTo(width * 0.9, height * 0.92);
                ctx.stroke();
            }
        },

        elegant_midnight: {
            id: 'elegant_midnight',
            name: 'Midnight Elegance',
            category: 'elegant',
            icon: '🌙',
            render: function (ctx, img, config) {
                const { width, height, greetingText, subtitleText, imageControls, textControls } = config;

                // Deep blue gradient
                const grad = ctx.createLinearGradient(0, 0, 0, height);
                grad.addColorStop(0, '#0a0e27');
                grad.addColorStop(1, '#1a1f3a');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);

                // Stars
                ctx.fillStyle = '#ffffff';
                for (let i = 0; i < 50; i++) {
                    const x = Math.random() * width;
                    const y = Math.random() * height;
                    const size = Math.random() * 2 + 1;
                    ctx.beginPath();
                    ctx.arc(x, y, size, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Image with soft glow - DYNAMIC ZOOM
                const baseImgWidth = width * 0.75;
                const baseImgHeight = height * 0.5;
                const imgWidth = baseImgWidth * (imageControls.zoom / 100);
                const imgHeight = baseImgHeight * (imageControls.zoom / 100);
                const imgX = width * 0.125 + (baseImgWidth - imgWidth) / 2;
                const imgY = height * 0.1 + (baseImgHeight - imgHeight) / 2;

                ctx.save();
                ctx.shadowColor = '#4a90e2';
                ctx.shadowBlur = 30;
                ctx.beginPath();
                ctx.roundRect(imgX, imgY, imgWidth, imgHeight, 20);
                ctx.closePath();
                ctx.clip();

                const aspectRatio = img.width / img.height;
                let drawWidth, drawHeight;
                if (aspectRatio > imgWidth / imgHeight) {
                    drawHeight = imgHeight;
                    drawWidth = imgHeight * aspectRatio;
                } else {
                    drawWidth = imgWidth;
                    drawHeight = imgWidth / aspectRatio;
                }

                ctx.drawImage(img, imgX + imgWidth / 2 - drawWidth / 2, imgY + imgHeight / 2 - drawHeight / 2, drawWidth, drawHeight);
                ctx.restore();

                // Silver border
                ctx.strokeStyle = '#c0c0c0';
                ctx.lineWidth = 3;
                ctx.shadowColor = '#c0c0c0';
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.roundRect(imgX, imgY, imgWidth, imgHeight, 20);
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Text - DYNAMIC FONT SIZE
                ctx.fillStyle = '#ffffff';
                ctx.font = `bold ${textControls.greeting.fontSize}px Poppins, sans-serif`;
                ctx.textAlign = 'center';
                ctx.shadowColor = '#4a90e2';
                ctx.shadowBlur = 20;
                ctx.fillText(greetingText, width / 2, height * 0.75);

                if (subtitleText) {
                    ctx.font = `${textControls.subtitle.fontSize}px Poppins, sans-serif`;
                    ctx.fillStyle = '#c0c0c0';
                    ctx.fillText(subtitleText, width / 2, height * 0.87);
                }
                ctx.shadowBlur = 0;
            }
        },

        // ============================================================================
        // ADDITIONAL TRENDING TEMPLATES (3 more)
        // ============================================================================

        trending_confetti: {
            id: 'trending_confetti',
            name: 'Confetti Rain',
            category: 'trending',
            icon: '🎊',
            render: function (ctx, img, config) {
                const { width, height, greetingText, subtitleText, imageControls, textControls } = config;

                // Vibrant gradient
                const grad = ctx.createLinearGradient(0, 0, width, height);
                grad.addColorStop(0, '#f093fb');
                grad.addColorStop(0.5, '#f5576c');
                grad.addColorStop(1, '#4facfe');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);

                // Confetti particles
                ctx.save();
                for (let i = 0; i < 50; i++) {
                    const x = Math.random() * width;
                    const y = Math.random() * height;
                    const size = Math.random() * 10 + 5;
                    const colors = ['#FFD700', '#FF69B4', '#00CED1', '#FF6347', '#32CD32'];
                    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
                    ctx.globalAlpha = 0.7;
                    ctx.fillRect(x, y, size, size);
                }
                ctx.globalAlpha = 1;
                ctx.restore();

                // Image - DYNAMIC ZOOM
                const baseSize = Math.min(width, height) * 0.55;
                const imgSize = baseSize * (imageControls.zoom / 100);
                const imgX = width / 2;
                const imgY = height * 0.3;

                ctx.save();
                ctx.beginPath();
                ctx.roundRect(imgX - imgSize / 2, imgY - imgSize / 2, imgSize, imgSize, 25);
                ctx.closePath();
                ctx.clip();

                const aspectRatio = img.width / img.height;
                let drawWidth, drawHeight;
                if (aspectRatio > 1) {
                    drawHeight = imgSize;
                    drawWidth = imgSize * aspectRatio;
                } else {
                    drawWidth = imgSize;
                    drawHeight = imgSize / aspectRatio;
                }

                ctx.drawImage(img, imgX - drawWidth / 2, imgY - drawHeight / 2, drawWidth, drawHeight);
                ctx.restore();

                // White border
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 10;
                ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.roundRect(imgX - imgSize / 2, imgY - imgSize / 2, imgSize, imgSize, 25);
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Text
                if (greetingText) {
                    ctx.fillStyle = '#ffffff';
                    ctx.font = `bold ${textControls.greeting.fontSize}px Poppins, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 3;
                    ctx.strokeText(greetingText, width / 2, height * 0.8);
                    ctx.fillText(greetingText, width / 2, height * 0.8);
                }

                if (subtitleText) {
                    ctx.font = `${textControls.subtitle.fontSize}px Poppins, sans-serif`;
                    ctx.fillStyle = '#ffffff';
                    ctx.textAlign = 'center';
                    ctx.fillText(subtitleText, width / 2, height * 0.9);
                }
            }
        },

        trending_countdown: {
            id: 'trending_countdown',
            name: 'Countdown 2026',
            category: 'trending',
            icon: '⏰',
            badge: 'Popular',
            render: function (ctx, img, config) {
                const { width, height, greetingText, subtitleText, imageControls, textControls } = config;

                // Dark gradient
                const grad = ctx.createLinearGradient(0, 0, 0, height);
                grad.addColorStop(0, '#141E30');
                grad.addColorStop(1, '#243B55');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);

                // Large "2026" in background
                ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                ctx.font = `bold ${height * 0.35}px Arial`;
                ctx.textAlign = 'center';
                ctx.fillText('2026', width / 2, height / 2);

                // Image - DYNAMIC ZOOM
                const baseSize = Math.min(width, height) * 0.4;
                const imgSize = baseSize * (imageControls.zoom / 100);
                const imgX = width / 2;
                const imgY = height * 0.25;

                ctx.save();
                ctx.beginPath();
                ctx.arc(imgX, imgY, imgSize / 2, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();

                const aspectRatio = img.width / img.height;
                let drawWidth, drawHeight;
                if (aspectRatio > 1) {
                    drawHeight = imgSize;
                    drawWidth = imgSize * aspectRatio;
                } else {
                    drawWidth = imgSize;
                    drawHeight = imgSize / aspectRatio;
                }

                ctx.drawImage(img, imgX - drawWidth / 2, imgY - drawHeight / 2, drawWidth, drawHeight);
                ctx.restore();

                // Gold ring
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 6;
                ctx.shadowColor = '#FFD700';
                ctx.shadowBlur = 20;
                ctx.beginPath();
                ctx.arc(imgX, imgY, imgSize / 2, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Text
                if (greetingText) {
                    ctx.fillStyle = '#FFD700';
                    ctx.font = `bold ${textControls.greeting.fontSize}px Poppins, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText(greetingText, width / 2, height * 0.7);
                }

                if (subtitleText) {
                    ctx.font = `${textControls.subtitle.fontSize}px Poppins, sans-serif`;
                    ctx.fillStyle = '#ffffff';
                    ctx.textAlign = 'center';
                    ctx.fillText(subtitleText, width / 2, height * 0.85);
                }
            }
        },

        trending_party: {
            id: 'trending_party',
            name: 'Party Burst',
            category: 'trending',
            icon: '🎉',
            render: function (ctx, img, config) {
                const { width, height, greetingText, subtitleText, imageControls, textControls } = config;

                // Radial gradient
                const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) / 2);
                grad.addColorStop(0, '#FF6B6B');
                grad.addColorStop(0.5, '#4ECDC4');
                grad.addColorStop(1, '#45B7D1');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);

                // Burst rays
                ctx.save();
                ctx.translate(width / 2, height / 2);
                for (let i = 0; i < 12; i++) {
                    ctx.rotate(Math.PI / 6);
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(width * 0.6, -20);
                    ctx.lineTo(width * 0.6, 20);
                    ctx.closePath();
                    ctx.fill();
                }
                ctx.restore();

                // Image - DYNAMIC ZOOM
                const baseSize = Math.min(width, height) * 0.45;
                const imgSize = baseSize * (imageControls.zoom / 100);
                const imgX = width / 2;
                const imgY = height / 2;

                ctx.save();
                ctx.beginPath();
                ctx.arc(imgX, imgY, imgSize / 2, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();

                const aspectRatio = img.width / img.height;
                let drawWidth, drawHeight;
                if (aspectRatio > 1) {
                    drawHeight = imgSize;
                    drawWidth = imgSize * aspectRatio;
                } else {
                    drawWidth = imgSize;
                    drawHeight = imgSize / aspectRatio;
                }

                ctx.drawImage(img, imgX - drawWidth / 2, imgY - drawHeight / 2, drawWidth, drawHeight);
                ctx.restore();

                // White border
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 12;
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 20;
                ctx.beginPath();
                ctx.arc(imgX, imgY, imgSize / 2, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Text at top
                if (greetingText) {
                    ctx.fillStyle = '#ffffff';
                    ctx.font = `bold ${textControls.greeting.fontSize}px Poppins, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 4;
                    ctx.strokeText(greetingText, width / 2, height * 0.1);
                    ctx.fillText(greetingText, width / 2, height * 0.1);
                }

                if (subtitleText) {
                    ctx.font = `${textControls.subtitle.fontSize}px Poppins, sans-serif`;
                    ctx.fillStyle = '#ffffff';
                    ctx.textAlign = 'center';
                    ctx.fillText(subtitleText, width / 2, height * 0.92);
                }
            }
        },

        // ============================================================================
        // ADDITIONAL MINIMAL TEMPLATES (3 more)
        // ============================================================================

        minimal_modern: {
            id: 'minimal_modern',
            name: 'Modern Frame',
            category: 'minimal',
            icon: '◻️',
            render: function (ctx, img, config) {
                const { width, height, greetingText, subtitleText, imageControls, textControls } = config;

                // Light gray background
                ctx.fillStyle = '#f0f0f0';
                ctx.fillRect(0, 0, width, height);

                // Image with frame - DYNAMIC ZOOM
                const baseSize = Math.min(width, height) * 0.65;
                const imgSize = baseSize * (imageControls.zoom / 100);
                const imgX = width / 2 - imgSize / 2;
                const imgY = height * 0.2;

                // White frame
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(imgX - 20, imgY - 20, imgSize + 40, imgSize + 40);

                // Shadow
                ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
                ctx.shadowBlur = 30;
                ctx.shadowOffsetY = 10;

                const aspectRatio = img.width / img.height;
                let drawWidth, drawHeight;
                if (aspectRatio > 1) {
                    drawWidth = imgSize;
                    drawHeight = imgSize / aspectRatio;
                } else {
                    drawHeight = imgSize;
                    drawWidth = imgSize * aspectRatio;
                }

                ctx.drawImage(img, width / 2 - drawWidth / 2, imgY, drawWidth, drawHeight);
                ctx.shadowBlur = 0;

                // Text
                if (greetingText) {
                    ctx.fillStyle = '#333333';
                    ctx.font = `bold ${textControls.greeting.fontSize}px Poppins, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText(greetingText, width / 2, height * 0.9);
                }

                if (subtitleText) {
                    ctx.font = `${textControls.subtitle.fontSize}px Poppins, sans-serif`;
                    ctx.fillStyle = '#888888';
                    ctx.textAlign = 'center';
                    ctx.fillText(subtitleText, width / 2, height * 0.96);
                }
            }
        },

        minimal_pastel: {
            id: 'minimal_pastel',
            name: 'Soft Pastels',
            category: 'minimal',
            icon: '🌸',
            render: function (ctx, img, config) {
                const { width, height, greetingText, subtitleText, imageControls, textControls } = config;

                // Pastel gradient
                const grad = ctx.createLinearGradient(0, 0, 0, height);
                grad.addColorStop(0, '#ffecd2');
                grad.addColorStop(1, '#fcb69f');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);

                // Image - DYNAMIC ZOOM
                const baseSize = Math.min(width, height) * 0.5;
                const imgSize = baseSize * (imageControls.zoom / 100);
                const imgX = width / 2;
                const imgY = height * 0.35;

                ctx.save();
                ctx.beginPath();
                ctx.arc(imgX, imgY, imgSize / 2, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();

                const aspectRatio = img.width / img.height;
                let drawWidth, drawHeight;
                if (aspectRatio > 1) {
                    drawHeight = imgSize;
                    drawWidth = imgSize * aspectRatio;
                } else {
                    drawWidth = imgSize;
                    drawHeight = imgSize / aspectRatio;
                }

                ctx.drawImage(img, imgX - drawWidth / 2, imgY - drawHeight / 2, drawWidth, drawHeight);
                ctx.restore();

                // Soft border
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 6;
                ctx.beginPath();
                ctx.arc(imgX, imgY, imgSize / 2, 0, Math.PI * 2);
                ctx.stroke();

                // Text
                if (greetingText) {
                    ctx.fillStyle = '#8B4513';
                    ctx.font = `bold ${textControls.greeting.fontSize}px Poppins, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText(greetingText, width / 2, height * 0.75);
                }

                if (subtitleText) {
                    ctx.font = `${textControls.subtitle.fontSize}px Poppins, sans-serif`;
                    ctx.fillStyle = '#A0522D';
                    ctx.textAlign = 'center';
                    ctx.fillText(subtitleText, width / 2, height * 0.85);
                }
            }
        },

        minimal_typo: {
            id: 'minimal_typo',
            name: 'Typography Focus',
            category: 'minimal',
            icon: '📝',
            render: function (ctx, img, config) {
                const { width, height, greetingText, subtitleText, imageControls, textControls } = config;

                // White background
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);

                // Large greeting text at top
                if (greetingText) {
                    ctx.fillStyle = '#000000';
                    ctx.font = `bold ${textControls.greeting.fontSize}px Poppins, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText(greetingText, width / 2, height * 0.15);
                }

                // Image (smaller, centered) - DYNAMIC ZOOM
                const baseSize = Math.min(width, height) * 0.45;
                const imgSize = baseSize * (imageControls.zoom / 100);
                const imgX = width / 2 - imgSize / 2;
                const imgY = height * 0.3;

                const aspectRatio = img.width / img.height;
                let drawWidth, drawHeight;
                if (aspectRatio > 1) {
                    drawWidth = imgSize;
                    drawHeight = imgSize / aspectRatio;
                } else {
                    drawHeight = imgSize;
                    drawWidth = imgSize * aspectRatio;
                }

                ctx.drawImage(img, width / 2 - drawWidth / 2, imgY, drawWidth, drawHeight);

                // Decorative line
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(width * 0.3, height * 0.8);
                ctx.lineTo(width * 0.7, height * 0.8);
                ctx.stroke();

                // Subtitle
                if (subtitleText) {
                    ctx.font = `${textControls.subtitle.fontSize}px Poppins, sans-serif`;
                    ctx.fillStyle = '#666666';
                    ctx.textAlign = 'center';
                    ctx.fillText(subtitleText, width / 2, height * 0.9);
                }
            }
        },

        // ============================================================================
        // ADDITIONAL NEON TEMPLATES (3 more)
        // ============================================================================

        neon_retro: {
            id: 'neon_retro',
            name: 'Retro Wave',
            category: 'neon',
            icon: '🌆',
            badge: 'Retro',
            render: function (ctx, img, config) {
                const { width, height, greetingText, subtitleText, imageControls, textControls } = config;

                // Retro gradient
                const grad = ctx.createLinearGradient(0, 0, 0, height);
                grad.addColorStop(0, '#1a1a2e');
                grad.addColorStop(0.5, '#16213e');
                grad.addColorStop(1, '#0f3460');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);

                // Grid lines (retro style)
                ctx.strokeStyle = '#e94560';
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.3;
                for (let i = 0; i < height; i += 40) {
                    ctx.beginPath();
                    ctx.moveTo(0, i);
                    ctx.lineTo(width, i);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;

                // Image - DYNAMIC ZOOM
                const baseImgWidth = width * 0.7;
                const baseImgHeight = height * 0.45;
                const imgWidth = baseImgWidth * (imageControls.zoom / 100);
                const imgHeight = baseImgHeight * (imageControls.zoom / 100);
                const imgX = width * 0.15 + (baseImgWidth - imgWidth) / 2;
                const imgY = height * 0.15 + (baseImgHeight - imgHeight) / 2;

                ctx.save();
                ctx.beginPath();
                ctx.roundRect(imgX, imgY, imgWidth, imgHeight, 15);
                ctx.closePath();
                ctx.clip();

                const aspectRatio = img.width / img.height;
                let drawWidth, drawHeight;
                if (aspectRatio > imgWidth / imgHeight) {
                    drawHeight = imgHeight;
                    drawWidth = imgHeight * aspectRatio;
                } else {
                    drawWidth = imgWidth;
                    drawHeight = imgWidth / aspectRatio;
                }

                ctx.drawImage(img, imgX + imgWidth / 2 - drawWidth / 2, imgY + imgHeight / 2 - drawHeight / 2, drawWidth, drawHeight);
                ctx.restore();

                // Neon border
                ctx.strokeStyle = '#e94560';
                ctx.lineWidth = 4;
                ctx.shadowColor = '#e94560';
                ctx.shadowBlur = 25;
                ctx.beginPath();
                ctx.roundRect(imgX, imgY, imgWidth, imgHeight, 15);
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Text
                if (greetingText) {
                    ctx.fillStyle = '#e94560';
                    ctx.font = `bold ${textControls.greeting.fontSize}px Poppins, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.shadowColor = '#e94560';
                    ctx.shadowBlur = 30;
                    ctx.fillText(greetingText, width / 2, height * 0.75);
                    ctx.shadowBlur = 0;
                }

                if (subtitleText) {
                    ctx.font = `${textControls.subtitle.fontSize}px Poppins, sans-serif`;
                    ctx.fillStyle = '#00d4ff';
                    ctx.textAlign = 'center';
                    ctx.fillText(subtitleText, width / 2, height * 0.88);
                }
            }
        },

        neon_laser: {
            id: 'neon_laser',
            name: 'Laser Grid',
            category: 'neon',
            icon: '🔷',
            render: function (ctx, img, config) {
                const { width, height, greetingText, subtitleText, imageControls, textControls } = config;

                // Black background
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, width, height);

                // Diagonal laser lines
                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 3;
                ctx.globalAlpha = 0.2;
                for (let i = -height; i < width + height; i += 60) {
                    ctx.beginPath();
                    ctx.moveTo(i, 0);
                    ctx.lineTo(i + height, height);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;

                // Image with hexagon mask - DYNAMIC ZOOM
                const baseSize = Math.min(width, height) * 0.5;
                const imgSize = baseSize * (imageControls.zoom / 100);
                const imgX = width / 2;
                const imgY = height * 0.35;

                ctx.save();
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i;
                    const x = imgX + (imgSize / 2) * Math.cos(angle);
                    const y = imgY + (imgSize / 2) * Math.sin(angle);
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.clip();

                const aspectRatio = img.width / img.height;
                let drawWidth, drawHeight;
                if (aspectRatio > 1) {
                    drawHeight = imgSize;
                    drawWidth = imgSize * aspectRatio;
                } else {
                    drawWidth = imgSize;
                    drawHeight = imgSize / aspectRatio;
                }

                ctx.drawImage(img, imgX - drawWidth / 2, imgY - drawHeight / 2, drawWidth, drawHeight);
                ctx.restore();

                // Hexagon border
                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 5;
                ctx.shadowColor = '#00ff00';
                ctx.shadowBlur = 25;
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i;
                    const x = imgX + (imgSize / 2) * Math.cos(angle);
                    const y = imgY + (imgSize / 2) * Math.sin(angle);
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Text
                if (greetingText) {
                    ctx.fillStyle = '#00ff00';
                    ctx.font = `bold ${textControls.greeting.fontSize}px Poppins, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.shadowColor = '#00ff00';
                    ctx.shadowBlur = 35;
                    ctx.fillText(greetingText, width / 2, height * 0.75);
                    ctx.shadowBlur = 0;
                }

                if (subtitleText) {
                    ctx.font = `${textControls.subtitle.fontSize}px Poppins, sans-serif`;
                    ctx.fillStyle = '#00ffff';
                    ctx.textAlign = 'center';
                    ctx.fillText(subtitleText, width / 2, height * 0.88);
                }
            }
        },

        neon_rave: {
            id: 'neon_rave',
            name: 'Rave Lights',
            category: 'neon',
            icon: '💫',
            render: function (ctx, img, config) {
                const { width, height, greetingText, subtitleText, imageControls, textControls } = config;

                // Multi-color gradient
                const grad = ctx.createLinearGradient(0, 0, width, height);
                grad.addColorStop(0, '#ff0080');
                grad.addColorStop(0.25, '#7928ca');
                grad.addColorStop(0.5, '#0080ff');
                grad.addColorStop(0.75, '#00ff00');
                grad.addColorStop(1, '#ffff00');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);

                // Overlay for depth
                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                ctx.fillRect(0, 0, width, height);

                // Image - DYNAMIC ZOOM
                const baseSize = Math.min(width, height) * 0.5;
                const imgSize = baseSize * (imageControls.zoom / 100);
                const imgX = width / 2;
                const imgY = height * 0.35;

                ctx.save();
                ctx.beginPath();
                ctx.arc(imgX, imgY, imgSize / 2, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();

                const aspectRatio = img.width / img.height;
                let drawWidth, drawHeight;
                if (aspectRatio > 1) {
                    drawHeight = imgSize;
                    drawWidth = imgSize * aspectRatio;
                } else {
                    drawWidth = imgSize;
                    drawHeight = imgSize / aspectRatio;
                }

                ctx.drawImage(img, imgX - drawWidth / 2, imgY - drawHeight / 2, drawWidth, drawHeight);
                ctx.restore();

                // Rainbow border
                const gradient = ctx.createLinearGradient(imgX - imgSize / 2, imgY, imgX + imgSize / 2, imgY);
                gradient.addColorStop(0, '#ff0080');
                gradient.addColorStop(0.5, '#00ff00');
                gradient.addColorStop(1, '#0080ff');

                ctx.strokeStyle = gradient;
                ctx.lineWidth = 8;
                ctx.shadowColor = '#ffffff';
                ctx.shadowBlur = 30;
                ctx.beginPath();
                ctx.arc(imgX, imgY, imgSize / 2, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Text
                if (greetingText) {
                    ctx.fillStyle = '#ffffff';
                    ctx.font = `bold ${textControls.greeting.fontSize}px Poppins, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.shadowColor = '#ff00ff';
                    ctx.shadowBlur = 40;
                    ctx.fillText(greetingText, width / 2, height * 0.75);
                    ctx.shadowBlur = 0;
                }

                if (subtitleText) {
                    ctx.font = `${textControls.subtitle.fontSize}px Poppins, sans-serif`;
                    ctx.fillStyle = '#00ffff';
                    ctx.textAlign = 'center';
                    ctx.fillText(subtitleText, width / 2, height * 0.88);
                }
            }
        },

        // ============================================================================
        // ADDITIONAL ELEGANT TEMPLATES (3 more)
        // ============================================================================

        elegant_royal: {
            id: 'elegant_royal',
            name: 'Royal Purple',
            category: 'elegant',
            icon: '💜',
            badge: 'Elegant',
            render: function (ctx, img, config) {
                const { width, height, greetingText, subtitleText, imageControls, textControls } = config;

                // Deep purple gradient
                const grad = ctx.createLinearGradient(0, 0, 0, height);
                grad.addColorStop(0, '#2d1b69');
                grad.addColorStop(1, '#1a0f3d');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);

                // Decorative corners
                ctx.fillStyle = '#9b59b6';
                ctx.globalAlpha = 0.3;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(width * 0.2, 0);
                ctx.lineTo(0, height * 0.2);
                ctx.closePath();
                ctx.fill();

                ctx.beginPath();
                ctx.moveTo(width, 0);
                ctx.lineTo(width * 0.8, 0);
                ctx.lineTo(width, height * 0.2);
                ctx.closePath();
                ctx.fill();
                ctx.globalAlpha = 1;

                // Image - DYNAMIC ZOOM
                const baseSize = Math.min(width, height) * 0.5;
                const imgSize = baseSize * (imageControls.zoom / 100);
                const imgX = width / 2;
                const imgY = height * 0.35;

                ctx.save();
                ctx.beginPath();
                ctx.arc(imgX, imgY, imgSize / 2, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();

                const aspectRatio = img.width / img.height;
                let drawWidth, drawHeight;
                if (aspectRatio > 1) {
                    drawHeight = imgSize;
                    drawWidth = imgSize * aspectRatio;
                } else {
                    drawWidth = imgSize;
                    drawHeight = imgSize / aspectRatio;
                }

                ctx.drawImage(img, imgX - drawWidth / 2, imgY - drawHeight / 2, drawWidth, drawHeight);
                ctx.restore();

                // Purple border
                ctx.strokeStyle = '#9b59b6';
                ctx.lineWidth = 8;
                ctx.shadowColor = '#9b59b6';
                ctx.shadowBlur = 25;
                ctx.beginPath();
                ctx.arc(imgX, imgY, imgSize / 2, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Text
                if (greetingText) {
                    ctx.fillStyle = '#e8daef';
                    ctx.font = `bold ${textControls.greeting.fontSize}px Poppins, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText(greetingText, width / 2, height * 0.72);
                }

                if (subtitleText) {
                    ctx.font = `italic ${textControls.subtitle.fontSize}px Poppins, sans-serif`;
                    ctx.fillStyle = '#d7bde2';
                    ctx.textAlign = 'center';
                    ctx.fillText(subtitleText, width / 2, height * 0.85);
                }
            }
        },

        elegant_diamond: {
            id: 'elegant_diamond',
            name: 'Diamond Shine',
            category: 'elegant',
            icon: '💎',
            render: function (ctx, img, config) {
                const { width, height, greetingText, subtitleText, imageControls, textControls } = config;

                // Black background
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, width, height);

                // Sparkle effects
                ctx.fillStyle = '#ffffff';
                for (let i = 0; i < 30; i++) {
                    const x = Math.random() * width;
                    const y = Math.random() * height;
                    const size = Math.random() * 3 + 1;
                    ctx.beginPath();
                    ctx.arc(x, y, size, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Image with diamond shape - DYNAMIC ZOOM
                const baseSize = Math.min(width, height) * 0.5;
                const imgSize = baseSize * (imageControls.zoom / 100);
                const imgX = width / 2;
                const imgY = height * 0.35;

                ctx.save();
                ctx.beginPath();
                ctx.moveTo(imgX, imgY - imgSize / 2);
                ctx.lineTo(imgX + imgSize / 2, imgY);
                ctx.lineTo(imgX, imgY + imgSize / 2);
                ctx.lineTo(imgX - imgSize / 2, imgY);
                ctx.closePath();
                ctx.clip();

                const aspectRatio = img.width / img.height;
                let drawWidth, drawHeight;
                if (aspectRatio > 1) {
                    drawHeight = imgSize;
                    drawWidth = imgSize * aspectRatio;
                } else {
                    drawWidth = imgSize;
                    drawHeight = imgSize / aspectRatio;
                }

                ctx.drawImage(img, imgX - drawWidth / 2, imgY - drawHeight / 2, drawWidth, drawHeight);
                ctx.restore();

                // Silver border
                ctx.strokeStyle = '#c0c0c0';
                ctx.lineWidth = 6;
                ctx.shadowColor = '#ffffff';
                ctx.shadowBlur = 30;
                ctx.beginPath();
                ctx.moveTo(imgX, imgY - imgSize / 2);
                ctx.lineTo(imgX + imgSize / 2, imgY);
                ctx.lineTo(imgX, imgY + imgSize / 2);
                ctx.lineTo(imgX - imgSize / 2, imgY);
                ctx.closePath();
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Text
                if (greetingText) {
                    ctx.fillStyle = '#ffffff';
                    ctx.font = `bold ${textControls.greeting.fontSize}px Poppins, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.shadowColor = '#ffffff';
                    ctx.shadowBlur = 20;
                    ctx.fillText(greetingText, width / 2, height * 0.75);
                    ctx.shadowBlur = 0;
                }

                if (subtitleText) {
                    ctx.font = `${textControls.subtitle.fontSize}px Poppins, sans-serif`;
                    ctx.fillStyle = '#c0c0c0';
                    ctx.textAlign = 'center';
                    ctx.fillText(subtitleText, width / 2, height * 0.88);
                }
            }
        },

        elegant_velvet: {
            id: 'elegant_velvet',
            name: 'Velvet Night',
            category: 'elegant',
            icon: '🌌',
            render: function (ctx, img, config) {
                const { width, height, greetingText, subtitleText, imageControls, textControls } = config;

                // Deep red gradient
                const grad = ctx.createLinearGradient(0, 0, 0, height);
                grad.addColorStop(0, '#3d0814');
                grad.addColorStop(1, '#1a0308');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);

                // Subtle pattern
                ctx.strokeStyle = 'rgba(139, 0, 0, 0.1)';
                ctx.lineWidth = 1;
                for (let i = 0; i < width; i += 30) {
                    ctx.beginPath();
                    ctx.moveTo(i, 0);
                    ctx.lineTo(i, height);
                    ctx.stroke();
                }

                // Image - DYNAMIC ZOOM
                const baseImgWidth = width * 0.7;
                const baseImgHeight = height * 0.5;
                const imgWidth = baseImgWidth * (imageControls.zoom / 100);
                const imgHeight = baseImgHeight * (imageControls.zoom / 100);
                const imgX = width * 0.15 + (baseImgWidth - imgWidth) / 2;
                const imgY = height * 0.15 + (baseImgHeight - imgHeight) / 2;

                ctx.save();
                ctx.beginPath();
                ctx.roundRect(imgX, imgY, imgWidth, imgHeight, 20);
                ctx.closePath();
                ctx.clip();

                const aspectRatio = img.width / img.height;
                let drawWidth, drawHeight;
                if (aspectRatio > imgWidth / imgHeight) {
                    drawHeight = imgHeight;
                    drawWidth = imgHeight * aspectRatio;
                } else {
                    drawWidth = imgWidth;
                    drawHeight = imgWidth / aspectRatio;
                }

                ctx.drawImage(img, imgX + imgWidth / 2 - drawWidth / 2, imgY + imgHeight / 2 - drawHeight / 2, drawWidth, drawHeight);
                ctx.restore();

                // Gold border
                const goldGrad = ctx.createLinearGradient(imgX, imgY, imgX + imgWidth, imgY);
                goldGrad.addColorStop(0, '#d4af37');
                goldGrad.addColorStop(0.5, '#ffd700');
                goldGrad.addColorStop(1, '#d4af37');

                ctx.strokeStyle = goldGrad;
                ctx.lineWidth = 4;
                ctx.shadowColor = '#ffd700';
                ctx.shadowBlur = 20;
                ctx.beginPath();
                ctx.roundRect(imgX, imgY, imgWidth, imgHeight, 20);
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Text
                if (greetingText) {
                    ctx.fillStyle = '#ffd700';
                    ctx.font = `bold ${textControls.greeting.fontSize}px Poppins, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText(greetingText, width / 2, height * 0.8);
                }

                if (subtitleText) {
                    ctx.font = `italic ${textControls.subtitle.fontSize}px Poppins, sans-serif`;
                    ctx.fillStyle = '#d4af37';
                    ctx.textAlign = 'center';
                    ctx.fillText(subtitleText, width / 2, height * 0.92);
                }
            }
        }
    }
};

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log("🎉 New Year AI Template Generator Loaded");

    // Initialize DOM references
    initDOMReferences();

    // Setup event listeners
    setupFileHandling();
    setupCategoryTabs();
    setupPlatformSelection();
    setupTextInputs();
    setupGenerateButton();

    // Load initial templates
    loadTemplates('trending');
});

function initDOMReferences() {
    const dom = NewYearApp.dom;

    dom.dropZone = document.getElementById('dropZone');
    dom.fileInput = document.getElementById('fileInput');
    dom.previewContainer = document.getElementById('previewContainer');
    dom.canvas = document.getElementById('previewCanvas');
    dom.loadingOverlay = document.getElementById('loadingOverlay');

    dom.startInfoLeft = document.getElementById('startInfoLeft');
    dom.startInfoRight = document.getElementById('startInfoRight');
    dom.templateControls = document.getElementById('templateControls');
    dom.templateGrid = document.getElementById('templateGrid');

    dom.generateBtn = document.getElementById('generateBtn');
    dom.downloadArea = document.getElementById('downloadArea');
    dom.downloadBtn = document.getElementById('downloadBtn');

    dom.greetingText = document.getElementById('greetingText');
    dom.subtitleText = document.getElementById('subtitleText');

    dom.fileName = document.getElementById('fileName');
    dom.fileDim = document.getElementById('fileDim');
    dom.fileSize = document.getElementById('fileSize');
    dom.selectedTemplate = document.getElementById('selectedTemplate');
    dom.fileInfoSection = document.getElementById('fileInfoSection');
}

// ============================================================================
// FILE HANDLING
// ============================================================================

function setupFileHandling() {
    const { dropZone, fileInput } = NewYearApp.dom;

    if (!dropZone || !fileInput) return;

    // Click to upload
    dropZone.addEventListener('click', () => fileInput.click());

    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFile(e.target.files[0]);
        }
    });
}

function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        showToast('Please upload a valid image', 'error');
        return;
    }

    NewYearApp.currentFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            NewYearApp.sourceImage = img;
            NewYearApp.isImageLoaded = true;
            initEditor();
        };
        img.onerror = () => {
            showToast('Failed to load image', 'error');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function initEditor() {
    const { dropZone, previewContainer, startInfoLeft, startInfoRight, templateControls, generateBtn, fileName, fileDim, fileSize, fileInfoSection } = NewYearApp.dom;
    const { currentFile, sourceImage } = NewYearApp;

    // Hide upload area, show editor
    dropZone.style.display = 'none';
    previewContainer.style.display = 'flex';

    // Show controls
    if (startInfoLeft) startInfoLeft.style.display = 'none';
    if (startInfoRight) startInfoRight.style.display = 'none';
    if (templateControls) templateControls.style.display = 'block';
    if (fileInfoSection) fileInfoSection.style.display = 'block';

    // Update file info
    if (fileName) fileName.textContent = currentFile.name;
    if (fileDim) fileDim.textContent = `${sourceImage.width} × ${sourceImage.height}`;
    if (fileSize) fileSize.textContent = formatFileSize(currentFile.size);

    // Enable generate button if template is selected
    if (NewYearApp.selectedTemplateId && generateBtn) {
        generateBtn.disabled = false;
    }

    // Show placeholder on canvas
    renderPlaceholder();
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function renderPlaceholder() {
    const { canvas } = NewYearApp.dom;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = NewYearApp.selectedPlatform;

    canvas.width = width;
    canvas.height = height;

    // Dark background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // Message
    ctx.fillStyle = '#ffffff';
    ctx.font = `${height * 0.04}px Poppins, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Select a template to preview', width / 2, height / 2);
}

// ============================================================================
// TEMPLATE SYSTEM
// ============================================================================

function setupCategoryTabs() {
    const tabs = document.querySelectorAll('.category-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const category = tab.dataset.category;

            // Update active state
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Load templates for category
            NewYearApp.selectedCategory = category;
            loadTemplates(category);
        });
    });
}

function loadTemplates(category) {
    const { templateGrid } = NewYearApp.dom;
    if (!templateGrid) return;

    // Clear existing templates
    templateGrid.innerHTML = '';

    // Filter templates by category
    const categoryTemplates = Object.values(NewYearApp.templates).filter(t => t.category === category);

    // Create template cards
    categoryTemplates.forEach(template => {
        const card = document.createElement('div');
        card.className = 'template-card';
        card.dataset.templateId = template.id;

        const gradientClass = getGradientClass(template.id);

        card.innerHTML = `
            <div class="template-preview ${gradientClass}">
                ${template.icon}
            </div>
            <div class="template-name">${template.name}</div>
            ${template.badge ? `<div class="template-badge">${template.badge}</div>` : ''}
        `;

        card.addEventListener('click', () => selectTemplate(template.id));
        templateGrid.appendChild(card);
    });
}

function getGradientClass(templateId) {
    const gradients = {
        'trending_sparkle': 'gradient-1',
        'trending_fireworks': 'gradient-neon',
        'minimal_clean': 'gradient-7',
        'minimal_elegant': 'gradient-8',
        'neon_electric': 'gradient-neon',
        'neon_cyberpunk': 'gradient-neon',
        'elegant_gold': 'gradient-dark',
        'elegant_midnight': 'gradient-dark'
    };
    return gradients[templateId] || 'gradient-1';
}

function selectTemplate(templateId) {
    NewYearApp.selectedTemplateId = templateId;

    // Update UI
    document.querySelectorAll('.template-card').forEach(card => {
        card.classList.remove('active');
        if (card.dataset.templateId === templateId) {
            card.classList.add('active');
        }
    });

    // Update selected template display
    const template = NewYearApp.templates[templateId];
    if (NewYearApp.dom.selectedTemplate) {
        NewYearApp.dom.selectedTemplate.textContent = template.name;
    }

    // Enable generate button if image is loaded
    if (NewYearApp.isImageLoaded && NewYearApp.dom.generateBtn) {
        NewYearApp.dom.generateBtn.disabled = false;
    }

    // Show preview if image is loaded
    if (NewYearApp.isImageLoaded) {
        renderPreview();
    }
}

// ============================================================================
// PLATFORM SELECTION
// ============================================================================

function setupPlatformSelection() {
    const platformBtns = document.querySelectorAll('.platform-btn');
    platformBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            platformBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update selected platform
            NewYearApp.selectedPlatform = {
                ratio: btn.dataset.ratio,
                width: parseInt(btn.dataset.width),
                height: parseInt(btn.dataset.height)
            };

            // Re-render preview if available
            if (NewYearApp.isImageLoaded && NewYearApp.selectedTemplateId) {
                renderPreview();
            } else if (NewYearApp.isImageLoaded) {
                renderPlaceholder();
            }
        });
    });
}

// ============================================================================
// TEXT INPUTS
// ============================================================================

function setupTextInputs() {
    const { greetingText, subtitleText } = NewYearApp.dom;

    if (greetingText) {
        greetingText.addEventListener('input', () => {
            if (NewYearApp.isImageLoaded && NewYearApp.selectedTemplateId) {
                renderPreview();
            }
        });
    }

    if (subtitleText) {
        subtitleText.addEventListener('input', () => {
            if (NewYearApp.isImageLoaded && NewYearApp.selectedTemplateId) {
                renderPreview();
            }
        });
    }
}

// ============================================================================
// CANVAS RENDERING
// ============================================================================

function renderPreview() {
    if (!NewYearApp.isImageLoaded || !NewYearApp.selectedTemplateId) return;

    const { canvas, greetingText, subtitleText } = NewYearApp.dom;
    const { sourceImage, selectedTemplateId, selectedPlatform, imageControls, textControls } = NewYearApp;

    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const template = NewYearApp.templates[selectedTemplateId];

    // Set canvas size
    canvas.width = selectedPlatform.width;
    canvas.height = selectedPlatform.height;

    // Render template with dynamic controls
    const config = {
        width: selectedPlatform.width,
        height: selectedPlatform.height,
        greetingText: greetingText ? greetingText.value : 'Happy New Year 2026',
        subtitleText: subtitleText ? subtitleText.value : '',
        imageControls: imageControls,
        textControls: textControls,
        ratio: selectedPlatform.ratio
    };

    template.render(ctx, sourceImage, config);
}

// ============================================================================
// GENERATE & DOWNLOAD
// ============================================================================

function setupGenerateButton() {
    const { generateBtn } = NewYearApp.dom;

    if (generateBtn) {
        generateBtn.addEventListener('click', generateTemplate);
    }
}

async function generateTemplate() {
    if (!NewYearApp.isImageLoaded || !NewYearApp.selectedTemplateId || NewYearApp.isProcessing) return;

    // Auth check
    if (window.AuthManager && !AuthManager.user) {
        showToast('Login required to generate templates', 'error');
        setTimeout(() => window.location.href = '/auth', 1500);
        return;
    }

    // Credit check (5 credits required)
    if (window.CreditManager && !CreditManager.hasCredits(5)) {
        showToast('Insufficient credits (5 required)', 'error');
        setTimeout(() => window.location.href = '/billing', 2000);
        return;
    }

    NewYearApp.isProcessing = true;

    // Show loading
    if (window.ImgCraftBusyUI) {
        window.ImgCraftBusyUI.showLoading('Generating Your Template...');
    }

    try {
        // Render final template at full resolution
        renderPreview();

        // Convert canvas to blob
        const { canvas } = NewYearApp.dom;
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

        // Deduct credits via API
        const headers = window.AuthManager ? window.AuthManager.getAuthHeaders() : {};
        const deductResponse = await fetch('/api/newyear/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        });

        if (!deductResponse.ok) {
            const errorData = await deductResponse.json();
            throw new Error(errorData.error || 'Failed to deduct credits');
        }

        // Create download link
        const url = URL.createObjectURL(blob);
        const { downloadArea, downloadBtn, generateBtn } = NewYearApp.dom;

        if (downloadArea) downloadArea.style.display = 'block';
        if (downloadBtn) {
            downloadBtn.href = url;
            const templateName = NewYearApp.templates[NewYearApp.selectedTemplateId].name.replace(/\s+/g, '_');
            downloadBtn.download = `NewYear_2026_${templateName}.png`;
        }
        if (generateBtn) generateBtn.style.display = 'none';

        showToast('Template generated successfully! (-5 Credits)', 'success');

        // Refresh credits
        if (window.CreditManager) CreditManager.refreshCredits();

        // Update streak
        if (window.StreakManager) StreakManager.updateStreak();

    } catch (error) {
        console.error('Template generation error:', error);
        showToast(error.message || 'Failed to generate template', 'error');
    } finally {
        NewYearApp.isProcessing = false;
        if (window.ImgCraftBusyUI) {
            window.ImgCraftBusyUI.hideLoading();
        }
    }
}

// ============================================================================
// UTILITIES
// ============================================================================

// Polyfill for roundRect (for older browsers)
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, width, height, radius) {
        if (width < 2 * radius) radius = width / 2;
        if (height < 2 * radius) radius = height / 2;
        this.beginPath();
        this.moveTo(x + radius, y);
        this.arcTo(x + width, y, x + width, y + height, radius);
        this.arcTo(x + width, y + height, x, y + height, radius);
        this.arcTo(x, y + height, x, y, radius);
        this.arcTo(x, y, x + width, y, radius);
        this.closePath();
        return this;
    };
}

// ============================================================================
// SLIDER CONTROLS - Image Zoom & Text Size
// ============================================================================

// Setup slider controls after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Image Zoom Slider
    const imageZoomSlider = document.getElementById('imageZoomSlider');
    const imageZoomValue = document.getElementById('imageZoomValue');

    if (imageZoomSlider && imageZoomValue) {
        imageZoomSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            imageZoomValue.textContent = value + '%';
            NewYearApp.imageControls.zoom = parseInt(value);

            // Re-render preview if image is loaded
            if (NewYearApp.isImageLoaded && NewYearApp.selectedTemplateId) {
                renderPreview();
            }
        });
    }

    // Greeting Font Size Slider
    const greetingFontSizeSlider = document.getElementById('greetingFontSizeSlider');
    const greetingFontSizeValue = document.getElementById('greetingFontSizeValue');

    if (greetingFontSizeSlider && greetingFontSizeValue) {
        greetingFontSizeSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            greetingFontSizeValue.textContent = value + 'px';
            NewYearApp.textControls.greeting.fontSize = parseInt(value);

            // Re-render preview if image is loaded
            if (NewYearApp.isImageLoaded && NewYearApp.selectedTemplateId) {
                renderPreview();
            }
        });
    }

    // Subtitle Font Size Slider
    const subtitleFontSizeSlider = document.getElementById('subtitleFontSizeSlider');
    const subtitleFontSizeValue = document.getElementById('subtitleFontSizeValue');

    if (subtitleFontSizeSlider && subtitleFontSizeValue) {
        subtitleFontSizeSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            subtitleFontSizeValue.textContent = value + 'px';
            NewYearApp.textControls.subtitle.fontSize = parseInt(value);

            // Re-render preview if image is loaded
            if (NewYearApp.isImageLoaded && NewYearApp.selectedTemplateId) {
                renderPreview();
            }
        });
    }
});

// Export for debugging
window.NewYearApp = NewYearApp;
